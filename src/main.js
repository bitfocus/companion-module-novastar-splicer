import { InstanceBase, InstanceStatus, Regex, runEntrypoint, UDPHelper } from '@companion-module/base';

import { ACTIONS_CMD, PRODUCTS_INFORMATION } from '../utils/constant.js';
import { upgradeScripts } from './upgrades.js';

import { EventEmitter } from 'events';
import { HeartbeatManager } from '../utils/heartbeat.js';
import {
  decodeRes,
  formatLayerVariable,
  formatPresetCollectionVariable,
  formatPresetVariable,
  formatScreenVariable,
  formatSourceList,
  formatSourceVariable,
  sendUDPRequestsSync,
} from '../utils/index.js';
import {
  getInputListSimplify,
  getLayerList,
  getOutputList,
  getPresetCollectionList,
  getPresetList,
  getScreenDetails,
  getScreenList,
} from '../utils/request.js';
import { getActions } from './actions.js';
import { getFeedbacks } from './feedbacks.js';
import { getPresetDefinitions } from './presets.js';

class ModuleInstance extends InstanceBase {
  constructor(internal) {
    super(internal);
    Object.assign(this, EventEmitter.prototype);
    EventEmitter.call(this);
    /** 屏幕列表 包含图层和场景和屏幕的详细信息 */
    this.screenList = [];
    /**组合场景列表 */
    this.presetCollectionList = [];
    /**输入源列表 */
    this.sourceList = [];
    /** 选中的屏幕列表 */
    this.selectedScreenList = [];
    /** 选中的图层 */
    this.selectedLayerInfo = null;
    /** 定时器句柄 */
    this.dataInterval = null;
    /**PGM/PVW/Take 按钮选中状态 */
    this.pgmOrPvwActive = {
      pgmActive: false,
      pvwActive: false,
      takeActive: false,
    };
    /** 选中的组合场景 */
    this.selectedPresetCollectionId = null;
    /**黑屏 */
    this.ftb = false;
    /** 音量静音 */
    this.volumeMute = false;
    /** 屏幕冻结状态 */
    this.screenFRZState = 0;
    /** 图层冻结状态 */
    this.layerFRZState = 0;
    /** 测试画面开关 */
    this.testPattern = false;
    /**选中的输入源id */
    this.inputId = false;
    /** BKG开关状态 */
    this.bkgEnable = false;
    /** 文字OSD开关状态 */
    this.textOsdEnable = false;
    /** 图片OSD开关状态 */
    this.imgOsdEnable = false;
    this.deviceId = 0; // 设备ID，按需设置
    this.initRate = 0; // 设备初始化进度
    this.connectStatus = false; // 设备连接状态
    this.initStatusTimer = null; // 初始化状态查询定时器
    this.heartbeatManager = new HeartbeatManager({
      sendHeartbeat: () => this.sendHeartbeat(),
      onTimeout: () => this.handleHeartbeatTimeout(),
      onRecover: () => this.handleHeartbeatRecover(),
      timeout: 3000,
      maxRetry: 3,
    });
    /** 加载的场景信息 */
    this.selectedPresetInfo = null;
    /**
     * Per-screen state for direct actions/feedbacks.
     * Mirrors device truth (populated from R0401 apply_screen_details) and
     * accepts optimistic updates from action callbacks for instant feedback.
     */
    this.enhancedState = { screens: {} };
    /**
     * Per-connector input signal state. Keyed by `input_${slotId+1}_${interfaceId+1}`
     * (1-based labels in the UI, 0-based on the wire). Populated from R0102
     * (Get Slot Information) responses when input signal polling is enabled.
     */
    this.inputSignalState = {};
  }

  /** Initialize per-screen enhanced state with defaults */
  initEnhancedScreen(screenId) {
    this.enhancedState.screens[screenId] = {
      brightness: 100,
      frozen: false,
      ftb: false,
      bkg: false,
      bkgId: 0,
      osdText: false,
      osdImage: false,
      testPattern: false,
    };
  }

