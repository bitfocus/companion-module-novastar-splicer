import { ACTIONS_CMD } from './constant.js';
import { handleParams } from './index.js';
/** 获取场景列表 */
export const getPresetList = (instance, screenId) => {
  instance.log('debug', 'getPresetList');
  const command = handleParams(ACTIONS_CMD['get_preset_list'], {
    param0: 0,
    param1: screenId,
    param2: 1,
    param3: 0,
  });
  instance.udp.send(command);
};
/** 获取屏幕列表 */
export const getScreenList = (instance) => {
  instance.log('debug', 'getScreenList');
  const command = handleParams(ACTIONS_CMD['get_screen_list']);
  instance.udp.send(command);
};
/** 获取图层列表 */
export const getLayerList = (instance, screenId) => {
  instance.log('debug', 'getLayer');
  const command = handleParams(ACTIONS_CMD['get_layer_list'], {
    param0: 0,
    param1: screenId,
  });
  instance.udp.send(command);
};

/** 获取场景组列表 */
export const getPresetCollectionList = (instance) => {
  instance.log('info', 'getPresetCollectionList');
  const command = handleParams(ACTIONS_CMD['get_preset_collection_list'], {
    param0: 0,
  });
  instance.udp.send(command);
};

/** 获取输入源列表 */
export const getInputList = (instance) => {
  instance.log('info', 'getInputList');
  const command = handleParams(ACTIONS_CMD['get_input_list'], {
    param0: 0,
    //1获取输入详情，0不获取
    param1: 1,
  });
  instance.udp.send(command);
};

/** 分页获取输入源列表，直到取完为止，返回合并的 inputs 数组 */
export const getInputListSimplify = async (instance) => {
  instance.log('info', 'getInputListSimplify');
  const command = handleParams(ACTIONS_CMD['get_input_list_simplify'], {
    param0: 0,
    param1: 0,
    param2: 0,
    param3: 0,
  });
  instance.udp.send(command);
};

/** 应用PGM PVW 上屏 */
export const applyPgmOrPvw = (instance, { enNonTime, manualPlay, screenId }) => {
  instance.log('info', 'applyPgmOrPvw');
  const command = handleParams(ACTIONS_CMD.apply_pgm_preset, {
    enNonTime,
    manualPlay,
    screenId,
  });
  instance.udp.send(command);
};

export const getScreenDetails = (instance, screenId) => {
  const command = handleParams(ACTIONS_CMD['apply_screen_details'], {
    param0: 0,
    param1: screenId,
  });
  instance.udp.send(command);
};

/** 应用场景组 */
export const applyPresetCollection = (instance, { presetCollectionId }) => {
  instance.log('info', 'applyPresetCollection');
  const command = handleParams(ACTIONS_CMD.apply_preset_collection_list, {
    presetCollectionId,
  });
  instance.udp.send(command);
};

/** 黑屏*/
export const blackScreen = (instance, param) => {
  instance.log('info', 'blackScreen');
  const command = handleParams(ACTIONS_CMD.black_screen, param);
  instance.udp.send(command);
};

/** 音量静音 */
export const volumeMute = (instance, params) => {
  instance.log('info', 'volumeMute');
  const command = handleParams(ACTIONS_CMD.volume_switch, params);
  instance.udp.send(command);
};

/**输出列表 */
export const getOutputList = (instance) => {
  instance.log('info', 'getOutputList');
  const command = handleParams(ACTIONS_CMD.get_output_list, {
    param0: 0,
    param1: 1,
  });
  instance.udp.send(command);
};

/**测试画面开关 */
export const testPatternSwitch = (instance, { bright, grid, outputId, speed, testPattern }) => {
  instance.log('info', 'testPatternSwitch');
  const command = handleParams(ACTIONS_CMD.test_pattern_switch, {
    bright,
    grid,
    outputId,
    speed,
    testPattern,
  });
  instance.udp.send(command);
};

/**输出接口详情 */
export const getOutputDetails = (instance, outputId) => {
  instance.log('info', 'getOutputDetails');
  const command = handleParams(ACTIONS_CMD.get_output_details, {
    outputId,
  });
  instance.udp.send(command);
};
