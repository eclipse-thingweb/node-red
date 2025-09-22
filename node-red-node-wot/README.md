# Node-RED Packages of node-wot

[![Telegram Group](https://img.shields.io/endpoint?color=neon&url=https%3A%2F%2Ftg.sumanjay.workers.dev%2Fnodewot)](https://t.me/nodewot)
[![Discord](https://img.shields.io/badge/Discord-7289DA?logo=discord&logoColor=white&label=node-wot)](https://discord.gg/JXY2Jzefz3)

A [Node-RED](https://nodered.org/) package of nodes for the [Web of Things](https://www.w3.org/WoT/).

Can be installed from the Node-RED palette manager directly (see [the Node-RED library entry](https://flows.nodered.org/node/@thingweb/node-red-node-wot)) or via npm (see [the npm package](https://www.npmjs.com/package/@thingweb/node-red-node-wot)).
The package provides nodes that can communicate with any HTTP/HTTPS, WebSocket, CoAP/CoAPS, MQTT, OPC UA, and Modbus device based on its [W3C WoT Thing Description](https://www.w3.org/TR/wot-thing-description/).
The package is built upon the [node-wot](https://github.com/eclipse-thingweb/node-wot) runtime environment.

## Provided Nodes

After installation, the package adds ten nodes at the Node-RED palette, each scoped under the __Web of Things__ title.
Those nodes are as follows and needed to interact with different interaction affordances of a Thing:

1) Read Property node;
1) Write Property node;
1) Invoke Action node;
1) Subscribe Event node;
1) Update TD node;
1) Server-End node;
1) Server-property node;
1) Server-Action node;
1) Server-Event node;
1) Server-TD node.

![WoT nodes](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/nodes.png)

## Getting Started

### Consume Things

To consume a Thing and interact with it, drag and drop one of the interaction nodes to a flow.
Then, double-click on that node.
Click the pencil icon next to the _Add new consumed-thing_ dropdown inside the opened window.

![Add new consumed Thing](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/add-thing.png)

A new window will appear.

![Add Thing Description](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/add-td.png)

Now, copy-paste/type in a Thing Description inside the TD JSON box or fetch a Thing Description from a URL.
**Tip:** If you choose the first option, click on the three dots to expand the JSON editor.
After you click "Process"/"Fetch", all protocol bindings supported by the Thing will be enabled (except this package does not support them).
Now, you can leave only the necessary bindings and disable the others.
Or you can leave them all as they are.
Anyway, this can be changed at any time.

If a Thing needs basic authentication (i.e., using username and password) for any of its interaction affordances, you can enable that in the respective checkbox.
**Note:** Only basic authentication is currently supported by this package.
If you enable security, the nodes will automatically infer whether to use authentication for this particular affordance or not based on the provided Thing Description.

Finally, click the red "Add" button in the top right corner.

Now, for all WoT nodes you add to a flow, you will see all the respective interaction affordances populated from the Thing Description.

You can also add more Things and choose a particular one for any node you add.
To see a fetched property value, you can wire it with the "debug" node of Node-RED and see all the values inside the "Debug messages" tab of Node-RED.
Wire an "inject" node with the "Write Property" node to write to a property.
Select JSON format as payload in the "inject" node and plug in your value.

To send an input for an action, you can also wire it with the "inject" node, as explained above.
**Tip:** To invoke an action that does not require input, wire it with an empty "inject" node.

Properties and Actions also support uriVariables.
They can be specified inside "Read Property"/"Write Property"/"Invoke Action" node properties.

Subscribing to an event is pretty much the same as reading a property.

Overall, a basic flow may look like this.

![Flow Example](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/flow-example.png)

### Expose Things

To expose a Thing, firstly, drag & drop one of the nodes belonging to the Thing, either Property(Server-Property), Action(Server-Action), or Event(Server-Event), to the canvas.

When you double-click on that node, a property screen appears.

![Property Screen](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/server-property-settings.png)

On the properties screen, the `Server config` and `Thing config` must be configured. The roles of each config are as follows:

