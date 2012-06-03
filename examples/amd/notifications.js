define(["knockout", "knockout-postbox"], function(ko, postbox) {
    return function() {
        this.visible = ko.observable(false);

        //as an alternative, use a direct subscription on the topic to update the observable
        postbox.subscribe("section", function(newValue) {
            this.visible(newValue === "Notifications");
        }, this);

        //subscribe and publish on the "email" topic to keep this observable in sync between view models
        this.emailAddress = ko.observable("ryan@knockmeout.net").syncWith("email");

        this.sendNotifications = ko.observable(false);
    };
});
