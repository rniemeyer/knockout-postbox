define(["knockout", "knockout-postbox"], function(ko) {
    return function() {
        //publish updates to the nick name
        this.nickName = ko.observable("Ryan").publishOn("nickName");

        //apply a filter to turn the value that we receive into a boolean
        this.visible = ko.observable().subscribeTo("section", function(newValue) {
            return newValue === "Profile";
        });

        //subscribe and publish on the "email" topic to keep this observable in sync between view models
        this.emailAddress = ko.observable("ryan@knockmeout.net").syncWith("email");
    };
});