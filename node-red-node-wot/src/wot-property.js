"use strict"

module.exports = function (RED) {
    function readPropertyNode(config) {
        RED.nodes.createNode(this, config)
        let node = this
        let consumedThing
        let subscription
        let repeatId

        this.status({})

        if (!config.thing) {
            this.status({ fill: "red", shape: "dot", text: "Error: Thing undefined" })
            return
        } else if (!config.property) {
            this.status({
                fill: "red",
                shape: "dot",
                text: "Error: Choose a property",
            })
            return
        }

        const thingNode = RED.nodes.getNode(config.thing)
        thingNode.addUpdateTDListener(async (_consumedThing) => {
            if (repeatId) {
                clearInterval(repeatId)
                repeatId = undefined
            }
            if (subscription) {
                // Stop if already subscribed
                await subscription.stop()
            }
            subscription = undefined
            consumedThing = _consumedThing
            if (config.observe === false) {
                return
            }
            // Repeat until observeProperty succeeds.
            await new Promise((resolve) => {
                repeatId = setInterval(() => {
                    consumedThing
                        .observeProperty(
                            config.property,
                            async (resp) => {
                                let payload
                                try {
                                    payload = await resp.value()
                                } catch (err) {
                                    node.error(`[error] failed to get property change. err: ${err.toString()}`)
                                    console.error(`[error] failed to get property change. err:`, err)
                                }
                                node.send({ payload, topic: config.topic })
                            },
                            (err) => {
                                node.error(`[error] property observe error. error: ${err.toString()}`)
                                console.error(`[error] property observe error. error: `, err)
                                node.status({
                                    fill: "red",
                                    shape: "ring",
                                    text: "Observe error",
                                })
                            }
                        )
                        .then((sub) => {
                            subscription = sub
                            clearInterval(repeatId)
                            repeatId = undefined
                            resolve()
                        })
                        .catch((err) => {
                            console.warn("[warn] property observe error. try again. error: " + err)
                            node.status({
                                fill: "red",
                                shape: "ring",
                                text: "Observe error",
                            })
                        })
                }, 1000)
            })
            if (subscription) {
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "connected",
                })
            }
        })

        node.on("input", async (msg, send, done) => {
            if (!consumedThing) {
                node.error("[error] consumedThing is not defined.")
                done("consumedThing is not defined.")
                return
            }
            const uriVariables = config.uriVariables ? JSON.parse(config.uriVariables) : undefined
            consumedThing
                .readProperty(config.property, { uriVariables: uriVariables })
                .then(async (resp) => {
                    let payload
                    try {
                        payload = await resp.value()
                    } catch (err) {
                        console.error(`[error] failed to get value. name: ${config.property}, error: `, err.toString())
                        done(`[error] failed to get value. name: ${config.property}, error: ${err.toString()}`)
                    }
                    node.send({ payload, topic: config.topic })
                    node.status({
                        fill: "green",
                        shape: "dot",
                        text: "connected",
                    })
                    done()
                })
                .catch((err) => {
                    node.warn(err)
                    node.status({
                        fill: "red",
                        shape: "ring",
                        text: "Response error",
                    })
                    console.error(err)
                    done(err)
                })
        })

        node.on("close", async function (removed, done) {
            if (repeatId) {
                clearInterval(repeatId)
                repeatId = undefined
            }
            if (subscription) {
                // Stop if already subscribed
                await subscription.stop()
            }
            done()
        })
    }
    RED.nodes.registerType("read-property", readPropertyNode)

    function writePropertyNode(config) {
        RED.nodes.createNode(this, config)
        let node = this
        let consumedThing

        this.status({})

        if (!config.thing) {
            this.status({ fill: "red", shape: "dot", text: "Error: Thing undefined" })
            return
        } else if (!config.property) {
            this.status({
                fill: "red",
                shape: "dot",
                text: "Error: Choose a property",
            })
            return
        }

        const thingNode = RED.nodes.getNode(config.thing)
        thingNode.addUpdateTDListener(async (_consumedThing) => {
            consumedThing = _consumedThing
        })

        node.on("input", function (msg, send, done) {
            if (!consumedThing) {
                node.error("[error] consumedThing is not defined.")
                done("consumedThing is not defined.")
                return
            }
            const uriVariables = config.uriVariables ? JSON.parse(config.uriVariables) : undefined
            consumedThing
                .writeProperty(config.property, msg.payload, {
                    uriVariables: uriVariables,
                })
                .then((resp) => {
                    if (resp) node.send({ payload: resp, topic: config.topic })
                    node.status({
                        fill: "green",
                        shape: "dot",
                        text: "connected",
                    })
                    done()
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
    RED.nodes.registerType("write-property", writePropertyNode)
}
