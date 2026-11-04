import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getActions } from '../src/actions.js';
test('brightness uses the value prepared by the API 1.13+ host', async () => {
	const sent = [];
	const instance = { screenList: [{screenId:0, details:{brightness:100}}], sourceList:[], presetCollectionList:[], safeSend: p => sent.push(p), updateEnhancedFromAction() {}, parseVariablesInString() { throw new Error('host-prepared options must not be parsed again') } };
	await getActions(instance).set_brightness.callback({options:{screenId:0, brightness:'34'}});
	assert.equal(instance.screenList[0].details.brightness,34);
	assert.equal(sent.length,1);
});
