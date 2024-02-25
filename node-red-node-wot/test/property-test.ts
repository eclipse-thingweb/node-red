/**
 * test for property
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
      1. wot-server-property:id.serverpropertyn01 (id.serverconfig01, id.thingconfig01')
      2a. helper:id.serverreadpropertyhelper01
      3a. wot-server-end:id.serverreadpropertyend01
      2b. helper:id.serverwritepropertyhelper01
      3b. wot-server-end:id.serverwritepropertyend01
    [Client-side]
      1a. read-property:id.readproperty01 (id.consumedthing01)
      2a. helper:id.readpropertyhelper01
      1b. write-property:id.writeproperty01 (id.consumedthing01)
 */
const targetFlow = [
  // Server-side
  {
    id: 'id.serverproperty01',
    type: 'wot-server-property',
    name: 'server-property',
    propertyName: 'count',
    propertyDescription: 'count for test',
    propertyDataType: 'integer',
    propertyReadOnlyFlag: false,
    propertyObservableFlag: true,
    outParams2_writingValueType: 'msg',
    outParams2_writingValueConstValue: 'payload',
    woTServerConfig: 'id.serverconfig01',
    woTThingConfig: 'id.thingconfig01',
    wires: [['id.serverreadpropertyhelper01'], ['id.serverwritepropertyhelper01']],
  },
  {
    id: 'id.serverreadpropertyhelper01',
    type: 'helper',
    wires: [['id.serverreadpropertyend01']],
  },
  {
    id: 'id.serverreadpropertyend01',
    type: 'wot-server-end',
    name: '',
    inParams_returnValueType: 'msg',
    inParams_returnValueConstValue: 'payload',
    wires: [],
  },
  { id: 'id.serverwritepropertyhelper01', type: 'helper', wires: [['id.serverwritepropertyend01']] },
  {
    id: 'id.serverwritepropertyend01',
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
    id: 'id.readproperty01',
    type: 'read-property',
    name: '',
    topic: '',
    thing: 'id.consumedthing01',
    property: 'count',
    uriVariables: '',
    observe: true,
    wires: [['id.readpropertyhelper01']],
  },
  { id: 'id.readpropertyhelper01', type: 'helper' },
  {
    id: 'id.writeproperty01',
    type: 'write-property',
    name: '',
    topic: '',
    thing: 'id.consumedthing01',
    property: 'count',
    uriVariables: '',
    wires: [],
  },
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
      properties: {
        count: {
          description: '',
          type: 'integer',
          readOnly: false,
          observable: true,
          forms: [
            {
              href: 'http://localhost:8383/thing01/properties/count',
              contentType: 'application/json',
              op: ['readproperty', 'writeproperty'],
            },
            {
              href: 'http://localhost:8383/thing01/properties/count/observable',
              contentType: 'application/json',
              op: ['observeproperty', 'unobserveproperty'],
              subprotocol: 'longpoll',
            },
            {
              href: 'http://localhost:8383/thing01/properties/count',
              contentType: 'application/cbor',
              op: ['readproperty', 'writeproperty'],
            },
            {
              href: 'http://localhost:8383/thing01/properties/count/observable',
              contentType: 'application/cbor',
              op: ['observeproperty', 'unobserveproperty'],
              subprotocol: 'longpoll',
            },
          ],
          writeOnly: false,
        },
      },
      id: 'urn:uuid:cf950521-8eaf-4e1c-9277-758930e47246',
      description: '',
      forms: [
        {
          href: 'http://localhost:8383/thing01/properties',
          contentType: 'application/json',
          op: ['readallproperties', 'readmultipleproperties', 'writeallproperties', 'writemultipleproperties'],
        },
        {
          href: 'http://localhost:8383/thing01/properties',
          contentType: 'application/cbor',
          op: ['readallproperties', 'readmultipleproperties', 'writeallproperties', 'writemultipleproperties'],
        },
      ],
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

let countPropertyValue = 1

describe('Tests for WoT Property', function () {
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

  it('read property', function (done) {
    countPropertyValue = 1
    const serverHelperNode = helper.getNode('id.serverreadpropertyhelper01')
    serverHelperNode.removeAllListeners('input')
    serverHelperNode.on('input', function (msg, send, done) {
      msg.payload = countPropertyValue
      send(msg)
      done()
    })
    const clientHelperNode = helper.getNode('id.readpropertyhelper01')
    clientHelperNode.removeAllListeners('input')
    clientHelperNode.on('input', function (msg) {
      try {
        assert.equal(msg.payload, 1)
        done()
      } catch (err) {
        done(err)
      }
    })
    const readPropertyNode = helper.getNode('id.readproperty01')
    readPropertyNode.receive({})
  })

  it('write property', function (done) {
    countPropertyValue = 1
    const serverHelperNode = helper.getNode('id.serverwritepropertyhelper01')
    serverHelperNode.removeAllListeners('input')
    serverHelperNode.on('input', function (msg, send, done) {
      assert.equal(msg.payload, 100)
      countPropertyValue = Number(msg.payload)
      send(msg)
      done()
    })
    const clientHelperNode = helper.getNode('id.readpropertyhelper01')
    clientHelperNode.removeAllListeners('input')
    clientHelperNode.on('input', function (msg) {
      try {
        assert.equal(msg.payload, 100)
        done()
      } catch (err) {
        done(err)
      }
    })
    const writePropertyNode = helper.getNode('id.writeproperty01')
    writePropertyNode.receive({ payload: 100 })
  })
})
