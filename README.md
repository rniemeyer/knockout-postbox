knockout-postbox
================
*knockout-postbox* is a [Knockout.js](http://knockoutjs.com/) plugin designed to use Knockout's basic pub/sub capabilities to facilitate decoupled communication between separate view models / components.

More background here: http://www.knockmeout.net/2012/05/using-ko-native-pubsub.html

This allows you to set up simple topic-based communication like:

```js
var ViewModelOne = function() {
  //automatically update the observable's value from ko.postbox messages on "myEditableTopic"
  this.isEditable = ko.observable().subscribeTo("myEditableTopic");  
};

var ViewModelTwo = function() {
  //automatically publish changes through ko.postbox using "myEditableTopic" as the topic
  this.editable = ko.observable(false).publishOn("myEditableTopic");  
};

var ViewModelThree = function() {
  //both subscribe to and publish changes on the topic "myEditableTopic"
  this.canEdit = ko.observable().syncWith("myEditableTopic");
};

//a non-KO component can also participate in this communication
var SomeOtherComponent = function() {
  //subscribe directly to the topic
  ko.postbox.subscribe("myEditableTopic", function(newValue) {
     //do something with newValue
  }); 
  
  //publish on the topic
  ko.postbox.publish("myEditableTopic", "some new value");
};
```

The subscriptions do not need to be created when the observables are instantiated. You could just as easily wire it up later, if you don't want the individual view models to know that they are participating in this communication.

```js
var ViewModelOne = function() {
  this.isEditable = ko.observable();  
};

var ViewModelTwo = function() {
  this.editable = ko.observable(false);  
};

var one = new ViewModelOne();
var two = new ViewModelTwo();

var editableTopic = "myEditableTopic";
one.isEditable.subscribeTo(editableTopic);
two.editable.publishOn(editableTopic)
```

The observable extensions accept additional arguments that can help to customize the sending/receiving behavior, as described below.

Basic Usage
-----------

*knockout-postbox* creates a `ko.postbox` object that can be used for basic pub/sub communication. However, typically you would use the observable extensions rather than calling the `ko.postbox` APIs directly, unless you are integrating with a non-KO component.

**subscribe** *- ko.postbox.subscribe(topic, handler, [target], [initializeWithLatestValue])*

```js
ko.postbox.subscribe("mytopic", function(newValue) {
    console.log("Value: " + newValue);
}, viewModel);

//receive updates from "mytopic", initialize with latest published value
ko.postbox.subscribe("mytopic", function(newValue) {
    console.log("Value: " + newValue);
}, viewModel, true);
```


**publish** *- ko.postbox.publish(topic, value)*

```js
ko.postbox.publish("mytopic", "new value");
```

**ko.postbox.defaultComparer**

The default comparison done to determine if a value should be published simply uses `===`. At run-time you can supply your own default comparison function by overriding `ko.postbox.defaultComparer`.

**ko.postbox.reset**

This function disposes all subscriptions related to `ko.postbox` and clears any stored references to those subscriptions.

Observable Extensions
---------------------

*knockout-postbox* augments **observables**, **observableArrays**, and **computed observables** to be able to automatically participate in sending and receiving messages through `ko.postbox`.

**subscribeTo** *- subscribeTo(topic, [initializeWithLatestValue], [transform])*

The `subscribeTo` function tells an observable to automatically update itself whenever it receives a message on a topic.

```js
//update the value from messages on "mytopic"
this.value = ko.observable().subscribeTo("mytopic");

//receive updates from "mytopic" and use the last published value to initialize the observable
this.value = ko.observable().subscribeTo("mytopic", true);

//receive updates from "mytopic" and update the value after passing it through the transform function
var transform = function(newValue) {
    return newValue && newValue.toLowerCase();
};

this.value = ko.observable().subscribeTo("mytopic", transform);

//receive updates from "mytopic", initialize with latest published value, and send updates through transform
this.value = ko.observable().subscribeTo("mytopic", true, transform);
```


**unsubscribeFrom** *- unsubscribeFrom(topic)*

The `unsubscribeFrom` function removes the subscription that an observable has on a topic.

```js
this.value.unsubscribeFrom("mytopic");
```


**publishOn** *- publishOn(topic, [skipInitialPublish], [equalityComparer])*

The `publishOn` function tells an observable to automatically publish its value on a topic whenever it changes. By default, it will only publish when the new value is not the same (`===`) as the previous value.

```js
//whenever the value changes publish a message on "mytopic"
this.value = ko.observable(value).publishOn("mytopic");

//publish changes on "mytopic", but skip publishing the current value immediately
this.value = ko.observable(value).publishOn("mytopic", true);

//publish changes on "mytopic" when the comparer function returns false
var comparer = function(newValue, oldValue) {
    return newValue < oldValue;
};

this.value = ko.observable(value).publishOn("mytopic", comparer);

//publish changes on "mytopic", skip initial publish, and use override comparer
this.value = ko.observable(value).publishOn("mytopic", true, comparer);
```


**stopPublishingOn** *- stopPublishingOn(topic)*

The `stopPublishingOn` function removes the subscription used to automatically publish changes to the observable.

```js
this.value.stopPublishingOn("mytopic");
```

**syncWith** *- syncWith(topic, [initializeWithLatestValue], [skipInitialPublish], [equalityComparer])*

The `syncWith` function tells an observable to both subscribe and publish on a topic. This allows observables in two different view models to stay in sync with each other without having direct knowledge of its counterpart.

```js
//subscribe to and publish on a topic
this.value = ko.observable(value).syncWith("mytopic");

//subscribe to and publish on a topic and use the last published value to initialize the observable
this.value = ko.observable().syncWith("mytopic", true);

//subscribe to and publish on a topic, but do not publish out the observable's value initially
this.value = ko.observable(value).syncWith("mytopic", false, true);

//subscribe to and publish on a topic, but only publish when the comparer function returns false
var comparer = function(newValue, oldValue) {
    return newValue < oldValue;
};

this.value = ko.observable(value).syncWith("mytopic", false, false, comparer);
```

Dependencies
------------
* Knockout 2.0+
* JSON2.js - (for IE < 8)

Build
-----
This project uses [grunt](http://gruntjs.com/) for building/minifying.

Install from NuGet
------------------
    Install-Package Knockout-Postbox

Install from Bower
------------------
    bower install knockout-postbox

Examples
--------
The `examples` directory contains a sample that shows how three independent view models can exchange information without direct references to each other.

View the sample in jsFiddle here: <http://jsfiddle.net/rniemeyer/mg3hj/>

License
-------
MIT [http://www.opensource.org/licenses/mit-license.php](http://www.opensource.org/licenses/mit-license.php)