* Server config: Set up the communication method between the client and the Thing.
* Thing config: Set the Thing attributes, such as the Thing title.

By performing `Server config` and `Thing config` in the Server-Property, Server-Action, and Server-Event nodes, you determine how to publish properties, actions, and events.
The following screen will appear if you create a new server config on the properties screen.

![Server Config Screen](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/server-config-settings.png)

Perform the following settings:

* Server name: Specify the server name.
* Binding type: Specify the communication method between the server and the client.
* Binding config: Perform settings according to the type of binding.

If you create a new thing config on the properties screen, the following screen will appear.

![Thing Config Screen](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/thing-config-settings.png)

Specify the Thing title. The Thing title will be included in the Thing Description.

Description and Thing ID are optional; if Thing ID is not specified, Thing ID will be generated automatically.

Server config and Thing config can be shared across multiple Server-Property, Server-Action, and Server-Event nodes. By sharing configs, you can publish one or more properties, actions, and events to the client as a single Thing.

In addition to server config and Thing config, there are necessary settings for each Server-Property, Server-Action, and Server-Event node. For the settings of each node, refer to the node help.
Help can be viewed on the Node-RED editor's Help tab.

The Server-End node represents the end of a flow executed by a client request.
Flows connected to the two output terminals of the Server-Property node (read/write requests) and the output terminal of the Server-Action node must end with the Server-End node.

Here's an example of a flow:

![Server Flow Example](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/server-flow-example.png)

The Thing Description required when the client uses a Thing is set in the thingDescriptions object of the global context. The member name is `<server name>::<Thing title>`.
If you want to check the Thing Description, open the Context Data tab of the Node-RED editor and press the refresh icon of the Global context to display it.

![Reference TD](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/reference-td.png)

The Thing Description can also be obtained using the Server-TD node.

Also, the client can use the Update TD node to replace the Thing Description. For example, if the server URL changes, the destination server can be changed without restarting the flow.

You can get the Example from the Import menu of the Node-RED editor for reference.

![Import Example Flows](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/import-example-flows.png)

Currently, the supported binding types are HTTP, CoAP, and MQTT. As shown in the table below, each of these bindings has its own available/unavailable functions. Available functions are denoted by `✓` and unavailable functions are denoted by `-`.

| |http|coap|mqtt|
| :---: | :--- | :--- | :--- |
|read property|✓|✓|-|
|observe property|✓ *1|-|✓|
|write property|✓|✓|✓|
|invoke action|✓|✓|-|
|subscribe event|✓ *1|-|✓|

*1: After the connection with the server times out after 1 hour, it is not reconnected

Also, it is unclear how to define the flow when the data type is null.

## Plugin: Automatic WoT Consumer Flow Creation

This plugin allows the automatic creation of Consumer flows with UIs for WoT Things.
This UI can be from a web browser.

Please install the `@flowfuse/node-red-dashboard` node beforehand, as the UI functionality depends on it.
Nodes are installed by clicking on the menu icon in the upper right corner and then clicking on the Manage palette.

The procedure for creating a Consumer flow and using it from a web browser is as follows:

1. Click on the `Create WoT Consumer flow` when you click on the menu icon in the upper right corner.  
![Menu Create WoT Consumer Flow](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/menu-create-wot-consumer-flow.png)
2. When the dialog screen for entering the Thing Description appears, copy and paste the Thing Description and click the `OK` button.
![Dialog for Create WoT Consumer flow](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/dialog-for-create-wot-consumer-flow.png)
3. When the new flow screen appears, place the created flow.
![Created WoT Consumer Flow](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/created-wot-consumer-flow.png)
4. Press the `Deploy` button to execute the created flow.
5. Display the `Dashboard 2.0` tab and press the `Open Dashboard` button.
![Dashboard tab](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/dashboard-tab.png)
6. The WoT Consumer UI will appear in your web browser.
![WoT Consumer UI](https://raw.githubusercontent.com/eclipse-thingweb/node-red/main/node-red-node-wot/screenshots/wot-consumer-screen.png)

Feel free to modify the created flow.
