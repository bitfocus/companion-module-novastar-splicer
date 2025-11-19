import { OLD_ACTION_TO_NEW } from '../utils/constant.js';

export const upgradeScripts = [
  /*
   * Place your upgrade scripts here
   * Remember that once it has been added it cannot be removed!
   */
  function (context, props) {
    const { actions } = props;
    const result = {
      updatedConfig: null,
      updatedActions: [],
      updatedFeedbacks: [],
    };
    for (const action of actions) {
      if (OLD_ACTION_TO_NEW[action.actionId]) {
        action.actionId = OLD_ACTION_TO_NEW[action.actionId];
        action.options.deviceId = 0;
        result.updatedActions.push(action);
      }
    }

    return result;
  },
];
