"use strict"

module.exports = function (RED) {
    function UpdateTDNode(config) {
        RED.nodes.createNode(this, config)
        let node = this

        this.status({})

        if (!config.thing) {
            this.status({ fill: "red", shape: "dot", text: "Error: Thing undefined" })
            return
        } else if (!config.tdSource) {
            this.status({
                fill: "red",
                shape: "dot",
                text: "Error: Choose a td source",
            })
            return
        }

        const thingNode = RED.nodes.getNode(config.thing)

        this.on("input", async function (msg, send, done) {
            let td
            if (config.tdSource && config.tdSourceType) {
                try {
                    td = await RED.util.evaluateNodeProperty(config.tdSource, config.tdSourceType, node, msg)
                } catch (err) {
                    return done("cannot evaluate td source")
                }
            }
            try {
                await thingNode.createConsumedThing(td)
                done()
            } catch (err) {
                done(err)
            }
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
    RED.nodes.registerType("update-td", UpdateTDNode)
}
