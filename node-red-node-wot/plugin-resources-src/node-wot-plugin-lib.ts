import { detectProtocolSchemes } from "@thingweb/td-utils/build";

const PROTOCOLS = ["http", "ws", "coap", "mqtt", "opcua", "modbus"]
const DATATYPES = {
    string: {
        inputMode: "text",
        typeConvert: "String",
    },
    number: {
        inputMode: "number",
        typeConvert: "Number",
    },
    integer: {
        inputMode: "number",
        typeConvert: "Number",
    },
    boolean: {
        inputMode: "text",
        typeConvert: "JSON.parse",
    },
    object: {
        inputMode: "textarea",
        typeConvert: "JSON.parse",
    },
    array: {
        inputMode: "textarea",
        typeConvert: "JSON.parse",
    },
    propertyTypeNull: {
        inputMode: "text",
        typeConvert: "JSON.parse",
    },
    actionInputTypeNull: {
        inputMode: null,
        typeConvert: "",
    },
}
const COMMON_ID_COUNT = 7
const PROPERTY_ID_COUNT = 19
const ACTION_ID_COUNT = 14
const EVENT_ID_COUNT = 7

/** initial y for putting node on canvas */
const INITIAL_Y = 40
/** gap of y for putting node on canvas */
const Y_GAP = 50
/** index of common-genid for ui-base node in template */
const UIBASE_ID_INDEX = 3

