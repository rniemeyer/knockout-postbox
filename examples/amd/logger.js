define(["knockout-postbox"], function(postbox) {
    if (typeof console !== "undefined") {
        var topics, subscriptions, logOne, enable, disable;

        topics = ["email", "section", "nickName"];
        subscriptions = [];

        //log messages on a single topic
        logOne = function(topic)  {
            return postbox.subscribe(topic, function(newValue) {
                console.log("message for \"" + topic + "\" with value: " + newValue);
            });
        };

        //subscribe to all of the topics
        enable = function() {
            var i, length, topic;
            for (i = 0, length = topics.length; i < length; i++) {
                subscriptions.push(logOne(topics[i]));
            }
        };

        //remove subscriptions
        disable = function() {
            var i, length;
            for (i = 0, length = subscriptions.length; i < length; i++) {
                subscriptions[i].dispose();
            }
        };

        //enable or disable logging
        postbox.subscribe("loggingEnabled", function(newValue) {
            if (newValue) {
                enable();
            } else {
                disable();
            }
        });
    }
});