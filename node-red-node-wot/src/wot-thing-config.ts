module.exports = function (RED) {
    function WoTThingConfig(config) {
        RED.nodes.createNode(this, config)
        const node = this
        node.getProps = () => {
            let props = {
                title: config.name,
                description: config.description,
            }
            if (config.thingId) {
                props["id"] = config.thingId
            }
            return props
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