export const createClientFlowUsingDashboard = (tdString: string, existedNodes: any) => {
    let existedUiBaseId
    for (let node of existedNodes) {
        if (node.type === "ui-base" && node.name === "things-dashboard") {
            existedUiBaseId = node.id
        }
    }
    const td = JSON.parse(tdString)
    const commonGenIds: string[] = []
    for (let i = 0; i < COMMON_ID_COUNT; i++) {
        commonGenIds.push(generateId())
    }
    if (existedUiBaseId) {
        commonGenIds[UIBASE_ID_INDEX] = existedUiBaseId
    }
    let flow = []
    const tdTitle = td.title
    const tdDescription = td.description
    const availableBinding = {}
    PROTOCOLS.forEach((protocol) => {
        availableBinding[protocol] = checkBinding(tdString, protocol)
    })
    const commonParams = {
        tdTitle,
        tdDescription,
        tdString,
        td: JSON.stringify(td).replace(/\"/g, `\\"`),
        ...availableBinding,
    }
    let offsetY = INITIAL_Y
    let flowAndOffsetY = makeCommonFlow(commonGenIds, commonParams, offsetY, existedUiBaseId)
    flow = flow.concat(flowAndOffsetY.flow)
    if (td.properties) {
        for (let propertyName in td.properties) {
            const propertyGenIds: string[] = []
            for (let i = 0; i < PROPERTY_ID_COUNT; i++) {
                propertyGenIds.push(generateId())
            }
            const tdProperty = td.properties[propertyName]
            const propertyParams = {
                ...commonParams,
                propertyName,
                propertyDescription: tdProperty.description,
                propertyObserve: tdProperty.observable,
                inputMode: DATATYPES[tdProperty.type || "propertyTypeNull"].inputMode,
                convert: DATATYPES[tdProperty.type || "propertyTypeNull"].typeConvert,
            }
            flowAndOffsetY = makePropertyFlow(
                commonGenIds,
                propertyGenIds,
                propertyParams,
                tdProperty,
                flowAndOffsetY.offsetY
            )
            flow = flow.concat(flowAndOffsetY.flow)
        }
    }
    if (td.actions) {
        for (let actionName in td.actions) {
            const actionGenIds: string[] = []
            for (let i = 0; i < ACTION_ID_COUNT; i++) {
                actionGenIds.push(generateId())
            }
            const tdAction = td.actions[actionName]
            const actionParams = {
                ...commonParams,
                actionName,
                actionDescription: tdAction.description,
                inputMode: DATATYPES[tdAction.input?.type || "actionInputTypeNull"].inputMode,
                convert: DATATYPES[tdAction.input?.type || "actionInputTypeNull"].typeConvert,
            }
            flowAndOffsetY = makeActionFlow(commonGenIds, actionGenIds, actionParams, tdAction, flowAndOffsetY.offsetY)
            flow = flow.concat(flowAndOffsetY.flow)
        }
    }
    if (td.events) {
        for (let eventName in td.events) {
            const eventGenIds: string[] = []
            for (let i = 0; i < EVENT_ID_COUNT; i++) {
                eventGenIds.push(generateId())
            }
            const tdEvent = td.events[eventName]
            const eventParams = {
                ...commonParams,
                eventName,
                eventDescription: tdEvent.description,
            }
            flowAndOffsetY = makeEventFlow(commonGenIds, eventGenIds, eventParams, flowAndOffsetY.offsetY)
            flow = flow.concat(flowAndOffsetY.flow)
        }
    }
    const flowString = JSON.stringify(flow)
    var importOptions = { generateIds: false, addFlow: true }
    //@ts-ignore
    RED.view.importNodes(flowString, importOptions)
}

const replaceAll = (text, pattern, replacement) => {
    while (true) {
        let after = text.replace(pattern, replacement)
        if (text !== after) {
            text = after
        } else {
            break
        }
    }
    return text
}

const replaceIds = (flowStr, ids, prefix) => {
    if (ids) {
        for (let i = 0; i < ids.length; i++) {
            flowStr = replaceAll(flowStr, `<%${prefix}-genid(${i})%>`, ids[i])
        }
    }
    return flowStr
}

const replaceParamsAndIds = (
    flowTemplate,
    params,
    commonGenIds,
    propertyGenIds,
    actionGenIds,
    eventGenIds,
    offsetY
) => {
    let flowStr = flowTemplate
    if (params) {
        for (let key in params) {
            flowStr = replaceAll(flowStr, `<%${key}%>`, params[key])
        }
    }
    flowStr = replaceIds(flowStr, commonGenIds, "common")
    flowStr = replaceIds(flowStr, propertyGenIds, "property")
    flowStr = replaceIds(flowStr, actionGenIds, "action")
    flowStr = replaceIds(flowStr, eventGenIds, "event")
    for (let y = 0; true; y++) {
        if (flowStr.indexOf(`<%y${y}%>`) === -1) {
            break
        }
        flowStr = replaceAll(flowStr, `<%y${y}%>`, offsetY)
        offsetY += Y_GAP
    }
    let flow = JSON.parse(flowStr)
    return { flow, offsetY }
}

const makeCommonFlow = (commonGenIds, params, offsetY, existedUiBaseId) => {
    let flowAndOffsetY = replaceParamsAndIds(THING_COMMON_TEMP, params, commonGenIds, null, null, null, offsetY)
    // if ui-base node already existed on canvas, remove the node from new flow
    let flow = flowAndOffsetY.flow.filter((node) => node.id !== existedUiBaseId)
    flowAndOffsetY.flow = flow
    return flowAndOffsetY
}

const makePropertyFlow = (commonGenIds, propertyGenIds, params, tdProperty, offsetY) => {
    let flow = []
    let flowAndOffsetY = replaceParamsAndIds(
        PROPERTY_COMMON_TEMP,
        params,
        commonGenIds,
        propertyGenIds,
        null,
        null,
        offsetY
    )
    flow = flow.concat(flowAndOffsetY.flow)
    if (!tdProperty.writeOnly) {
        flowAndOffsetY = replaceParamsAndIds(
            PROPERTY_READ_TEMP,
            params,
            commonGenIds,
            propertyGenIds,
            null,
            null,
            flowAndOffsetY.offsetY
        )
        flow = flow.concat(flowAndOffsetY.flow)
        if (["integer", "number"].includes(tdProperty.type)) {
            flowAndOffsetY = replaceParamsAndIds(
                PROPERTY_READ_CHART_TEMP,
                params,
                commonGenIds,
                propertyGenIds,
                null,
                null,
                flowAndOffsetY.offsetY
            )
            flow = flow.concat(flowAndOffsetY.flow)
        }
    }
    if (!tdProperty.readOnly) {
        flowAndOffsetY = replaceParamsAndIds(
            PROPERTY_WRITE_TEMP,
            params,
            commonGenIds,
            propertyGenIds,
            null,
            null,
            flowAndOffsetY.offsetY
        )
        flow = flow.concat(flowAndOffsetY.flow)
    }
    return { flow, offsetY: flowAndOffsetY.offsetY }
}

const makeActionFlow = (commonGenIds, actionGenIds, params, tdAction, offsetY) => {
    let flow = []
    let flowAndOffsetY = replaceParamsAndIds(
        ACTION_COMMON_TEMP,
        params,
        commonGenIds,
        null,
        actionGenIds,
        null,
        offsetY
    )
    flow = flow.concat(flowAndOffsetY.flow)
    if (tdAction.input?.type) {
        flowAndOffsetY = replaceParamsAndIds(
            ACTION_ARGS_TEMP,
            params,
            commonGenIds,
            null,
            actionGenIds,
            null,
            flowAndOffsetY.offsetY
        )
        flow = flow.concat(flowAndOffsetY.flow)
    }
    flowAndOffsetY = replaceParamsAndIds(
        ACTION_BUTTON_TEMP,
        params,
        commonGenIds,
        null,
        actionGenIds,
        null,
        flowAndOffsetY.offsetY
    )
    flow = flow.concat(flowAndOffsetY.flow)
    return { flow, offsetY: flowAndOffsetY.offsetY }
}

const makeEventFlow = (commonGenIds, eventGenIds, params, offsetY) => {
    let flowAndOffsetY = replaceParamsAndIds(EVENT_TEMP, params, commonGenIds, null, null, eventGenIds, offsetY)
    return flowAndOffsetY
}

/**
 * <copy from @node-red/util/lib/util.js>
 *
 * Generates a psuedo-unique-random id.
 * @return {String} a random-ish id
 * @memberof @node-red/util_util
 */
function generateId() {
    var bytes = []
    for (var i = 0; i < 8; i++) {
        bytes.push(
            //@ts-ignore
            Math.round(0xff * Math.random())
                .toString(16)
                .padStart(2, "0")
        )
    }
    return bytes.join("")
}

function checkBinding(tdStr: string, binding: string) {
    // In case of OPC UA we look for opc.tcp in href not opcua
    binding = binding === "opcua" ? "opc.tcp" : binding
    // Also different for Modbus
    binding = binding === "modbus" ? "modbus+tcp" : binding

    const bindings = Object.keys(detectProtocolSchemes(tdStr))
    
    return bindings.includes(binding)
}

const THING_COMMON_TEMP = `[
    {
        "id": "<%common-genid(0)%>",
        "type": "comment",
        "z": "",
        "name": "Title: <%tdTitle%>",
        "info": "",
        "x": 90,
        "y": <%y0%>,
        "wires": []
    },
    {
        "id": "<%common-genid(1)%>",
        "type": "consumed-thing",
        "tdLink": "",
        "td": "<%td%>",
        "http": <%http%>,
        "ws": <%ws%>,
        "coap": <%coap%>,
        "mqtt": <%mqtt%>,
        "opcua": <%opcua%>,
        "modbus": <%modbus%>,
        "basicAuth": false,
        "username": "",
        "password": ""
    },
    {
        "id": "<%common-genid(2)%>",
        "type": "ui-page",
        "name": "<%tdTitle%>",
        "ui": "<%common-genid(3)%>",
        "path": "/<%tdTitle%>",
        "icon": "no-icon",
        "layout": "grid",
        "theme": "<%common-genid(4)%>",
        "order": -1,
        "className": "",
        "visible": "true",
        "disabled": "false"
    },
    {
        "id": "<%common-genid(3)%>",
        "type": "ui-base",
        "name": "things-dashboard",
        "path": "/dashboard",
        "includeClientData": true,
        "acceptsClientConfig": [
            "ui-notification",
            "ui-control"
        ],
        "showPathInSidebar": false,
        "navigationStyle": "default"
    },
    {
        "id": "<%common-genid(4)%>",
        "type": "ui-theme",
        "name": "things theme",
        "colors": {
            "surface": "#ffffff",
            "primary": "#0094ce",
            "bgPage": "#eeeeee",
            "groupBg": "#ffffff",
            "groupOutline": "#cccccc"
        },
        "sizes": {
            "pagePadding": "12px",
            "groupGap": "12px",
            "groupBorderRadius": "4px",
            "widgetGap": "12px"
        }
    },
    {
        "id": "<%common-genid(5)%>",
        "type": "ui-group",
        "name": "header",
        "page": "<%common-genid(2)%>",
        "width": "12",
        "height": "1",
        "order": -1,
        "showTitle": false,
        "className": "",
        "visible": "true",
        "disabled": "false"
    },
    {
        "id": "<%common-genid(6)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%common-genid(5)%>",
        "order": 0,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "<%tdDescription%>",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 140,
        "y": <%y1%>,
        "wires": []
    }
]`

const PROPERTY_COMMON_TEMP = `[
    {
        "id": "<%property-genid(0)%>",
        "type": "comment",
        "z": "",
        "name": "Property: <%propertyName%>",
        "info": "",
        "x": 140,
        "y": <%y0%>,
        "wires": []
    },
    {
        "id": "<%property-genid(1)%>",
        "type": "ui-group",
        "name": "Property: <%propertyName%>",
        "page": "<%common-genid(2)%>",
        "width": "12",
        "height": "1",
        "order": 1,
        "showTitle": true,
        "className": "",
        "visible": "true",
        "disabled": "false"
    },
    {
        "id": "<%property-genid(2)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%property-genid(1)%>",
        "order": 1,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "<%propertyDescription%>",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 180,
        "y": <%y1%>,
        "wires": []
    }
]`
const PROPERTY_READ_TEMP = `[
    {
        "id": "<%property-genid(3)%>",
        "type": "ui-button",
        "z": "",
        "group": "<%property-genid(1)%>",
        "name": "",
        "label": "read",
        "order": 4,
        "width": 0,
        "height": 0,
        "passthru": false,
        "tooltip": "",
        "color": "",
        "bgcolor": "",
        "className": "",
        "icon": "",
        "payload": "",
        "payloadType": "str",
        "topic": "topic",
        "topicType": "msg",
        "x": 180,
        "y": <%y0%>,
        "wires": [
            [
                "<%property-genid(4)%>",
                "<%property-genid(6)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(4)%>",
        "type": "function",
        "z": "",
        "name": "invoke time",
        "func": "msg.payload = \`property read invoked (\${new Date().toLocaleString()})\`\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 480,
        "y": <%y0%>,
        "wires": [
            [
                "<%property-genid(5)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(5)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%property-genid(1)%>",
        "order": 5,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": "16",
        "color": "#717171",
        "className": "",
        "x": 780,
        "y": <%y0%>,
        "wires": []
    },
    {
        "id": "<%property-genid(6)%>",
        "type": "read-property",
        "z": "",
        "name": "",
        "topic": "",
        "thing": "<%common-genid(1)%>",
        "property": "<%propertyName%>",
        "uriVariables": "{}",
        "observe": <%propertyObserve%>,
        "x": 480,
        "y": <%y1%>,
        "wires": [
            [
                "<%property-genid(7)%>",
                "<%property-genid(9)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(7)%>",
        "type": "function",
        "z": "",
        "name": "characterization",
        "func": "msg.payload = \`\${JSON.stringify(msg.payload)} (\${new Date().toLocaleString()})\`\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 780,
        "y": <%y1%>,
        "wires": [
            [
                "<%property-genid(8)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(8)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%property-genid(1)%>",
        "order": 2,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "latest value",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 1080,
        "y": <%y1%>,
        "wires": []
    }
]`

const PROPERTY_READ_CHART_TEMP = `[
    {
        "id": "<%property-genid(9)%>",
        "type": "ui-chart",
        "z": "",
        "group": "<%property-genid(1)%>",
        "name": "",
        "label": "<%propertyName%> chart",
        "order": 3,
        "chartType": "line",
        "category": "<%propertyName%>",
        "categoryType": "str",
        "xAxisProperty": "",
        "xAxisPropertyType": "msg",
        "xAxisType": "time",
        "yAxisProperty": "",
        "ymin": "",
        "ymax": "",
        "action": "append",
        "pointShape": "circle",
        "pointRadius": 4,
        "showLegend": true,
        "removeOlder": 1,
        "removeOlderUnit": "3600",
        "removeOlderPoints": "",
        "colors": [
            "#1f77b4",
            "#aec7e8",
            "#ff7f0e",
            "#2ca02c",
            "#98df8a",
            "#d62728",
            "#ff9896",
            "#9467bd",
            "#c5b0d5"
        ],
        "width": 12,
        "height": 6,
        "className": "",
        "x": 780,
        "y": <%y0%>,
        "wires": [
            []
        ]
    }
]`

const PROPERTY_WRITE_TEMP = `[
    {
        "id": "<%property-genid(10)%>",
        "type": "ui-text-input",
        "z": "",
        "group": "<%property-genid(1)%>",
        "name": "write data",
        "label": "write data",
        "order": 6,
        "width": "7",
        "height": "1",
        "topic": "topic",
        "topicType": "msg",
        "mode": "<%inputMode%>",
        "delay": 300,
        "passthru": true,
        "sendOnDelay": false,
        "sendOnBlur": true,
        "sendOnEnter": false,
        "className": "",
        "x": 180,
        "y": <%y0%>,
        "wires": [
            [
                "<%property-genid(11)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(11)%>",
        "type": "change",
        "z": "",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "propertyWriteValue_<%property-genid(12)%>",
                "pt": "flow",
                "to": "payload",
                "tot": "msg"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 480,
        "y": <%y0%>,
        "wires": [
            []
        ]
    },
    {
        "id": "<%property-genid(13)%>",
        "type": "ui-button",
        "z": "",
        "group": "<%property-genid(1)%>",
        "name": "",
        "label": "write",
        "order": 7,
        "width": "5",
        "height": "1",
        "passthru": false,
        "tooltip": "",
        "color": "",
        "bgcolor": "",
        "className": "",
        "icon": "",
        "iconPosition": "left",
        "payload": "",
        "payloadType": "str",
        "topic": "topic",
        "topicType": "msg",
        "x": 180,
        "y": <%y1%>,
        "wires": [
            [
                "<%property-genid(14)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(14)%>",
        "type": "change",
        "z": "",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "propertyWriteValue_<%property-genid(12)%>",
                "tot": "flow"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 480,
        "y": <%y1%>,
        "wires": [
            [
                "<%property-genid(15)%>",
                "<%property-genid(17)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(15)%>",
        "type": "function",
        "z": "",
        "name": "invoke time",
        "func": "msg.payload = \`property write invoked (\${new Date().toLocaleString()})\`\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 780,
        "y": <%y1%>,
        "wires": [
            [
                "<%property-genid(16)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(16)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%property-genid(1)%>",
        "order": 8,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 1080,
        "y": <%y1%>,
        "wires": []
    },
    {
        "id": "<%property-genid(17)%>",
        "type": "function",
        "z": "",
        "name": "change data type",
        "func": "msg.payload = <%convert%>(msg.payload)\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 780,
        "y": <%y2%>,
        "wires": [
            [
                "<%property-genid(18)%>"
            ]
        ]
    },
    {
        "id": "<%property-genid(18)%>",
        "type": "write-property",
        "z": "",
        "name": "",
        "topic": "",
        "thing": "<%common-genid(1)%>",
        "property": "<%propertyName%>",
        "uriVariables": "{}",
        "x": 1080,
        "y": <%y2%>,
        "wires": []
    }
]`

const ACTION_COMMON_TEMP = `[
    {
        "id": "<%action-genid(0)%>",
        "type": "comment",
        "z": "",
        "name": "Action: <%actionName%>",
        "info": "",
        "x": 140,
        "y": <%y0%>,
        "wires": []
    },
    {
        "id": "<%action-genid(1)%>",
        "type": "ui-group",
        "name": "Action: <%actionName%>",
        "page": "<%common-genid(2)%>",
        "width": "12",
        "height": "1",
        "order": 2,
        "showTitle": true,
        "className": "",
        "visible": "true",
        "disabled": "false"
    },
    {
        "id": "<%action-genid(13)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%action-genid(1)%>",
        "order": 1,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "<%actionDescription%>",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 180,
        "y": <%y1%>,
        "wires": []
    }
]`

const ACTION_ARGS_TEMP = `[
    {
        "id": "<%action-genid(2)%>",
        "type": "ui-text-input",
        "z": "",
        "group": "<%action-genid(1)%>",
        "name": "",
        "label": "argument of action",
        "order": 2,
        "width": "7",
        "height": "1",
        "topic": "topic",
        "topicType": "msg",
        "mode": "<%inputMode%>",
        "delay": 300,
        "passthru": true,
        "sendOnDelay": false,
        "sendOnBlur": true,
        "sendOnEnter": false,
        "className": "",
        "x": 180,
        "y": <%y0%>,
        "wires": [
            [
                "<%action-genid(3)%>"
            ]
        ]
    },
    {
        "id": "<%action-genid(3)%>",
        "type": "change",
        "z": "",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "actionArg_<%action-genid(4)%>",
                "pt": "flow",
                "to": "payload",
                "tot": "msg"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 480,
        "y": <%y0%>,
        "wires": [
            []
        ]
    }
]`

const ACTION_BUTTON_TEMP = `[
    {
        "id": "<%action-genid(5)%>",
        "type": "ui-button",
        "z": "",
        "group": "<%action-genid(1)%>",
        "name": "",
        "label": "execute",
        "order": 3,
        "width": "5",
        "height": "1",
        "passthru": false,
        "tooltip": "",
        "color": "",
        "bgcolor": "",
        "className": "",
        "icon": "",
        "iconPosition": "left",
        "payload": "",
        "payloadType": "str",
        "topic": "topic",
        "topicType": "msg",
        "x": 180,
        "y": <%y0%>,
        "wires": [
            [
                "<%action-genid(6)%>",
                "<%action-genid(8)%>"
            ]
        ]
    },
    {
        "id": "<%action-genid(6)%>",
        "type": "function",
        "z": "",
        "name": "invoke time",
        "func": "msg.payload = \`action invoked (\${new Date().toLocaleString()})\`\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 480,
        "y": <%y0%>,
        "wires": [
            [
                "<%action-genid(7)%>"
            ]
        ]
    },
    {
        "id": "<%action-genid(7)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%action-genid(1)%>",
        "order": 4,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 780,
        "y": <%y0%>,
        "wires": []
    },
    {
        "id": "<%action-genid(8)%>",
        "type": "change",
        "z": "",
        "name": "",
        "rules": [
            {
                "t": "set",
                "p": "payload",
                "pt": "msg",
                "to": "actionArg_<%action-genid(4)%>",
                "tot": "flow"
            }
        ],
        "action": "",
        "property": "",
        "from": "",
        "to": "",
        "reg": false,
        "x": 480,
        "y": <%y1%>,
        "wires": [
            [
                "<%action-genid(9)%>"
            ]
        ]
    },
    {
        "id": "<%action-genid(9)%>",
        "type": "function",
        "z": "",
        "name": "change data type",
        "func": "msg.payload = <%convert%>(msg.payload)\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 780,
        "y": <%y1%>,
        "wires": [
            [
                "<%action-genid(10)%>"
            ]
        ]
    },
    {
        "id": "<%action-genid(10)%>",
        "type": "invoke-action",
        "z": "",
        "name": "",
        "topic": "",
        "thing": "<%common-genid(1)%>",
        "action": "<%actionName%>",
        "uriVariables": "{}",
        "x": 1080,
        "y": <%y1%>,
        "wires": [
            [
                "<%action-genid(11)%>"
            ]
        ]
    },
    {
        "id": "<%action-genid(11)%>",
        "type": "function",
        "z": "",
        "name": "characterization",
        "func": "msg.payload = \`\${JSON.stringify(msg.payload)} (\${new Date().toLocaleString()})\`\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 1380,
        "y": <%y1%>,
        "wires": [
            [
                "<%action-genid(12)%>"
            ]
        ]
    },
    {
        "id": "<%action-genid(12)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%action-genid(1)%>",
        "order": 5,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "result of action",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 1680,
        "y": <%y1%>,
        "wires": []
    }
]`

const EVENT_TEMP = `[
    {
        "id": "<%event-genid(0)%>",
        "type": "comment",
        "z": "",
        "name": "Event: <%eventName%>",
        "info": "",
        "x": 140,
        "y": <%y0%>,
        "wires": []
    },
    {
        "id": "<%event-genid(1)%>",
        "type": "ui-group",
        "name": "Event: <%eventName%>",
        "page": "<%common-genid(2)%>",
        "width": "12",
        "height": "1",
        "order": 3,
        "showTitle": true,
        "className": "",
        "visible": "true",
        "disabled": "false"
    },
    {
        "id": "<%event-genid(6)%>",
        "type": "ui-text",
        "z": "",
        "group": "<%event-genid(1)%>",
        "order": 1,
        "width": 0,
        "height": 0,
        "name": "",
        "label": "<%eventDescription%>",
        "format": "{{msg.payload}}",
        "layout": "row-spread",
        "style": false,
        "font": "",
        "fontSize": 16,
        "color": "#717171",
        "className": "",
        "x": 180,
        "y": <%y1%>,
        "wires": []
    },
    {
        "id": "<%event-genid(2)%>",
        "type": "subscribe-event",
        "z": "",
        "name": "",
        "topic": "<%tdTitle%>:<%eventName%>",
        "thing": "<%common-genid(1)%>",
        "event": "<%eventName%>",
        "x": 180,
        "y": <%y2%>,
        "wires": [
            [
                "<%event-genid(5)%>",
                "<%event-genid(3)%>"
            ]
        ]
    },
    {
        "id": "<%event-genid(3)%>",
        "type": "function",
        "z": "",
        "name": "make event data for display",
        "func": "let events = flow.get(\\"<%tdTitle%>:<%eventName%>\\")\\nif(!events) events = []\\nevents.unshift({\\n    time: new Date().toLocaleString(),\\n    source: msg.topic,\\n    event: JSON.stringify(msg.payload)\\n})\\nflow.set(\\"<%tdTitle%>:<%eventName%>\\", events)\\nmsg.payload = events\\nreturn msg",
        "outputs": 1,
        "timeout": 0,
        "noerr": 0,
        "initialize": "",
        "finalize": "",
        "libs": [],
        "x": 480,
        "y": <%y2%>,
        "wires": [
            [
                "<%event-genid(4)%>"
            ]
        ]
    },
    {
        "id": "<%event-genid(4)%>",
        "type": "ui-table",
        "z": "",
        "group": "<%event-genid(1)%>",
        "name": "",
        "label": "text",
        "order": 2,
        "width": 0,
        "height": 0,
        "maxrows": "10",
        "autocols": true,
        "columns": [],
        "x": 780,
        "y": <%y2%>,
        "wires": []
    },
    {
        "id": "<%event-genid(5)%>",
        "type": "ui-notification",
        "z": "",
        "ui": "<%common-genid(3)%>",
        "position": "top center",
        "colorDefault": true,
        "color": "#000000",
        "displayTime": "3",
        "showCountdown": true,
        "outputs": 0,
        "allowDismiss": true,
        "dismissText": "Close",
        "raw": false,
        "className": "",
        "name": "",
        "x": 480,
        "y": <%y3%>,
        "wires": []
    }
]`
