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
        text: `Select\\n$(${MODULE_NAME}:screen_${screenId + 1})`,
        size: '18',
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
          text: `$(${MODULE_NAME}:screen_${screenId + 1})\n$(${MODULE_NAME}:screen_${screenId + 1}_layer_${layerId + 1})`,
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
        category: `Presets: ${name}`,
        name: presetName,
        style: {
          text: `$(${MODULE_NAME}:screen_${screenId + 1})\n$(${MODULE_NAME}:screen_${screenId + 1}_preset_${presetId + 1})`,
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
        text: `$({MODULE_NAME}:presetCollectionId_${presetCollectionId + 1})`,
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
        down: [{ actionId: 'apply_volume_switch', options: { isMute: 0 } }],
      },
      {
        down: [{ actionId: 'apply_volume_switch', options: { isMute: 1 } }],
      },
    ],
    feedbacks: [
      {
        feedbackId: 'volume_switch_selected',
        style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
      },
    ],
  };
  const freezeScreen = {
    type: 'button',
    category: 'Display',
    name: 'Freeze',
    style: {
      text: 'Freeze',
      size: 'auto',
      color: combineRgb(255, 255, 255),
      bgcolor: combineRgb(0, 0, 0),
    },
    feedbacks: [
      {
        feedbackId: 'screen_frz',
        style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0) },
      },
    ],
    steps: [
      { down: [{ actionId: 'screen_frz_toggle', options: { enable: 1 } }] },
      { down: [{ actionId: 'screen_frz_toggle', options: { enable: 0 } }] },
    ],
  };
  const volumeAdd = {
    type: 'button',
    category: 'Display',
    name: 'Volume Add',
    style: { text: 'Volume\n+', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_volume_add', options: {} }] }],
    feedbacks: [],
  };
  const volumeMinus = {
    name: 'Volume Minus',
    type: 'button',
    category: 'Display',
    style: { text: 'Volume\n-', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_volume_minus', options: {} }] }],
    feedbacks: [],
  };
  const brightnessAdd = {
    type: 'button',
    category: 'Display',
    name: 'Brightness Add',
    style: { text: 'Brightness\n+', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_brightness_add', options: {} }] }],
    feedbacks: [],
  };
  const brightnessMinus = {
    name: 'Brightness Minus',
    type: 'button',
    category: 'Display',
    style: { text: 'Brightness\n-', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_brightness_minus', options: {} }] }],
    feedbacks: [],
  };
  const freezeLayer = {
    type: 'button',
    category: 'Display',
    name: 'Layer FRZ',
    style: { text: 'Layer\nFRZ', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    feedbacks: [
      { feedbackId: 'layer_frz', style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0) } },
    ],
    steps: [
      { down: [{ actionId: 'layer_frz_toggle', options: { enable: 1 } }] },
      { down: [{ actionId: 'layer_frz_toggle', options: { enable: 0 } }] },
    ],
  };
  const testPattern = {
    type: 'button',
    category: 'Display',
    name: 'Test Pattern',
    style: { text: 'Test\nPattern', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.OPEN } }] },
      { down: [{ actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.CLOSE } }] },
    ],
    feedbacks: [
      { feedbackId: 'test_pattern_selected', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };
  const bkgSwitch = {
    type: 'button',
    category: 'Display',
    name: 'BKG',
    style: { text: 'BKG', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'bkg_switch', options: { enable: 1 } }] },
      { down: [{ actionId: 'bkg_switch', options: { enable: 0 } }] },
    ],
    feedbacks: [
      { feedbackId: 'bkg_switch', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };
  const osdTextSwitch = {
    type: 'button',
    category: 'Display',
    name: 'OSD Text',
    style: { text: 'OSD\nText', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'osd_switch', options: { enable: 1, osdType: 'text' } }] },
      { down: [{ actionId: 'osd_switch', options: { enable: 0, osdType: 'text' } }] },
    ],
    feedbacks: [
      {
        feedbackId: 'osd_switch',
        options: { osdType: 'text' },
        style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
      },
    ],
  };
  const osdImageSwitch = {
    type: 'button',
    category: 'Display',
    name: 'OSD Image',
    style: { text: 'OSD\nImage', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'osd_switch', options: { enable: 1, osdType: 'image' } }] },
      { down: [{ actionId: 'osd_switch', options: { enable: 0, osdType: 'image' } }] },
    ],
    feedbacks: [
      {
        feedbackId: 'osd_switch',
        options: { osdType: 'image' },
        style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
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
        text: `$({MODULE_NAME}:source_${inputId + 1}_${cropId})`,
        size: '12',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        {
          down: [{ actionId: 'source_switch', options: { id: `${inputId}_${cropId}` } }],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'source_switch_selected',
          options: { id: `${inputId}_${cropId}` },
          style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
        },
      ],
    };
    sourceList[`source_${inputId}_${cropId}`] = source;
  });
  return sourceList;
};

// ==================== ENHANCED: Per-screen direct control presets ====================

