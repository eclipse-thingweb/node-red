import ServientManager from "./servients/servient-manager"

module.exports = function (RED) {
    function WoTServerTD(config) {
        RED.nodes.createNode(this, config)
        const node = this
        this.status({ fill: "red", shape: "dot", text: "not prepared" })

        node.setServientStatus = (running: boolean) => {
            if (running) {
                node.status({ fill: "green", shape: "dot", text: "running" })
            } else {
                node.status({ fill: "red", shape: "dot", text: "not prepared" })
            }
        }

        node.getOutputTDAfterServerStartFlag = () => {
            return config.outputTDAfterServerStartFlag
        }

        node.on("input", async (msg, send, done) => {
            try {
                const woTServerConfig = RED.nodes.getNode(config.woTServerConfig)
                const woTThingConfig = RED.nodes.getNode(config.woTThingConfig)
                const thing = ServientManager.getInstance().getThing(woTServerConfig.id, woTThingConfig.name)
                const tdOutputKey = config.outParams1_tdConstValue
                const td = thing.getThingDescription()
                msg[tdOutputKey] = td
                console.debug("[debug] send td. td: ", td)
                send(msg)
                done()
            } catch (err) {
                done(err)
            }
        })

        node.on("close", function (removed, done) {
            if (removed) {
                // This node has been disabled/deleted
            } else {
                // This node is being restarted
            }
            done()
        })

        const woTServerConfig = RED.nodes.getNode(config.woTServerConfig)
        woTServerConfig?.addUserNode(node)
    }
    RED.nodes.registerType("wot-server-td", WoTServerTD, {
        credentials: {
            outParams1_td: { type: "text" },
        },
    })

    const setOutput = (type, valueName, msg, context, value) => {
        if (type === "msg") {
            const names = valueName.split(".")
            let target = msg
            for (let i = 0; i < names.length - 1; i++) {
                let n = names[i]
                if (target[n] && target[n] instanceof Object) {
                    target = target[n]
                } else {
                    target[n] = {}
                    target = target[n]
                }
            }
            target[names[names.length - 1]] = value
        } else if (type === "node") {
            context.set(valueName, value)
        } else if (type === "flow") {
            context.flow.set(valueName, value)
        } else if (type === "global") {
            context.global.set(valueName, value)
        }
    }
}