  /**
   * Update enhanced state from the R0401 apply_screen_details response.
   *
   * The device reports per-screen state in NESTED objects, not flat fields:
   *   { brightness: 45,
   *     Freeze: { enable: 0|1 },
   *     Ftb:    { enable: 0|1 },
   *     Bkg:    { enable: 0|1, bkgId: N },
   *     Osd:    { enable: 0|1 },        // screen text OSD
   *     OsdImage: { enable: 0|1 } }
   * An earlier version read flat names (bkgEnable, screenFrz, blackout,
   * textOsdEnable) that don't exist in the payload, so freeze/ftb/bkg/osd
   * never reconciled from device truth — they only reflected optimistic
   * action presses. This reads the real nested fields.
   */
  updateEnhancedFromDetails(screenId, details) {
    if (!this.enhancedState.screens[screenId]) this.initEnhancedScreen(screenId);
    const s = this.enhancedState.screens[screenId];
    const before = { ...s };
    if (details.brightness !== undefined) s.brightness = details.brightness;
    if (details.Freeze?.enable !== undefined) s.frozen = details.Freeze.enable === 1;
    // FTB uses the INVERTED convention (known Novastar quirk): per protocol
    // W0409 "Set Screen FTB", type 0 = FTB enabled, 1 = FTB disabled — the
    // opposite of Freeze. So Ftb.enable === 0 means FTB is on.
    if (details.Ftb?.enable !== undefined) s.ftb = details.Ftb.enable === 0;
    if (details.Bkg?.enable !== undefined) {
      s.bkg = details.Bkg.enable === 1;
      if (details.Bkg.bkgId !== undefined) s.bkgId = details.Bkg.bkgId;
    }
    if (details.Osd?.enable !== undefined) s.osdText = details.Osd.enable === 1;
    if (details.OsdImage?.enable !== undefined) s.osdImage = details.OsdImage.enable === 1;

    // Redraw any direct feedback whose underlying state changed on this poll.
    // Without this the advanced brightness_bar (and the boolean direct
    // feedbacks) only redraw on optimistic action updates, not when the
    // device reports a change made elsewhere (e.g. from the front panel).
    const changed = [];
    if (before.brightness !== s.brightness) changed.push('brightness_match', 'brightness_bar');
    if (before.frozen !== s.frozen) changed.push('frozen_direct');
    if (before.ftb !== s.ftb) changed.push('ftb_direct');
    if (before.bkg !== s.bkg) changed.push('bkg_direct');
    if (before.osdText !== s.osdText) changed.push('osd_text_direct');
    if (before.osdImage !== s.osdImage) changed.push('osd_image_direct');
    if (before.testPattern !== s.testPattern) changed.push('test_pattern_direct');
    if (changed.length > 0) this.checkFeedbacks(...changed);
  }

  /** Optimistic update from action callback — instant variable + feedback refresh */
  updateEnhancedFromAction(screenId, property, value) {
    if (!this.enhancedState.screens[screenId]) this.initEnhancedScreen(screenId);
    this.enhancedState.screens[screenId][property] = value;
    const prefix = `screen_${screenId + 1}`;
    const varMap = {
      brightness: { key: `${prefix}_brightness`, val: value, feedbacks: ['brightness_match', 'brightness_bar'] },
      frozen: { key: `${prefix}_frozen`, val: value ? 'On' : 'Off', feedbacks: ['frozen_direct'] },
      ftb: { key: `${prefix}_ftb`, val: value ? 'On' : 'Off', feedbacks: ['ftb_direct'] },
      bkg: { key: `${prefix}_bkg`, val: value ? 'On' : 'Off', feedbacks: ['bkg_direct'] },
      osdText: { key: `${prefix}_osd_text`, val: value ? 'On' : 'Off', feedbacks: ['osd_text_direct'] },
      osdImage: { key: `${prefix}_osd_image`, val: value ? 'On' : 'Off', feedbacks: ['osd_image_direct'] },
      testPattern: { key: `${prefix}_test_pattern`, val: value ? 'On' : 'Off', feedbacks: ['test_pattern_direct'] },
    };
    if (varMap[property]) {
      this.setVariableValues({ [varMap[property].key]: varMap[property].val });
      this.checkFeedbacks(...varMap[property].feedbacks);
    }
  }

