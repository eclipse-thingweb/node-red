"use strict"

module.exports = function (RED) {
    function subscribeEventNode(config) {
        RED.nodes.createNode(this, config)
        let node = this
        let consumedThing
        let subscription
        let repeatId

        this.status({})

        if (!config.thing) {
            this.status({ fill: "red", shape: "dot", text: "Error: Thing undefined" })
            return
        } else if (!config.event) {
            this.status({ fill: "red", shape: "dot", text: "Error: Choose an event" })
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
            // Repeat until event subscription succeeds.
            await new Promise((resolve) => {
                repeatId = setInterval(() => {
                    consumedThing
                        .subscribeEvent(
                            config.event,
                            async (resp) => {
                                if (resp) {
                                    let payload
                                    try {
                                        payload = await resp.value()
                                    } catch (err) {
                                        node.error(`[error] failed to get event. err: ${err.toString()}`)
                                        console.error(`[error] failed to get event. err: `, err)
                                    }
                                    node.send({ payload, topic: config.topic })
                                }
                                node.status({
                                    fill: "green",
                                    shape: "dot",
                                    text: "Subscribed",
                                })
                            },
                            (err) => {
                                console.error("[error] subscribe events.", err)
                                node.error(`[error] subscribe events. err: ${err.toString()}`)
                                node.status({
                                    fill: "red",
                                    shape: "ring",
                                    text: "Subscription error",
                                })
                            },
                            () => {
                                console.error("[warn] Subscription ended.")
                                node.warn("[warn] Subscription ended.")
                                node.status({})
                                subscription = undefined
                            }
                        )
                        .then((sub) => {
                            subscription = sub
                            clearInterval(repeatId)
                            repeatId = undefined
                            resolve()
                        })
                        .catch((err) => {
                            console.warn("[warn] event subscribe error. try again. error: " + err)
                        })
                }, 1000)
            })

            if (subscription) {
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "Subscribed",
                })
            }
        })

        this.on("close", async function (removed, done) {
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
    RED.nodes.registerType("subscribe-event", subscribeEventNode)
}
