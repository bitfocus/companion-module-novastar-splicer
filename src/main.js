import { InstanceBase, InstanceStatus, Regex, UDPHelper } from '@companion-module/base';

import { ACTIONS_CMD, PRODUCTS_INFORMATION } from '../utils/constant.js';
import { UpgradeScripts } from './upgrades.js';

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

    // ========== ENHANCED: Per-screen direct state ==========
    this.enhancedState = {
      screens: {},
    };
    /** Input signal state — keyed by `input_${slot+1}_${connector+1}` -> boolean */
    this.inputSignalState = {};
  }

  // ========== Safe UDP send wrapper ==========

  /** Send data via UDP with error handling to prevent crashes */
  safeSend(data) {
    if (!this.udp) {
      this.log('debug', 'safeSend: no UDP socket');
      return;
    }
    try {
      this.udp.send(data);
    } catch (err) {
      this.log('warn', `UDP send error: ${err.message}`);
      this.connectStatus = false;
      if (this.config.offlineMode) {
        this.updateStatus(InstanceStatus.Ok, 'Offline Programming Mode');
      } else {
        this.updateStatus(InstanceStatus.ConnectionFailure);
      }
    }
  }

  // ========== ENHANCED: Per-screen state management ==========

  /** Initialize enhanced state for a screen with defaults */
  initEnhancedScreen(screenId) {
    this.enhancedState.screens[screenId] = {
      frozen: false,
      ftb: false,
      bkg: false,
      osdText: false,
      osdImage: false,
      brightness: 100,
      testPattern: false,
    };
  }

  /** Update enhanced state from R0401 screen details response */
  updateEnhancedFromDetails(screenId, details) {
    if (!this.enhancedState.screens[screenId]) {
      this.initEnhancedScreen(screenId);
    }
    const state = this.enhancedState.screens[screenId];
    if (details.brightness !== undefined) state.brightness = details.brightness;
    if (details.screenFrz !== undefined) state.frozen = details.screenFrz === 1;
    // FTB inverted logic: blackout 0 = FTB enabled, 1 = FTB disabled
    if (details.blackout !== undefined) state.ftb = details.blackout === 0;
    if (details.bkgEnable !== undefined) state.bkg = details.bkgEnable === 1;
    if (details.textOsdEnable !== undefined) state.osdText = details.textOsdEnable === 1;
    if (details.imgOsdEnable !== undefined) state.osdImage = details.imgOsdEnable === 1;
  }

  /** Optimistic update from action callback for instant feedback */
  updateEnhancedFromAction(screenId, property, value) {
    if (!this.enhancedState.screens[screenId]) {
      this.initEnhancedScreen(screenId);
    }
    this.enhancedState.screens[screenId][property] = value;

    // Push updated variable value to Companion immediately
    const prefix = `screen_${screenId + 1}`;
    const varMap = {
      brightness: { key: `${prefix}_brightness`, val: value, feedbacks: ['brightness_match'] },
      frozen: { key: `${prefix}_frozen`, val: value ? 'On' : 'Off', feedbacks: ['frozen_direct', 'screen_frz'] },
      ftb: { key: `${prefix}_ftb`, val: value ? 'On' : 'Off', feedbacks: ['ftb_direct', 'ftb_selected'] },
      bkg: { key: `${prefix}_bkg`, val: value ? 'On' : 'Off', feedbacks: ['bkg_direct', 'bkg_switch'] },
      osdText: { key: `${prefix}_osd_text`, val: value ? 'On' : 'Off', feedbacks: ['osd_text_direct', 'osd_switch'] },
      osdImage: { key: `${prefix}_osd_image`, val: value ? 'On' : 'Off', feedbacks: ['osd_image_direct', 'osd_switch'] },
      testPattern: { key: `${prefix}_test_pattern`, val: value ? 'On' : 'Off', feedbacks: ['test_pattern_direct', 'test_pattern_selected'] },
    };
    if (varMap[property]) {
      this.setVariableValues({ [varMap[property].key]: varMap[property].val });
      this.checkFeedbacks(...varMap[property].feedbacks);
    }
  }

  /** Generate per-screen enhanced variables */
  getEnhancedVariables() {
    const definitions = {};
    const values = {};

    // Connection state variable — always available
    definitions['connection_state'] = { name: 'Connection State' };
    if (this.connectStatus) {
      values['connection_state'] = 'Online';
    } else if (this.config.offlineMode) {
      values['connection_state'] = 'Offline Programming';
    } else {
      values['connection_state'] = 'Disconnected';
    }

    for (const [screenIdStr, state] of Object.entries(this.enhancedState.screens)) {
      const screenId = Number(screenIdStr);
      const screen = this.screenList.find((s) => s.screenId === screenId);
      const screenName = screen ? screen.name : `Screen ${screenId + 1}`;
      const prefix = `screen_${screenId + 1}`;

      definitions[`${prefix}_brightness`] = { name: `${screenName} Brightness` };
      definitions[`${prefix}_frozen`] = { name: `${screenName} Frozen` };
      definitions[`${prefix}_ftb`] = { name: `${screenName} FTB` };
      definitions[`${prefix}_bkg`] = { name: `${screenName} BKG` };
      definitions[`${prefix}_osd_text`] = { name: `${screenName} OSD Text` };
      definitions[`${prefix}_osd_image`] = { name: `${screenName} OSD Image` };
      definitions[`${prefix}_test_pattern`] = { name: `${screenName} Test Pattern` };

      values[`${prefix}_brightness`] = state.brightness;
      values[`${prefix}_frozen`] = state.frozen ? 'On' : 'Off';
      values[`${prefix}_ftb`] = state.ftb ? 'On' : 'Off';
      values[`${prefix}_bkg`] = state.bkg ? 'On' : 'Off';
      values[`${prefix}_osd_text`] = state.osdText ? 'On' : 'Off';
      values[`${prefix}_osd_image`] = state.osdImage ? 'On' : 'Off';
      values[`${prefix}_test_pattern`] = state.testPattern ? 'On' : 'Off';
    }

    // Input signal variables
    for (const [inputKey, hasSignal] of Object.entries(this.inputSignalState)) {
      definitions[`${inputKey}_signal`] = { name: `${inputKey.replace('_', ' ').replace('_', '-')} Signal` };
      values[`${inputKey}_signal`] = hasSignal ? 'Active' : 'No Signal';
    }

    return { definitions, values };
  }

  // ========== ENHANCED: Offline mode data generation ==========

  generateOfflineData() {
    const screenCount = this.config.screenCount || 4;
    const inputCardCount = this.config.inputCardCount || 10;
    const PRESETS_PER_SCREEN = 20;

    // Generate screenList matching the format from R0400/R0500/R0600
    this.screenList = [];
    for (let i = 0; i < screenCount; i++) {
      const screen = {
        screenId: i,
        name: `Screen ${i + 1}`,
        layers: [
          { layerId: 0, name: 'Layer 1' },
          { layerId: 1, name: 'Layer 2' },
          { layerId: 2, name: 'Layer 3' },
          { layerId: 3, name: 'Layer 4' },
        ],
        presets: [],
        details: {
          screenId: i,
          brightness: 100,
          screenFrz: 0,
          blackout: 1, // 1 = not blacked out (FTB inverted logic)
          bkgEnable: 0,
          textOsdEnable: 0,
          imgOsdEnable: 0,
        },
      };

      for (let p = 0; p < PRESETS_PER_SCREEN; p++) {
        screen.presets.push({
          presetId: p,
          name: `Preset ${p + 1}`,
        });
      }

      this.screenList.push(screen);

      // Initialize enhanced state for each offline screen
      this.initEnhancedScreen(i);
    }

    // Generate empty preset collection list
    this.presetCollectionList = [];

    // Generate source list based on input card count (each card has 4 connectors)
    this.sourceList = [];
    for (let slot = 0; slot < inputCardCount; slot++) {
      for (let connector = 0; connector < 4; connector++) {
        const inputId = slot * 4 + connector;
        this.sourceList.push({
          inputId: inputId,
          cropId: 255,
          name: `Input ${slot + 1}-${connector + 1}`,
          online: 1,
          sourceType: 1,
          interfaceType: 0,
          slotId: slot,
          templateId: 0,
          streamId: 0,
        });
      }
    }

    this.log(
      'info',
      `Offline mode: Generated ${screenCount} screens, ${PRESETS_PER_SCREEN} presets each, ${this.sourceList.length} inputs (${inputCardCount} cards × 4)`,
    );
  }

  // ========== ORIGINAL v3.0.2 methods (with enhancements noted) ==========

  handleGetAllData() {
    this.getAllData();
    this.updateAll();
    // 启动定时器，定时获取全量数据
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }
    this.dataInterval = setInterval(() => {
      this.getAllData();
    }, this.config.pollInterval || 1000);
  }

  async init(config) {
    this.config = {
      ...this.config,
      ...config,
    };

    // Offline Programming Mode — generate data and set OK
    if (this.config.offlineMode) {
      this.generateOfflineData();
      this.updateAll();
      this.log('info', 'Offline Programming Mode enabled');
      this.updateStatus(InstanceStatus.Ok, 'Offline Programming Mode');
    }

    // If host is configured, attempt connection
    if (this.config.host) {
      if (!this.config.offlineMode) {
        this.updateStatus(InstanceStatus.Connecting);
      }
      this.initUDP();
    } else if (!this.config.offlineMode) {
      this.log('info', 'No host configured');
      this.updateStatus(InstanceStatus.Disconnected, 'No host configured');
    }
  }

  /** 更新actions、presets、feedbacks */
  updateAll() {
    this.setActionDefinitions(getActions(this));
    this.setFeedbackDefinitions(getFeedbacks(this));
    const { structure, presets } = getPresetDefinitions(this);
    this.setPresetDefinitions(structure, presets);
    // 处理变量
    const { screenVariableDefinitions, screenDefaultVariableValues } = formatScreenVariable(this.screenList);
    const { layerVariableDefinitions, layerDefaultVariableValues } = formatLayerVariable(this.screenList);
    const { presetVariableDefinitions, presetDefaultVariableValues } = formatPresetVariable(this.screenList);
    const { presetCollectionVariableDefinitions, presetCollectionDefaultVariableValues } =
      formatPresetCollectionVariable(this.presetCollectionList);
    const { sourceVariableDefinitions, sourceDefaultVariableValues } = formatSourceVariable(this.sourceList);

    // ENHANCED: Get per-screen enhanced variables
    const { definitions: enhancedDefs, values: enhancedVals } = this.getEnhancedVariables();

    this.setVariableDefinitions({
      ...screenVariableDefinitions,
      ...layerVariableDefinitions,
      ...presetVariableDefinitions,
      ...presetCollectionVariableDefinitions,
      ...sourceVariableDefinitions,
      ...enhancedDefs,
    });
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
    // Poll input signal status for each input card slot
    this.pollInputSignals();
  }

  /** Query R0103 for each input connector to get signal status */
  pollInputSignals() {
    if (!this.udp || !this.connectStatus) return;
    const inputCardCount = this.config.inputCardCount || 1;
    for (let slot = 0; slot < inputCardCount; slot++) {
      for (let connector = 0; connector < 4; connector++) {
        const cmd = JSON.stringify([{ cmd: 'R0103', param0: 0, param1: slot, param2: connector }]);
        this.safeSend(Buffer.from(cmd));
      }
    }
  }

  getConfigFields() {
    // Build screen count dropdown choices (1-40)
    const screenCountChoices = [];
    for (let i = 1; i <= 40; i++) {
      screenCountChoices.push({ id: i, label: `${i}` });
    }

    // Build input card count dropdown choices (1-40)
    const inputCardChoices = [];
    for (let i = 1; i <= 40; i++) {
      inputCardChoices.push({ id: i, label: `${i} (${i * 4} inputs)` });
    }

    return [
      {
        type: 'static-text',
        id: 'info',
        width: 12,
        label: 'Information',
        value: PRODUCTS_INFORMATION,
      },
      // Connection settings
      {
        type: 'textinput',
        id: 'host',
        label: 'IP Address',
        width: 6,
        default: '192.168.0.10',
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
        tooltip: 'How often to poll the device for state updates (500-30000ms)',
        isVisibleExpression: '!!$(options:host)',
      },
      // Device size configuration (always available for offline programming)
      {
        type: 'static-text',
        id: 'offline_heading',
        width: 12,
        label: 'Offline Programming',
        value: 'Enable Offline Programming Mode to activate variables and feedbacks without a device connection. This allows full pre-programming of your show before equipment arrives on-site.',
      },
      {
        type: 'checkbox',
        id: 'offlineMode',
        label: 'Enable Offline Programming Mode',
        width: 6,
        default: false,
        tooltip: 'When enabled, the module will report as connected (OK) even without a device, allowing variables and feedbacks to function for offline programming.',
      },
      {
        type: 'static-text',
        id: 'offline_info',
        width: 12,
        label: 'Device Configuration',
        value: 'The counts below will automatically populate from the device upon connection, however, they can be set manually for offline programming.',
      },
      {
        type: 'dropdown',
        id: 'screenCount',
        label: 'Number of Screens',
        width: 6,
        default: 1,
        choices: screenCountChoices,
        tooltip: 'Number of screens on your device. Used for offline programming. Overridden by device when connected.',
      },
      {
        type: 'dropdown',
        id: 'inputCardCount',
        label: 'Number of Input Cards',
        width: 6,
        default: 1,
        choices: inputCardChoices,
        tooltip:
          'Number of input cards installed (each card has 4 connectors). Used for offline programming. Overridden by device when connected.',
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
        this.log('warn', `UDP error: ${err.message}`);
        this.connectStatus = false;
        if (!this.config.offlineMode) {
          this.updateStatus(InstanceStatus.ConnectionFailure);
        }
        this.updateAll();
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
    }
  }
  /** devices cmd handle end */

  async configUpdated(config) {
    const hadHost = !!this.config.host;
    const hasHost = !!config.host;
    const hostChanged = this.config.host !== config.host;
    const sizeChanged = this.config.screenCount !== config.screenCount || this.config.inputCardCount !== config.inputCardCount;
    const offlineModeChanged = this.config.offlineMode !== config.offlineMode;

    this.log('info', 'configUpdated module....');

    this.config = {
      ...this.config,
      ...config,
    };

    // If size config changed and offline mode is on, regenerate offline data
    if (sizeChanged && this.config.offlineMode) {
      this.enhancedState = { screens: {} };
      this.generateOfflineData();
      this.updateAll();
    }

    // If offline mode toggled, update status immediately
    if (offlineModeChanged) {
      if (this.config.offlineMode) {
        this.enhancedState = { screens: {} };
        this.generateOfflineData();
        this.updateAll();
        this.updateStatus(InstanceStatus.Ok, 'Offline Programming Mode');
      } else {
        // Turning off offline mode — clear offline data
        this.enhancedState = { screens: {} };
        this.screenList = [];
        this.presetCollectionList = [];
        this.sourceList = [];
        this.updateAll();
        if (!this.connectStatus) {
          if (hasHost) {
            this.updateStatus(InstanceStatus.Connecting);
          } else {
            this.updateStatus(InstanceStatus.Disconnected, 'No host configured');
          }
        }
      }
    }

    // No host = stay in offline mode
    if (!hasHost) {
      // Tear down any existing connection
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
      if (this.config.offlineMode) {
        this.updateStatus(InstanceStatus.Ok, 'Offline Programming Mode');
      } else {
        this.updateStatus(InstanceStatus.Disconnected, 'No host configured');
      }
      return;
    }

    // Host was added or changed — (re)connect
    if (!hadHost || hostChanged) {
      this.updateStatus(InstanceStatus.Connecting);
      this.heartbeatManager.stop();
      this.clearInitStatusTimer();
      this.initUDP();
      this.handleGetAllData();
      return;
    }

    // Host unchanged but other config changed — just update
    if (sizeChanged) {
      // Already regenerated above, nothing else to do
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
        break;
      case ACTIONS_CMD.apply_screen_details:
        console.log('apply_screen_details', JSON.stringify(res.data));
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
      default:
        // Handle R0103 input signal responses
        if (res.cmd === 'R0103' && res.ack === 'Ok') {
          const slotId = res.data?.slotId ?? 0;
          const interfaceId = res.data?.interfaceId ?? 0;
          const hasSignal = res.data?.iSignal === 1;
          const inputKey = `input_${slotId + 1}_${interfaceId + 1}`;
          this.inputSignalState[inputKey] = hasSignal;
          this.setVariableValues({ [`${inputKey}_signal`]: hasSignal ? 'Active' : 'No Signal' });
          this.checkFeedbacks('input_signal');
        }
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
    if (this.screenList) {
      this.screenList.find((screen) => screen.screenId === data.screenId).layers = data.screenLayers.map((item) => ({
        layerId: item.layerId,
        name: item.name,
      }));
    }
  }

  /** 处理场景列表 */
  dealPresetList(data) {
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
      // ENHANCED: Update per-screen enhanced state from details
      this.updateEnhancedFromDetails(data.screenId, data);
    }
  }

  handleHeartbeatTimeout() {
    this.connectStatus = false;
    if (this.config.offlineMode) {
      this.updateStatus(InstanceStatus.Ok, 'Offline Programming Mode');
    } else {
      this.updateStatus(InstanceStatus.ConnectionFailure);
    }
    this.log('warn', 'Heartbeat timeout — device disconnected');
    this.updateAll();
    // 保持心跳请求
  }

  handleHeartbeatRecover() {
    this.log('debug', 'handleHeartbeatRecover');
    this.sendInitStatusRequest();
  }
}

export default ModuleInstance;
export { UpgradeScripts };
