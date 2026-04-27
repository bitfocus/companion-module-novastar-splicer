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
  }

  /** Initialize per-screen enhanced state with defaults */
  initEnhancedScreen(screenId) {
    this.enhancedState.screens[screenId] = {
      brightness: 100,
      frozen: false,
      ftb: false,
      bkg: false,
      osdText: false,
      osdImage: false,
      testPattern: false,
    };
  }

  /** Update enhanced state from R0401 screen details response */
  updateEnhancedFromDetails(screenId, details) {
    if (!this.enhancedState.screens[screenId]) this.initEnhancedScreen(screenId);
    const s = this.enhancedState.screens[screenId];
    if (details.brightness !== undefined) s.brightness = details.brightness;
    if (details.screenFrz !== undefined) s.frozen = details.screenFrz === 1;
    // Protocol: blackout 0 = FTB enabled, 1 = FTB disabled (inverted)
    if (details.blackout !== undefined) s.ftb = details.blackout === 0;
    if (details.bkgEnable !== undefined) s.bkg = details.bkgEnable === 1;
    if (details.textOsdEnable !== undefined) s.osdText = details.textOsdEnable === 1;
    if (details.imgOsdEnable !== undefined) s.osdImage = details.imgOsdEnable === 1;
  }

  /** Optimistic update from action callback — instant variable + feedback refresh */
  updateEnhancedFromAction(screenId, property, value) {
    if (!this.enhancedState.screens[screenId]) this.initEnhancedScreen(screenId);
    this.enhancedState.screens[screenId][property] = value;
    const prefix = `screen_${screenId + 1}`;
    const varMap = {
      brightness: { key: `${prefix}_brightness`, val: value, feedbacks: ['brightness_match'] },
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
        { variableId: `${prefix}_osd_text`, name: `${screenName} OSD Text` },
        { variableId: `${prefix}_osd_image`, name: `${screenName} OSD Image` },
        { variableId: `${prefix}_test_pattern`, name: `${screenName} Test Pattern` },
      );
      values[`${prefix}_brightness`] = state.brightness;
      values[`${prefix}_frozen`] = state.frozen ? 'On' : 'Off';
      values[`${prefix}_ftb`] = state.ftb ? 'On' : 'Off';
      values[`${prefix}_bkg`] = state.bkg ? 'On' : 'Off';
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
    this.dataInterval = setInterval(() => {
      this.getAllData();
    }, 10000);
  }

  async init(config) {
    this.config = {
      ...this.config,
      ...config,
    };

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

    this.setVariableDefinitions([
      ...screenVariableDefinitions,
      ...layerVariableDefinitions,
      ...presetVariableDefinitions,
      ...presetCollectionVariableDefinitions,
      ...sourceVariableDefinitions,
      ...enhancedDefs,
    ]);
    this.setVariableValues({
      ...screenDefaultVariableValues,
      ...layerDefaultVariableValues,
      ...presetDefaultVariableValues,
      ...presetCollectionDefaultVariableValues,
      ...sourceDefaultVariableValues,
      ...enhancedVals,
    });
  }

  /** 获取全量列表数据 */
  getAllData() {
    this.log('debug', `${new Date().getTime()} getAllData`);
    getScreenList(this);
    getPresetCollectionList(this);
    getOutputList(this);
    getInputListSimplify(this);
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
        console.log('apply_screen_details', JSON.stringify(res.data));
        this.dealScreenDetails(res.data);
        break;
      case ACTIONS_CMD.get_input_list_simplify:
        this.sourceList = formatSourceList(res.data.inputs);
        // this.log('debug', `get_input_list_simplify响应: ${JSON.stringify(res.data)}`);
        break;
      case ACTIONS_CMD.device_heartbeat:
        this.heartbeatManager.receive();
        break;
      case ACTIONS_CMD.get_device_init_status:
        this.handleInitStatusResponse(res.data.rate);
        break;
      default:
        break;
    }
    this.updateAll();
  }
  /** 处理屏幕列表 */
  dealScreenList(data) {
    this.screenList = data.screens;
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
