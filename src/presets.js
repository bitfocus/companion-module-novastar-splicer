import { combineRgb } from '@companion-module/base';
import { MODULE_NAME, PGM_PVW_TYPE, TEST_PATTERN_TYPE } from '../utils/constant.js';

// ============================================================================
// Screen-first preset layout with template groups
// ============================================================================

/** Build all preset definitions (flat map, keyed by unique ID) */
const buildAllPresets = (instance) => {
  const presets = {};

  // ---- Screen Selection presets (one per screen, stays simple) ----
  instance.screenList?.forEach((screen) => {
    const { name, screenId } = screen;
    presets[`screen_${screenId}`] = {
      type: 'simple',
      name,
      style: {
        text: `Select\\n$(${MODULE_NAME}:screen_${screenId + 1})`,
        size: '18',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      feedbacks: [
        {
          feedbackId: 'screen_selected',
          options: { screenId },
          style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
        },
      ],
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }], up: [] },
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 0 } }], up: [] },
      ],
    };
  });

  // ---- Template: Preset Recall (one template per screen) ----
  instance.screenList?.forEach((screen) => {
    const { screenId } = screen;
    presets[`tpl_preset_recall_${screenId}`] = {
      type: 'simple',
      name: 'Preset Recall',
      localVariables: [
        { variableName: 'presetIndex', variableType: 'simple', startupValue: 1 },
      ],
      style: {
        text: `$(${MODULE_NAME}:screen_${screenId + 1})\nPreset $(local:presetIndex)`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      feedbacks: [
        {
          feedbackId: 'preset_loaded',
          options: {
            combineId: { value: `concat('${screenId}_', $(local:presetIndex) - 1)`, isExpression: true },
          },
          style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
        },
      ],
      steps: [
        {
          down: [{
            actionId: 'load_preset',
            options: {
              combineId: { value: `concat('${screenId}_', $(local:presetIndex) - 1)`, isExpression: true },
              screenId,
            },
          }],
          up: [],
        },
      ],
    };
  });

  // ---- Template: Layer Selection (one template per screen) ----
  instance.screenList?.forEach((screen) => {
    const { screenId } = screen;
    presets[`tpl_layer_select_${screenId}`] = {
      type: 'simple',
      name: 'Layer Select',
      localVariables: [
        { variableName: 'layerIndex', variableType: 'simple', startupValue: 1 },
      ],
      style: {
        text: `$(${MODULE_NAME}:screen_${screenId + 1})\nLayer $(local:layerIndex)`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      feedbacks: [
        {
          feedbackId: 'layer_selected',
          options: {
            combineId: { value: `concat('${screenId}_', $(local:layerIndex) - 1)`, isExpression: true },
          },
          style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
        },
      ],
      steps: [
        {
          down: [{
            actionId: 'select_layer',
            options: {
              combineId: { value: `concat('${screenId}_', $(local:layerIndex) - 1)`, isExpression: true },
              screenId,
              enable: 1,
            },
          }],
          up: [],
        },
        {
          down: [{
            actionId: 'select_layer',
            options: {
              combineId: { value: `concat('${screenId}_', $(local:layerIndex) - 1)`, isExpression: true },
              screenId,
              enable: 0,
            },
          }],
          up: [],
        },
      ],
    };
  });

  // ---- Template: Brightness Level (one template per screen) ----
  instance.screenList?.forEach((screen) => {
    const { screenId } = screen;
    presets[`tpl_brightness_${screenId}`] = {
      type: 'simple',
      name: 'Brightness Level',
      localVariables: [
        { variableName: 'brightnessLevel', variableType: 'simple', startupValue: 100 },
      ],
      style: {
        text: `$(${MODULE_NAME}:screen_${screenId + 1})\n$(local:brightnessLevel)%`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      feedbacks: [
        {
          feedbackId: 'brightness_match',
          options: {
            screenId,
            brightness: { value: '$(local:brightnessLevel)', isExpression: true },
          },
          style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
        },
      ],
      steps: [
        {
          down: [
            {
              actionId: 'set_brightness',
              options: {
                screenId,
                brightness: { value: '$(local:brightnessLevel)', isExpression: true },
              },
            },
            {
              actionId: 'save_brightness',
              options: { screenId },
              delay: 100,
            },
          ],
          up: [],
        },
      ],
    };
  });

  // ---- Per-screen Brightness +/- (stays simple, not templatable) ----
  instance.screenList?.forEach((screen) => {
    const { name, screenId } = screen;

    presets[`direct_bright_up_${screenId}`] = {
      type: 'simple',
      name: `${name} Brightness +`,
      style: { text: `${name}\nBright +`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'screen_brightness_add', options: {} }], up: [] },
      ],
      feedbacks: [],
    };

    presets[`direct_bright_down_${screenId}`] = {
      type: 'simple',
      name: `${name} Brightness -`,
      style: { text: `${name}\nBright -`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'screen_brightness_minus', options: {} }], up: [] },
      ],
      feedbacks: [],
    };
  });

  // ---- Preset Collection (Group) presets ----
  instance.presetCollectionList?.forEach(({ name, presetCollectionId }) => {
    presets[`preset_group_${presetCollectionId}`] = {
      type: 'simple',
      name,
      style: {
        text: `$(${MODULE_NAME}:presetCollectionId_${presetCollectionId + 1})`,
        size: 'auto',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        { down: [{ actionId: 'play_preset_collection', options: { presetCollectionId } }], up: [] },
      ],
      feedbacks: [
        {
          feedbackId: 'preset_group_selected',
          options: { presetCollectionId },
          style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
        },
      ],
    };
  });

  // ---- Source List presets ----
  instance.sourceList?.forEach(({ name, inputId, cropId }) => {
    presets[`source_${inputId}_${cropId}`] = {
      type: 'simple',
      name,
      style: {
        text: `$(${MODULE_NAME}:source_${inputId + 1}_${cropId})`,
        size: '12',
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 0, 0),
      },
      steps: [
        { down: [{ actionId: 'source_switch', options: { id: `${inputId}_${cropId}` } }], up: [] },
      ],
      feedbacks: [
        {
          feedbackId: 'source_switch_selected',
          options: { id: `${inputId}_${cropId}` },
          style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) },
        },
      ],
    };
  });

  // ---- Global Display controls ----
  presets['pgm_pvw_switch'] = {
    type: 'simple',
    name: 'PGM/PVW',
    style: { text: 'PGM/PVW', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'pgm_pvw_switch', options: { enNonTime: 0 } }], up: [] },
      { down: [{ actionId: 'pgm_pvw_switch', options: { enNonTime: 1 } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'pgm_pvw_switch', options: { type: PGM_PVW_TYPE.PGM }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0), text: 'PGM' } },
      { feedbackId: 'pgm_pvw_switch', options: { type: PGM_PVW_TYPE.PVW }, style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0), text: 'PVW' } },
    ],
  };

  presets['take_apply'] = {
    type: 'simple',
    name: 'Take',
    style: { text: 'Take', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'take_switch', options: { manualPlay: 1 } }], up: [] },
      { down: [{ actionId: 'take_switch', options: { manualPlay: 0 } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'pvw_take_selected', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['ftb_global'] = {
    type: 'simple',
    name: 'FTB',
    style: { text: 'FTB', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'apply_ftb', options: { type: 0 } }], up: [] },
      { down: [{ actionId: 'apply_ftb', options: { type: 1 } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'ftb_selected', style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['volume_switch'] = {
    type: 'simple',
    name: 'Volume Switch',
    style: { text: 'Volume\nSwitch', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'apply_volume_switch', options: { isMute: 0 } }], up: [] },
      { down: [{ actionId: 'apply_volume_switch', options: { isMute: 1 } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'volume_switch_selected', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['screen_frz_global'] = {
    type: 'simple',
    name: 'Screen FRZ',
    style: { text: 'Screen\nFRZ', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'screen_frz_toggle', options: { enable: 1 } }], up: [] },
      { down: [{ actionId: 'screen_frz_toggle', options: { enable: 0 } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'screen_frz', style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['layer_frz_global'] = {
    type: 'simple',
    name: 'Layer FRZ',
    style: { text: 'Layer\nFRZ', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'layer_frz_toggle', options: { enable: 1 } }], up: [] },
      { down: [{ actionId: 'layer_frz_toggle', options: { enable: 0 } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'layer_frz', style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['volume_add'] = {
    type: 'simple',
    name: 'Volume +',
    style: { text: 'Volume\n+', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_volume_add', options: {} }], up: [] }],
    feedbacks: [],
  };

  presets['volume_minus'] = {
    type: 'simple',
    name: 'Volume -',
    style: { text: 'Volume\n-', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_volume_minus', options: {} }], up: [] }],
    feedbacks: [],
  };

  presets['brightness_add_global'] = {
    type: 'simple',
    name: 'Brightness +',
    style: { text: 'Brightness\n+', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_brightness_add', options: {} }], up: [] }],
    feedbacks: [],
  };

  presets['brightness_minus_global'] = {
    type: 'simple',
    name: 'Brightness -',
    style: { text: 'Brightness\n-', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [{ down: [{ actionId: 'screen_brightness_minus', options: {} }], up: [] }],
    feedbacks: [],
  };

  presets['test_pattern_global'] = {
    type: 'simple',
    name: 'Test Pattern',
    style: { text: 'Test\nPattern', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.OPEN } }], up: [] },
      { down: [{ actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.CLOSE } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'test_pattern_selected', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['bkg_global'] = {
    type: 'simple',
    name: 'BKG',
    style: { text: 'BKG', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'bkg_switch', options: { enable: 1 } }], up: [] },
      { down: [{ actionId: 'bkg_switch', options: { enable: 0 } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'bkg_switch', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['osd_text_global'] = {
    type: 'simple',
    name: 'OSD Text',
    style: { text: 'OSD\nText', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'osd_switch', options: { enable: 1, osdType: 'text' } }], up: [] },
      { down: [{ actionId: 'osd_switch', options: { enable: 0, osdType: 'text' } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'osd_switch', options: { osdType: 'text' }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  presets['osd_image_global'] = {
    type: 'simple',
    name: 'OSD Image',
    style: { text: 'OSD\nImage', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'osd_switch', options: { enable: 1, osdType: 'image' } }], up: [] },
      { down: [{ actionId: 'osd_switch', options: { enable: 0, osdType: 'image' } }], up: [] },
    ],
    feedbacks: [
      { feedbackId: 'osd_switch', options: { osdType: 'image' }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
    ],
  };

  // ---- Global Blackout ----
  presets['blackout_global'] = {
    type: 'simple',
    name: 'Blackout',
    style: { text: 'BLACKOUT', size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
    steps: [
      { down: [{ actionId: 'blackout', options: { state: 1 } }], up: [] },
      { down: [{ actionId: 'blackout', options: { state: 0 } }], up: [] },
    ],
    feedbacks: [],
  };

  // ---- Per-screen direct controls (not templatable - each is unique) ----
  instance.screenList?.forEach((screen) => {
    const { name, screenId } = screen;

    presets[`direct_pgm_pvw_${screenId}`] = {
      type: 'simple',
      name: `${name} PGM/PVW`,
      style: { text: `${name}\nPGM/PVW`, size: '14', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'pgm_pvw_switch', options: { enNonTime: 0 } }], up: [] },
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'pgm_pvw_switch', options: { enNonTime: 1 } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'pgm_pvw_switch', options: { type: PGM_PVW_TYPE.PGM }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0), text: `${name}\nPGM` } },
        { feedbackId: 'pgm_pvw_switch', options: { type: PGM_PVW_TYPE.PVW }, style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(0, 0, 0), text: `${name}\nPVW` } },
      ],
    };

    presets[`direct_take_${screenId}`] = {
      type: 'simple',
      name: `${name} Take`,
      style: { text: `${name}\nTake`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'take_switch', options: { manualPlay: 1 } }], up: [] },
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'take_switch', options: { manualPlay: 0 } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'pvw_take_selected', style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    presets[`direct_ftb_${screenId}`] = {
      type: 'simple',
      name: `${name} FTB`,
      style: { text: `${name}\nFTB`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'ftb_direct', options: { screenId, state: 1 } }], up: [] },
        { down: [{ actionId: 'ftb_direct', options: { screenId, state: 0 } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'ftb_direct', options: { screenId }, style: { bgcolor: combineRgb(255, 0, 0), color: combineRgb(255, 255, 255) } },
      ],
    };

    presets[`direct_freeze_${screenId}`] = {
      type: 'simple',
      name: `${name} Freeze`,
      style: { text: `${name}\nFreeze`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'freeze_direct', options: { screenId, state: 1 } }], up: [] },
        { down: [{ actionId: 'freeze_direct', options: { screenId, state: 0 } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'frozen_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 0, 255), color: combineRgb(255, 255, 255) } },
      ],
    };

    presets[`direct_bkg_${screenId}`] = {
      type: 'simple',
      name: `${name} BKG`,
      style: { text: `${name}\nBKG`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'bkg_direct', options: { screenId, state: 1 } }], up: [] },
        { down: [{ actionId: 'bkg_direct', options: { screenId, state: 0 } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'bkg_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    presets[`direct_osd_text_${screenId}`] = {
      type: 'simple',
      name: `${name} OSD Text`,
      style: { text: `${name}\nOSD Text`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 1 } }], up: [] },
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 0 } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'osd_text_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    presets[`direct_osd_image_${screenId}`] = {
      type: 'simple',
      name: `${name} OSD Image`,
      style: { text: `${name}\nOSD Img`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 1 } }], up: [] },
        { down: [{ actionId: 'osd_direct', options: { screenId, state: 0 } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'osd_image_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };

    presets[`direct_test_${screenId}`] = {
      type: 'simple',
      name: `${name} Test Pattern`,
      style: { text: `${name}\nTest`, size: 'auto', color: combineRgb(255, 255, 255), bgcolor: combineRgb(0, 0, 0) },
      steps: [
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.OPEN } }], up: [] },
        { down: [{ actionId: 'select_screen', options: { screenId, enable: 1 } }, { actionId: 'test_pattern_switch', options: { testPattern: TEST_PATTERN_TYPE.CLOSE } }], up: [] },
      ],
      feedbacks: [
        { feedbackId: 'test_pattern_direct', options: { screenId }, style: { bgcolor: combineRgb(0, 255, 0), color: combineRgb(0, 0, 0) } },
      ],
    };
  });

  return presets;
};

// ============================================================================
// STRUCTURE: Screen-first hierarchy with template groups
// ============================================================================

const buildStructure = (instance) => {
  const structure = [];
  const screens = instance.screenList || [];

  // Per-screen sections
  screens.forEach((screen) => {
    const { name, screenId } = screen;
    const groups = [];

    // Select Screen (simple - only one button)
    groups.push({
      id: `screen_${screenId}_select`,
      type: 'simple',
      name: 'Select Screen',
      keywords: ['select', 'screen'],
      presets: [`screen_${screenId}`],
    });

    // Preset Recall (template - one preset generates N buttons)
    const screenPresets = screen.presets || [];
    if (screenPresets.length > 0) {
      groups.push({
        id: `screen_${screenId}_presets`,
        type: 'template',
        name: 'Preset Recall',
        keywords: ['preset', 'recall', 'scene', 'load'],
        presetId: `tpl_preset_recall_${screenId}`,
        templateVariableName: 'presetIndex',
        templateValues: screenPresets.map((p) => ({
          name: p.name || `Preset ${p.presetId + 1}`,
          value: p.presetId + 1,
        })),
      });
    }

    // Layers (template - one preset generates N buttons)
    const screenLayers = screen.layers || [];
    if (screenLayers.length > 0) {
      groups.push({
        id: `screen_${screenId}_layers`,
        type: 'template',
        name: 'Layers',
        keywords: ['layer', 'select'],
        presetId: `tpl_layer_select_${screenId}`,
        templateVariableName: 'layerIndex',
        templateValues: screenLayers.map((l) => ({
          name: l.name || `Layer ${l.layerId + 1}`,
          value: l.layerId + 1,
        })),
      });
    }

    // Brightness (template for levels + simple for +/-)
    const brightnessLevels = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0];
    groups.push({
      id: `screen_${screenId}_brightness_levels`,
      type: 'template',
      name: 'Brightness Levels',
      keywords: ['brightness', 'dim', 'level', 'percent'],
      presetId: `tpl_brightness_${screenId}`,
      templateVariableName: 'brightnessLevel',
      templateValues: brightnessLevels.map((pct) => ({ name: `${pct}%`, value: pct })),
    });

    groups.push({
      id: `screen_${screenId}_brightness_adjust`,
      type: 'simple',
      name: 'Brightness Adjust',
      keywords: ['brightness', 'adjust', 'up', 'down'],
      presets: [
        `direct_bright_up_${screenId}`,
        `direct_bright_down_${screenId}`,
      ],
    });

    // Controls (simple - each is unique)
    groups.push({
      id: `screen_${screenId}_controls`,
      type: 'simple',
      name: 'Controls',
      keywords: ['pgm', 'pvw', 'take', 'ftb', 'freeze', 'background', 'osd', 'control'],
      presets: [
        `direct_pgm_pvw_${screenId}`,
        `direct_take_${screenId}`,
        `direct_ftb_${screenId}`,
        `direct_freeze_${screenId}`,
        `direct_bkg_${screenId}`,
        `direct_osd_text_${screenId}`,
        `direct_osd_image_${screenId}`,
      ],
    });

    // Test Pattern (simple - single button)
    groups.push({
      id: `screen_${screenId}_test_pattern`,
      type: 'simple',
      name: 'Test Pattern',
      keywords: ['test', 'pattern', 'test pattern', 'grid'],
      presets: [
        `direct_test_${screenId}`,
      ],
    });

    structure.push({
      id: `section_screen_${screenId}`,
      name: name,
      keywords: ['screen', `screen ${screenId + 1}`, name.toLowerCase()],
      definitions: groups,
    });
  });

  // Section: Global Display Controls
  structure.push({
    id: 'section_global',
    name: 'Global Display',
    keywords: ['global', 'display', 'transport', 'volume', 'brightness'],
    definitions: [
      {
        id: 'global_transport',
        type: 'simple',
        name: 'Transport',
        presets: ['pgm_pvw_switch', 'take_apply'],
      },
      {
        id: 'global_controls',
        type: 'simple',
        name: 'Controls',
        presets: [
          'ftb_global',
          'screen_frz_global',
          'layer_frz_global',
          'bkg_global',
          'osd_text_global',
          'osd_image_global',
        ],
      },
      {
        id: 'global_test_pattern',
        type: 'simple',
        name: 'Test Pattern',
        keywords: ['test', 'pattern', 'grid'],
        presets: ['test_pattern_global'],
      },
      {
        id: 'global_volume',
        type: 'simple',
        name: 'Volume',
        presets: ['volume_switch', 'volume_add', 'volume_minus'],
      },
      {
        id: 'global_brightness',
        type: 'simple',
        name: 'Brightness',
        presets: ['brightness_add_global', 'brightness_minus_global'],
      },
      {
        id: 'global_blackout',
        type: 'simple',
        name: 'Blackout',
        keywords: ['blackout', 'all', 'off'],
        presets: ['blackout_global'],
      },
    ],
  });

  // Section: Preset Groups (flat list)
  const groupIds = (instance.presetCollectionList || []).map((g) => `preset_group_${g.presetCollectionId}`);
  if (groupIds.length > 0) {
    structure.push({
      id: 'section_preset_groups',
      name: 'Preset Groups',
      definitions: groupIds,
    });
  }

  // Section: Source List (flat list)
  const sourceIds = (instance.sourceList || []).map((s) => `source_${s.inputId}_${s.cropId}`);
  if (sourceIds.length > 0) {
    structure.push({
      id: 'section_sources',
      name: 'Source List',
      definitions: sourceIds,
    });
  }

  return structure;
};

// ============================================================================
// EXPORT
// ============================================================================

export const getPresetDefinitions = function (instance) {
  const presets = buildAllPresets(instance);
  const structure = buildStructure(instance);
  return { structure, presets };
};
