"use strict";

var QWebChannelMessageTypes = {
    signal: 1,
    propertyUpdate: 2,
    init: 3,
    idle: 4,
    debug: 5,
    invokeMethod: 6,
    connectToSignal: 7,
    disconnectFromSignal: 8,
    setProperty: 9,
    response: 10,
    error: 11
};

var QWebChannel = function(transport, initCallback) {
    if (typeof transport !== "object" || typeof transport.send !== "function") {
        console.error("The QWebChannel requires a transport object. This object must have a send method");
        return;
    }

    var channel = this;
    this.transport = transport;

    this.execCallbacks = {};
    this.execId = 0;
    this.registeredObjects = {};
    this.objects = {};

    this.send = function(data) {
        if (typeof data !== "string") {
            data = JSON.stringify(data);
        }
        channel.transport.send(data);
    };

    this.exec = function(data, callback) {
        var execId = channel.execId++;
        if (callback) {
            channel.execCallbacks[execId] = callback;
        }
        data.id = execId;
        channel.send(data);
    };

    this.handleResponse = function(response) {
        console.log("QWebChannel received response:", response);
        if (response.id !== undefined && channel.execCallbacks[response.id]) {
            var callback = channel.execCallbacks[response.id];
            delete channel.execCallbacks[response.id];
            callback(response.data);
        } else if (response.id !== undefined) {
             console.warn("Received response for unknown execId:", response.id);
        } else {
            console.error("Invalid response without id:", response);
        }
    };

    this.handleSignal = function(message) {
        console.log("QWebChannel received signal:", message);
        var object = channel.registeredObjects[message.object];
        if (object) {
            var signalName = object.__signalIndices__[message.signal] || message.signal;
            console.log("Dispatching signal:", signalName, "with args:", message.args);
            object.signalEmitted(signalName, message.args);
        } else {
            console.warn("Unhandled signal: " + message.object + "::" + message.signal);
        }
    };

    this.handlePropertyUpdate = function(message) {
        for (var objectName in message.signals) {
            var object = channel.registeredObjects[objectName];
            if (object) {
                object.propertyUpdate(message.signals[objectName]);
            } else {
                console.warn("Unhandled property update: " + objectName);
            }
        }
    };

    this.debug = function(message) {
        console.log("QWebChannel debug: " + message);
    };

    transport.onmessage = function(message) {
        var data = message.data;
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error("Failed to parse JSON message: " + data);
                return;
            }
        }
        switch (data.type) {
            case QWebChannelMessageTypes.response:
                channel.handleResponse(data);
                break;
            case QWebChannelMessageTypes.signal:
                channel.handleSignal(data);
                break;
            case QWebChannelMessageTypes.propertyUpdate:
                channel.handlePropertyUpdate(data);
                break;
            case QWebChannelMessageTypes.debug:
                channel.debug(data.data);
                break;
            case QWebChannelMessageTypes.error:
                console.error("QWebChannel error: " + data.data);
                break;
            default:
                // Handle missing 'type' or other issues
                console.error("QWebChannel received message without type:", data);
                if (data.id !== undefined && channel.execCallbacks[data.id]) {
                    channel.handleResponse(data);
                } else {
                    console.error("Unhandled message: ", data);
                }
                break;
        }
    };

    this.exec({type: QWebChannelMessageTypes.init}, function(data) {
        console.log("QWebChannel initialized with " + Object.keys(data).length + " objects.");
        for (var objectName in data) {
            new QObject(objectName, data[objectName], channel);
        }
        if (initCallback) {
            initCallback(channel);
        }
    });
};

function QObject(name, data, webChannel) {
    this.__id__ = name;
    webChannel.registeredObjects[name] = this;
    webChannel.objects[name] = this;
    this.__webChannel__ = webChannel;
    this.__objectSignals__ = {};
    this.__signatures__ = data.signatures;
    this.__propertySignals__ = data.propertySignals;

    this.__propertyIndices__ = {};
    this.__signalIndices__ = {};

    var object = this;

    // Methods
    this.__methods__ = {};
    if (data.methods) {
        for (var i = 0; i < data.methods.length; ++i) {
            var methodName = data.methods[i][0];
            var methodIndex = data.methods[i][1];
            this.__methods__[methodName] = methodIndex;
            this[methodName] = this.generateMethod(methodName);
        }
    }

    // Properties
    this.__properties__ = {};
    if (data.properties) {
        for (var i = 0; i < data.properties.length; ++i) {
            var propIndex = data.properties[i][0];
            var propName = data.properties[i][1];
            var propValue = data.properties[i][3];
            this.__properties__[propName] = propIndex;
            this.__propertyIndices__[propIndex] = propName;
            this["_" + propName] = propValue;
            this.generateProperty(propName);
        }
    }

    // Signals
    this.__signals__ = {};
    if (data.signals) {
        for (var i = 0; i < data.signals.length; ++i) {
            var signalData = data.signals[i];
            var signalName = signalData[0];
            var signalIndex = signalData[1];
            this.__signals__[signalName] = signalIndex;
            this.__signalIndices__[signalIndex] = signalName;
            this.generateSignal(signalName);

            var shortName = signalName.split('(')[0];
            if (shortName !== signalName) {
                this.__signals__[shortName] = signalIndex;
                this.generateSignal(shortName);
            }
        }
    }
}

