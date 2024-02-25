/**
 * test for event
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
      1. wot-server-event:id.serverevent01 (id.serverconfig01, id.thingconfig01')
    [Client-side]
      1. subscribe-event:id.subscribeevent01 (id.consumedthing01)
      2. helper:id.subscribeeventhelper01
 */
const targetFlow = [
  // Server-side
  {
    id: 'id.serverevent01',
    type: 'wot-server-event',
    name: '',
    eventName: 'testEvent',
    eventDescription: 'test event',
    eventDataType: 'string',
    inParams_eventValueType: 'msg',
    inParams_eventValueConstValue: 'payload',
    woTServerConfig: 'id.serverconfig01',
    woTThingConfig: 'id.thingconfig01',
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
    id: 'id.subscribeevent01',
    type: 'subscribe-event',
    name: '',
    topic: '',
    thing: 'id.consumedthing01',
    event: 'testEvent',
    uriVariables: '',
    wires: [['id.subscribeeventhelper01']],
  },
  { id: 'id.subscribeeventhelper01', type: 'helper' },
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
      events: {
        testEvent: {
          description: '',
          data: { type: 'string' },
          forms: [
            {
              href: 'http://localhost:8383/thing01/events/testEvent',
              contentType: 'application/json',
              subprotocol: 'longpoll',
              op: ['subscribeevent', 'unsubscribeevent'],
            },
            {
              href: 'http://localhost:8383/thing01/events/testEvent',
              contentType: 'application/cbor',
              subprotocol: 'longpoll',
              op: ['subscribeevent', 'unsubscribeevent'],
            },
          ],
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

let eventContent = 'test-content'

describe('Tests for WoT Event', function () {
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

  it('subscribe event', function (done) {
    const clientHelperNode = helper.getNode('id.subscribeeventhelper01')
    clientHelperNode.removeAllListeners('input')
    clientHelperNode.on('input', function (msg) {
      try {
        assert.equal(msg.payload, eventContent)
        done()
      } catch (err) {
        done(err)
      }
    })
    const serverEventNode = helper.getNode('id.serverevent01')
    serverEventNode.receive({ payload: eventContent })
  })
})
