import { ACTIONS_CMD, DEFAULT_COMMAND, TEST_PATTERN_TYPE } from '../utils/constant.js';
import formatDropDownData from '../utils/formatDropDown.js';
import { handleParams, sendUDPRequestsSync } from '../utils/index.js';
import { applyPgmOrPvw, applyPresetCollection, blackScreen } from '../utils/request.js';
export const getActions = (instance) => {
  const { presetCollectionListDropDown, sourceListDropDown, presetDropDown, screenListDropDown, layerListDropDown } =
    formatDropDownData(instance);
  return {
    // 选择屏幕
    select_screen: {
      name: 'Select Screen',
      description: 'Select/Deselect a screen (without affecting operations performed on other terminals).',
      options: [
        {
          type: 'dropdown',
          name: 'Screen Select',
          label: 'Screen Select',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
        {
          type: 'dropdown',
          name: 'Screen Select',
          label: 'Screen Select',
          id: 'enable',
          default: 1,
          choices: [
            {
              id: 1,
              label: 'Select',
            },
            {
              id: 0,
              label: 'Unselect',
            },
          ],
        },
      ],
      callback: (event) => {
        const { screenId, enable } = event.options;
        instance.log('debug', JSON.stringify(event.options));
        if (enable === 1 && !instance.selectedScreenList.includes(screenId)) {
          instance.selectedScreenList.push(screenId);
        }
        if (enable === 0) {
          instance.selectedScreenList = instance.selectedScreenList.filter((item) => item !== screenId);
        }
        instance.checkFeedbacks("screen_selected");
      },
    },
    // 选择图层
    select_layer: {
      name: 'Select Layer',
      description:
        'Select a layer (screen and layer display, without affecting operations performed on other terminals).',
      options: [
        {
          type: 'dropdown',
          name: 'Screen Layer',
          label: 'Screen Layer',
          id: 'combineId',
          default: layerListDropDown[0]?.id ?? null,
          choices: layerListDropDown,
        },
        {
          type: 'dropdown',
          name: 'Layer Select',
          label: 'Layer Select',
          id: 'enable',
          default: 1,
          choices: [
            {
              id: 1,
              label: 'Select',
            },
            {
              id: 0,
              label: 'Unselect',
            },
          ],
        },
      ],
      callback: (event) => {
        const { enable } = event.options;
        const [screenId, layerId] = event.options.combineId.split('_').map((item) => Number(item));
        instance.log('debug', JSON.stringify(event.options));
        if (enable) {
          instance.selectedLayerInfo = { layerId, screenId };
        }
        if (enable === 0) {
          instance.selectedLayerInfo = null;
        }
        instance.checkFeedbacks("layer_selected");
      },
    },
    // 加载场景
    load_preset: {
      name: 'Preset',
      description: 'Read the screen list and preset list of each screen. Preset loading is allowed.',
      options: [
        {
          type: 'dropdown',
          name: 'Preset',
          label: 'Preset',
          id: 'combineId',
          default: presetDropDown[0]?.id ?? null,
          choices: presetDropDown,
        },
      ],
      callback: (event) => {
        const { combineId } = event.options;
        instance.log('debug', JSON.stringify(event.options));
        const [screenId, presetId] = combineId.split('_').map((item) => Number(item));
        instance.selectedPresetInfo = { screenId, presetId };
        instance.checkFeedbacks("preset_loaded");
        if (!instance.connectStatus) return;
        const command = handleParams(ACTIONS_CMD.load_preset, {
          screenId,
          presetId,
        });
        instance.safeSend(command);
      },
    },
    // 发送命令
    send_command: {
      name: 'Send Command',
      description: 'You can send a custom command',
      options: [
        {
          type: 'textinput',
          name: 'command',
          label: 'Command',
          id: 'command',
          default: DEFAULT_COMMAND,
          requiredExpression: true,
        },
      ],
      callback: (event) => {
        const {
          options: { command },
        } = event;
        if (!instance.connectStatus) return;
        try {
          const params = Buffer.from(command);
          instance.safeSend(params);
        } catch (error) {
          instance.log('error', 'send command error');
        }
      },
    },
    play_preset_collection: {
      name: 'Preset group',
      description:
        'Read the preset group list of the selected screen. Select a preset group to load it. (Once loaded, the screen with presets saved in the preset group is selected.',
      options: [
        {
          type: 'dropdown',
          label: 'Preset Collection',
          name: 'Preset Collection',
          id: 'presetCollectionId',
          default: presetCollectionListDropDown[0]?.id ?? null,
          choices: presetCollectionListDropDown,
        },
      ],
      callback: async (action) => {
        const { presetCollectionId } = action.options;
        instance.selectedPresetCollectionId = presetCollectionId;
        instance.checkFeedbacks("preset_group_selected");
        if (!instance.connectStatus) return;
        applyPresetCollection(instance, { presetCollectionId });
      },
    },
    pgm_pvw_switch: {
      name: 'PGM/PVW',
      description: 'Switch to PGM/PVW mode for the selected screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Model',
          id: 'enNonTime',
          default: 0,
          choices: [
            {
              id: 0,
              label: 'PGM',
            },
            {
              id: 1,
              label: 'PVW',
            },
          ],
        },
      ],
      callback: async (action) => {
        const { enNonTime } = action.options;
        const isPgm = enNonTime === 0;
        instance.pgmOrPvwActive = {
          pgmActive: isPgm,
          pvwActive: !isPgm,
          takeActive: false,
        };
        instance.checkFeedbacks("pgm_pvw_switch");
        if (!instance.connectStatus) return;
        instance.selectedScreenList?.forEach((_screenId) => {
          applyPgmOrPvw(instance, {
            enNonTime,
            manualPlay: 0,
            screenId: _screenId,
          });
        });
      },
    },
    take_switch: {
      name: 'Take',
      description: 'Press Take button to take the content to the screen in PVW mode.',
      options: [
        {
          type: 'dropdown',
          name: 'Take Select',
          label: 'Take Select',
          id: 'manualPlay',
          default: 1,
          choices: [
            {
              id: 1,
              label: 'Select',
            },
            {
              id: 0,
              label: 'Unselect',
            },
          ],
        },
      ],
      callback: async (action) => {
        if (!instance.pgmOrPvwActive.pvwActive) return;
        const { manualPlay } = action.options;
        instance.pgmOrPvwActive.takeActive = manualPlay === 1;
        instance.checkFeedbacks("pvw_take_selected");
        if (!instance.connectStatus) return;
        instance.selectedScreenList?.forEach((_screenId) => {
          applyPgmOrPvw(instance, {
            enNonTime: 1,
            manualPlay,
            screenId: _screenId,
          });
        });
      },
    },
    apply_ftb: {
      name: 'FTB',
      description: 'On/Off; make the selected screen go black.',
      options: [
        {
          type: 'dropdown',
          label: 'FTB',
          name: 'FTB',
          id: 'type',
          default: 0,
          choices: [
            {
              id: 0,
              label: 'FTB',
            },
            {
              id: 1,
              label: 'unFTB',
            },
          ],
        },
      ],
      callback: async (action) => {
        const { type } = action.options;
        instance.ftb = !type;
        // ENHANCED: Optimistic update for per-screen FTB
        instance.selectedScreenList?.forEach((screenId) => {
          instance.updateEnhancedFromAction(screenId, 'ftb', !type);
        });
        instance.checkFeedbacks("ftb_selected", "ftb_direct");
        if (!instance.connectStatus) return;
        if (!instance.selectedScreenList?.length) return;
        const param = instance.selectedScreenList.map((screenId) => ({ type, screenId }));
        blackScreen(instance, param);
      },
    },
    apply_volume_switch: {
      name: 'Volume Switch',
      description: 'On/Off; turn on or turn off the audio of the selected screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Switch',
          name: 'Switch',
          id: 'isMute',
          default: 0,
          choices: [
            {
              id: 0,
              label: 'open',
            },
            {
              id: 1,
              label: 'close',
            },
          ],
        },
      ],
      callback: async (action) => {
        const { isMute } = action.options;
        instance.volumeMute = !isMute;
        instance.checkFeedbacks("volume_switch_selected");
        if (!instance.connectStatus) return;
        if (!instance.selectedScreenList?.length) return;
        const resList = [];
        //音量批量下发只生效一个，所以需要遍历下发
        const requests = [];
        instance.selectedScreenList?.forEach((screenId) => {
          requests.push(
            {
              cmd: ACTIONS_CMD.apply_screen_details,
              params: { param0: 0, param1: screenId },
            },
            {
              cmd: ACTIONS_CMD.volume_switch,
              processParams: (results, idx) => {
                const detailRes = results[idx - 1]?.data || {};
                return {
                  isMute,
                  screenId,
                  volume: detailRes?.audio?.volume ?? 0,
                };
              },
            },
          );
        });
        sendUDPRequestsSync(instance, requests);
      },
    },
    /** 屏幕冻结 */
    screen_frz_toggle: {
      name: 'Freeze',
      description: 'On/Off; freeze the selected screen.',
      options: [
        {
          type: 'dropdown',
          name: 'Freeze',
          label: 'Freeze',
          id: 'enable',
          default: 1,
          choices: [
            {
              id: 1,
              label: 'On',
            },
            {
              id: 0,
              label: 'Off',
            },
          ],
        },
      ],
      callback: async (action) => {
        const { enable } = action.options;
        instance.log('debug', enable);
        instance.screenFRZState = enable;
        // ENHANCED: Optimistic update for per-screen freeze
        instance.selectedScreenList?.forEach((screenId) => {
          instance.updateEnhancedFromAction(screenId, 'frozen', enable === 1);
        });
        instance.checkFeedbacks("screen_frz", "frozen_direct");
        if (!instance.connectStatus) return;
        if (instance.selectedScreenList.length === 0) {
          instance.log('error', 'Please select a screen');
          return;
        }
        instance.selectedScreenList.forEach((screenId) => {
          instance.log('debug', { screenId, enable });
          instance.safeSend(handleParams(ACTIONS_CMD.screen_frz, { screenId, enable }));
        });
      },
    },
    screen_volume_add: {
      name: 'Screen Volume Add',
      description: 'Increase the volume of the selected screen.',
      callback: () => {
        if (!instance.connectStatus) return;
        instance.selectedScreenList?.forEach((screenId) => {
          const curScreenDetails = instance.screenList.find((screen) => screen.screenId === screenId)?.details;
          if (!curScreenDetails) return;
          let volume = curScreenDetails.audio.volume;
          volume = Math.min(volume + 1, 100);
          curScreenDetails.audio.volume = volume;
          const command = handleParams(ACTIONS_CMD.apply_screen_volume, {
            screenId,
            volume: volume,
            isMute: 0,
          });
          instance.safeSend(command);
        });
      },
    },
    screen_volume_minus: {
      name: 'Screen Volume Minus',
      description: 'Decrease the volume of the selected screen.',
      callback: () => {
        if (!instance.connectStatus) return;
        instance.selectedScreenList?.forEach((screenId) => {
          const curScreenDetails = instance.screenList.find((screen) => screen.screenId === Number(screenId))?.details;
          if (!curScreenDetails) return;
          let volume = curScreenDetails.audio.volume;
          volume = Math.max(volume - 1, 0);
          curScreenDetails.audio.volume = volume;
          const command = handleParams(ACTIONS_CMD.apply_screen_volume, {
            screenId,
            volume: volume,
            isMute: 0,
          });
          instance.safeSend(command);
        });
      },
    },
    screen_brightness_add: {
      name: 'Screen Brightness Add',
      description: 'Increase the brightness of the screen loaded by the selected sending card.',
      callback: () => {
        instance.selectedScreenList?.forEach((screenId) => {
          const curScreenDetails = instance.screenList.find((screen) => screen.screenId === screenId)?.details;
          if (!curScreenDetails) return;
          let brightness = curScreenDetails.brightness;
          brightness = Math.min(brightness + 1, 100);
          curScreenDetails.brightness = brightness;
          // ENHANCED: Optimistic update for per-screen brightness
          instance.updateEnhancedFromAction(screenId, 'brightness', brightness);
          if (!instance.connectStatus) return;
          const command = handleParams(ACTIONS_CMD.apply_screen_brightness, {
            screenId,
            brightness: brightness,
          });
          instance.safeSend(command);
        });
      },
    },
    screen_brightness_minus: {
      name: 'Screen Brightness Minus',
      description: 'Decrease the brightness of the screen loaded by the selected sending card.',
      callback: () => {
        instance.selectedScreenList?.forEach((screenId) => {
          const curScreenDetails = instance.screenList.find((screen) => screen.screenId === screenId)?.details;
          if (!curScreenDetails) return;
          let brightness = curScreenDetails.brightness;
          brightness = Math.max(brightness - 1, 0);
          curScreenDetails.brightness = brightness;
          // ENHANCED: Optimistic update for per-screen brightness
          instance.updateEnhancedFromAction(screenId, 'brightness', brightness);
          if (!instance.connectStatus) return;
          const command = handleParams(ACTIONS_CMD.apply_screen_brightness, {
            screenId,
            brightness: brightness,
          });
          instance.safeSend(command);
        });
      },
    },
    // Direct Brightness Increase - per screen
    brightness_add_direct: {
      name: 'Brightness + (Direct)',
      description: 'Increase brightness by 1% on a specific screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
      ],
      callback: async (event) => {
        const screenId = event.options.screenId;
        const curScreenDetails = instance.screenList?.find((screen) => screen.screenId === screenId)?.details;
        if (!curScreenDetails) return;
        const brightness = Math.min(curScreenDetails.brightness + 1, 100);
        curScreenDetails.brightness = brightness;
        instance.updateEnhancedFromAction(screenId, 'brightness', brightness);
        if (!instance.connectStatus) return;
        const command = handleParams(ACTIONS_CMD.apply_screen_brightness, { screenId, brightness });
        instance.safeSend(command);
      },
    },
    // Direct Brightness Decrease - per screen
    brightness_minus_direct: {
      name: 'Brightness - (Direct)',
      description: 'Decrease brightness by 1% on a specific screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
      ],
      callback: async (event) => {
        const screenId = event.options.screenId;
        const curScreenDetails = instance.screenList?.find((screen) => screen.screenId === screenId)?.details;
        if (!curScreenDetails) return;
        const brightness = Math.max(curScreenDetails.brightness - 1, 0);
        curScreenDetails.brightness = brightness;
        instance.updateEnhancedFromAction(screenId, 'brightness', brightness);
        if (!instance.connectStatus) return;
        const command = handleParams(ACTIONS_CMD.apply_screen_brightness, { screenId, brightness });
        instance.safeSend(command);
      },
    },
    // Set absolute brightness (W0410) with variable support
    set_brightness: {
      name: 'Set Brightness',
      description: 'Set the brightness of the selected screen to an absolute value (0-100). Supports variables.',
      options: [
        {
          type: 'dropdown',
          name: 'Screen',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
        {
          type: 'textinput',
          name: 'Brightness (0-100)',
          label: 'Brightness (0-100)',
          id: 'brightness',
          default: '100',
          useVariables: true,
        },
      ],
      callback: async (event) => {
        const screenId = event.options.screenId;
        const brightnessRaw = String(event.options.brightness);
        const brightness = Math.max(0, Math.min(100, Math.round(Number(brightnessRaw))));
        if (isNaN(brightness)) {
          instance.log('warn', `set_brightness: invalid brightness value "${event.options.brightness}"`);
          return;
        }
        // Update local state
        const curScreenDetails = instance.screenList?.find((screen) => screen.screenId === screenId)?.details;
        if (curScreenDetails) {
          curScreenDetails.brightness = brightness;
        }
        // ENHANCED: Optimistic update for per-screen brightness
        instance.updateEnhancedFromAction(screenId, 'brightness', brightness);
        if (!instance.connectStatus) return;
        const command = handleParams(ACTIONS_CMD.apply_screen_brightness, {
          screenId,
          brightness,
        });
        instance.safeSend(command);
      },
    },
    // Save current brightness to LED receiving card hardware (W0417)
    save_brightness: {
      name: 'Save Brightness',
      description: 'Save the current screen brightness to the LED receiving card hardware. No brightness parameter needed.',
      options: [
        {
          type: 'dropdown',
          name: 'Screen',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
      ],
      callback: (event) => {
        const screenId = event.options.screenId;
        if (!instance.connectStatus) return;
        const command = handleParams(ACTIONS_CMD.save_screen_brightness, {
          screenId,
        });
        instance.safeSend(command);
      },
    },
    // ==================== Direct per-screen actions ====================
    // These target a specific screen directly without needing select_screen first.

    // Direct Freeze (W040A) - per screen
    freeze_direct: {
      name: 'Freeze (Direct)',
      description: 'Enable or disable freeze on a specific screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
        {
          type: 'dropdown',
          label: 'State',
          id: 'state',
          default: 1,
          choices: [
            { id: 1, label: 'Enable' },
            { id: 0, label: 'Disable' },
          ],
        },
      ],
      callback: async (event) => {
        const screenId = event.options.screenId;
        const state = parseInt(event.options.state);
        instance.updateEnhancedFromAction(screenId, 'frozen', state === 1);
        if (!instance.connectStatus) return;
        instance.safeSend(handleParams(ACTIONS_CMD.screen_frz, { screenId, enable: state }));
      },
    },
    // Direct FTB (W0409) - per screen
    ftb_direct: {
      name: 'FTB (Direct)',
      description: 'Enable or disable Fade to Black on a specific screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
        {
          type: 'dropdown',
          label: 'State',
          id: 'state',
          default: 1,
          choices: [
            { id: 1, label: 'Enable' },
            { id: 0, label: 'Disable' },
          ],
        },
      ],
      callback: async (event) => {
        const screenId = event.options.screenId;
        const state = parseInt(event.options.state);
        // FTB inverted logic: type 0 = FTB on, type 1 = FTB off
        instance.updateEnhancedFromAction(screenId, 'ftb', state === 1);
        if (!instance.connectStatus) return;
        const command = handleParams(ACTIONS_CMD.black_screen, {
          screenId,
          type: state === 1 ? 0 : 1,
        });
        instance.safeSend(command);
      },
    },
    // Direct BKG (W040B) - per screen
    bkg_direct: {
      name: 'BKG (Direct)',
      description: 'Enable or disable background on a specific screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
        {
          type: 'dropdown',
          label: 'State',
          id: 'state',
          default: 1,
          choices: [
            { id: 1, label: 'Enable' },
            { id: 0, label: 'Disable' },
          ],
        },
      ],
      callback: async (event) => {
        const screenId = event.options.screenId;
        const state = parseInt(event.options.state);
        instance.updateEnhancedFromAction(screenId, 'bkg', state === 1);
        if (!instance.connectStatus) return;
        const params = { screenId, enable: state, bkgId: 0 };
        instance.safeSend(handleParams(ACTIONS_CMD.bkg_switch, params));
      },
    },
    // Direct OSD (W040C) - per screen
    osd_direct: {
      name: 'OSD (Direct)',
      description: 'Enable or disable OSD on a specific screen.',
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
        {
          type: 'dropdown',
          label: 'State',
          id: 'state',
          default: 1,
          choices: [
            { id: 1, label: 'Enable' },
            { id: 0, label: 'Disable' },
          ],
        },
      ],
      callback: async (event) => {
        const screenId = event.options.screenId;
        const state = parseInt(event.options.state);
        instance.updateEnhancedFromAction(screenId, 'osdText', state === 1);
        instance.updateEnhancedFromAction(screenId, 'osdImage', state === 1);
        if (!instance.connectStatus) return;
        const params = { screenId, Osd: { enable: state } };
        instance.safeSend(handleParams(ACTIONS_CMD.osd_switch, params));
      },
    },
    /** 图层冻结 */
    layer_frz_toggle: {
      name: 'Layer FRZ',
      description: 'On/Off; freeze the layer of the selected screen.',
      options: [
        {
          type: 'dropdown',
          name: 'Layer FRZ',
          label: 'Layer FRZ',
          id: 'enable',
          default: 1,
          choices: [
            {
              id: 1,
              label: 'On',
            },
            {
              id: 0,
              label: 'Off',
            },
          ],
        },
      ],
      callback: async (action) => {
        const { enable } = action.options;
        instance.log('debug', action.options);
        instance.layerFRZState = enable;
        instance.checkFeedbacks("layer_frz");
        if (!instance.connectStatus) return;
        if (!instance.selectedLayerInfo) {
          instance.log('error', 'Please select a layer');
          return;
        }
        instance.safeSend(
          handleParams(ACTIONS_CMD.layer_frz, {
            layerId: instance.selectedLayerInfo.layerId,
            screenId: instance.selectedLayerInfo.screenId,
            enable,
          }),
        );
      },
    },
    source_switch: {
      name: 'Source',
      description:
        'Invoke the command to switch the selected source to that of the selected layer displayed on the selected screen.',
      options: [
        {
          type: 'dropdown',
          name: 'Source List',
          label: 'Source List',
          id: 'id',
          default: sourceListDropDown[0]?.id ?? null,
          choices: sourceListDropDown,
        },
      ],
      callback: async (action) => {
        const { id } = action.options;
        const source = instance.sourceList?.find((_item) => id === `${_item.inputId}_${_item.cropId}`);
        instance.selectedSourceId = id;
        instance.checkFeedbacks("source_switch_selected");
        if (!instance.connectStatus) return;
        if (!source || !instance.selectedLayerInfo) return;
        instance.safeSend(
          handleParams(ACTIONS_CMD.source_switch, {
            inputId: source.inputId,
            sourceType: source.sourceType,
            interfaceType: source.interfaceType,
            slotId: source.slotId,
            templateId: 0,
            cropId: source.cropId,
            streamId: source.streamId,
            screenId: instance.selectedLayerInfo.screenId,
            layerId: instance.selectedLayerInfo.layerId,
          }),
        );
      },
    },
    test_pattern_switch: {
      name: 'Test Pattern',
      description: 'On/Off; turn on or turn off the test pattern for the selected screen.',
      options: [
        {
          type: 'dropdown',
          label: 'testPattern',
          name: 'testPattern',
          id: 'testPattern',
          default: TEST_PATTERN_TYPE.OPEN,
          choices: [
            {
              id: TEST_PATTERN_TYPE.OPEN,
              label: 'open',
            },
            {
              id: TEST_PATTERN_TYPE.CLOSE,
              label: 'close',
            },
          ],
        },
      ],
      callback: async (action) => {
        const { testPattern } = action.options;
        instance.testPattern = testPattern === TEST_PATTERN_TYPE.OPEN;
        // ENHANCED: Optimistic update for per-screen test pattern
        instance.selectedScreenList?.forEach((screenId) => {
          instance.updateEnhancedFromAction(screenId, 'testPattern', testPattern === TEST_PATTERN_TYPE.OPEN);
        });
        instance.checkFeedbacks("test_pattern_selected", "test_pattern_direct");
        if (!instance.connectStatus) return;
        //目前的协议只支持遍历通过接口修改测试画面，后续协议支持按照屏幕修改后调整
        for (const screenId of instance.selectedScreenList) {
          const requests = [];
          let validInterfaces = [];
          requests.push(
            {
              cmd: ACTIONS_CMD.apply_screen_details,
              params: { param0: 0, param1: screenId },
            },
            {
              cmd: ACTIONS_CMD.get_output_details,
              processParams: (results, idx) => {
                const detail = results[idx - 1]?.data || {};
                // 遍历 screenInterfaces 找到 outputId 不是 255 的项
                validInterfaces = detail?.outputMode?.screenInterfaces?.filter(
                  (screenInterface) => screenInterface.outputId !== 255,
                );
                //查询某一个接口的详情，用于下发的bright、grid、speed回填参数
                const outputId = validInterfaces[0]?.outputId;
                return {
                  param0: 0,
                  param1: outputId,
                };
              },
            },
            {
              cmd: ACTIONS_CMD.test_pattern_switch,
              processParams: (results, idx) => {
                const detail = results[idx - 1]?.data || {};
                return validInterfaces.map((item) => ({
                  bright: detail?.testPattern?.bright,
                  grid: detail?.testPattern?.grid,
                  outputId: item.outputId,
                  speed: detail?.testPattern?.speed,
                  testPattern,
                }));
              },
            },
          );
          await sendUDPRequestsSync(instance, requests);
        }
      },
    },
    bkg_switch: {
      name: 'BKG',
      description: 'On/Off; turn on or turn off the BKG function for the selected screen.',
      options: [
        {
          type: 'dropdown',
          name: 'BKG Status',
          label: 'BKG Status',
          id: 'enable',
          default: 1,
          choices: [
            {
              id: 1,
              label: 'On',
            },
            {
              id: 0,
              label: 'Off',
            },
          ],
        },
      ],
      callback: (action) => {
        const { enable } = action.options;
        instance.bkgEnable = !!enable;
        // ENHANCED: Optimistic update for per-screen BKG
        instance.selectedScreenList?.forEach((screenId) => {
          instance.updateEnhancedFromAction(screenId, 'bkg', !!enable);
        });
        instance.checkFeedbacks("bkg_switch", "bkg_direct");
        if (!instance.connectStatus) return;
        if (!instance.selectedScreenList?.length) return;
        const requests = [];
        instance.selectedScreenList?.forEach((screenId) => {
          requests.push(
            {
              cmd: ACTIONS_CMD.apply_screen_details,
              params: { param0: 0, param1: screenId },
            },
            {
              cmd: ACTIONS_CMD.bkg_switch,
              processParams: (results, idx) => {
                const detailRes = results[idx - 1]?.data || {};
                return {
                  screenId,
                  enable,
                  bkgId: detailRes.Bkg?.bkgId ?? 0,
                };
              },
            },
          );
        });
        sendUDPRequestsSync(instance, requests);
      },
    },
    osd_switch: {
      name: 'OSD',
      description: 'On/Off; turn on or turn off the OSD function for the selected screen.',
      options: [
        {
          type: 'dropdown',
          name: 'OSD Status',
          label: 'OSD Status',
          id: 'enable',
          default: 1,
          choices: [
            {
              id: 1,
              label: 'On',
            },
            {
              id: 0,
              label: 'Off',
            },
          ],
        },
        {
          type: 'dropdown',
          name: 'OSD Type',
          label: 'OSD Type',
          id: 'osdType',
          default: 'text',
          choices: [
            {
              id: 'text',
              label: 'OSD Text',
            },
            {
              id: 'image',
              label: 'OSD Image',
            },
          ],
        },
      ],
      callback: (action) => {
        const { enable, osdType } = action.options;
        if (osdType === 'image') {
          instance.imgOsdEnable = !!enable;
        } else {
          instance.textOsdEnable = !!enable;
        }
        // ENHANCED: Optimistic update for per-screen OSD
        const prop = osdType === 'image' ? 'osdImage' : 'osdText';
        instance.selectedScreenList?.forEach((screenId) => {
          instance.updateEnhancedFromAction(screenId, prop, !!enable);
        });
        instance.checkFeedbacks("osd_switch", "osd_text_direct", "osd_image_direct");
        if (!instance.connectStatus) return;
        if (!instance.selectedScreenList?.length) return;
        const requests = [];
        instance.selectedScreenList?.forEach((screenId) => {
          requests.push(
            {
              cmd: ACTIONS_CMD.apply_screen_details,
              params: { param0: 0, param1: screenId },
            },
            {
              cmd: ACTIONS_CMD.osd_switch,
              processParams: (results, idx) => {
                const detailRes = results[idx - 1]?.data || {};
                return {
                  ...(osdType === 'image' ? detailRes.OsdImage : detailRes.Osd),
                  enable,
                  screenId,
                };
              },
            },
          );
        });
        sendUDPRequestsSync(instance, requests);
      },
    },
    // Global blackout on all screens (W0700)
    blackout: {
      name: 'Blackout',
      description: 'Enable or disable blackout on all screens.',
      options: [
        {
          type: 'dropdown',
          name: 'State',
          label: 'State',
          id: 'state',
          default: 1,
          choices: [
            { id: 1, label: 'Enable' },
            { id: 0, label: 'Disable' },
          ],
        },
      ],
      callback: (event) => {
        const state = parseInt(event.options.state);
        if (!instance.connectStatus) return;
        const command = handleParams(ACTIONS_CMD.blackout, {
          blackout: state,
        });
        instance.safeSend(command);
      },
    },
  };
};
