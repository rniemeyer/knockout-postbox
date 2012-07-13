knockout-postbox
================
*knockout-postbox* is a [Knockout.js](http://knockoutjs.com/) plugin designed to use Knockout's basic pub/sub capabilities to facilitate decoupled communication between separate view models / components.

More background here: http://www.knockmeout.net/2012/05/using-ko-native-pubsub.html

Basic Usage
-----------

*knockout-postbox* creates a `ko.postbox` object that can be used for basic pub/sub communication. However, typically you would use the observable extensions rather than calling the `ko.postbox` APIs directly, unless you are integrating with a non-KO component.

**subscribe** *- ko.postbox.subscribe(topic, handler, target)*

```js
ko.postbox.subscribe("mytopic", function(newValue) {
    this.topic("Topic: " + newValue);
}, viewModel);
```


**publish** *- ko.postbox.publish(topic, value)*

```js
ko.postbox.publish("mytopic", "new value");
```

Observable Extensions
---------------------

*knockout-postbox* augments **observables**, **observableArrays**, and **computed observables** to be able to automatically participate in sending and receiving messages through `ko.postbox`.

**subscribeTo** *- subscribeTo(topic, [initializeWithLatestValue], [transform])*

The `subscribeTo` function tells an observable to automatically update itself whenever it receives a message on a topic.

```js
//update the value from messages on "mytopic"
this.topic = ko.observable().subscribeTo("mytopic");

//receive updates from "mytopic" and use the last published value to initialize the observable
this.topic = ko.observable().subscribeTo("mytopic", true);

//receive updates from "mytopic" and update the value after passing it through the transform function
var transform = function(newValue) {
    return newValue && newValue.toLowerCase();
};

this.topic = ko.observable().subscribeTo("mytopic", transform);

//receive updates from "mytopic", initialize with latest published value, and send updates through transform
this.topic = ko.observable().subscribeTo("mytopic", true, transform);
```


**unsubscribeFrom** *- unsubscribeFrom(topic)*

The `unsubscribeFrom` function removes the subscription that an observable has on a topic.

```js
this.topic = ko.observable().unsubscribeFrom("mytopic");
```


**publishOn** *- publishOn(topic, [skipInitialPublish], [equalityComparer])*

The `publishOn` function tells an observable to automatically publish its value on a topic whenever it changes. By default, it will only publish when the new value is not the same (`===`) as the previous value.

```js
//whenever the value changes publish a message on "mytopic"
this.topic = ko.observable(value).publishOn("mytopic");

//publish changes on "mytopic", but skip publishing the current value immediately
this.topic = ko.observable(value).publishOn("mytopic", true);

//publish changes on "mytopic" when the comparer function returns false
var comparer = function(newValue, oldValue) {
    return newValue < oldValue;
};

this.topic = ko.observable(value).publishOn("mytopic", comparer);

//publish changes on "mytopic", skip initial publish, and use override comparer
this.topic = ko.observable(value).publishOn("mytopic", true, comparer);
```


**stopPublishingOn** *- stopPublishingOn(topic)*

The `stopPublishingOn` function removes the subscription used to automatically publish changes to the observable.


**syncWith** *- syncWith(topic, [initializeWithLatestValue], [skipInitialPublish], [equalityComparer])*

The `syncWith` function tells an observable to both subscribe and publish on a topic. This allows observables in two different view models to stay in sync with each other without having direct knowledge of its counterpart.

```js
//subscribe to and publish on a topic
this.topic = ko.observable(value).syncWith("mytopic");
```

**ko.postbox.defaultComparer**

The default comparison done to determine if a value should be published simply uses `===`. At run-time you can supply your own default comparison function by overriding `ko.postbox.defaultComparer`.

Dependencies
------------
* Knockout 2.0+
* JSON2.js - (for IE < 8)

Build
-----
This project uses anvil.js (see http://github.com/arobson/anvil.js) for building/minifying.

Install from NuGet
------------------
    Install-Package Knockout-Postbox

Examples
--------
The `examples` directory contains a sample that shows how three independent view models can exchange information without direct references to each other.

View the sample in jsFiddle here: <http://jsfiddle.net/rniemeyer/mg3hj/>

License
-------
MIT [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)