/**
 * test for action
 */
import 'mocha'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import helper from 'node-red-node-test-helper'
import { startFlow, endFlow } from './util'

helper.init(require.resolve('node-red'))

chai.use(chaiAsPromised)
const assert = chai.assert

/*
  Flow Summary
    [Server-side]
      1. wot-server-action:id.serveraction01 (id.serverconfig01, id.thingconfig01')
      2. helper:id.serveractionhelper01
      3. wot-server-end:id.serveractionend01
    [Client-side]
      1. invoke-action:id.invokeaction01 (id.consumedthing01)
      2. helper:id.invokeactionhelper01
 */
const targetFlow = [
  // Server-side
  {
    id: 'id.serveraction01',
    type: 'wot-server-action',
    name: 'server-action',
    actionName: 'testAction',
    actionDescription: 'test action',
    actionInputDataType: 'string',
    actionOutputDataType: 'string',
    outParams1_actionArgsType: 'msg',
    outParams1_actionArgsConstValue: 'payload',
    woTServerConfig: 'id.serverconfig01',
    woTThingConfig: 'id.thingconfig01',
    wires: [['id.serveractionhelper01']],
  },
  {
    id: 'id.serveractionhelper01',
    type: 'helper',
    wires: [['id.serveractionend01']],
  },
  {
    id: 'id.serveractionend01',
    type: 'wot-server-end',
    name: '',
    inParams_returnValueType: 'msg',
    inParams_returnValueConstValue: 'payload',
    wires: [],
  },
  {
    id: 'id.serverconfig01',
    type: 'wot-server-config',
    name: 'httpserver',
    bindingType: 'http',
    bindingConfigType: 'json',
    bindingConfigConstValue: '{"port":8383}',
  },
  {
    id: 'id.thingconfig01',
    type: 'wot-thing-config',
    name: 'thing01',
    description: 'thing01 for test',
  },
  // Client-side
  {
    id: 'id.invokeaction01',
    type: 'invoke-action',
    name: '',
    topic: '',
    thing: 'id.consumedthing01',
    action: 'testAction',
    uriVariables: '',
    wires: [['id.invokeactionhelper01']],
  },
  { id: 'id.invokeactionhelper01', type: 'helper' },
  {
    id: 'id.consumedthing01',
    type: 'consumed-thing',
    tdLink: 'http://localhost:8383/thing01',
    td: JSON.stringify({
      '@context': ['https://www.w3.org/2019/wot/td/v1', 'https://www.w3.org/2022/wot/td/v1.1', { '@language': 'en' }],
      '@type': 'Thing',
      title: 'thing01',
      securityDefinitions: { nosec: { scheme: 'nosec' } },
      security: ['nosec'],
      actions: {
        testAction: {
          description: '',
          input: { type: 'string' },
          output: { type: 'string' },
          forms: [
            {
              href: 'http://localhost:8383/thing01/actions/testAction',
              contentType: 'application/json',
              op: ['invokeaction'],
              'htv:methodName': 'POST',
            },
            {
              href: 'http://localhost:8383/thing01/actions/testAction',
              contentType: 'application/cbor',
              op: ['invokeaction'],
              'htv:methodName': 'POST',
            },
          ],
          idempotent: false,
          safe: false,
        },
      },
      id: 'urn:uuid:cf950521-8eaf-4e1c-9277-758930e47246',
      description: '',
    }),
    http: true,
    ws: false,
    coap: false,
    mqtt: false,
    opcua: false,
    modbus: false,
    basicAuth: false,
    username: '',
    password: '',
  },
]

let actionArgs = 'test-args'
let actionResult = 'test-result'

describe('Tests for WoT Action', function () {
  this.timeout(15 * 1000)
  before(async function () {
    await startFlow(targetFlow, helper)
  })

  after(async function () {
    await endFlow('id.serverconfig01', helper)
  })

  beforeEach(function (done) {
    done()
  })

  afterEach(function (done) {
    done()
  })

  it('invoke action', function (done) {
    const serverHelperNode = helper.getNode('id.serveractionhelper01')
    serverHelperNode.on('input', function (msg, send, done) {
      assert.equal(msg.payload, actionArgs)
      msg.payload = actionResult
      send(msg)
      done()
    })
    const clientHelperNode = helper.getNode('id.invokeactionhelper01')
    clientHelperNode.removeAllListeners('input')
    clientHelperNode.on('input', function (msg) {
      try {
        assert.equal(msg.payload, actionResult)
        done()
      } catch (err) {
        done(err)
      }
    })
    const invokeActionNode = helper.getNode('id.invokeaction01')
    invokeActionNode.receive({ payload: actionArgs })
  })
})
