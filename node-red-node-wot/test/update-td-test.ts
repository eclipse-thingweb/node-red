/**
 * test for update-td
 */
import "mocha"
import * as chai from "chai"
import chaiAsPromised from "chai-as-promised"
import helper from "node-red-node-test-helper"
import { startFlow, endFlow } from "./util"

helper.init(require.resolve("node-red"))

chai.use(chaiAsPromised)
const assert = chai.assert

/*
  Flow Summary
    [Server-side]
      1a. wot-server-event:id.serverevent01 (id.serverconfig01, id.thingconfig01')
      1b. wot-server-event:id.serverevent02 (id.serverconfig02, id.thingconfig01')
    [Client-side]
      1a. subscribe-event:id.subscribeevent01 (id.consumedthing01)
      2a. helper:id.subscribeeventhelper01
      1b. update-td:id.updatetd01 (id.consumedthing01)
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
        id: "id.serverconfig01",
        type: "wot-server-config",
        name: "httpserver",
        bindingType: "http",
        bindingConfigType: "json",
        bindingConfigConstValue: '{"port":8181}',
    },
    {
        id: "id.thingconfig01",
        type: "wot-thing-config",
        name: "thing01",
        description: "thing01 for test",
    },
    {
        id: "id.serverevent02",
        type: "wot-server-event",
        name: "",
        eventName: "testEvent",
        eventDescription: "test event",
        eventDataType: "string",
        inParams_eventValueType: "msg",
        inParams_eventValueConstValue: "payload",
        woTServerConfig: "id.serverconfig02",
        woTThingConfig: "id.thingconfig01",
        wires: [],
    },
    {
        id: "id.serverconfig02",
        type: "wot-server-config",
        name: "httpserver",
        bindingType: "http",
        bindingConfigType: "json",
        bindingConfigConstValue: '{"port":8282}',
    },
    // Client-side
    {
        id: "id.subscribeevent01",
        type: "subscribe-event",
        name: "",
        topic: "",
        thing: "id.consumedthing01",
        event: "testEvent",
        uriVariables: "",
        wires: [["id.subscribeeventhelper01"]],
    },
    { id: "id.subscribeeventhelper01", type: "helper" },
    {
        id: "id.consumedthing01",
        type: "consumed-thing",
        tdLink: "",
        td: JSON.stringify({
            "@context": [
                "https://www.w3.org/2019/wot/td/v1",
                "https://www.w3.org/2022/wot/td/v1.1",
                { "@language": "en" },
            ],
            "@type": "Thing",
            title: "thing01",
            securityDefinitions: { nosec: { scheme: "nosec" } },
            security: ["nosec"],
            events: {
                testEvent: {
                    description: "",
                    data: { type: "string" },
                    forms: [
                        {
                            href: "http://localhost:8181/thing01/events/testEvent",
                            contentType: "application/json",
                            subprotocol: "longpoll",
                            op: ["subscribeevent", "unsubscribeevent"],
                        },
                        {
                            href: "http://localhost:8181/thing01/events/testEvent",
                            contentType: "application/cbor",
                            subprotocol: "longpoll",
                            op: ["subscribeevent", "unsubscribeevent"],
                        },
                    ],
                },
            },
            id: "urn:uuid:cf950521-8eaf-4e1c-9277-758930e47246",
            description: "",
        }),
        http: true,
        ws: false,
        coap: false,
        mqtt: false,
        opcua: false,
        modbus: false,
        basicAuth: false,
        username: "",
        password: "",
    },
    {
        id: "id.updatetd01",
        type: "update-td",
        name: "",
        thing: "id.consumedthing01",
        tdSourceType: "msg",
        tdSource: "payload",
        wires: [],
    },
]

describe("Tests for Update TD", function () {
    this.timeout(15 * 1000)
    before(async function () {
        await startFlow(targetFlow, helper)
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

    it("update td", function (done) {
        const clientHelperNode = helper.getNode("id.subscribeeventhelper01")
        clientHelperNode.removeAllListeners("input")
        let expectedEvent
        clientHelperNode.on("input", function (msg) {
            try {
                assert.equal(msg.payload, expectedEvent)
                if (expectedEvent === "event from server02") {
                    done()
                }
            } catch (err) {
                done(err)
            }
        })
        const serverEventNode01 = helper.getNode("id.serverevent01")
        const serverEventNode02 = helper.getNode("id.serverevent02")
        expectedEvent = "event from server01"
        serverEventNode01.receive({ payload: "event from server01" })
        serverEventNode02.receive({ payload: "event from server02" })
        new Promise((resolve) => setTimeout(resolve, 500)).then(() => {
            const updateTDNode = helper.getNode("id.updatetd01")
            updateTDNode.receive({
                payload: {
                    "@context": [
                        "https://www.w3.org/2019/wot/td/v1",
                        "https://www.w3.org/2022/wot/td/v1.1",
                        { "@language": "en" },
                    ],
                    "@type": "Thing",
                    title: "thing01",
                    securityDefinitions: { nosec: { scheme: "nosec" } },
                    security: ["nosec"],
                    events: {
                        testEvent: {
                            description: "",
                            data: { type: "string" },
                            forms: [
                                {
                                    href: "http://localhost:8282/thing01/events/testEvent",
                                    contentType: "application/json",
                                    subprotocol: "longpoll",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },
                                {
                                    href: "http://localhost:8282/thing01/events/testEvent",
                                    contentType: "application/cbor",
                                    subprotocol: "longpoll",
                                    op: ["subscribeevent", "unsubscribeevent"],
                                },
                            ],
                        },
                    },
                    id: "urn:uuid:cf950521-8eaf-4e1c-9277-758930e47246",
                    description: "",
                },
            })
            new Promise((resolve) => setTimeout(resolve, 500)).then(() => {
                expectedEvent = "event from server02"
                serverEventNode01.receive({ payload: "event from server01" })
                serverEventNode02.receive({ payload: "event from server02" })
            })
        })
    })
})