  /** Build per-screen enhanced variable defs + values */
  getEnhancedVariables() {
    const definitions = [];
    const values = {};
    for (const [screenIdStr, state] of Object.entries(this.enhancedState.screens)) {
      const screenId = Number(screenIdStr);
      const screen = this.screenList.find((s) => s.screenId === screenId);
      const screenName = screen ? screen.name : `Screen ${screenId + 1}`;
      const prefix = `screen_${screenId + 1}`;
      definitions.push(
        { variableId: `${prefix}_brightness`, name: `${screenName} Brightness` },
        { variableId: `${prefix}_frozen`, name: `${screenName} Frozen` },
        { variableId: `${prefix}_ftb`, name: `${screenName} FTB` },
        { variableId: `${prefix}_bkg`, name: `${screenName} BKG` },
        { variableId: `${prefix}_bkg_id`, name: `${screenName} BKG ID` },
        { variableId: `${prefix}_osd_text`, name: `${screenName} OSD Text` },
        { variableId: `${prefix}_osd_image`, name: `${screenName} OSD Image` },
        { variableId: `${prefix}_test_pattern`, name: `${screenName} Test Pattern` },
      );
      values[`${prefix}_brightness`] = state.brightness;
      values[`${prefix}_frozen`] = state.frozen ? 'On' : 'Off';
      values[`${prefix}_ftb`] = state.ftb ? 'On' : 'Off';
      values[`${prefix}_bkg`] = state.bkg ? 'On' : 'Off';
      // Display 1-based to match the rest of the UI (device bkgId is 0-based).
      values[`${prefix}_bkg_id`] = (state.bkgId ?? 0) + 1;
      values[`${prefix}_osd_text`] = state.osdText ? 'On' : 'Off';
      values[`${prefix}_osd_image`] = state.osdImage ? 'On' : 'Off';
      values[`${prefix}_test_pattern`] = state.testPattern ? 'On' : 'Off';
    }
    return { definitions, values };
  }

  /**
   * Send data via UDP with error handling so transport errors don't
   * crash the instance. Flips status to ConnectionFailure on failure.
   */
  safeSend(data) {
    if (!this.udp) {
      this.log('debug', 'safeSend: no UDP socket');
      return;
    }
    try {
      this.udp.send(data);
    } catch (err) {
      this.log('warn', `UDP send error: ${err.message}`);
      this.updateStatus(InstanceStatus.ConnectionFailure);
    }
  }

