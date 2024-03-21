import ServientManager from "./servients/servient-manager"

module.exports = function (RED) {
    function WoTServerProperty(config) {
        RED.nodes.createNode(this, config)
        const node = this
        node.status({ fill: "red", shape: "dot", text: "not prepared" })

        // for wot-server-config
        node.getProps = () => {
            return {
                attrType: "properties",
                name: config.propertyName,
                outputAttr: config.outParams2_writingValueConstValue,
                content: {
                    description: config.propertyDescription,
                    type: config.propertyDataType,
                    readOnly: config.propertyReadOnlyFlag,
                    observable: config.propertyObservableFlag,
                },
            }
        }

        node.setServientStatus = (running: boolean) => {
            if (running) {
                node.status({ fill: "green", shape: "dot", text: "running" })
            } else {
                node.status({ fill: "red", shape: "dot", text: "not prepared" })
            }
        }

        // for wot-server-config
        node.getThingNode = () => {
            return RED.nodes.getNode(config.woTThingConfig)
        }

        node.on("input", async (msg, send, done) => {
            try {
                const woTServerConfig = RED.nodes.getNode(config.woTServerConfig)

                await ServientManager.getInstance()
                    .getThing(woTServerConfig.id, node.getThingNode().getProps().title)
                    .emitPropertyChange(config.propertyName)
                console.debug("[debug] emitPropertyChange finished. propertyName: ", config.propertyName)

                // No output if changed property value is entered
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
    RED.nodes.registerType("wot-server-property", WoTServerProperty)
}
