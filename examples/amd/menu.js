define(["knockout", "knockout-postbox"], function(ko) {
    return function() {
        this.name = ko.observable().subscribeTo("nickName");
        this.sections = ["Profile", "Notifications"];
        this.selectedSection = ko.observable().publishOn("section");
        this.loggingEnabled = ko.observable(false).publishOn("loggingEnabled");
    };
});