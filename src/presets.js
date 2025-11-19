import { combineRgb } from '@companion-module/base';
import { MODULE_NAME, PGM_PVW_TYPE, TEST_PATTERN_TYPE } from '../utils/constant.js';

/** 屏幕、图层、场景预设 */
const getSLPPresets = (screenList) => {
  /** 选中屏幕 */
  const screenPresets = {};
  /** 选中图层 */
  const layerPresets = {};
  /** 加载场景 */
  const presetPresets = {};
  screenList?.forEach((screen) => {
    const { name, screenId } = screen;
    const selectScreenPreset = {
      type: 'button',
      category: 'Screen',
      name: name,
      style: {
        text: `$(${MODULE_NAME}:screenId_${screenId})`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      feedbacks: [
        {
          feedbackId: 'screen_selected',
          options: { screenId: screenId },
          style: {
            bgcolor: combineRgb(0, 255, 0), // 选中时高亮绿色
            color: combineRgb(0, 0, 0), // 选中时字体黑色
          },
        },
      ],
      steps: [
        {
          down: [
            {
              actionId: 'select_screen',
              options: {
                screenId: screenId,
                enable: 1,
              },
            },
          ],
        },
        {
          down: [
            {
              actionId: 'select_screen',
              options: {
                screenId: screenId,
                enable: 0,
              },
            },
          ],
        },
      ],
    };
    screenPresets[`screen ${screenId}`] = selectScreenPreset;

    screen.layers?.forEach((layer) => {
      const { name: layerName, layerId } = layer;
      const selectLayerPreset = {
        type: 'button',
        category: 'Layer',
        name: layerName,
        style: {
          text: `$(${MODULE_NAME}:screenId_${screenId})\n$(${MODULE_NAME}:screenId_${screenId}_layerId_${layerId})`,
          size: 'auto',
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(0, 0, 0),
        },
        feedbacks: [
          {
            feedbackId: 'layer_selected',
            options: { combineId: `${screenId}_${layerId}` },
            style: {
              bgcolor: combineRgb(0, 255, 0), // 选中时高亮绿色
              color: combineRgb(0, 0, 0), // 选中时字体黑色
            },
          },
        ],
        steps: [
          {
            down: [
              {
                actionId: 'select_layer',
                options: {
                  combineId: `${screenId}_${layerId}`,
                  screenId: screenId,
                  enable: 1,
                },
              },
            ],
          },
          {
            down: [
              {
                actionId: 'select_layer',
                options: {
                  combineId: `${screenId}_${layerId}`,
                  screenId: screenId,
                  enable: 0,
                },
              },
            ],
          },
        ],
      };
      layerPresets[`layer_${screenId}_${layerId}`] = selectLayerPreset;
    });
    screen.presets?.forEach((preset) => {
      const { name: presetName, presetId } = preset;
      const selectPresetPreset = {
        type: 'button',
        category: 'Preset',
        name: presetName,
        style: {
          text: `$(${MODULE_NAME}:screenId_${screenId})\n$(${MODULE_NAME}:screenId_${screenId}_presetId_${presetId})`,
          size: 'auto',
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(0, 0, 0),
        },
        feedbacks: [
          {
            feedbackId: 'preset_loaded',
            options: { combineId: `${screenId}_${presetId}` },
            style: {
              bgcolor: combineRgb(0, 255, 0),
              color: combineRgb(0, 0, 0),
            },
          },
        ],
        steps: [
          {
            down: [
              {
                actionId: 'load_preset',
                options: {
                  combineId: `${screenId}_${presetId}`,
                  screenId: screenId,
                },
              },
            ],
          },
        ],
      };
      presetPresets[`preset_${screenId}_${presetId}`] = selectPresetPreset;
    });
  });

  return {
    screenPresets,
    layerPresets,
    presetPresets,
  };
};

/** 组合场景 */
const getPresetCollectionsPresets = (instance) => {
  const presetCollections = {};
  instance.presetCollectionList?.forEach(({ name, presetCollectionId }) => {
    const presetCollection = {
      type: 'button',
      category: 'Preset Group',
      name: name,
      style: {
        text: `$({MODULE_NAME}:presetCollectionId_${presetCollectionId})`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        {
          down: [
            {
              actionId: 'play_preset_collection',
              options: {
                presetCollectionId,
              },
            },
          ],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'preset_group_selected',
          options: { presetCollectionId },
          style: {
            bgcolor: combineRgb(0, 255, 0),
            color: combineRgb(0, 0, 0),
          },
        },
      ],
    };
    presetCollections[`preset_group ${presetCollectionId}`] = presetCollection;
  });
  return presetCollections;
};

/** 屏幕应用*/
const applyScreenPreset = () => {
  // 实时模式 PGM
  const pgmOrPvwSwitch = {
    type: 'button',
    category: 'Display',
    name: 'PGM/PVW',
    style: {
      text: 'PGM/PVW',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'pgm_pvw_switch',
            options: {
              //非实时模式开关，0：不使能，1：使能；
              enNonTime: 0,
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'pgm_pvw_switch',
            options: {
              enNonTime: 1,
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'pgm_pvw_switch',
        options: { type: PGM_PVW_TYPE.PGM },
        style: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
          text: 'PGM',
        },
      },
      {
        feedbackId: 'pgm_pvw_switch',
        options: { type: PGM_PVW_TYPE.PVW },
        style: {
          bgcolor: combineRgb(255, 0, 0),
          color: combineRgb(0, 0, 0),
          text: 'PVW',
        },
      },
    ],
  };
  // 上屏 Take
  const takeApply = {
    type: 'button',
    category: 'Display',
    name: 'Take',
    style: {
      text: 'Take',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'take_switch',
            options: {
              //手动上屏的开关，1：开 0:关闭
              manualPlay: 1,
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'take_switch',
            options: {
              manualPlay: 0,
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'pvw_take_selected',
        style: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
        },
      },
    ],
  };
  //黑屏
  const blackScreen = {
    type: 'button',
    category: 'Display',
    name: 'FTB',
    style: {
      text: 'FTB',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'apply_ftb',
            options: {
              // 亮屏或者黑屏[0：黑屏，1：亮屏]
              type: 0,
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'apply_ftb',
            options: {
              type: 1,
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'ftb_selected',
        style: {
          bgcolor: combineRgb(255, 0, 0),
          color: combineRgb(0, 0, 0),
        },
      },
    ],
  };
  // 音频开关
  const volumeSwitch = {
    type: 'button',
    category: 'Display',
    name: 'Volume Switch',
    style: {
      text: 'Volume Switch',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'apply_volume_switch',
            options: {
              isMute: 0,
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'apply_volume_switch',
            options: {
              isMute: 1,
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'volume_switch_selected',
        style: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
        },
      },
    ],
  };
  /** 屏幕冻结 */
  const freezeScreen = {
    type: 'button',
    category: 'Display',
    name: 'Screen FRZ',
    style: {
      text: 'Screen\nFRZ',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    feedbacks: [
      {
        feedbackId: 'screen_frz',
        style: {
          bgcolor: combineRgb(255, 0, 0), // 选中时高亮红色
          color: combineRgb(0, 0, 0), // 选中时字体黑色
        },
      },
    ],
    steps: [
      {
        down: [
          {
            actionId: 'screen_frz_toggle',
            options: {
              enable: 1,
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'screen_frz_toggle',
            options: {
              enable: 0,
            },
          },
        ],
      },
    ],
  };
  const volumeAdd = {
    type: 'button',
    category: 'Display',
    name: 'Volume Add',
    style: {
      text: 'Volume\n+',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'screen_volume_add',
            options: {},
          },
        ],
      },
    ],
    feedbacks: [],
  };
  // 音量-
  const volumeMinus = {
    name: 'Volume Minus',
    type: 'button',
    category: 'Display',
    style: {
      text: 'Volume\n-',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'screen_volume_minus',
            options: {},
          },
        ],
      },
    ],
    feedbacks: [],
  };
  // 亮度+
  const brightnessAdd = {
    type: 'button',
    category: 'Display',
    name: 'Brightness Add',
    style: {
      text: 'Brightness\n+',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'screen_brightness_add',
            options: {},
          },
        ],
      },
    ],
    feedbacks: [],
  };
  // 亮度-
  const brightnessMinus = {
    name: 'Brightness Minus',
    type: 'button',
    category: 'Display',
    style: {
      text: 'Brightness\n-',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'screen_brightness_minus',
            options: {},
          },
        ],
      },
    ],
    feedbacks: [],
  };

  /** 图层冻结 */
  const freezeLayer = {
    type: 'button',
    category: 'Display',
    name: 'Layer FRZ',
    style: {
      text: 'Layer\nFRZ',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    feedbacks: [
      {
        feedbackId: 'layer_frz',
        style: {
          bgcolor: combineRgb(255, 0, 0), // 选中时高亮红色
          color: combineRgb(0, 0, 0), // 选中时字体黑色
        },
      },
    ],
    steps: [
      {
        down: [
          {
            actionId: 'layer_frz_toggle',
            options: { enable: 1 },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'layer_frz_toggle',
            options: { enable: 0 },
          },
        ],
      },
    ],
  };

  /**测试画面开关 */
  const testPattern = {
    type: 'button',
    category: 'Display',
    name: 'Test Pattern',
    style: {
      text: 'Test\nPattern',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'test_pattern_switch',
            options: {
              //开
              testPattern: TEST_PATTERN_TYPE.OPEN,
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'test_pattern_switch',
            options: {
              //关
              testPattern: TEST_PATTERN_TYPE.CLOSE,
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'test_pattern_selected',
        style: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
        },
      },
    ],
  };

  // BKG开关
  const bkgSwitch = {
    type: 'button',
    category: 'Display',
    name: 'BKG',
    style: {
      text: 'BKG',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'bkg_switch',
            options: {
              enable: 1,
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'bkg_switch',
            options: {
              enable: 0,
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'bkg_switch',
        style: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
        },
      },
    ],
  };

  // OSD Text开关
  const osdTextSwitch = {
    type: 'button',
    category: 'Display',
    name: 'OSD Text',
    style: {
      text: 'OSD\nText',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'osd_switch',
            options: {
              enable: 1,
              osdType: 'text',
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'osd_switch',
            options: {
              enable: 0,
              osdType: 'text',
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'osd_switch',
        options: { osdType: 'text' },
        style: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
        },
      },
    ],
  };

  // OSD Image开关
  const osdImageSwitch = {
    type: 'button',
    category: 'Display',
    name: 'OSD Image',
    style: {
      text: 'OSD\nImage',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    steps: [
      {
        down: [
          {
            actionId: 'osd_switch',
            options: {
              enable: 1,
              osdType: 'image',
            },
          },
        ],
      },
      {
        down: [
          {
            actionId: 'osd_switch',
            options: {
              enable: 0,
              osdType: 'image',
            },
          },
        ],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'osd_switch',
        options: { osdType: 'image' },
        style: {
          bgcolor: combineRgb(0, 255, 0),
          color: combineRgb(0, 0, 0),
        },
      },
    ],
  };

  return {
    pgmOrPvwSwitch,
    take_apply: takeApply,
    black_screen: blackScreen,
    volume_switch: volumeSwitch,
    freezeScreen,
    freezeLayer,
    volume_add: volumeAdd,
    volume_minus: volumeMinus,
    brightness_add: brightnessAdd,
    brightness_minus: brightnessMinus,
    testPattern,
    bkgSwitch,
    osdTextSwitch,
    osdImageSwitch,
  };
};

/** 输入源列表 */
const getSourceListPresets = (instance) => {
  const sourceList = {};
  instance.sourceList?.forEach(({ name, inputId, cropId }) => {
    const source = {
      type: 'button',
      category: 'Source List',
      name,
      style: {
        text: `$({MODULE_NAME}:source_${inputId}_${cropId})`,
        size: '12',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        {
          down: [
            {
              actionId: 'source_switch',
              options: {
                id: `${inputId}_${cropId}`,
              },
            },
          ],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'source_switch_selected',
          options: {
            id: `${inputId}_${cropId}`,
          },
          style: {
            bgcolor: combineRgb(0, 255, 0),
            color: combineRgb(0, 0, 0),
          },
        },
      ],
    };
    sourceList[`source_${inputId}_${cropId}`] = source;
  });
  return sourceList;
};

export const getPresetDefinitions = function (instance) {
  // instance.log('info', JSON.stringify(instance.screenList));
  // instance.log('info', JSON.stringify(instance.sourceList));
  const { screenPresets, layerPresets, presetPresets } = getSLPPresets(instance.screenList);
  return {
    ...screenPresets,
    ...layerPresets,
    ...presetPresets,
    ...getPresetCollectionsPresets(instance),
    ...getSourceListPresets(instance),
    ...applyScreenPreset(),
  };
};
