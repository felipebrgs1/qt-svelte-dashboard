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
    error: 11 // Added missing error type
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

    this.send = function(data) {
        if (typeof data !== "string") {
            data = JSON.stringify(data);
        }
        channel.transport.send(data);
    };

    this.exec = function(data, callback) {
        if (!callback) {
            channel.send(data);
            return;
        }
        var execId = channel.execId++;
        channel.execCallbacks[execId] = callback;
        data.id = execId;
        channel.send(data);
    };

    this.handleResponse = function(response) {
        if (!response.id || !channel.execCallbacks[response.id]) {
            console.error("Invalid response id: " + response.id);
            return;
        }
        var callback = channel.execCallbacks[response.id];
        delete channel.execCallbacks[response.id];
        callback(response.data);
    };

    this.handleSignal = function(message) {
        var object = channel.registeredObjects[message.object];
        if (object) {
            object.signalEmitted(message.signal, message.args);
        } else {
            console.warn("Unhandled signal: " + message.object + "::" + message.signal);
        }
    };

    this.handlePropertyUpdate = function(message) {
        for (var i in message.signals) {
            var object = channel.registeredObjects[i];
            if (object) {
                object.propertyUpdate(message.signals[i]);
            } else {
                console.warn("Unhandled property update: " + i);
            }
        }
    };

    this.debug = function(message) {
        console.log("QWebChannel debug: " + message);
    };

    transport.onmessage = function(message) {
        var data = message.data;
        if (typeof data === "string") {
            data = JSON.parse(data);
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
                console.error("Unhandled message type: " + data.type);
                break;
        }
    };

    this.exec({type: QWebChannelMessageTypes.init}, function(data) {
        for (var objectName in data) {
            var object = new QObject(objectName, data[objectName], channel);
        }
        if (initCallback) {
            initCallback(channel);
        }
    });
};

function QObject(name, data, webChannel) {
    this.__id__ = name;
    webChannel.registeredObjects[name] = this;
    this.__webChannel__ = webChannel;
    this.__objectSignals__ = {};
    this.__signatures__ = data.signatures;
    this.__propertySignals__ = data.propertySignals;

    for (var i = 0; i < data.methods.length; ++i) {
        this[data.methods[i][0]] = this.generateMethod(data.methods[i][0]);
    }

    for (var i = 0; i < data.properties.length; ++i) {
        this[data.properties[i][0]] = data.properties[i][1];
        this.generateProperty(data.properties[i][0]);
    }

    for (var signalName in data.signals) {
        this.generateSignal(signalName);
    }
}

QObject.prototype.generateMethod = function(methodName) {
    var object = this;
    return function() {
        var args = [];
        for (var i = 0; i < arguments.length; ++i) {
            args.push(arguments[i]);
        }
        var callback = undefined;
        if (args.length > 0 && typeof args[args.length - 1] === "function") {
            callback = args.pop();
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

            if (!object.__signatures__[signalName]) {
                // property update signal
                return;
            }

            object.__webChannel__.exec({
                type: QWebChannelMessageTypes.connectToSignal,
                object: object.__id__,
                signal: signalName
            });
        },
        disconnect: function(callback) {
            if (typeof callback !== "function") {
                console.error("Qt signals can only be disconnected from functions.");
                return;
            }

            var callbacks = object.__objectSignals__[signalName];
            if (callbacks) {
                var index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                    if (callbacks.length === 0 && object.__signatures__[signalName]) {
                        object.__webChannel__.exec({
                            type: QWebChannelMessageTypes.disconnectFromSignal,
                            object: object.__id__,
                            signal: signalName
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
};

QObject.prototype.generateProperty = function(propertyName) {
    var object = this;
    Object.defineProperty(this, propertyName, {
        get: function() {
            return object["_" + propertyName];
        },
        set: function(value) {
            if (value === undefined) {
                console.error("Property value cannot be undefined");
                return;
            }
            object["_" + propertyName] = value;
            object.__webChannel__.exec({
                type: QWebChannelMessageTypes.setProperty,
                object: object.__id__,
                property: propertyName,
                value: value
            });
        }
    });
};

QObject.prototype.propertyUpdate = function(signals) {
    for (var propertyName in signals) {
        this["_" + propertyName] = signals[propertyName][0];
        var signalName = this.__propertySignals__[propertyName];
        if (signalName) {
            this.signalEmitted(signalName, signals[propertyName]);
        }
    }
};

if (typeof module === "object") {
    module.exports = { QWebChannel: QWebChannel };
}
