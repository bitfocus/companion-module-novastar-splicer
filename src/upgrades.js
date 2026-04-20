import { OLD_ACTION_TO_NEW, OLD_FEEDBACK_TO_NEW } from '../utils/constant.js';

export const UpgradeScripts = [
  /*
   * Place your upgrade scripts here
   * Remember that once it has been added it cannot be removed!
   */
  function (context, props) {
    const { actions, feedbacks } = props;
    const result = {
      updatedConfig: null,
      updatedActions: [],
      updatedFeedbacks: [],
    };
    for (const action of actions) {
      if (OLD_ACTION_TO_NEW[action.actionId]) {
        action.actionId = OLD_ACTION_TO_NEW[action.actionId];
        // Handle both old plain values and new { isExpression, value } shape
        if (action.options.deviceId && typeof action.options.deviceId === 'object') {
          action.options.deviceId.value = 0;
        } else {
          action.options.deviceId = { isExpression: false, value: 0 };
        }
        result.updatedActions.push(action);
      }
    }
    for (const feedback of feedbacks) {
      if (OLD_FEEDBACK_TO_NEW[feedback.feedbackId]) {
        feedback.feedbackId = OLD_FEEDBACK_TO_NEW[feedback.feedbackId];
        result.updatedFeedbacks.push(feedback);
      }
    }
    return result;
  },
  // Migrate from offline_mode checkbox to host-based offline detection
  function (_context, props) {
    const result = {
      updatedConfig: null,
      updatedActions: [],
      updatedFeedbacks: [],
    };

    if (props.config) {
      const config = props.config;

      // If old offline_mode was enabled and a host was set,
      // clear the host so the module stays in offline mode
      if (config.offline_mode === true && config.host) {
        result.updatedConfig = {
          ...config,
          host: '',
        };
        delete result.updatedConfig.offline_mode;
      } else if (config.offline_mode !== undefined) {
        // Just remove the old offline_mode field
        result.updatedConfig = { ...config };
        delete result.updatedConfig.offline_mode;
      }
    }

    return result;
  },
];
