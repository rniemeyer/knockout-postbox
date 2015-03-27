require.config({
    paths: {
        "knockout": "../../ext/knockout-3.3.0",
        "knockout-postbox": "../../build/knockout-postbox.min"
    }
});

require(["knockout", "menu", "profile", "notifications", "logger"], function(ko, MenuModel, ProfileModel, NotificationsModel, logger) {
    ko.applyBindings(new MenuModel(), document.getElementById("menu"));
    ko.applyBindings(new ProfileModel(), document.getElementById("profile"));
    ko.applyBindings(new NotificationsModel(), document.getElementById("notifications"));
});