/** Generate per-screen control presets (FTB, Freeze, BKG, OSD, Test Pattern) */
const getPerScreenControlPresets = (instance) => {
  const presets = {};

  instance.screenList?.forEach((screen) => {
    const { name, screenId } = screen;
    const category = `Control: ${name}`;

    // Per-screen FTB toggle
    presets[`direct_ftb_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} FTB`,
      style: { text: `${name}\nFTB`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'ftb_direct', options: { screenId, state: 1 } }] },
        { down: [{ actionId: 'ftb_direct', options: { screenId, state: 0 } }] },
      ],
      feedbacks: [
        { feedbackId: 'ftb_direct', options: { screenId }, style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(255, 255, 255) } },
      ],
    };

    // Per-screen Freeze toggle
    presets[`direct_freeze_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} Freeze`,
      style: { text: `${name}\nFreeze`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'freeze_direct', options: { screenId, state: 1 } }] },
        { down: [{ actionId: 'freeze_direct', options: { screenId, state: 0 } }] },
      ],
      feedbacks: [
        { feedbackId: 'frozen_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 0, 255), color: combineRgb(255, 255, 255) } },
      ],
    };

    // Per-screen BKG toggle
    presets[`direct_bkg_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} BKG`,
      style: { text: `${name}\nBKG`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'bkg_direct', options: { screenId, state: 1 } }] },
        { down: [{ actionId: 'bkg_direct', options: { screenId, state: 0 } }] },
      ],
      feedbacks: [
        { feedbackId: 'bkg_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    // Per-screen OSD Text toggle
    presets[`direct_osd_text_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} OSD Text`,
      style: { text: `${name}\nOSD Text`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 1 } }] },
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 0 } }] },
      ],
      feedbacks: [
        { feedbackId: 'osd_text_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    // Per-screen OSD Image toggle
    presets[`direct_osd_image_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} OSD Image`,
      style: { text: `${name}\nOSD Img`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 1 } }] },
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 0 } }] },
      ],
      feedbacks: [
        { feedbackId: 'osd_image_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    // Per-screen Test Pattern toggle
    presets[`direct_test_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} Test Pattern`,
      style: { text: `${name}\nTest`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.OPEN } }] },
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.CLOSE } }] },
      ],
      feedbacks: [
        { feedbackId: 'test_pattern_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    // Per-screen PGM/PVW
    presets[`direct_pgm_pvw_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} PGM/PVW`,
      style: { text: `${name}\nPGM/PVW`, size: '14', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'pgm_pvw_switch', options: { enNonTime: 0 } }] },
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'pgm_pvw_switch', options: { enNonTime: 1 } }] },
      ],
      feedbacks: [
        { feedbackId: 'pgm_pvw_switch', options: { type: PGM_PVW_TYPE.PGM }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0), text: `${name}\nPGM` } },
        { feedbackId: 'pgm_pvw_switch', options: { type: PGM_PVW_TYPE.PVW }, style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0), text: `${name}\nPVW` } },
      ],
    };

    // Per-screen Take
    presets[`direct_take_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} Take`,
      style: { text: `${name}\nTake`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'take_switch', options: { manualPlay: 1 } }] },
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'take_switch', options: { manualPlay: 0 } }] },
      ],
      feedbacks: [
        { feedbackId: 'pvw_take_selected', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };
  });

  // Blackout (global - all screens)
  presets['blackout_global'] = {
    type: 'button',
    category: 'Display',
    name: 'Blackout',
    style: { text: 'Blackout', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'blackout', options: { state: 1 } }] },
      { down: [{ actionId: 'blackout', options: { state: 0 } }] },
    ],
    feedbacks: [],
  };

  return presets;
};

/** Generate per-screen brightness presets (common levels + increment/decrement) */
const getPerScreenBrightnessPresets = (instance) => {
  const presets = {};
  const levels = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0];

  instance.screenList?.forEach((screen) => {
    const { name, screenId } = screen;
    const category = `Brightness: ${name}`;

    // Brightness level presets
    levels.forEach((pct) => {
      presets[`direct_bright_${screenId}_${pct}`] = {
        type: 'button',
        category,
        name: `${name} ${pct}%`,
        style: {
          text: `${name}\n${pct}%`,
          size: 'auto',
          color: combineRgb(255, 255, 255),
          bgcolor: combineRgb(0, 0, 0),
        },
        steps: [
          {
            down: [
              { actionId: 'set_brightness', options: { screenId, brightness: pct.toString() } },
              { actionId: 'save_brightness', options: { screenId }, delay: 100 },
            ],
          },
        ],
        feedbacks: [
          {
            feedbackId: 'brightness_match',
            options: { screenId, brightness: String(pct) },
            style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
          },
        ],
      };
    });

    // Brightness increment
    presets[`direct_bright_up_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} Brightness +`,
      style: {
        text: `${name}\nBright +`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        {
          down: [
            { actionId: 'brightness_add_direct', options: { screenId } },
          ],
        },
      ],
      feedbacks: [],
    };

    // Brightness decrement
    presets[`direct_bright_down_${screenId}`] = {
      type: 'button',
      category,
      name: `${name} Brightness -`,
      style: {
        text: `${name}\nBright -`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        {
          down: [
            { actionId: 'brightness_minus_direct', options: { screenId } },
          ],
        },
      ],
      feedbacks: [],
    };
  });

  return presets;
};

export const getPresetDefinitions = function (instance) {
  const { screenPresets, layerPresets, presetPresets } = getSLPPresets(instance.screenList);
  return {
    // Original v3.0.2 presets (presets now per-screen categories)
    ...screenPresets,
    ...layerPresets,
    ...presetPresets,
    ...getPresetCollectionsPresets(instance),
    ...getSourceListPresets(instance),
    ...applyScreenPreset(),
    // Enhanced per-screen direct presets
    ...getPerScreenControlPresets(instance),
    ...getPerScreenBrightnessPresets(instance),
  };
};
