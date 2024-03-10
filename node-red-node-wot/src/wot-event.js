"use strict"

module.exports = function (RED) {
    function subscribeEventNode(config) {
        RED.nodes.createNode(this, config)
        let node = this
        let consumedThing
        let subscription

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
            if (subscription) {
                // Stop if already subscribed
                await subscription.stop()
            }
            consumedThing = _consumedThing
            // Repeat until event subscription succeeds.
            try {
                while (true) {
                    subscription = await consumedThing
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
                        .catch((err) => {
                            console.warn("[warn] event subscribe error. try again. error: " + err)
                        })
                    if (subscription) {
                        break
                    }
                    await new Promise((resolve) => {
                        setTimeout(resolve, 500)
                    })
                }
            } catch (err) {
                node.status({
                    fill: "red",
                    shape: "ring",
                    text: "Subscription error",
                })
                node.error(`[error] failed to subscribe events. error: ${err.toString()}`)
            }

            if (subscription) {
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "Subscribed",
                })
            }
        })

        this.on("close", async function (removed, done) {
            if (subscription) {
                // Stop if already subscribed
                await subscription.stop()
            }
            done()
        })
    }
    RED.nodes.registerType("subscribe-event", subscribeEventNode)
}
