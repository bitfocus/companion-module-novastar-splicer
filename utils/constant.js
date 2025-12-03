export const PRODUCTS_INFORMATION = 'This module will allow you to control the splicer';

export const ACTIONS_CMD = {
  /** 获取屏幕列表 */
  get_screen_list: 'R0400',
  /** 获取图层列表 */
  get_layer_list: 'R0500',
  /** 获取组合场景列表 */
  get_preset_collection_list: 'R0620',
  /** 应用组合场景列表 */
  apply_preset_collection_list: 'W0625',
  /** 应用PGM PVW 上屏 */
  apply_pgm_preset: 'W0412',
  /** 获取输入源列表 */
  get_input_list: 'R0200',
  /** 获取输入源列表 */
  get_input_list_simplify: 'R0226',
  /** 获取IPC输入源列表 */
  get_ipc_input_list: 'W0A00',
  /** 获取NDI输入源列表 */
  get_ndi_input_list: 'W0B03',
  /** 获取场景列表 */
  get_preset_list: 'R0600',
  /** 设置屏幕音量 */
  apply_screen_volume: 'W041C',
  /** R0401 屏幕详情 */
  apply_screen_details: 'R0401',
  /** 黑屏 */
  black_screen: 'W0409',
  /** 加载场景 */
  load_preset: 'W0605',
  /** 音量静音 */
  volume_switch: 'W041C',
  /** 屏幕冻结 */
  screen_frz: 'W040A',
  /** 图层冻结 */
  layer_frz: 'W0509',
  /** 屏幕亮度调节 */
  apply_screen_brightness: 'W0410',
  /**切源 */
  source_switch: 'W0506',
  /**输出列表 */
  get_output_list: 'R0300',
  /**测试画面开关 */
  test_pattern_switch: 'W0303',
  /**输出接口详情 */
  get_output_details: 'R0301',
  /** BKG开关 */
  bkg_switch: 'W040B',
  /** OSD开关 */
  osd_switch: 'W040C',
  /** 获取设备初始化状态 */
  get_device_init_status: 'R0118',
  /** 设备心跳协议 */
  device_heartbeat: 'W0120',
};

export const SCREEN_COUNT_H = 40;

export const PRESET_COUNT_H = 128;

export const FREEZE_CHOICES = [
  { label: 'Freeze', id: 1 },
  { label: 'Unfreeze', id: 0 },
];

export const FTB_CHOICES = [
  { label: 'FTB', id: 0 },
  { label: 'Cancel FTB', id: 1 },
];

export const DEFAULT_COMMAND = '[{"cmd":"W041A","screenId":1,"enable":0}]';

export const OLD_ACTION_TO_NEW = {
  // v2.0.0 -> v3.0.0 action ID mappings
  play_preset: 'load_preset',
  freeze: 'screen_frz_toggle',
  ftb: 'apply_ftb',
  brightness: 'screen_brightness_add', // Note: v2.0.0 brightness action mapped to brightness_add
};

export const OLD_FEEDBACK_TO_NEW = {
  // v2.0.0 -> v3.0.0 feedback ID mappings
  freeze: 'screen_frz',
  ftb: 'ftb_selected',
};

export const MODULE_NAME = 'companion-module-novastar-splicer';

/**屏幕模式 */
export const PGM_PVW_TYPE = {
  PGM: 0,
  PVW: 1,
  TAKE: 2,
};

/**测试画面开关 */
export const TEST_PATTERN_TYPE = {
  CLOSE: 65535,
  OPEN: 0,
};
