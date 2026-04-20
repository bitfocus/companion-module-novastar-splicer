/** 生成协议的参数 */
export const handleParams = (cmd, params) => {
  if (Array.isArray(params)) {
    return Buffer.from(
      JSON.stringify(
        params.map((param) => {
          return { ...param, cmd, deviceId: 0 };
        }),
      ),
    );
  }
  return Buffer.from(JSON.stringify([{ ...params, cmd, deviceId: 0 }]));
};

/** 解析协议数据 */
export const decodeRes = (msg) => {
  try {
    const res = msg.toString();
    const { cmd, ack, ...data } = JSON.parse(res)[0];
    return {
      cmd,
      ack: Boolean(ack === 'Ok'),
      data,
    };
  } catch (error) {}
};

/** 通用的UDP请求Promise包装器 - 使用事件监听器 */
export const sendUDPRequest = (instance, cmd, params = {}) => {
  return new Promise((resolve, reject) => {
    const command = handleParams(cmd, params);

    // 设置超时处理
    const timeout = setTimeout(() => {
      // 清理事件监听器
      instance.removeListener('udp_response', responseHandler);
      reject(new Error(`UDP request timeout for command: ${cmd}`));
    }, 10000); // 10秒超时

    // 响应处理函数
    const responseHandler = (res) => {
      if (res.cmd === cmd) {
        clearTimeout(timeout);
        // 清理事件监听器
        instance.removeListener('udp_response', responseHandler);
        resolve(res);
      }
    };

    // 添加事件监听器
    instance.on('udp_response', responseHandler);

    // 发送UDP请求
    instance.safeSend(command);
  });
};

/** 串行执行多个UDP请求 */
export const sendUDPRequestsSync = async (instance, requests) => {
  const results = [];
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    try {
      // 如果请求有依赖处理函数，则使用它来处理参数
      let params = request.params;
      if (request.processParams && typeof request.processParams === 'function') {
        params = request.processParams(results, i);
      }

      const result = await sendUDPRequest(instance, request.cmd, params);
      results.push(result);

      // 可选：在请求之间添加延迟
      if (request.delay) {
        await new Promise((resolve) => setTimeout(resolve, request.delay));
      }
    } catch (error) {
      instance.log('error', `Serial UDP request failed at step ${i + 1}: ${error.message}`);
    }
  }
  return results;
};

/** 并行执行多个UDP请求 */
export const sendUDPRequestsAll = async (instance, requests) => {
  // 创建所有请求的 Promise
  const requestPromises = requests.map(async (request, index) => {
    try {
      // 如果请求有依赖处理函数，则使用它来处理参数
      let params = request.params;
      if (request.processParams && typeof request.processParams === 'function') {
        // 注意：并行模式下，processParams 无法访问之前的结果
        // 只能使用传入的初始数据或实例状态
        params = request.processParams([], index);
      }

      const result = await sendUDPRequest(instance, request.cmd, params);

      // 可选：在请求后添加延迟
      if (request.delay) {
        await new Promise((resolve) => setTimeout(resolve, request.delay));
      }

      return result;
    } catch (error) {
      instance.log('error', `Parallel UDP request failed at step ${index + 1}: ${error.message}`);
    }
  });

  // 并行执行所有请求
  return await Promise.all(requestPromises);
};

/** 生成屏幕的变量 */
export const formatScreenVariable = (list) => {
  const screenVariableDefinitions = {};
  const screenDefaultVariableValues = {};
  list.forEach((item) => {
    const variableId = `screen_${item.screenId + 1}`;
    screenVariableDefinitions[variableId] = { name: `Screen ${item.screenId + 1}` };
    screenDefaultVariableValues[variableId] = item.name;
  });
  return { screenVariableDefinitions, screenDefaultVariableValues };
};

/** 生成图层的变量 */
export const formatLayerVariable = (screenList) => {
  const layerVariableDefinitions = {};
  const layerDefaultVariableValues = {};
  screenList?.forEach((screen) => {
    (screen.layers || []).forEach((layer) => {
      const variableId = `screen_${screen.screenId + 1}_layer_${layer.layerId + 1}`;
      layerVariableDefinitions[variableId] = { name: `Screen ${screen.screenId + 1} Layer ${layer.layerId + 1}` };
      layerDefaultVariableValues[variableId] = layer.name;
    });
  });
  return { layerVariableDefinitions, layerDefaultVariableValues };
};

/** 生成场景的变量 */
export const formatPresetVariable = (screenList) => {
  const presetVariableDefinitions = {};
  const presetDefaultVariableValues = {};
  screenList?.forEach((screen) => {
    (screen.presets || []).forEach((preset) => {
      const variableId = `screen_${screen.screenId + 1}_preset_${preset.presetId + 1}`;
      presetVariableDefinitions[variableId] = { name: `Screen ${screen.screenId + 1} Preset ${preset.presetId + 1}` };
      presetDefaultVariableValues[variableId] = preset.name;
    });
  });
  return { presetVariableDefinitions, presetDefaultVariableValues };
};

export const formatPresetCollectionVariable = (presetCollectionList) => {
  const presetCollectionVariableDefinitions = {};
  const presetCollectionDefaultVariableValues = {};
  presetCollectionList?.forEach(({ name, presetCollectionId }) => {
    const variableId = `presetCollectionId_${presetCollectionId + 1}`;
    presetCollectionVariableDefinitions[variableId] = { name: `Preset Group ${presetCollectionId + 1}` };
    presetCollectionDefaultVariableValues[variableId] = name;
  });
  return { presetCollectionVariableDefinitions, presetCollectionDefaultVariableValues };
};

export const formatSourceVariable = (sourceList) => {
  const sourceVariableDefinitions = {};
  const sourceDefaultVariableValues = {};
  sourceList?.forEach(({ name, inputId, cropId }) => {
    const variableId = `source_${inputId + 1}_${cropId}`;
    sourceVariableDefinitions[variableId] = { name: `Source ${inputId + 1}` };
    sourceDefaultVariableValues[variableId] = name;
  });
  return { sourceVariableDefinitions, sourceDefaultVariableValues };
};

/**处理输入源 */
export const formatSourceList = (inputs) => {
  // console.log('inputs', JSON.stringify(inputs));
  const _list =
    inputs
      ?.filter((input) => input.online !== 0)
      ?.map((item) => {
        return { ...item, streamId: 0, cropId: 255, templateId: 0, sourceType: 1 };
      }) ?? [];
  const croupList = [];
  _list?.forEach((_item) => {
    _item.crops?.forEach((cropItem) => {
      croupList.push({ ..._item, ...cropItem, templateId: 0, streamId: 0, sourceType: 1 });
    });
  });
  return [..._list, ...croupList];
};
