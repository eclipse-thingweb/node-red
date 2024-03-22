module.exports = function (RED) {
    function WoTServerEnd(config) {
        RED.nodes.createNode(this, config)
        const node = this

        node.on("input", async (msg, send, done) => {
            try {
                if (config.inParams_returnValueConstValue && config.inParams_returnValueType) {
                    node.inParams_returnValue = RED.util.evaluateNodeProperty(
                        config.inParams_returnValueConstValue,
                        config.inParams_returnValueType,
                        node,
                        msg
                    )
                }
                msg._wot?.finish(node.inParams_returnValue)
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
    }
    RED.nodes.registerType("wot-server-end", WoTServerEnd)
}
