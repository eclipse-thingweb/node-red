module.exports = function (RED) {
    function WoTThingConfig(config) {
        RED.nodes.createNode(this, config)
        const node = this
        node.getProps = () => {
            return {
                title: config.name,
                description: config.description,
                id: config.thingId,
            }
        }
        node.getCredentials = () => {
            return {
                username: config.basicAuthUsername,
                password: config.basicAuthPassword,
            }
        }
        node.getSecurityScheme = () => {
            if (config.basicAuth) {
                return "basic"
            } else {
                return "nosec"
            }
        }
    }

    RED.nodes.registerType("wot-thing-config", WoTThingConfig)
}