  handleGetAllData() {
    this.getAllData();
    this.updateAll();
    // 启动定时器，定时获取全量数据
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }
    const interval = Math.max(500, Math.min(30000, Number(this.config.pollInterval) || 1000));
    this.dataInterval = setInterval(() => {
      this.getAllData();
    }, interval);
  }

  async init(config) {
    this.config = {
      ...this.config,
      ...config,
    };

    // Build banner so the loaded version is visible in the connection log.
    this.log('info', `${PRODUCTS_INFORMATION}`);

    // Offline Programming Mode: synthesize a virtual screen/layer/preset tree
    // so variables, actions, and feedbacks all work without a device. Useful
    // when building buttons for a show before rental/deployment hardware
    // is on-site.
    if (this.config.offlineMode) {
      this.generateOfflineData();
      this.updateAll();
      this.log('info', 'Offline Programming Mode enabled');
      this.updateStatus(InstanceStatus.Ok, 'Offline Programming Mode');
      return;
    }

    this.updateStatus(InstanceStatus.Connecting);
    this.initUDP();
  }

  /**
   * Generate synthetic screenList/presetCollectionList/sourceList data from
   * the configured screen and input card counts so offline programming can
   * populate variable dropdowns and previews.
   */
  generateOfflineData() {
    const screenCount = this.config.screenCount || 4;
    const inputCardCount = this.config.inputCardCount || 1;
    const PRESETS_PER_SCREEN = 20;

    this.screenList = [];
    for (let i = 0; i < screenCount; i++) {
      this.screenList.push({
        screenId: i,
        name: `Screen ${i + 1}`,
        layers: [
          { layerId: 0, name: 'Layer 1' },
          { layerId: 1, name: 'Layer 2' },
          { layerId: 2, name: 'Layer 3' },
          { layerId: 3, name: 'Layer 4' },
        ],
        presets: Array.from({ length: PRESETS_PER_SCREEN }, (_, p) => ({
          presetId: p,
          name: `Preset ${p + 1}`,
        })),
        details: {
          screenId: i,
          brightness: 100,
          screenFrz: 0,
          blackout: 1, // 1 = not blacked out (protocol inverted: 0=FTB on)
          bkgEnable: 0,
          textOsdEnable: 0,
          imgOsdEnable: 0,
        },
      });
    }

    this.presetCollectionList = [];
    // Synthetic input source entries so source dropdowns populate offline.
    // `inputId = slot * 4 + conn` gives a unique identifier across all cards;
    // formatSourceVariable builds `source_${inputId}_${cropId}` variable ids,
    // so duplicate inputIds would collide and only the last entry would show.
    this.sourceList = [];
    for (let slot = 0; slot < inputCardCount; slot++) {
      for (let conn = 0; conn < 4; conn++) {
        const inputId = slot * 4 + conn;
        this.sourceList.push({
          inputId,
          cropId: 255,
          streamId: 0,
          templateId: 0,
          sourceType: 1,
          groupName: 'Video Inputs',
          name: `Input ${slot + 1}-${conn + 1}`,
          inputName: `Input ${slot + 1}-${conn + 1}`,
          slotId: slot,
          interfaceId: conn,
          online: 1,
        });
      }
    }
  }

  /** 更新actions、presets、feedbacks */
  updateAll() {
    this.setActionDefinitions(getActions(this));
    this.setFeedbackDefinitions(getFeedbacks(this));
    this.setPresetDefinitions(getPresetDefinitions(this));
    // 处理变量
    const { screenVariableDefinitions, screenDefaultVariableValues } = formatScreenVariable(this.screenList);
    const { layerVariableDefinitions, layerDefaultVariableValues } = formatLayerVariable(this.screenList);
    const { presetVariableDefinitions, presetDefaultVariableValues } = formatPresetVariable(this.screenList);
    const { presetCollectionVariableDefinitions, presetCollectionDefaultVariableValues } =
      formatPresetCollectionVariable(this.presetCollectionList);
    const { sourceVariableDefinitions, sourceDefaultVariableValues } = formatSourceVariable(this.sourceList);
    const { definitions: enhancedDefs, values: enhancedVals } = this.getEnhancedVariables();

    // Input signal variables — only emitted when polling is enabled, so the
    // feature is dead code (no defs, no values) when the toggle is off.
    const inputSignalDefs = [];
    const inputSignalVals = {};
    if (this.config.inputSignalPolling) {
      for (const [inputKey, hasSignal] of Object.entries(this.inputSignalState)) {
        const label = inputKey.replace('input_', '').replace('_', '-');
        inputSignalDefs.push({ variableId: `${inputKey}_signal`, name: `Input ${label} Signal` });
        inputSignalVals[`${inputKey}_signal`] = hasSignal ? 'Active' : 'No Signal';
      }
    }

    this.setVariableDefinitions([
      ...screenVariableDefinitions,
      ...layerVariableDefinitions,
      ...presetVariableDefinitions,
      ...presetCollectionVariableDefinitions,
      ...sourceVariableDefinitions,
      ...enhancedDefs,
      ...inputSignalDefs,
    ]);
    this.setVariableValues({
      ...screenDefaultVariableValues,
      ...layerDefaultVariableValues,
      ...presetDefaultVariableValues,
      ...presetCollectionDefaultVariableValues,
      ...sourceDefaultVariableValues,
      ...enhancedVals,
      ...inputSignalVals,
    });
  }

  /** 获取全量列表数据 */
  getAllData() {
    this.log('debug', `${new Date().getTime()} getAllData`);
    getScreenList(this);
    getPresetCollectionList(this);
    getOutputList(this);
    getInputListSimplify(this);
    // Opt-in input signal polling. Default off, no extra packets unless enabled.
    if (this.config.inputSignalPolling) {
      this.pollInputSignals();
    }
  }

  /**
   * Poll R0102 (Get Slot Information) once per installed slot. Each response
   * carries an `interfaces[]` array with `iSignal` for all 4 connectors on
   * that slot, so one call per slot covers every connector (75% fewer round
   * trips than per-connector R0103 polling).
   *
   * Slot range is derived from `this.sourceList` (populated by the existing
   * R0226 getInputListSimplify poll) rather than a static config, so we only
   * poll slots that actually have cards installed.
   */
  pollInputSignals() {
    if (!this.udp || !this.connectStatus) return;
    // Per Novastar H Series Control Protocol V1.0.19 §4.3.1, R0100
    // (Get Device Details) returns slotList[] with the complete inventory of
    // every installed card: slotId, cardType (1=Input, 2=Output, 3=Sender,
    // 4=MVR), and interfaces[] including iSignal for each connector.
    // One call enumerates every input slot and connector on the device — no
    // need to scan slot numbers or guess at card layout. The response handler
    // filters to cardType=1 slots so only real input connectors are surfaced.
    const cmd = JSON.stringify([{ cmd: ACTIONS_CMD.get_device_details, param0: this.deviceId }]);
    this.safeSend(Buffer.from(cmd));
  }

  getConfigFields() {
    const screenCountChoices = [];
    for (let i = 1; i <= 40; i++) screenCountChoices.push({ id: i, label: `${i}` });
    const inputCardChoices = [];
    for (let i = 1; i <= 40; i++) inputCardChoices.push({ id: i, label: `${i} (${i * 4} inputs)` });

    return [
      {
        type: 'static-text',
        id: 'info',
        width: 12,
        label: 'Information',
        value: PRODUCTS_INFORMATION,
      },
      {
        type: 'textinput',
        id: 'host',
        label: 'IP Address',
        width: 6,
        default: '127.0.0.1',
        regex: Regex.IP,
      },
      {
        type: 'textinput',
        id: 'port',
        label: 'Port',
        width: 6,
        default: '6000',
        regex: Regex.PORT,
      },
      {
        type: 'number',
        id: 'pollInterval',
        label: 'Poll Interval (ms)',
        width: 6,
        min: 500,
        max: 30000,
        default: 1000,
        tooltip: 'How often to poll the device for state updates (500-30000ms). Lower = more responsive feedback at the cost of more UDP traffic.',
      },
      {
        type: 'static-text',
        id: 'offline_heading',
        width: 12,
        label: 'Offline Programming',
        value:
          'Enable Offline Programming Mode to build and test buttons against a synthetic device — useful when hardware arrives after the show is being programmed. Actions will be silently no-op for the UDP layer; variables and feedbacks populate from the counts below.',
      },
      {
        type: 'checkbox',
        id: 'offlineMode',
        label: 'Enable Offline Programming Mode',
        width: 6,
        default: false,
      },
      {
        type: 'dropdown',
        id: 'screenCount',
        label: 'Number of Screens',
        width: 6,
        default: 1,
        choices: screenCountChoices,
        tooltip: 'Used in offline mode to synthesize the screen list. Overridden by live device data when connected.',
      },
      {
        type: 'dropdown',
        id: 'inputCardCount',
        label: 'Number of Input Cards',
        width: 6,
        default: 1,
        choices: inputCardChoices,
        tooltip: 'Used in offline mode to synthesize input source entries (each card has 4 connectors).',
      },
      {
        type: 'static-text',
        id: 'input_signal_heading',
        width: 12,
        label: 'Input Signal Polling',
        value:
          'Optional feature for live operators who need to drive button feedback off whether an input connector has signal. When enabled, the module polls R0102 (Get Slot Information) once per installed slot on the regular getAllData tick and exposes input_N_M_signal variables and an input_signal boolean feedback. Slots are auto-detected from the existing source list, so no additional configuration is needed. Default off, leave it off if you do not need this.',
      },
      {
        type: 'checkbox',
        id: 'inputSignalPolling',
        label: 'Enable Input Signal Polling',
        width: 6,
        default: false,
      },
    ];
  }

  //暂时不需要支持ipc ndi
  async getInputListSync() {
    let _list = [];
    const addList = async (cmd, params, expr) => {
      if (_list.length < 500) {
        const res = await sendUDPRequestsSync(this, [
          {
            cmd: ACTIONS_CMD[cmd],
            params,
          },
        ]);
        const croupList = [];
        // console.info(1111, res[0]?.data?.inputs);
        const _data =
          res[0]?.data?.inputs?.map((_item) => {
            _item.crops?.forEach((cropItem) => {
              croupList.push({ ...cropItem, ...expr, templateId: 0, ...cropItem });
            });
            return { ..._item, ...expr, templateId: 0, cropId: 255 };
          }) ?? [];
        _list = [..._list, ..._data, ...croupList];
      }
      if (_list.length > 500) {
        _list = _list.slice(0, 500);
      }
    };
    // Mosaic Network Inputs
    await addList(
      'get_input_list',
      {
        param0: 0,
        param1: 1,
      },
      { groupName: 'Video Inputs', streamI: 0 },
    );
    await addList(
      'get_ipc_input_list',
      {
        segPagelndex: 0,
        segPageSize: 10,
      },
      { groupName: 'IPC Input Signal' },
    );
    await addList(
      'get_ndi_input_list',
      {
        segPagelndex: 0,
        segPageSize: 500,
      },
      { groupName: 'NDI Input Signal' },
    );
    this.sourceList = formatSourceList(_list);
  }

  // When module gets deleted
  async destroy() {
    this.log('info', 'destroy:' + this.id);
    if (this.udp !== undefined) {
      this.udp.destroy();
    }
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
      this.dataInterval = null;
    }
    this.heartbeatManager.stop();
    this.clearInitStatusTimer();
  }

  initUDP() {
    if (this.udp !== undefined) {
      this.udp.destroy();
      delete this.udp;
    }

    if (this.config.host !== undefined) {
      this.udp = new UDPHelper(this.config.host, this.config.port);

      this.udp.on('error', (err) => {
        this.updateStatus(InstanceStatus.ConnectionFailure);
      });

      this.udp.on('listening', () => {
        this.log('debug', 'UDP listening');
        this.updateStatus(InstanceStatus.Connecting);
        this.connectStatus = false;
        this.startInitStatusQuery();
        this.heartbeatManager.stop(); // 确保心跳管理器重置
      });

      // If we get data, thing should be good
      this.udp.on('data', (msg) => {
        // this.log("info", JSON.stringify(decodeRes(msg)));
        try {
          const res = decodeRes(msg);
          if (res.ack) {
            this.UDPResponse(res);
          }
        } catch (err) {
          this.log('error', `udp data error: ${err}`);
        }
      });

      this.udp.on('status_change', (status, message) => {
        this.log('debug', 'UDP status_change: ' + status);
      });
      this.log('debug', 'initUDP finish');
    } else {
      this.log('error', 'No host configured');
      // this.updateStatus(InstanceStatus.BadConfig);
    }
  }
  /** devices cmd handle end */

  async configUpdated(config) {
    const hostChanged = this.config.host != config.host;
    const offlineModeChanged = this.config.offlineMode !== config.offlineMode;
    const sizeChanged =
      this.config.screenCount !== config.screenCount || this.config.inputCardCount !== config.inputCardCount;

    this.log('info', 'configUpdated module....');

    this.config = {
      ...this.config,
      ...config,
    };

    // If offline mode is on and size changed, regenerate synthetic data
    if (sizeChanged && this.config.offlineMode) {
      this.generateOfflineData();
      this.updateAll();
    }

    // Handle offline mode toggle
    if (offlineModeChanged) {
      if (this.config.offlineMode) {
        // Entering offline mode — tear down any live connection cleanly
        if (this.udp) {
          this.udp.destroy();
          delete this.udp;
        }
        if (this.dataInterval) {
          clearInterval(this.dataInterval);
          this.dataInterval = null;
        }
        this.heartbeatManager.stop();
        this.clearInitStatusTimer();
        this.connectStatus = false;
        this.generateOfflineData();
        this.updateAll();
        this.updateStatus(InstanceStatus.Ok, 'Offline Programming Mode');
        return;
      } else {
        // Leaving offline mode — clear synthetic data and immediately fetch
        // real device state so Presets/Feedback refresh without needing a
        // host change or polling cycle.
        this.screenList = [];
        this.presetCollectionList = [];
        this.sourceList = [];
        this.connectStatus = false;
        this.updateAll();
        if (this.config.host) {
          this.updateStatus(InstanceStatus.Connecting);
          this.heartbeatManager.stop();
          this.clearInitStatusTimer();
          this.initUDP();
          this.handleGetAllData();
        } else {
          this.updateStatus(InstanceStatus.Disconnected, 'No host configured');
        }
        return;
      }
    }

    if (hostChanged && !this.config.offlineMode) {
      this.updateStatus(InstanceStatus.Connecting);
      this.heartbeatManager.stop();
      this.clearInitStatusTimer();
      this.initUDP();
      this.handleGetAllData();
    }
  }

  // 初始化状态查询
  startInitStatusQuery() {
    this.log('debug', 'Starting initial status query...');
    this.clearInitStatusTimer();
    this.sendInitStatusRequest();
  }

  sendInitStatusRequest() {
    this.log('debug', 'Sending initial status request...');
    if (this.udp) {
      this.safeSend(Buffer.from(JSON.stringify([{ cmd: ACTIONS_CMD.get_device_init_status, param0: this.deviceId }])));
    }
  }

  handleInitStatusResponse(rate) {
    this.log('debug', `Handling init status response with rate: ${rate}`);
    this.initRate = rate;
    if (rate === 100) {
      this.handleGetAllData();
      this.connectStatus = true;
      this.updateStatus(InstanceStatus.Ok);
      this.clearInitStatusTimer();
      this.heartbeatManager.start();
    } else {
      this.connectStatus = false;
      this.updateStatus(InstanceStatus.Connecting);
      this.initStatusTimer = setTimeout(() => {
        this.sendInitStatusRequest();
      }, 15000);
    }
  }

  clearInitStatusTimer() {
    if (this.initStatusTimer) {
      clearTimeout(this.initStatusTimer);
      this.initStatusTimer = null;
    }
  }

  sendHeartbeat() {
    if (this.udp) {
      this.safeSend(Buffer.from(JSON.stringify([{ cmd: ACTIONS_CMD.device_heartbeat, deviceId: this.deviceId }])));
    }
  }

  /** 处理返回数据 */
  UDPResponse(res) {
    // 发出UDP响应事件，供串行请求监听
    this.emit('udp_response', res);
    switch (res.cmd) {
      case ACTIONS_CMD.get_screen_list:
        this.dealScreenList(res.data);
        break;
      case ACTIONS_CMD.get_layer_list:
        this.dealLayerList(res.data);
        break;
      case ACTIONS_CMD.get_preset_collection_list:
        this.presetCollectionList = res.data?.presetCollectionList ?? [];
        break;
      case ACTIONS_CMD.get_preset_list:
        this.dealPresetList(res.data);
        // this.log('debug', `presetList22: ${JSON.stringify(res)}`);

        break;
      case ACTIONS_CMD.apply_screen_details:
        this.dealScreenDetails(res.data);
        break;
      case ACTIONS_CMD.get_input_list_simplify:
        this.sourceList = formatSourceList(res.data.inputs);
        break;
      case ACTIONS_CMD.device_heartbeat:
        this.heartbeatManager.receive();
        break;
      case ACTIONS_CMD.get_device_init_status:
        this.handleInitStatusResponse(res.data.rate);
        break;
      case ACTIONS_CMD.get_device_details:
        this.dealDeviceDetails(res);
        break;
      default:
        break;
    }
    this.updateAll();
  }

  /**
   * R0103 response handler. Each response covers one connector and carries:
   *   { deviceId, slotId, interfaceId, interfaceType, iSignal, functionType }
   * Per protocol, iSignal=1 means signal source connected; values 0 (no
   * source) and 2 (disconnected) are both treated as inactive.
   *
   * Matches the V10 working build, which proved this pattern reliable on
   * live H Series chassis. Only fires while inputSignalPolling is enabled;
   * the polling loop checks the toggle so this case is unreachable when off.
   */
  /**
   * R0100 response handler. Walks slotList[], keeps only slots where
   * cardType === 1 (Input card slot), and for each one's interfaces[]
   * builds an `input_${slotId+1}_${interfaceId+1}` entry in
   * `inputSignalState` with iSignal === 1 → Active, else No Signal.
   *
   * Per protocol §4.3.2:
   *   cardType: 0=No card, 1=Input, 2=Output, 3=Sender, 4=MVR
   *   interfaces[].iSignal: 0=no source, 1=connected, 2=disconnected
   */
  dealDeviceDetails(res) {
    if (res.ack !== true) return;
    const slotList = res.data?.slotList;
    if (!Array.isArray(slotList)) return;


    const changedKeys = [];
    const values = {};
    const seenKeys = new Set();

    for (const slot of slotList) {
      // Only input card slots that are actually populated. Per protocol
      // §4.3.2: cardType=1 is "Input card slot" (the bay), status=1 is
      // "Normal" (card present and operational). Empty input bays report
      // cardType=1 with status=0 and have to be skipped.
      if (slot?.cardType !== 1 || slot?.status !== 1) continue;
      const slotId = slot.slotId;
      if (typeof slotId !== 'number') continue;
      const interfaces = Array.isArray(slot.interfaces) ? slot.interfaces : [];

      for (const iface of interfaces) {
        const interfaceId = iface?.interfaceId;
        if (typeof interfaceId !== 'number') continue;

        // Skip connectors that are not a usable input.
        //
        // 1) functionType=255 means "Invalid" (protocol §4.3.5) — the
        //    disabled side of a combo HDMI/DP input card where only one
        //    connector can be enabled at a time. Never a usable input.
        if (iface.functionType === 255) continue;

        // 2) 12G-SDI loop-out. The H_1x12G SDI input card exposes two
        //    interfaceType=18 connectors, but only connector 0 is an input —
        //    connector 1 is a hardware LOOP-OUT. The protocol returns both
        //    with identical fields (no direction flag), so we encode the
        //    card's known layout: on a 12G-SDI card, keep connector 0 only.
        if (iface.interfaceType === 18 && interfaceId >= 1) continue;

        const inputKey = `input_${slotId + 1}_${interfaceId + 1}`;
        seenKeys.add(inputKey);
        const hasSignal = iface.iSignal === 1;
        const prev = this.inputSignalState[inputKey];
        this.inputSignalState[inputKey] = hasSignal;
        values[`${inputKey}_signal`] = hasSignal ? 'Active' : 'No Signal';
        if (prev !== hasSignal) changedKeys.push(inputKey);
      }
    }

    // Drop stale entries for connectors that disappeared (card hot-removed).
    for (const key of Object.keys(this.inputSignalState)) {
      if (!seenKeys.has(key)) delete this.inputSignalState[key];
    }

    this.setVariableValues(values);
    if (changedKeys.length > 0) {
      this.checkFeedbacks('input_signal');
    }
  }
  /** 处理屏幕列表 */
  dealScreenList(data) {
    // Preserve existing layers/presets/details on each screen while replacing
    // the rest of the screen record. R0400 carries only top-level screen fields
    // (screenId, name, etc.); layers come from R0500, presets from R0600,
    // and details from R0401. If we wipe screenList on every R0400, the
    // layer/preset/screen-detail presets briefly vanish during each poll
    // cycle until the dependent responses arrive. At 10s polling this was
    // hard to notice; at 1s polling it makes presets flicker on every tick.
    const prev = this.screenList ?? [];
    const merged = (data.screens ?? []).map((newScreen) => {
      const existing = prev.find((s) => s.screenId === newScreen.screenId);
      return {
        ...newScreen,
        layers: newScreen.layers ?? existing?.layers ?? [],
        presets: newScreen.presets ?? existing?.presets ?? [],
        details: newScreen.details ?? existing?.details,
      };
    });
    this.screenList = merged;
    data.screens.forEach((screen) => {
      getLayerList(this, screen.screenId);
      getPresetList(this, screen.screenId);
      getScreenDetails(this, screen.screenId);
    });
  }

  /** 处理图层列表 */
  dealLayerList(data) {
    // console.log('layerList', JSON.stringify(data));
    if (this.screenList) {
      this.screenList.find((screen) => screen.screenId === data.screenId).layers = data.screenLayers.map((item) => ({
        layerId: item.layerId,
        name: item.name,
      }));
    }
  }

  /** 处理场景列表 */
  dealPresetList(data) {
    // this.log('debug', `presetList1: ${JSON.stringify(data)}`);
    if (this.screenList) {
      this.screenList.find((screen) => screen.screenId === data.screenId).presets = data.presets.map((item) => ({
        presetId: item.presetId,
        name: item.name,
      }));
    }
  }
  /** 处理屏幕详情 */
  dealScreenDetails(data) {
    if (this.screenList) {
      this.screenList.find((screen) => screen.screenId === data.screenId).details = data;
      // Reconcile enhanced per-screen state from the device truth
      this.updateEnhancedFromDetails(data.screenId, data);
    }
  }

  handleHeartbeatTimeout() {
    this.connectStatus = false;
    this.updateStatus(InstanceStatus.ConnectionFailure);
    this.log('debug', 'Heartbeat timeout, device disconnected');
    // 保持心跳请求
  }

  handleHeartbeatRecover() {
    this.log('debug', 'handleHeartbeatRecover');
    this.sendInitStatusRequest();
  }
}

runEntrypoint(ModuleInstance, upgradeScripts);
