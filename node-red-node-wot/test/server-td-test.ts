/**
 * test for server-td
 */
import "mocha"
import * as chai from "chai"
import chaiAsPromised from "chai-as-promised"
import helper from "node-red-node-test-helper"
import { startFlow, endFlow, getNodeAfterStartFlow } from "./util"

helper.init(require.resolve("node-red"))

chai.use(chaiAsPromised)
const assert = chai.assert

/*
  Flow Summary
    [Server-side]
      1a. wot-server-event:id.serverevent01 (id.serverconfig01, id.thingconfig01')
      1b. wot-server-td:id.servertd01 (id.serverconfig01, id.thingconfig01')
      2b. helper:id.gettdhelper01
 */
const targetFlow = [
    // Server-side
    {
        id: "id.serverevent01",
        type: "wot-server-event",
        name: "",
        eventName: "testEvent",
        eventDescription: "test event",
        eventDataType: "string",
        inParams_eventValueType: "msg",
        inParams_eventValueConstValue: "payload",
        woTServerConfig: "id.serverconfig01",
        woTThingConfig: "id.thingconfig01",
        wires: [],
    },
    {
        id: "id.servertd01",
        type: "wot-server-td",
        name: "",
        outParams1_tdType: "msg",
        outParams1_tdConstValue: "payload",
        woTServerConfig: "id.serverconfig01",
        woTThingConfig: "id.thingconfig01",
        outputTDAfterServerStartFlag: true,
        wires: [["id.gettdhelper01"]],
    },
    {
        id: "id.serverconfig01",
        type: "wot-server-config",
        name: "httpserver",
        bindingType: "http",
        bindingConfigType: "json",
        bindingConfigConstValue: '{"port":8383}',
    },
    {
        id: "id.thingconfig01",
        type: "wot-thing-config",
        name: "thing01",
        description: "thing01 for test",
    },
    { id: "id.gettdhelper01", type: "helper" },
]

let eventContent = "test-content"

describe("Tests for Server TD", function () {
    this.timeout(15 * 1000)
    before(async function () {
        await startFlow(targetFlow, helper, 0)
    })

    after(async function () {
        await endFlow("id.serverconfig01", helper)
    })

    beforeEach(function (done) {
        done()
    })

    afterEach(function (done) {
        done()
    })

    it("get td after server start", function (done) {
        getNodeAfterStartFlow("id.gettdhelper01", helper).then((helperNode) => {
            helperNode.removeAllListeners("input")
            helperNode.on("input", function (msg) {
                try {
                    //@ts-ignore
                    assert.equal(msg.payload?.title, "thing01")
                    done()
                } catch (err) {
                    done(err)
                }
            })
        })
    })

    it("get td by input", function (done) {
        // wait for servient start
        new Promise((resolve, reject) => {
            setTimeout(resolve, 2000)
        }).then(() => {
            const helperNode = helper.getNode("id.gettdhelper01")
            let sentFlg = false
            helperNode.removeAllListeners("input")
            helperNode.on("input", function (msg) {
                try {
                    // check after send trigger or not
                    if (sentFlg) {
                        //@ts-ignore
                        assert.equal(msg.payload?.title, "thing01")
                        done()
                    }
                } catch (err) {
                    done(err)
                }
            })
            const serverTDNode = helper.getNode("id.servertd01")
            serverTDNode.receive({})
            sentFlg = true
        })
    })
})
