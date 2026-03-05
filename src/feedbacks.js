import { combineRgb } from '@companion-module/base';
import { PGM_PVW_TYPE } from '../utils/constant.js';
import formatDropDownData from '../utils/formatDropDown.js';

export const getFeedbacks = (instance) => {
  const { presetCollectionListDropDown, sourceListDropDown, presetDropDown, screenListDropDown, layerListDropDown } =
    formatDropDownData(instance);

  // ENHANCED: Build screen choices for direct feedbacks from live screenList
  const screenChoices = instance.screenList?.map((s) => ({
    id: s.screenId,
    label: s.name,
  })) || [];

  return {
    // ==================== ORIGINAL v3.0.2 FEEDBACKS ====================
    screen_selected: {
      type: 'boolean',
      name: 'Select Screen',
      description: 'Update button style when the screen is selected.',
      options: [
        {
          type: 'dropdown',
          name: 'Select Screen',
          label: 'Select Screen',
          id: 'screenId',
          default: screenListDropDown[0]?.id ?? null,
          choices: screenListDropDown,
        },
      ],
      callback: (event) => instance.selectedScreenList && instance.selectedScreenList.includes(event.options.screenId),
    },
    layer_selected: {
      type: 'boolean',
      name: 'Select Layer',
      description: 'Update button style when the layer is selected.',
      options: [
        {
          type: 'dropdown',
          name: 'Select Layer',
          label: 'Select Layer',
          id: 'combineId',
          default: layerListDropDown[0]?.id ?? null,
          choices: layerListDropDown,
        },
      ],
      callback: (event) => {
        const [screenId, layerId] = event.options.combineId.split('_').map((item) => Number(item));
        return (
          instance.selectedLayerInfo &&
          instance.selectedLayerInfo.screenId === screenId &&
          instance.selectedLayerInfo.layerId === layerId
        );
      },
    },
    screen_frz: {
      type: 'boolean',
      name: 'Freeze Screen',
      description: 'Update button style when the selected screen is frozen.',
      callback: () => instance.screenFRZState === 1,
    },
    layer_frz: {
      type: 'boolean',
      name: 'Freeze Layer',
      description: 'Update button style when the selected layer is frozen.',
      callback: () => instance.layerFRZState === 1,
    },
    pgm_pvw_switch: {
      type: 'boolean',
      name: 'PGM/PVW Status Detection',
      description: 'Update button style on PGM/PVW change.',
      options: [
        {
          type: 'dropdown',
          label: 'Model',
          id: 'type',
          default: PGM_PVW_TYPE.PGM,
          choices: [
            {
              id: PGM_PVW_TYPE.PGM,
              label: 'PGM',
            },
            {
              id: PGM_PVW_TYPE.PVW,
              label: 'PVW',
            },
          ],
        },
      ],
      callback: (event) =>
        (instance.pgmOrPvwActive.pgmActive && event.options.type === PGM_PVW_TYPE.PGM) ||
        (instance.pgmOrPvwActive.pvwActive && event.options.type === PGM_PVW_TYPE.PVW),
    },
    pvw_take_selected: {
      type: 'boolean',
      name: 'Take Status Detection',
      description: 'TUpdate button style when Take is selected.',
      callback: () => instance.pgmOrPvwActive.takeActive && instance.pgmOrPvwActive.pvwActive,
    },
    preset_group_selected: {
      type: 'boolean',
      name: 'Preset Group Selection Detection',
      description: 'Update button style when the new preset group is loaded.',
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
      callback: (event) => instance.selectedPresetCollectionId === event.options.presetCollectionId,
    },
    source_switch_selected: {
      type: 'boolean',
      name: 'Input Source Selection Detection',
      description: 'Update button style when the new preset group is loaded.',
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
      callback: (event) => instance.selectedSourceId === event.options.id,
    },
    ftb_selected: {
      type: 'boolean',
      name: 'FTB Status Detection',
      description: 'Update button style on FTB status change.',
      callback: () => instance.ftb,
    },
    volume_switch_selected: {
      type: 'boolean',
      name: 'Volume On/Off Status Detection',
      description: 'Update button style on volume status change.',
      callback: () => instance.volumeMute,
    },
    test_pattern_selected: {
      type: 'boolean',
      name: 'Test Pattern On/Off Status Detection',
      description: 'Update button style on test pattern status change.',
      callback: () => instance.testPattern,
    },
    bkg_switch: {
      type: 'boolean',
      name: 'BKG Status Detection',
      description: 'Update button style when BKG status is selected.',
      defaultStyle: {
        bgcolor: combineRgb(0, 255, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [],
      callback: () => instance.bkgEnable,
    },
    osd_switch: {
      type: 'boolean',
      name: 'OSD Status Detection',
      description: 'Update button style when OSD status is selected.',
      defaultStyle: {
        bgcolor: combineRgb(0, 255, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'dropdown',
          label: 'OSD Type',
          id: 'osdType',
          default: 'text',
          choices: [
            { id: 'text', label: 'OSD Text' },
            { id: 'image', label: 'OSD Image' },
          ],
        },
      ],
      callback: (feedback) => {
        if (feedback.options.osdType === 'image') {
          return instance.imgOsdEnable;
        } else {
          return instance.textOsdEnable;
        }
      },
    },
    preset_loaded: {
      type: 'boolean',
      name: 'Load Preset',
      description: 'Update button style when the preset is loaded.',
      options: [
        {
          type: 'dropdown',
          label: 'Load Preset',
          name: 'Load Preset',
          id: 'combineId',
          default: presetDropDown[0]?.id ?? null,
          choices: presetDropDown,
        },
      ],
      callback: (event) => {
        const [screenId, presetId] = event.options.combineId.split('_').map((item) => Number(item));
        return (
          instance.selectedPresetInfo &&
          instance.selectedPresetInfo.screenId === screenId &&
          instance.selectedPresetInfo.presetId === presetId
        );
      },
    },

    // ==================== ENHANCED: Direct per-screen feedbacks ====================

    frozen_direct: {
      type: 'boolean',
      name: 'Screen Frozen (Direct)',
      description: 'Shows frozen state for a specific screen without requiring screen selection.',
      defaultStyle: {
        bgcolor: combineRgb(0, 0, 255),
        color: combineRgb(255, 255, 255),
      },
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenChoices[0]?.id ?? 0,
          choices: screenChoices,
        },
      ],
      callback: (event) => {
        const state = instance.enhancedState.screens[event.options.screenId];
        return state ? state.frozen : false;
      },
    },
    ftb_direct: {
      type: 'boolean',
      name: 'FTB (Direct)',
      description: 'Shows FTB state for a specific screen without requiring screen selection.',
      defaultStyle: {
        bgcolor: combineRgb(255, 0, 0),
        color: combineRgb(255, 255, 255),
      },
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenChoices[0]?.id ?? 0,
          choices: screenChoices,
        },
      ],
      callback: (event) => {
        const state = instance.enhancedState.screens[event.options.screenId];
        return state ? state.ftb : false;
      },
    },
    bkg_direct: {
      type: 'boolean',
      name: 'BKG (Direct)',
      description: 'Shows BKG state for a specific screen without requiring screen selection.',
      defaultStyle: {
        bgcolor: combineRgb(0, 255, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenChoices[0]?.id ?? 0,
          choices: screenChoices,
        },
      ],
      callback: (event) => {
        const state = instance.enhancedState.screens[event.options.screenId];
        return state ? state.bkg : false;
      },
    },
    osd_text_direct: {
      type: 'boolean',
      name: 'OSD Text (Direct)',
      description: 'Shows OSD Text state for a specific screen without requiring screen selection.',
      defaultStyle: {
        bgcolor: combineRgb(0, 255, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenChoices[0]?.id ?? 0,
          choices: screenChoices,
        },
      ],
      callback: (event) => {
        const state = instance.enhancedState.screens[event.options.screenId];
        return state ? state.osdText : false;
      },
    },
    osd_image_direct: {
      type: 'boolean',
      name: 'OSD Image (Direct)',
      description: 'Shows OSD Image state for a specific screen without requiring screen selection.',
      defaultStyle: {
        bgcolor: combineRgb(0, 255, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenChoices[0]?.id ?? 0,
          choices: screenChoices,
        },
      ],
      callback: (event) => {
        const state = instance.enhancedState.screens[event.options.screenId];
        return state ? state.osdImage : false;
      },
    },
    brightness_match: {
      type: 'boolean',
      name: 'Brightness Match (Direct)',
      description: 'True when a specific screen brightness matches the target value.',
      defaultStyle: {
        bgcolor: combineRgb(255, 255, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenChoices[0]?.id ?? 0,
          choices: screenChoices,
        },
        {
          type: 'textinput',
          label: 'Brightness (0-100)',
          id: 'brightness',
          default: '100',
          useVariables: true,
        },
      ],
      callback: (event) => {
        const state = instance.enhancedState.screens[event.options.screenId];
        return state ? Number(state.brightness) === Number(event.options.brightness) : false;
      },
    },
    test_pattern_direct: {
      type: 'boolean',
      name: 'Test Pattern (Direct)',
      description: 'Shows test pattern state for a specific screen without requiring screen selection.',
      defaultStyle: {
        bgcolor: combineRgb(0, 255, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'dropdown',
          label: 'Screen',
          id: 'screenId',
          default: screenChoices[0]?.id ?? 0,
          choices: screenChoices,
        },
      ],
      callback: (event) => {
        const state = instance.enhancedState.screens[event.options.screenId];
        return state ? state.testPattern : false;
      },
    },
  };
};