QObject.prototype.generateMethod = function(methodName) {
    var object = this;
    return function() {
        var args = [];
        var callback;
        for (var i = 0; i < arguments.length; ++i) {
            if (typeof arguments[i] === "function" && i === arguments.length - 1) {
                callback = arguments[i];
            } else {
                args.push(arguments[i]);
            }
        }

        if (!callback && typeof Promise !== "undefined") {
            return new Promise(function(resolve, reject) {
                object.__webChannel__.exec({
                    type: QWebChannelMessageTypes.invokeMethod,
                    object: object.__id__,
                    method: object.__methods__[methodName],
                    args: args
                }, function(data) {
                    if (data && data.error) {
                        reject(data.error);
                    } else {
                        resolve(data);
                    }
                });
            });
        }

        object.__webChannel__.exec({
            type: QWebChannelMessageTypes.invokeMethod,
            object: object.__id__,
            method: methodName,
            args: args
        }, callback);
    };
};

QObject.prototype.generateSignal = function(signalName) {
    var object = this;
    this[signalName] = {
        connect: function(callback) {
            if (typeof callback !== "function") {
                console.error("Qt signals can only be connected to functions.");
                return;
            }

            object.__objectSignals__[signalName] = object.__objectSignals__[signalName] || [];
            object.__objectSignals__[signalName].push(callback);

            object.__webChannel__.exec({
                type: QWebChannelMessageTypes.connectToSignal,
                object: object.__id__,
                signal: object.__signals__[signalName]
            });
        },
        disconnect: function(callback) {
            if (typeof callback !== "function") {
                return;
            }
            var callbacks = object.__objectSignals__[signalName];
            if (callbacks) {
                var index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                    if (callbacks.length === 0) {
                        object.__webChannel__.exec({
                            type: QWebChannelMessageTypes.disconnectFromSignal,
                            object: object.__id__,
                            signal: object.__signals__[signalName]
                        });
                    }
                }
            }
        }
    };
};

QObject.prototype.signalEmitted = function(signalName, args) {
    var callbacks = this.__objectSignals__[signalName];
    if (callbacks) {
        for (var i = 0; i < callbacks.length; ++i) {
            callbacks[i].apply(undefined, args);
        }
    }

    var shortName = signalName.split('(')[0];
    if (shortName !== signalName) {
        var shortCallbacks = this.__objectSignals__[shortName];
        if (shortCallbacks) {
            for (var i = 0; i < shortCallbacks.length; ++i) {
                shortCallbacks[i].apply(undefined, args);
            }
        }
    }
};

QObject.prototype.generateProperty = function(propertyName) {
    var object = this;
    Object.defineProperty(this, propertyName, {
        get: function() {
            return object["_" + propertyName];
        },
        set: function(value) {
            if (value === undefined) return;

            // Critical fix: objectName and other internal properties should be read-only for the bridge
            // Some JS frameworks (like Svelte 5) try to instrument objects by touching their properties.
            if (typeof propertyName === "string" && (propertyName === "objectName" || propertyName === "parent" || propertyName.startsWith("__"))) {
                return;
            }

            if (object["_" + propertyName] === value) return;

            // Don't try to send complex objects to simple string/number properties
            // UNLESS it's a property that is EXPECTED to be an object.
            // For the bridge, we don't have such properties, so we skip sending to backend.
            if (typeof value === "object" && value !== null) {
                // We still update the local value so JS doesn't complain,
                // but we don't notify the Qt side as it would cause a conversion error.
                object["_" + propertyName] = value;
                return;
            }

            object["_" + propertyName] = value;
            object.__webChannel__.exec({
                type: QWebChannelMessageTypes.setProperty,
                object: object.__id__,
                property: object.__properties__[propertyName],
                value: value
            });
        }
    });
};

QObject.prototype.propertyUpdate = function(signals) {
    for (var propIndex in signals) {
        var propertyName = this.__propertyIndices__[propIndex] || propIndex;
        this["_" + propertyName] = signals[propIndex][0];
        var signalName = this.__propertySignals__[propertyName];
        if (signalName) {
            this.signalEmitted(signalName, signals[propIndex]);
        }
    }
};

if (typeof module === "object") {
    module.exports = { QWebChannel: QWebChannel };
}
