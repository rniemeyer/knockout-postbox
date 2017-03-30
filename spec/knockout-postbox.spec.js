describe("knockout-postbox", function(){
    var subscription, target, observable, computed, underlying, observableArray, value, newValue, arrayValue, newArrayValue, topic, callback, transform, arrayFilter;

    it("should create ko.postbox", function() {
        expect(ko.postbox).toBeDefined();
    });

    beforeEach(function() {
        ko.postbox.reset();
        value = "test_value";
        newValue = "newer_value";
        topic = "test_topic";
        arrayValue = [value];
        newArrayValue = [value, newValue];
    });

    describe("ko.postbox.subscribe/publish", function() {
        beforeEach(function() {
            target = {};
            callback = jasmine.createSpy("callback").and.callFake(function() { return this; });
            subscription = ko.postbox.subscribe(topic, callback, target);
        });

        it("should return a subscription", function() {
            expect(subscription).toBeDefined();
            expect(subscription.isDisposed).toBeFalsy();
        });

        it("should receive updates on the topic", function() {
            ko.postbox.publish(topic, value);
            expect(callback).toHaveBeenCalledWith(value);
        });

        it("should execute the callback with this being the target", function() {
            ko.postbox.publish(topic, value);
            expect(callback.calls.mostRecent().object).toEqual(target);
        });

        it("should not error when subscribing with missing topic", function() {
            expect(ko.postbox.subscribe.bind(ko.postbox, null, callback)).not.toThrow();
        });

        it("should not error when publishing with missing topic", function() {
            expect(ko.postbox.publish.bind(ko.postbox, null, newValue)).not.toThrow();
        });

        describe("when initializing the value", function() {
            beforeEach(function() {
                target = {};
                callback = jasmine.createSpy("callback").and.callFake(function() { return this; });
            });

            it("should receive the last published value", function() {
                ko.postbox.publish(topic, newValue);
                var newSubscription = ko.postbox.subscribe(topic, callback, target, true);
                expect(callback).toHaveBeenCalledWith(newValue);
            });

            it("should call the callback with the appropriate target as the context during initialization", function() {
                ko.postbox.publish(topic, newValue);
                var newSubscription = ko.postbox.subscribe(topic, callback, target, true);

                expect(callback.calls.mostRecent().object).toEqual(target);
            });

            it("should not execute callback before publish", function() {
                var newSubscription = ko.postbox.subscribe(topic, callback, target, true);
                expect(callback).not.toHaveBeenCalled();
                ko.postbox.publish(topic, newValue);
                expect(callback).toHaveBeenCalledWith(newValue);
            });

            describe("when passing as the third argument", function() {
                it("should receive the last published value", function() {
                    ko.postbox.publish(topic, newValue);
                    var newSubscription = ko.postbox.subscribe(topic, callback, true);
                    expect(callback).toHaveBeenCalledWith(newValue);
                });

                it("should not execute callback before publish", function() {
                    var newSubscription = ko.postbox.subscribe(topic, callback, true);
                    expect(callback).not.toHaveBeenCalled();
                    ko.postbox.publish(topic, newValue);
                    expect(callback).toHaveBeenCalledWith(newValue);
                });
            });
        });
    });

    describe("ko.postbox.serializer", function() {
        it("should use ko.toJSON as the default serializer", function() {
            var message = { test: ko.observable(value) };
            ko.postbox.publish(topic, message);
            expect(ko.postbox.topicCache[topic].serialized).toEqual(ko.toJSON(message));
        });

        describe("using a custom serializer", function() {
            //add a custom serialier
            var originalSerializer, message;
            beforeEach(function() {
                originalSerializer = ko.postbox.serializer;
                //this test serializer just returns a string
                ko.postbox.serializer = function(val) {
                    return value;
                };

                message = { test: value };
            });

            //restore the original serializer
            afterEach(function() {
                ko.postbox.serializer = originalSerializer;
            });

            it("should keep a serialized value cached for comparison", function() {
                ko.postbox.publish(topic, message);
                expect(ko.postbox.topicCache[topic].serialized).toEqual(value);

                //restore
                ko.postbox.serializer = originalSerializer;
            });

            it("observables should not publish when the cached value matches the new serialized value", function() {
                var callback = jasmine.createSpy("callback").and.callFake(function() { return this; }),
                    publisher = ko.observable().publishOn(topic);

                publisher(message);
                ko.postbox.subscribe(topic, callback);
                //publish again with a different message, which will still get serialized to the same value by our custom serializer
                publisher(newValue);

                expect(callback).not.toHaveBeenCalled();
            });
        });
    });

    describe("subscribeTo", function() {
        beforeEach(function() {
            observable = ko.observable(value).subscribeTo(topic);
            underlying = ko.observable(value);
            computed = ko.computed({
                read: underlying,
                write: underlying
            }).subscribeTo(topic);
            observableArray = ko.observableArray([value]).subscribeTo(topic);
            transform = function(newValue) {
                return newValue + "!";
            };
            arrayFilter = function(newArray) {
                if (newArray && newArray.length) {
                    newArray[0] = newValue;
                }

                return newArray;
            };
        });

        describe("when applied to an observable", function() {
            it("should return the observable", function() {
                expect(ko.isObservable(observable)).toBeTruthy();
                expect(observable()).toEqual(value);
            });

            it("should update when the topic is published on", function() {
                ko.postbox.publish(topic, newValue);
                expect(observable()).toEqual(newValue);
            });

            it("should not update when another topic is published on", function() {
               ko.postbox.publish("bad_topic", newValue);
                expect(observable()).toEqual(value);
            });

            it("should not error when topic is missing", function() {
                var observable = ko.observable();

               expect(observable.subscribeTo.bind(observable, null)).not.toThrow();
            });

            describe("when initializing the value", function() {
                it("should receive the last published value", function() {
                    ko.postbox.publish(topic, newValue);
                    var newObservable = ko.observable().subscribeTo(topic, true);
                    expect(newObservable()).toEqual(newValue);
                });
            });

            describe("when applying a transform", function() {
                beforeEach(function() {
                    ko.postbox.publish(topic, value);
                });

                describe("when passing as the second argument", function() {
                    beforeEach(function() {
                        observable = ko.observable().subscribeTo(topic, transform);
                    });

                    it("should not receive the latest value initially", function() {
                        expect(observable()).toBeUndefined();
                    });

                    it("should set the observable to the result of transforming the published value", function() {
                        ko.postbox.publish(topic, newValue);
                        expect(observable()).toEqual(newValue + "!");
                    });
                });

                describe("when passing as the third argument", function() {
                    describe("when initializing from the latest value", function() {
                        beforeEach(function() {
                            observable = ko.observable().subscribeTo(topic, true, transform);
                        });

                        it("should receive the result of transforming the latest value initially", function() {
                            expect(observable()).toEqual(value + "!");
                        });

                        it("should set the observable to the result of transforming the published value", function() {
                            ko.postbox.publish(topic, newValue);
                            expect(observable()).toEqual(newValue + "!");
                        });
                    });

                    describe("when not initializing from the latest value", function() {
                        beforeEach(function() {
                            observable = ko.observable().subscribeTo(topic, false, transform);
                        });

                        it("should not receive the latest value initially", function() {
                            expect(observable()).toBeUndefined();
                        });

                        it("should set the observable to the result of transforming the published value", function() {
                            ko.postbox.publish(topic, newValue);
                            expect(observable()).toEqual(newValue + "!");
                        });
                    });
                });
            });
        });

        describe("when applied to a computed observable", function() {
            it("should return the computed observable", function() {
                expect(ko.isComputed(computed)).toBeTruthy();
                expect(computed()).toEqual(value);
            });

            it("should update when the topic is published on", function() {
                ko.postbox.publish(topic, newValue);
                expect(computed()).toEqual(newValue);
            });

            it("should not update when another topic is published on", function() {
                ko.postbox.publish("bad_topic", newValue);
                expect(computed()).toEqual(value);
            });

            describe("when initializing the value", function() {
                it("should receive the last published value", function() {
                    ko.postbox.publish(topic, newValue);
                    var newComputed = ko.computed({ read: underlying, write: underlying }).subscribeTo(topic, true);
                    expect(newComputed()).toEqual(newValue);
                });
            });

            describe("when applying a transform", function() {
                beforeEach(function() {
                    ko.postbox.publish(topic, value);
                    underlying = ko.observable();
                });

                describe("when passing as the second argument", function() {
                    beforeEach(function() {
                        computed = ko.computed({
                            read: underlying,
                            write: underlying
                        }).subscribeTo(topic, transform);
                    });

                    it("should not receive the latest value initially", function() {
                        expect(computed()).toBeUndefined();
                    });

                    it("should set the computed observable to the result of transforming the published value", function() {
                        ko.postbox.publish(topic, newValue);
                        expect(computed()).toEqual(newValue + "!");
                    });
                });

                describe("when passing as the third argument", function() {
                    describe("when initializing from the latest value", function() {
                        beforeEach(function() {
                            computed = ko.computed({
                                read: underlying,
                                write: underlying
                            }).subscribeTo(topic, true, transform);
                        });

                        it("should receive the result of transforming the latest value initially", function() {
                            expect(computed()).toEqual(value + "!");
                        });

                        it("should set the computed observable to the result of transforming the published value", function() {
                            ko.postbox.publish(topic, newValue);
                            expect(computed()).toEqual(newValue + "!");
                        });
                    });

                    describe("when not initializing from the latest value", function() {
                        beforeEach(function() {
                            computed = ko.computed({
                                read: underlying,
                                write: underlying
                            }).subscribeTo(topic, false, transform);
                        });

                        it("should not receive the latest value initially", function() {
                            expect(computed()).toBeUndefined();
                        });

                        it("should set the computed observable to the result of transforming the published value", function() {
                            ko.postbox.publish(topic, newValue);
                            expect(computed()).toEqual(newValue + "!");
                        });
                    });
                });
            });
        });

        describe("when applied to an observableArray", function() {
            it("should return the observableArray", function() {
                expect(ko.isObservable(observableArray) && observableArray.push).toBeTruthy();
                expect(observableArray()).toEqual(arrayValue);
            });

            it("should update when the topic is published on", function() {
                ko.postbox.publish(topic, newArrayValue);
                expect(observableArray()).toEqual(newArrayValue);
            });

            it("should not update when another topic is published on", function() {
                ko.postbox.publish(newArrayValue, "bad_topic");
                expect(observableArray()).toEqual(arrayValue);
            });

            describe("when initializing the value", function() {
                it("should receive the last published value", function() {
                    ko.postbox.publish(topic, newArrayValue);
                    var newObservableArray = ko.observableArray().subscribeTo(topic, true);
                    expect(newObservableArray()).toEqual(newArrayValue);
                });
            });

            describe("when applying a transform", function() {
                beforeEach(function() {
                    ko.postbox.publish(topic, arrayValue);
                });

                describe("when passing as the second argument", function() {
                    beforeEach(function() {
                        observableArray = ko.observableArray().subscribeTo(topic, arrayFilter);
                    });

                    it("should not receive the latest value initially", function() {
                        expect(observableArray().length).toEqual(0);
                    });

                    it("should set the observableArray to the result of transforming the published value", function() {
                        ko.postbox.publish(topic, newArrayValue);
                        expect(observableArray()[0]).toEqual(newValue);
                    });
                });

                describe("when passing as the third argument", function() {
                    describe("when initializing from the latest value", function() {
                        beforeEach(function() {
                            observableArray = ko.observableArray().subscribeTo(topic, true, arrayFilter);
                        });

                        it("should receive the result of transforming the latest value initially", function() {
                            expect(observableArray().length).toEqual(1);
                            expect(observableArray()[0]).toEqual(newValue);
                        });

                        it("should set the observableArray to the result of transforming the published value", function() {
                            ko.postbox.publish(topic, newArrayValue);
                            expect(observableArray().length).toEqual(2);
                            expect(observableArray()[0]).toEqual(newValue);
                        });
                    });

                    describe("when not initializing from the latest value", function() {
                        beforeEach(function() {
                            observableArray = ko.observableArray().subscribeTo(topic, false, arrayFilter);
                        });

                        it("should not receive the latest value initially", function() {
                            expect(observableArray().length).toEqual(0);
                        });

                        it("should set the observable to the result of transforming the published value", function() {
                            ko.postbox.publish(topic, newArrayValue);
                            expect(observableArray().length).toEqual(2);
                            expect(observableArray()[0]).toEqual(newValue);
                        });
                    });
                });
            });
        });
    });

    describe("unsubscribeFrom", function() {
        beforeEach(function() {
            observable = ko.observable(value).subscribeTo(topic);
        });

        it("should stop receiving updates after calling unsubscribeFrom", function() {
            ko.postbox.publish(topic, newValue);
            expect(observable()).toEqual(newValue);

            observable.unsubscribeFrom(topic);
            ko.postbox.publish(topic, value);
            expect(observable()).toEqual(newValue);
        });
    });

    describe("publishOn", function() {
        var lengthComparer = function(newValue, cacheItem) {
            var cached = cacheItem.value;
            newValue = newValue || "";
            cached = cached.value || "";
            return newValue.length < cached.length;
        };

        describe("when applied to an observable", function() {
            beforeEach(function() {
                callback = jasmine.createSpy("callback");
                ko.postbox.subscribe(topic, callback);
                observable = ko.observable(value).publishOn(topic);
            });

            it("should return the observable", function() {
                expect(ko.isObservable(observable)).toBeTruthy();
                expect(observable()).toEqual(value);
            });

            it("should publish on topic when updated", function() {
                observable(newValue);
                expect(callback).toHaveBeenCalledWith(newValue);
            });

            it("should publish initially", function() {
                expect(callback).toHaveBeenCalledWith(value);
            });

            it("should not error when topic is missing", function() {
                var observable = ko.observable();
                expect(observable.publishOn.bind(observable, null)).not.toThrow();
            });

            describe("when not publishing initial value", function() {
                it("should not publish initially", function() {
                    callback.calls.reset();
                    observable = ko.observable(value).publishOn(topic, true);
                    expect(callback).not.toHaveBeenCalled();
                });

                it("should publish on next change", function() {
                    callback.calls.reset();
                    ko.postbox.topicCache = {};
                    observable = ko.observable(value).publishOn(topic, true);
                    expect(callback).not.toHaveBeenCalled();
                    observable(newValue);
                    expect(callback).toHaveBeenCalled();
                });
            });

            describe("when given an equalityComparer", function() {
                var observableWithComparer;
                describe("when passing as the second argument", function() {
                    beforeEach(function() {
                        observableWithComparer = ko.observable(value).publishOn(topic, lengthComparer);
                    });

                    it("should publish initially", function() {
                        expect(callback).toHaveBeenCalledWith(value);
                    });

                    it("should not publish when the equalityComparer returns true", function() {
                        observableWithComparer(newValue);
                        observableWithComparer("a");
                        expect(callback).toHaveBeenCalledWith(newValue);
                    });

                    it("should publish when the equalityComparer returns false", function() {
                        observableWithComparer(newValue);
                        expect(callback).toHaveBeenCalledWith(newValue);
                    });
                });

                describe("when passing as the third argument", function() {
                    describe("when publishing initially", function() {
                        beforeEach(function() {
                            observableWithComparer = ko.observable(value).publishOn(topic, false, lengthComparer);
                        });

                        it("should publish initially", function() {
                            expect(callback).toHaveBeenCalledWith(value);
                        });

                        it("should not publish when the equalityComparer returns true", function() {
                            observableWithComparer(newValue);
                            observableWithComparer("a");
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });

                        it("should publish when the equalityComparer returns false", function() {
                            observableWithComparer(newValue);
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });
                    });

                    describe("when not publishing initially", function() {
                        beforeEach(function() {
                            callback.calls.reset();
                            observableWithComparer = ko.observable(value).publishOn(topic, true, lengthComparer);
                        });

                        it("should not publish initially", function() {
                            expect(callback).not.toHaveBeenCalled();
                        });

                        it("should not publish when the equalityComparer returns true", function() {
                            observableWithComparer(newValue);
                            observableWithComparer("a");
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });

                        it("should publish when the equalityComparer returns false", function() {
                            observableWithComparer(newValue);
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });
                    });
                });
            });
        });

        describe("when applied to a computed observable", function() {
            beforeEach(function() {
                callback = jasmine.createSpy("callback");
                ko.postbox.subscribe(topic, callback);

                underlying = ko.observable(value); //computed references this observable
                computed = ko.computed({ //writeable computed observable
                    read: underlying,
                    write: underlying
                }).publishOn(topic);
            });

            it("should return the computed observable", function() {
                expect(ko.isComputed(computed)).toBeTruthy();
                expect(computed()).toEqual(value);
            });

            it("should publish on topic when updated", function() {
                computed(newValue);
                expect(callback).toHaveBeenCalledWith(newValue);
            });

            it("should publish initially", function() {
                expect(callback).toHaveBeenCalledWith(value);
            });

            describe("when not publishing initial value", function() {
                it("should skip publishing initially", function() {
                    callback.calls.reset();
                    computed = ko.computed({
                        read: underlying,
                        write: underlying
                    }).publishOn(topic, true);

                    expect(callback).not.toHaveBeenCalled();
                });
            });

            describe("when given an equalityComparer", function() {
                var computedWithComparer;

                describe("when passing as the second argument", function() {
                    beforeEach(function() {
                        underlying = ko.observable(value);
                        computedWithComparer = ko.computed({
                            read: underlying,
                            write: underlying
                        }).publishOn(topic, lengthComparer);
                    });

                    it("should publish initially", function() {
                        expect(callback).toHaveBeenCalledWith(value);
                    });

                    it("should not publish when the equalityComparer returns true", function() {
                        computedWithComparer(newValue);
                        computedWithComparer("a");
                        expect(callback).toHaveBeenCalledWith(newValue);
                    });

                    it("should publish when the equalityComparer returns false", function() {
                        computedWithComparer(newValue);
                        expect(callback).toHaveBeenCalledWith(newValue);
                    });
                });

                describe("when passing as the third argument", function() {
                    describe("when publishing initially", function() {
                        beforeEach(function() {
                            underlying = ko.observable(value);
                            computedWithComparer = ko.computed({
                                read: underlying,
                                write: underlying
                            }).publishOn(topic, false, lengthComparer);
                        });

                        it("should publish initially", function() {
                            expect(callback).toHaveBeenCalledWith(value);
                        });

                        it("should not publish when the equalityComparer returns true", function() {
                            computedWithComparer(newValue);
                            computedWithComparer("a");
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });

                        it("should publish when the equalityComparer returns false", function() {
                            computedWithComparer(newValue);
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });
                    });

                    describe("when not publishing initially", function() {
                        beforeEach(function() {
                            callback.calls.reset();
                            underlying = ko.observable(value);
                            computedWithComparer = ko.computed({
                                read: underlying,
                                write: underlying
                            }).publishOn(topic, true, lengthComparer);
                        });

                        it("should not publish initially", function() {
                            expect(callback).not.toHaveBeenCalled();
                        });

                        it("should not publish when the equalityComparer returns true", function() {
                            computedWithComparer(newValue);
                            computedWithComparer("a");
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });

                        it("should publish when the equalityComparer returns false", function() {
                            computedWithComparer(newValue);
                            expect(callback).toHaveBeenCalledWith(newValue);
                        });
                    });
                });
            });
        });

        describe("when applied to an observableArray", function() {
            beforeEach(function() {
                callback = jasmine.createSpy("callback");
                arrayValue = [value];
                ko.postbox.subscribe(topic, callback);
                observableArray = ko.observableArray(arrayValue).publishOn(topic);
            });

            it("should return the observableArray", function() {
                expect(ko.isObservable(observableArray) && observableArray.push).toBeTruthy();
                expect(observableArray()).toEqual(arrayValue);
            });

            it("should publish on topic when updated", function() {
                callback.calls.reset();
                observableArray(newArrayValue);
                expect(callback).toHaveBeenCalledWith(newArrayValue);
            });

            it("should publish when given a reference to the same array after it has been modified", function() {
                callback.calls.reset();
                observableArray.push("extra_value");
                expect(callback).toHaveBeenCalledWith(arrayValue);
            });

            it("should not publish when given a reference to the same array", function() {
                callback.calls.reset();
                observableArray(arrayValue);
                expect(callback).not.toHaveBeenCalled();
            });

            it("should publish initially", function() {
                expect(callback).toHaveBeenCalledWith(arrayValue);
            });

            describe("when publishing initial value", function() {
                it("should publish initially", function() {
                    observableArray = ko.observableArray(arrayValue).publishOn(topic, true);
                    expect(callback).toHaveBeenCalledWith(arrayValue);
                });
            });

            describe("when given an equalityComparer", function() {
                var observableArrayWithComparer;
                describe("when passing as the second argument", function() {
                    beforeEach(function() {
                        observableArrayWithComparer = ko.observableArray(arrayValue).publishOn(topic, lengthComparer);
                    });

                    it("should publish initially", function() {
                        expect(callback).toHaveBeenCalledWith(arrayValue);
                    });

                    it("should not publish when the equalityComparer returns true", function() {
                        observableArrayWithComparer(newArrayValue);
                        observableArrayWithComparer(arrayValue);
                        expect(callback).toHaveBeenCalledWith(newArrayValue);
                    });

                    it("should publish when the equalityComparer returns false", function() {
                        observableArrayWithComparer(newArrayValue);
                        expect(callback).toHaveBeenCalledWith(newArrayValue);
                    });
                });

                describe("when passing as the third argument", function() {
                    describe("when publishing initially", function() {
                        beforeEach(function() {
                            observableArrayWithComparer = ko.observableArray(arrayValue).publishOn(topic, false, lengthComparer);
                        });

                        it("should publish initially", function() {
                            expect(callback).toHaveBeenCalledWith(arrayValue);
                        });

                        it("should not publish when the equalityComparer returns true", function() {
                            observableArrayWithComparer(newArrayValue);
                            observableArrayWithComparer(arrayValue);
                            expect(callback).toHaveBeenCalledWith(newArrayValue);
                        });

                        it("should publish when the equalityComparer returns false", function() {
                            observableArrayWithComparer(newArrayValue);
                            expect(callback).toHaveBeenCalledWith(newArrayValue);
                        });
                    });

                    describe("when not publishing initially", function() {
                        beforeEach(function() {
                            callback.calls.reset();
                            observableArrayWithComparer = ko.observableArray(arrayValue).publishOn(topic, true, lengthComparer);
                        });

                        it("should not publish initially", function() {
                            expect(callback).not.toHaveBeenCalled();
                        });

                        it("should not publish when the equalityComparer returns true", function() {
                            observableArrayWithComparer(newArrayValue);
                            observableArrayWithComparer(arrayValue);
                            expect(callback).toHaveBeenCalledWith(newArrayValue);
                        });

                        it("should publish when the equalityComparer returns false", function() {
                            observableArrayWithComparer(newArrayValue);
                            expect(callback).toHaveBeenCalledWith(newArrayValue);
                        });
                    });
                });
            });
        });
    });

    describe("stopPublishingOn", function() {
        var observable, subscription, callback;

        beforeEach(function() {
            observable = ko.observable(value).publishOn(topic);
            callback = jasmine.createSpy("callback");
            subscription = ko.postbox.subscribe(topic, callback);
        });

        it("should stop publishing after calling stopPublishingOn", function() {
            observable(newValue);
            expect(callback).toHaveBeenCalledWith(newValue);
            callback.calls.reset();
            observable.stopPublishingOn(topic);

            observable(value);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("syncWith", function() {
        var secondObservable, secondUnderlying, secondComputed, secondObservableArray;

        describe("when applied to an observable", function() {
            beforeEach(function() {
                observable = ko.observable(value).syncWith(topic);
                secondObservable = ko.observable(value).syncWith(topic);
            });

            it("should return the observable", function() {
                expect(ko.isObservable(observable)).toBeTruthy();
                expect(observable()).toEqual(value);
            });

            it("should publish on topic when updated", function() {
                observable(newValue);
                expect(secondObservable()).toEqual(newValue);
            });

            it("should update when the topic is published on", function() {
                secondObservable(newValue);
                expect(observable()).toEqual(newValue);
            });

            describe("when initializing the value", function() {
                it("should receive the last published value", function() {
                    ko.postbox.publish(topic, newValue);
                    var newObservable = ko.observable().syncWith(topic, true);
                    expect(newObservable()).toEqual(newValue);
                });
            });
        });

        describe("when applied to a computed observable", function() {
            beforeEach(function() {
                underlying = ko.observable(value);
                computed = ko.computed({ read: underlying, write: underlying}).syncWith(topic);
                secondUnderlying = ko.observable(value);
                secondComputed = ko.computed({ read: secondUnderlying, write: secondUnderlying }).syncWith(topic);
            });

            it("should return the computed", function() {
                expect(ko.isComputed(computed)).toBeTruthy();
                expect(computed()).toEqual(value);
            });

            it("should publish on topic when updated", function() {
                computed(newValue);
                expect(secondComputed()).toEqual(newValue);
            });

            it("should update when the topic is published on", function() {
                secondComputed(newValue);
                expect(computed()).toEqual(newValue);
            });

            describe("when initializing the value", function() {
                it("should receive the last published value", function() {
                    ko.postbox.publish(topic, newValue);
                    var newUnderlying = ko.observable(),
                        newComputed = ko.computed({ read: newUnderlying, write: newUnderlying }).syncWith(topic, true);
                    expect(newComputed()).toEqual(newValue);
                });
            });
        });

        describe("when applied to an observableArray", function() {
            beforeEach(function() {
                observableArray = ko.observableArray(arrayValue).syncWith(topic);
                secondObservableArray = ko.observableArray(arrayValue).syncWith(topic);
            });

            it("should return the observableArray", function() {
                expect(ko.isObservable(observableArray) && observableArray.push).toBeTruthy();
            });

            it("should publish on topic when updated", function() {
                var newArray = [];
                secondObservableArray(newArray);
                expect(observableArray()).toEqual(newArray);

                observableArray.push("extra_value");
                expect(secondObservableArray()).toEqual(newArray);
                expect(secondObservableArray()[0]).toEqual("extra_value");
            });

            describe("when initializing the value", function() {
                it("should receive the last published value", function() {
                    ko.postbox.publish(topic, newArrayValue);
                    var newObservableArray = ko.observableArray().syncWith(topic, true);
                    expect(newObservableArray()).toEqual(newArrayValue);
                });
            });
        });
    });

    describe("stopSyncingWith", function() {
        beforeEach(function() {
            observable = ko.observable(value).syncWith(topic);
            callback = jasmine.createSpy("callback");
            subscription = ko.postbox.subscribe(topic, callback);
        });

        it("should stop receiving updates after calling stopSyncingWith", function() {
            ko.postbox.publish(topic, newValue);
            expect(observable()).toEqual(newValue);

            observable.stopSyncingWith(topic);
            ko.postbox.publish(topic, value);
            expect(observable()).toEqual(newValue);
        });

        it("should stop publishing after calling stopSyncingWith", function() {
            observable(newValue);
            expect(callback).toHaveBeenCalledWith(newValue);
            callback.calls.reset();
            observable.stopSyncingWith(topic);

            observable(value);

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe("dispose", function () {
        describe("when called on an observable", function() {
            beforeEach(function() {
                observable = ko.observable(value).syncWith(topic);
                callback = jasmine.createSpy("callback");
                subscription = ko.postbox.subscribe(topic, callback);
            });

            it("should stop receiving updates after calling dispose", function() {
                ko.postbox.publish(topic, newValue);
                expect(observable()).toEqual(newValue);

                observable.dispose();
                ko.postbox.publish(topic, value);
                expect(observable()).toEqual(newValue);
            });

            it("should stop publishing after calling dispose", function() {
                observable(newValue);
                expect(callback).toHaveBeenCalledWith(newValue);
                callback.calls.reset();
                observable.dispose();

                observable(value);
                expect(callback).not.toHaveBeenCalled();
            });

            it("should be safe to call more than once", function () {
                expect(function() {
                    observable.dispose()
                    observable.dispose()
                }).not.toThrow();
            });
        });

        describe("when called on a computed observable", function() {
            var existingDisposeSpy;

            beforeEach(function() {
                callback = jasmine.createSpy("callback");
                subscription = ko.postbox.subscribe(topic, callback);

                underlying = ko.observable(value); //computed references this observable
                computed = ko.computed({ //writeable computed observable
                    read: underlying,
                    write: underlying
                });
                spyOn(computed, "dispose").and.callThrough();
                existingDisposeSpy = computed.dispose;
                computed.syncWith(topic);
            });

            it("should stop receiving updates after calling dispose", function() {
                ko.postbox.publish(topic, newValue);
                expect(underlying()).toEqual(newValue);

                expect(computed.postboxSubs[topic].subscribeTo).toBeDefined();
                expect(computed.postboxSubs[topic].publishOn).toBeDefined();
                expect(existingDisposeSpy).not.toHaveBeenCalled();
                computed.dispose();
                expect(existingDisposeSpy).toHaveBeenCalled();
                expect(computed.postboxSubs[topic].subscribeTo).toBeUndefined();
                expect(computed.postboxSubs[topic].publishOn).toBeUndefined();

                ko.postbox.publish(topic, value);
                expect(underlying()).toEqual(newValue);
            });

            it("should stop publishing after calling dispose", function() {
                underlying(newValue);
                expect(callback).toHaveBeenCalledWith(newValue);
                callback.calls.reset();

                expect(computed.postboxSubs[topic].subscribeTo).toBeDefined();
                expect(computed.postboxSubs[topic].publishOn).toBeDefined();
                expect(existingDisposeSpy).not.toHaveBeenCalled();
                computed.dispose();
                expect(existingDisposeSpy).toHaveBeenCalled();
                expect(computed.postboxSubs[topic].subscribeTo).toBeUndefined();
                expect(computed.postboxSubs[topic].publishOn).toBeUndefined();

                underlying(value);
                expect(callback).not.toHaveBeenCalled();
            });

            it("should be safe to call more than once", function () {
                expect(function() {
                    computed.dispose()
                    computed.dispose()
                }).not.toThrow();
            });
        });
    });

    describe("reset", function() {
        var directSubs = [];
        var subscribeTos = [];
        var publishOns = [];
        var    noop = function() {};
        var topicTwo = "test-topic-two";

        it("should remove subscriptions added through direct postbox calls", function() {
            directSubs.push(ko.postbox.subscribe(topic), ko.postbox.subscribe(topic), ko.postbox.subscribe(topicTwo), ko.postbox.subscribe(topicTwo));

            ko.utils.arrayForEach(directSubs, function(sub) {
                spyOn(sub, "dispose").and.callThrough();
            });

            ko.postbox.reset();

            ko.utils.arrayForEach(directSubs, function(sub) {
                expect(sub.dispose).toHaveBeenCalled();
                expect(ko.postbox.subscriptions[sub.subId]).toBeUndefined();
            });
        });

        it("should remove subscribeTo subscriptions and pointers", function() {
            var subscriptions;

            subscribeTos.push(ko.observable().subscribeTo(topic), ko.observable().subscribeTo(topic), ko.observable().subscribeTo(topicTwo), ko.observable().subscribeTo(topicTwo));

            subscriptions = ko.utils.extend({}, ko.postbox.subscriptions);

            for (var id in subscriptions) {
                if (subscriptions.hasOwnProperty(id)) {
                    spyOn(subscriptions[id], "dispose").and.callThrough();
                }
            }

            ko.postbox.reset();

            for (var id in subscriptions) {
                if (subscriptions.hasOwnProperty(id)) {
                    expect(subscriptions[id].dispose).toHaveBeenCalled();
                    expect(ko.postbox.subscriptions[id]).toBeUndefined();
                }
            }

            ko.utils.arrayForEach(subscribeTos, function(observable) {
                ko.utils.arrayForEach([topic, topicTwo], function(value) {
                    if (observable.postboxSubs[value]) {
                        expect(observable.postboxSubs[value].subscribeTo).toBeUndefined();
                    }
                });
            });
        });

        it("should remove publishTo subscriptions and pointers", function() {
            var subscriptions = [];

            publishOns.push(ko.observable().publishOn(topic), ko.observable().publishOn(topic), ko.observable().publishOn(topicTwo), ko.observable().publishOn(topicTwo));

            // gather all of the subscriptions. they are subs against the observable and not against ko.postbox
            ko.utils.arrayForEach(publishOns, function(observable) {
                var subs = observable.postboxSubs;
                if (subs[topic]) {
                    subscriptions.push(observable.postboxSubs[topic].publishOn);
                }

                if (subs[topicTwo]) {
                    subscriptions.push(observable.postboxSubs[topicTwo].publishOn);
                }
            });

            ko.utils.arrayForEach(subscriptions, function(sub) {
                spyOn(sub, "dispose").and.callThrough();
            });

            ko.postbox.reset();

            ko.utils.arrayForEach(subscriptions, function(sub) {
                expect(sub.dispose).toHaveBeenCalled();
                expect(ko.postbox.subscriptions[sub.subId]).toBeUndefined();
            });

            ko.utils.arrayForEach(publishOns, function(observable) {
                ko.utils.arrayForEach([topic, topicTwo], function(value) {
                    if (observable.postboxSubs[value]) {
                        expect(observable.postboxSubs[value].publishOn).toBeUndefined();
                    }
                });
            });
        });

        it("should reset the topicCache", function() {
            ko.postbox.subscribe(topic, noop);
            ko.postbox.subscribe(topicTwo, noop);

            ko.postbox.publish(topic, value);
            ko.postbox.publish(topicTwo, newValue);

            ko.postbox.reset();

            expect(Object.keys(ko.postbox.topicCache).length).toEqual(0);
        });
    });
});