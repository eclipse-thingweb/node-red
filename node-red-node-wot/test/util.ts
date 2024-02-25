import ServientManager from '../src/servients/servient-manager'

const serverConfigNode = require('../src/wot-server-config.ts')
const serverThingConfigNode = require('../src/wot-thing-config.ts')
const serverPropertyNode = require('../src/wot-server-property.ts')
const serverActionNode = require('../src/wot-server-action.ts')
const serverEventNode = require('../src/wot-server-event.ts')
const serverEndNode = require('../src/wot-server-end.ts')
const thingConfigNode = require('../src/wot-thing.js')
const propertyNode = require('../src/wot-property.js')
const actionNode = require('../src/wot-action.js')
const eventNode = require('../src/wot-event.js')

const USE_NODES = [
  serverConfigNode,
  serverThingConfigNode,
  serverPropertyNode,
  serverActionNode,
  serverEventNode,
  serverEndNode,
  thingConfigNode,
  propertyNode,
  actionNode,
  eventNode,
]

const launchFlow = async (flow: any[], helper) => {
  return new Promise<void>((resolve, reject) => {
    helper.load(USE_NODES, flow, function () {
      // Wait for the servient to start.
      setTimeout(function () {
        resolve()
      }, 2000)
    })
  })
}

export const startFlow = async (targetFlow, helper) => {
  return new Promise<void>((resolve, reject) => {
    helper.startServer(async function () {
      try {
        await launchFlow(targetFlow, helper)
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  })
}

export const endFlow = async (id: string, helper) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      await ServientManager.getInstance().removeServientWrapper(id)
      await helper.unload()
      helper.stopServer(resolve)
    } catch (err) {
      reject(err)
    }
  })
}
