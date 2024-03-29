import { ExposedThing } from "@node-wot/core"
import ServientManager from "./servients/servient-manager"
import ServientWrapper from "./servients/servient-wrapper"

module.exports = function (RED) {
    function WoTServerConfig(config) {
        RED.nodes.createNode(this, config)
        const node = this
        const userNodes = []
        // Delete thingDescriptions in globalContext (to avoid having them remain if the wot-server-config node is deleted)
        // Deleting them here may cause the deletion of thingsDescriptions added to globalContext that should not be deleted, due to timing.
        node.context().global.set("thingDescriptions", {})
        const servientManager = ServientManager.getInstance()
        node.running = false

        node.addUserNode = (n) => {
            n.setServientStatus(node.running)
            const foundUserNodes = userNodes.filter((userNode) => userNode.id === n.id)
            if (foundUserNodes.length === 0) {
                userNodes.push(n)
            }
        }

        function getSecurityDefinition(scheme) {
            let params
            if (scheme === "basic") {
                params = { scheme, in: "header" }
            } else {
                params = { scheme }
            }
            return params
        }

        async function waitForFinishPrepareRelatedNodes(userNodes: any[], userNodeIds: string[]) {
            const MAX_CHECK_COUNT = 50
            const WAIT_MILLI_SEC = 100 //ms
            for (let i = 0; i < MAX_CHECK_COUNT; i++) {
                // Confirm that all user nodes have been added
                let prepareAllNodesFlg = true
                for (const id of userNodeIds) {
                    let foundFlg = false
                    for (const node of userNodes) {
                        if (node.id === id) {
                            foundFlg = true
                        }
                    }
                    if (!foundFlg) {
                        // Returns false if no matching user node exists
                        prepareAllNodesFlg = false
                        break
                    }
                }
                if (prepareAllNodesFlg) {
                    // End because all nodes have been added
                    return
                }
                // wait
                await ((sec) => {
                    return new Promise<void>((resolve, reject) => {
                        setTimeout(() => {
                            resolve()
                        }, sec)
                    })
                })(WAIT_MILLI_SEC)
            }
            throw new Error("Not enough WoT Nodes settings.")
        }

        async function registerPropertiesProcess(userNode: any, thing: ExposedThing, props: any) {
            thing.setPropertyReadHandler(props.name, () => {
                return new Promise<any>((resolve, reject) => {
                    const finish = (payload) => {
                        resolve(payload)
                    }
                    let msg = {
                        _wot: { finish },
                    }
                    userNode.send([msg, null])
                })
            })
            if (!props.content.readOnly) {
                thing.setPropertyWriteHandler(props.name, async (value: any) => {
                    const v = await value.value()
                    return new Promise<void>((resolve, reject) => {
                        const finish = (payload) => {
                            if (props.content.observable) {
                                thing
                                    .emitPropertyChange(props.name)
                                    .then(() => {
                                        resolve()
                                    })
                                    .catch((err) => {
                                        node.error(`[error] emit property change error. error: ${err.toString()}`)
                                        console.error(`[error] emit property change error. error: `, err)
                                        reject(err)
                                    })
                            } else {
                                resolve()
                            }
                        }
                        let msg = {}
                        setOutput("msg", props.outputAttr, msg, node.context(), v)
                        msg["_wot"] = { finish }
                        userNode.send([null, msg])
                    })
                })
            }
        }

        async function registerActionsProcess(userNode: any, thing: ExposedThing, props: any) {
            thing.setActionHandler(props.name, async (params) => {
                const args = await params.value()
                return new Promise<any>((resolve, reject) => {
                    const finish = (payload) => {
                        resolve(payload)
                    }
                    let msg = {}
                    setOutput("msg", props.outputArgs, msg, node.context(), args)
                    msg["_wot"] = { finish }
                    userNode.send(msg)
                })
            })
        }

        async function createWoTScriptAndExpose(
            thingProps: {
                title: string
                description: string
                id?: string
                securityDefinitions?: any
                security?: string[]
            },
            servientWrapper: ServientWrapper,
            userNodes: any[]
        ) {
            // create TD
            let td = { ...thingProps }
            for (const userNode of userNodes) {
                const props = userNode.getProps()
                td[props.attrType] = {
                    ...td[props.attrType],
                    [props.name]: props.content,
                }
            }
            const thing = await servientWrapper.createThing(td)
            // get elements of TD from each node
            for (const userNode of userNodes) {
                const props = userNode.getProps()
                if (!props.name) {
                    node.warn(`[warn] Not enough settings for td. props.name not specified.`)
                    console.warn("[warn] Not enough settings for td. props: ", props)
                    continue
                }
                if (props.attrType === "properties") {
                    registerPropertiesProcess(userNode, thing, props)
                } else if (props.attrType === "actions") {
                    registerActionsProcess(userNode, thing, props)
                } else if (props.attrType === "events") {
                    // Nothing to do
                }
            }
            const thingDescription = await servientWrapper.exposeThing(thing)
            const thingDescriptions = node.context().global.get("thingDescriptions") || {}
            thingDescriptions[`${config.name}::${thingProps.title}`] = thingDescription
            node.context().global.set("thingDescriptions", thingDescriptions)
            console.debug(`[info] servient started. ${config.name}::${thingProps.title}`)
        }

        async function launchServient() {
            if (config.bindingConfigConstValue && config.bindingConfigType) {
                node.bindingConfig = RED.util.evaluateNodeProperty(
                    config.bindingConfigConstValue,
                    config.bindingConfigType,
                    node
                )
            }

            // create thing
            const bindingType = config.bindingType
            const bindingConfig = node.bindingConfig
            try {
                await waitForFinishPrepareRelatedNodes(userNodes, config._users)
                // make thing title list and security definitions
                const securityDefinitions = []
                const thingTitles = []
                for (const userNode of userNodes) {
                    if (userNode.type === "wot-server-td") {
                        continue
                    }
                    let thingNode = userNode.getThingNode()
                    if (!thingNode) {
                        continue
                    }
                    let title = thingNode.getProps()?.title
                    if (title && !thingTitles.includes(title)) {
                        thingTitles.push(title)
                        // make security definitions for server
                        let secDef = getSecurityDefinition(thingNode.getSecurityScheme())
                        if (secDef.scheme !== "nosec") {
                            securityDefinitions.push(secDef)
                        }
                    }
                }
                // merge security params to bindingConfig
                bindingConfig["security"] = securityDefinitions
                console.debug("[debug] createServient ", node.id, bindingType, bindingConfig)
                const servientWrapper = servientManager.createServientWrapper(node.id, bindingType, bindingConfig)
                await servientWrapper.startServient()
                // Generate and Expose a Thing for each Thing title
                for (const thingTitle of thingTitles) {
                    const targetNodes = userNodes.filter(
                        (n) => n.type !== "wot-server-td" && n.getThingNode().getProps().title === thingTitle
                    )
                    if (targetNodes.length > 0) {
                        const thingNode = targetNodes[0].getThingNode()
                        const thingProps = thingNode.getProps() || {}
                        // add security definition to thingProps
                        const secScheme = thingNode.getSecurityScheme()
                        if (secScheme !== "nosec") {
                            thingProps["securityDefinitions"] = {
                                sc: getSecurityDefinition(secScheme),
                            }
                            thingProps["security"] = ["sc"]
                        }
                        await createWoTScriptAndExpose(thingProps, servientWrapper, targetNodes)
                        servientWrapper.addCredentials(thingProps.title, thingNode.getCredentials())
                    }
                }
                node.running = true
                userNodes.forEach((n) => {
                    if (n.type === "wot-server-td" && n.getOutputTDAfterServerStartFlag() === true) {
                        // send trigger to wot-server-td node for getting TD
                        n.receive({})
                    }
                    n.setServientStatus(node.running)
                })
            } catch (err) {
                throw err
            }
        }

        console.debug("[debug] launch servient. node.id: ", node.id)
        launchServient()
            .then(() => {
                node.debug("[info] success to launch thing. name: " + config.name + " id: " + config.id)
            })
            .catch((err) => {
                node.error("[error] Failed to launch thing. name: " + config.name + " id: " + config.id + " err:" + err)
                console.error(
                    "[error] Failed to launch thing. name: " + config.name + " id: " + config.id + " err: ",
                    err
                )
            })

        node.on("close", function (removed, done) {
            if (servientManager.existServienetWrapper(node.id)) {
                // Exit if already servient.
                console.debug("[debug] endServient. node.id: " + node.id)
                servientManager
                    .removeServientWrapper(node.id)
                    .then(() => {
                        // end servient
                        console.debug("[debug] servient ended. config.id: " + config.id)
                        done()
                    })
                    .catch((err) => {
                        node.error(
                            "[error] failed to remove server. name: " +
                                config.name +
                                " id: " +
                                config.id +
                                " err: " +
                                err
                        )
                        console.error(
                            "[error] failed to remove server. name: " + config.name + " id: " + config.id + " err: ",
                            err
                        )
                        done(err)
                    })
            }
        })
    }

    RED.nodes.registerType("wot-server-config", WoTServerConfig)

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
