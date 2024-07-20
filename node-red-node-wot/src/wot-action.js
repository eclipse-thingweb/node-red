"use strict"

module.exports = function (RED) {
    function invokeActionNode(config) {
        RED.nodes.createNode(this, config)
        let node = this
        let consumedThing

        this.status({})

        if (!config.thing) {
            this.status({ fill: "red", shape: "dot", text: "Error: Thing undefined" })
            return
        } else if (!config.action) {
            this.status({
                fill: "red",
                shape: "dot",
                text: "Error: Choose an action",
            })
            return
        }

        const thingNode = RED.nodes.getNode(config.thing)
        thingNode.addUpdateTDListener(async (_consumedThing) => {
            consumedThing = _consumedThing
        })

        this.on("input", function (msg, send, done) {
            if (!consumedThing) {
                node.error("[error] consumedThing is not defined.")
                done("consumedThing is not defined.")
                return
            }
            const uriVariables = config.uriVariables ? JSON.parse(config.uriVariables) : undefined
            consumedThing
                .invokeAction(config.action, msg.payload, {
                    uriVariables: uriVariables,
                })
                .then(async (resp) => {
                    let payload
                    try {
                        if (resp.schema) {
                            payload = await resp.value()
                            node.send({ payload: payload, topic: config.topic })
                        } else {
                            node.send({ payload: null, topic: config.topic })
                        }
                        node.status({
                            fill: "green",
                            shape: "dot",
                            text: "invoked",
                        })
                        done()
                    } catch (err) {
                        console.error(`[error] failed to get return value. err: `, err)
                        done(`[error] failed to get return value. err: ${err.toString()}`)
                    }
                })
                .catch((err) => {
                    node.warn(err)
                    node.status({
                        fill: "red",
                        shape: "ring",
                        text: err.message,
                    })
                    console.error(err)
                    done(err)
                })
        })

        this.on("close", function (removed, done) {
            if (removed) {
                // This node has been deleted
            } else {
                // This node is being restarted
            }
            done()
        })
    }
    RED.nodes.registerType("invoke-action", invokeActionNode)
}
