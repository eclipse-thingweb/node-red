import ServientManager from "../src/servients/servient-manager"

const serverConfigNode = require("../src/wot-server-config.ts")
const serverThingConfigNode = require("../src/wot-thing-config.ts")
const serverPropertyNode = require("../src/wot-server-property.ts")
const serverActionNode = require("../src/wot-server-action.ts")
const serverEventNode = require("../src/wot-server-event.ts")
const serverEndNode = require("../src/wot-server-end.ts")
const serverTDNode = require("../src/wot-server-td.ts")
const thingConfigNode = require("../src/wot-thing.js")
const propertyNode = require("../src/wot-property.js")
const actionNode = require("../src/wot-action.js")
const eventNode = require("../src/wot-event.js")
const updateTDNode = require("../src/wot-update-td.js")

const USE_NODES = [
    serverConfigNode,
    serverThingConfigNode,
    serverPropertyNode,
    serverActionNode,
    serverEventNode,
    serverEndNode,
    serverTDNode,
    thingConfigNode,
    propertyNode,
    actionNode,
    eventNode,
    updateTDNode,
]

const launchFlow = async (flow: any[], helper, waitForServientStart = 2000) => {
    return new Promise<void>((resolve, reject) => {
        helper.load(USE_NODES, flow, function () {
            // Wait for the servient to start.
            setTimeout(function () {
                resolve()
            }, waitForServientStart)
        })
    })
}

export const startFlow = async (targetFlow, helper, waitForServientStart = 2000) => {
    return new Promise<void>((resolve, reject) => {
        helper.startServer(async function () {
            try {
                await launchFlow(targetFlow, helper, waitForServientStart)
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
            await helper.unload()
            helper.stopServer(resolve)
        } catch (err) {
            reject(err)
        }
    })
}

export const getNodeAfterStartFlow = async (id: string, helper, wait = 50, maxCount = 50) => {
    for (let i = 0; i < maxCount; i++) {
        let node = helper.getNode(id)
        if (node) {
            return node
        } else {
            await new Promise((resolve, reject) => {
                setTimeout(resolve, wait)
            })
        }
    }
    throw new Error("timeout for getting node")
}
