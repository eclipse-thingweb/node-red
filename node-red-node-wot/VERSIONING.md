# Versioning

The package uses [semantic versioning](https://semver.org/) with the following meanings to different versions:

- Patch: Under the hood, documentation and UI annotation fixes:
  - The user flow sees no change other than some human-readable text within Node-RED.
  - Even if node-wot gets a major overhaul but nothing changes for the Node-RED user, this versioning applies. For example, changing to .value() function was a major change in node-wot but this would have no impact to the Node RED user.
  - Of course, if there are incompatible changes in the node-wot to be incorporated: Raise Major.
- Minor: Adding new features that influence the Node RED UI and add new nodes, new configuration fields, more options to configuration fields. An existing user flow does not break nor sees any change.
- Major: Changing the existing features such as removing nodes, removing configuration settings. An existing user flow breaks and the user needs to manually do some changes.
