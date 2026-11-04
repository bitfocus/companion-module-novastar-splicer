import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter, once } from 'node:events';
import dgram from 'node:dgram';
import { getActions } from '../src/actions.js';
import { getFeedbacks } from '../src/feedbacks.js';
import { ACTIONS_CMD } from '../utils/constant.js';
import { decodeRes, formatScreenVariable, sendUDPRequestsSync } from '../utils/index.js';

test('screen selection drives feedback and FTB sends the selected screen IDs', async () => {
	const packets = [];
	const instance = {
		screenList: [{ screenId: 2, name: 'Main', layers: [], presets: [] }],
		presetCollectionList: [],
		sourceList: [],
		selectedScreenList: [],
		log() {},
		checkFeedbacks() {},
		udp: { send: (packet) => packets.push(JSON.parse(packet)) },
	};
	const actions = getActions(instance);
	const feedbacks = getFeedbacks(instance);
	actions.select_screen.callback({ options: { screenId: 2, enable: 1 } });
	assert.equal(feedbacks.screen_selected.callback({ options: { screenId: 2 } }), true);
	await actions.apply_ftb.callback({ options: { type: 0 } });
	assert.deepEqual(packets, [[{ type: 0, screenId: 2, cmd: ACTIONS_CMD.black_screen, deviceId: 0 }]]);
	assert.equal(instance.ftb, true);
	actions.select_screen.callback({ options: { screenId: 2, enable: 0 } });
	assert.equal(feedbacks.screen_selected.callback({ options: { screenId: 2 } }), false);
});

test('serial UDP requests decode loopback responses and pass results to the next request', async (t) => {
	const server = dgram.createSocket('udp4');
	const client = dgram.createSocket('udp4');
	t.after(() => {
		server.close();
		client.close();
	});
	server.bind(0, '127.0.0.1');
	await once(server, 'listening');
	const packets = [];
	server.on('message', (packet, remote) => {
		const [request] = JSON.parse(packet);
		packets.push(request);
		server.send(
			Buffer.from(JSON.stringify([{ cmd: request.cmd, ack: 'Ok', value: request.param0 }])),
			remote.port,
			remote.address,
		);
	});
	const instance = new EventEmitter();
	instance.log = () => {};
	instance.udp = { send: (packet) => client.send(packet, server.address().port, '127.0.0.1') };
	client.on('message', (packet) => instance.emit('udp_response', decodeRes(packet)));
	const results = await sendUDPRequestsSync(instance, [
		{ cmd: 'R0400', params: { param0: 2 } },
		{ cmd: 'R0401', processParams: (previous) => ({ param0: previous[0].data.value + 1 }) },
	]);
	assert.deepEqual(
		results.map((r) => r.data.value),
		[2, 3],
	);
	assert.equal(
		results.every((r) => r.ack),
		true,
	);
	assert.deepEqual(
		packets.map((p) => p.deviceId),
		[0, 0],
	);
	assert.equal(instance.listenerCount('udp_response'), 0);
});

test('device screen names retain their published variable IDs', () => {
	assert.deepEqual(formatScreenVariable([{ screenId: 2, name: 'Main' }]), {
		screenVariableDefinitions: [{ variableId: 'screenId_2', name: 'Screen ID: 2', value: 'Main' }],
		screenDefaultVariableValues: { screenId_2: 'Main' },
	});
});
