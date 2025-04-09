import {
  FREEZE_CHOICES,
  FTB_CHOICES,
  DEFAULT_COMMAND,
} from "../utils/constant.js";
import { handleParams } from "../utils/index.js";

export const getActions = (instance) => {
  return {
    play_preset: {
      name: "Play Preset",
      description: "Select a screen and preset to load",
      options: [
        {
          type: "dropdown",
          id: "screenId",
          label: "Screen",
          default: instance.screenList[0].id,
          choices: instance.screenList,
          tooltip: "Please select a screen",
        },
        {
          type: "dropdown",
          label: "Preset",
          id: "presetId",
          default: instance.presetList[0].id,
          choices: instance.presetList,
        },
      ],
      callback: (event) => {
        const {
          actionId,
          options: { screenId, presetId },
        } = event;
        try {
          const params = handleParams(actionId, { screenId, presetId });
          instance.udp.send(params);
        } catch (error) {
          instance.log("error", "load preset error");
        }
      },
    },
    freeze: {
      name: "Freeze & Unfreeze",
      description: "Select a screen to freeze",
      options: [
        {
          type: "dropdown",
          label: "Screen",
          id: "screenId",
          default: instance.screenList[0].id,
          choices: instance.screenList,
          tooltip: "Please select a screen",
        },
        {
          type: "dropdown",
          id: "enable",
          label: "Enable",
          default: FREEZE_CHOICES[0].id,
          choices: FREEZE_CHOICES,
        },
      ],
      callback: (event) => {
        const {
          controlId,
          actionId,
          options: { screenId, enable },
        } = event;
        try {
          const params = handleParams(actionId, { screenId, enable });
          instance.udp.send(params);
          instance.freezeControlMap[controlId] = enable;
          instance.checkFeedbacks(actionId);
        } catch (error) {
          instance.log("error", `freeze error${String(error)}`);
        }
      },
    },
    ftb: {
      name: "FTB & Cancel FTB",
      description: "Select a screen to blacken",
      options: [
        {
          type: "dropdown",
          id: "screenId",
          label: "Screen",
          default: instance.screenList[0].id,
          choices: instance.screenList,
          tooltip: "Please select a screen",
        },
        {
          type: "dropdown",
          label: "Type",
          id: "type",
          default: FTB_CHOICES[0].id,
          choices: FTB_CHOICES,
        },
      ],
      callback: (event) => {
        const {
          controlId,
          actionId,
          options: { screenId, type },
        } = event;
        try {
          const params = handleParams(actionId, { screenId, type });
          instance.udp.send(params);
          instance.ftbControlMap[controlId] = type;
          instance.checkFeedbacks(actionId);
        } catch (error) {
          instance.log("error", `ftb send error${String(error)}`);
        }
      },
    },
    brightness: {
      name: "Brightness",
      description: "Select a screen to set brightness",
      options: [
        {
          type: "dropdown",
          label: "Screen",
          id: "screenId",
          default: instance.screenList[0].id,
          choices: instance.screenList,
          tooltip: "Please select a screen",
        },
        {
          type: "number",
          label: "Brightness",
          id: "brightness",
          default: 10,
          min: 0,
          max: 100,
          required: true,
          tooltip: "Please input brightness to set",
        },
      ],
      callback: (event) => {
        const {
          actionId,
          options: { screenId, brightness },
        } = event;
        try {
          const params = handleParams(actionId, { screenId, brightness });
          instance.udp.send(params);
        } catch (error) {
          instance.log("error", "brightness set error" + String(error));
        }
      },
    },
    send_command: {
      name: "Send Command",
      description: "You can send a custom command",
      options: [
        {
          type: "textinput",
          label: "Command",
          id: "command",
          default: DEFAULT_COMMAND,
          required: true,
        },
      ],
      callback: async (event) => {
        const {
          options: { command },
        } = event;
        try {
          var params = await instance.parseVariablesInString(command)
          params = Buffer.from(command);
          instance.udp.send(params);
        } catch (error) {
          instance.log("error", "send command error");
        }
      },
    },
  };
};
