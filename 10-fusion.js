module.exports = function(RED) {
  function Fusion(config) {
    RED.nodes.createNode(this, config);

    node.on("input", function(msg) {
      node.send(msg);
    });
  }

  RED.nodes.registerType("fusion", Fusion);
}