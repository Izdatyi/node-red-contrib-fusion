module.exports = function(RED) {
  function Fusion(config) {
    RED.nodes.createNode(this, config);

    const node = this;

    // In memory database
    // The key is the topic, the value is the message content
    const database = new Map();

    // Definitions of dictionaries
    // They key is their output-topic and the value is
    // dictionary the instance
    const dictionaries = new Map();

    // Map of dictionaries.
    // The key is the topic, the value is a set of dictionaries
    const dictionariesPerTopic = new Map();

    // Set of dirty dictionaries for the current iteration
    const dirtyDictionaries = new Set();

    const removeDictionaryFromOutputTopic = function(outputTopic) {
        node.log(outputTopic);
        const dictionary = dictionaries.get(outputTopic);
        if (dictionary) {
          node.log("wut");
          dictionaries.delete(dictionary);
          dirtyDictionaries.delete(dictionary);
          dictionary.topics.forEach((topic) => {
            node.log("wet");
            dictionariesPerTopic.forEach((dictionaries) => {
              node.log("wat");
              dictionaries.delete(dictionary);
            });
          });
        }
    };

    const processDirtyDictionaries = function() {
      dirtyDictionaries.forEach((dictionary) => {
        const payload = {};
        let containsUndefined = false;
        dictionary.topics.forEach((topic) => {
          const valueInDatabase = database.get(topic);
          payload[topic] = valueInDatabase;
          if (valueInDatabase === undefined) {
            containsUndefined = true;
          }
        });

        if (!containsUndefined || dictionary.allowUndefined) {
          node.send({
            topic: dictionary.outputTopic,
            payload
          });
        }
      });
      dirtyDictionaries.clear();
    };

    node.on("input", function(msg) {
      const topic = msg.topic;
      const payload = msg.payload;

      // If it's a configuration
      if (topic === 'fusion-configuration') {
        if (!payload) {
          node.error("Invalid fusion-configuration message, the payload is invalid.");
          return;
        }

        const outputTopic = payload.outputTopic || 'fusion';
        const allowUndefined = !!payload.allowUndefined;
        const topics = new Set();


        // Check if a dictionary with the same output topic already exists and remove it in this case
        let dictionary = dictionaries.get(outputTopic);
        if (dictionary) {
          removeDictionaryFromOutputTopic(payload);
        }

        dictionary = {
          outputTopic,
          topics,
          allowUndefined
        };

        (payload.inputTopics||[]).forEach((inputTopic) => {
          let dictionariesForTopicSet = dictionariesPerTopic.get(inputTopic);
          if (!dictionariesForTopicSet) {
            dictionariesForTopicSet = new Set();
            dictionariesPerTopic.set(inputTopic, dictionariesForTopicSet);
          }
          dictionariesForTopicSet.add(dictionary);
          topics.add(inputTopic);
        });

        // A new configuration is always a dirty dictionary
        dirtyDictionaries.add(dictionary);
        dictionaries.set(outputTopic, dictionary);
       
        // Process the dirty dictionaries at the next tick 
        processDirtyDictionaries();

      // If it's a deletion
      } else if (topic === 'fusion-deletion') {
        removeDictionaryFromOutputTopic(payload);

      // If it's a normal message
      } else {
        // We alway save the message in the database
        database.set(topic, msg);

        // Find dictionaries related to the topic
        const dictionaries = dictionariesPerTopic.get(topic);

        if (dictionaries) {
          // Mark the dirty dictionaries
          dictionaries.forEach((dictionary) => {
            dirtyDictionaries.add(dictionary);
          });

          // And process them at the next tick
          processDirtyDictionaries();
        }
      }
    });
  }

  RED.nodes.registerType("fusion", Fusion);
}