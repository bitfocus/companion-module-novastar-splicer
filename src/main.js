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

    this.updateStatus(InstanceStatus.Connecting);
    this.initUDP();
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
    this.setVariableDefinitions([
      ...screenVariableDefinitions,
      ...layerVariableDefinitions,
      ...presetVariableDefinitions,
      ...presetCollectionVariableDefinitions,
      ...sourceVariableDefinitions,
    ]);
    this.setVariableValues({
      ...screenDefaultVariableValues,
      ...layerDefaultVariableValues,
      ...presetDefaultVariableValues,
      ...presetCollectionDefaultVariableValues,
      ...sourceDefaultVariableValues,
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
    let resetConnection = false;

    if (this.config.host != config.host) {
      resetConnection = true;
    }

    this.log('info', 'configUpdated module....');

    this.config = {
      ...this.config,
      ...config,
    };

    if (resetConnection) {
      this.updateStatus(InstanceStatus.Connecting);

      // 停止心跳和初始化状态定时器，防止旧连接残留
      this.heartbeatManager.stop();
      this.clearInitStatusTimer();

      // 重新初始化UDP
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
      this.udp.send(Buffer.from(JSON.stringify([{ cmd: ACTIONS_CMD.get_device_init_status, param0: this.deviceId }])));
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
      this.udp.send(Buffer.from(JSON.stringify([{ cmd: ACTIONS_CMD.device_heartbeat, deviceId: this.deviceId }])));
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
