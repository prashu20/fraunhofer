/*
 * Copyright (c) 2016
 * Fraunhofer Institute for Manufacturing Engineering
 * and Automation (IPA)
 * Author: das
 */

'use strict';

var mqtt = require('mqtt')
var events = require('events');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var config = require('./config');


function FunctionEmitter() {
    EventEmitter.call(this);
}
util.inherits(FunctionEmitter, EventEmitter);

var MSBMessageTypes = [
    'IO',
    'NIO',
    'IO_CONNECTED',
    'IO_REGISTERED',
    'IO_PUBLISHED',
    'NIO_ALREADY_CONNECTED',
    'NIO_REGISTRATION_ERROR',
    'NIO_UNEXPECTED_REGISTRATION_ERROR',
    'NIO_UNAUTHORIZED_CONNECTION',
    'NIO_EVENT_FORWARDING_ERROR',
    'NIO_UNEXPECTED_EVENT_FORWARDING_ERROR'
];

var MSBClient = function() {

    if (!(this instanceof MSBClient)) {
        return new MSBClient();
    }

    var my = this;
    my.connected = false;
    my.initBuffer = true;
    my.mqtt = undefined;

    my.functions = {};
    my.events = {};
    my.parameters = {};
    my.configuration = {};
    my.configuration['parameters'] = my.parameters;
    my.eventBuffer = [];

    // The event emitter listens for incoming connection state messages from the MSB
    my.functionEmitter = new FunctionEmitter();
    my.functionEmitter.on('connectionState', function (msg) {
        console.log('Received connectionState message from MSB: ' + msg);
    });

    this.addFunction = function(function_obj) {
        if(function_obj.hasOwnProperty('responseEvents')){
            var eventIdArray = [];
            function_obj['responseEvents'].forEach(function(response_event) {
                for (var event in my.events) {
                    if (my.events.hasOwnProperty(event)) {
                        if(my.events[event].eventId === response_event){
                            var ev = my.events[event];
                            eventIdArray.push(ev['@id']);
                        }
                    }
                }
            });
            function_obj.responseEvents = eventIdArray;
        }
        function_obj.functionId = function_obj.functionId;
        my.functions[function_obj.functionId] = function_obj;
    };

    this.addEvent = function(event_obj, _eventName, _eventDescription, _dataType, priority, isArray) {
        if(event_obj.eventId){
            event_obj['@id'] = Object.keys(my.events).length + 1;
            event_obj.implementation.uuid = config.identity.uuid;
            event_obj.implementation.eventId = event_obj.eventId;
            my.events[event_obj.eventId] = event_obj;
        } else {
            var new_obj = {
                '@id': Object.keys(my.events).length + 1,
                'eventId': event_obj,
                'name': _eventName,
                'description': _eventDescription,
                dataFormat: {},
                implementation: { 'uuid': config.identity.uuid, 'eventId': event_obj, 'dataObject': null}
            };    

            if(isArray){
                new_obj.dataFormat['dataObject'] = {'type': 'array', items: getDataType(_dataType)};
            } else {
                new_obj.dataFormat['dataObject'] = getDataType(_dataType);;
            }
            my.events[new_obj.eventId] = new_obj; 
        }
    };

    function getDataType(format){
        var dataObject = {};
        if(format === 'string'){
            dataObject['type'] = 'string';
        }
        else if (format === 'int32'){
            dataObject['type'] = 'integer';
            dataObject['format'] = 'int32';
        }
        else if (format === 'int64'){
            dataObject['type'] = 'integer';
            dataObject['format'] = 'int64';
        }
        else if (format === 'double'){
            dataObject['type'] = 'number';
            dataObject['format'] = 'double';
        }
        else if (format === 'float'){
            dataObject['type'] = 'number';
            dataObject['format'] = 'float';
        }
        else if (format === 'date-time'){
            dataObject['type'] = 'string';
            dataObject['format'] = 'date-time';
        }
        else if (format === 'boolean'){
            dataObject['type'] = 'boolean';
            dataObject['default'] = 'false';
        }
        else if (format === 'byte'){
            dataObject['type'] = 'string';
            dataObject['format'] = 'byte';
        }
        return dataObject;
    };

    this.addConfigParam = function(key, value, type, format) {
        var newParam = {}
        newParam['value'] = value;
        newParam['type'] = type;
        newParam['format'] = format;
        my.configuration.parameters[key] = newParam;
    };

    this.getConfigParam = function(key) {
        if(my.configuration.parameters[key]){
            return my.configuration.parameters[key]['value'];
        }
        else return '';
    }

    this.changeConfigParam = function(key, value) {
        if( my.configuration.parameters[key] ) {
            my.configuration.parameters[key] = value;
            my.mqtt.publish('R ' + JSON.stringify(getSelfDescription()));
        }
    };

    this.setEventValue = function(eventId, eventValue){
        if(my.events[eventId]){
           my.events[eventId].implementation.dataObject = eventValue;
        }
    }

    this.sendEvent = function(eventId, buffered) {
        if(this.isConnected()){
            if(my.events[eventId]){
                var event = my.events[eventId].implementation;
                event.postDate = new Date().toISOString();
                console.log(JSON.stringify(event));
                my.mqtt.publish('UP/E/' + config.identity.uuid + '/' + event.eventId, JSON.stringify(event));
                console.log(event.eventId + ' sent to MSB');
            }
        }
        else {
            if(buffered || (!this.isConnected() & my.initBuffer)){
                console.log('Not connected, putting event in buffer.');
                if(my.events[eventId]){
                    var event = my.events[eventId].implementation;
                    event.postDate = new Date().toISOString();
                    my.eventBuffer.push(event)
                }
            }
        }
    };

    this.sendChangeEvent = function(eventId, eventValue, buffered) {
        if(this.isConnected()){
            if(my.events[eventId]){
                var newDataObject = {};
                var event = my.events[eventId].implementation;
                for (var property in event.dataObject) {
                    if (event.dataObject.hasOwnProperty(property)) {
                        if (eventValue.hasOwnProperty(property)) {
                            newDataObject[property] = eventValue[property];
                        }
                    }
                }
                event.dataObject = newDataObject;
                event.postDate = new Date().toISOString();
                console.log(JSON.stringify(event));
                my.mqtt.publish('UP/E/' + config.identity.uuid + '/' + event.eventId, JSON.stringify(event));
                console.log(event.eventId + ' sent to MSB');
            }
        }
        else {
            if(buffered || (!this.isConnected() & my.initBuffer)){
                console.log('Not connected, putting event in buffer.');
                if(my.events[eventId]){
                    var newDataObject = {};
                    var event = my.events[eventId].implementation;
                    for (var property in event.dataObject) {
                        if (event.dataObject.hasOwnProperty(property)) {
                            if (eventValue.hasOwnProperty(property)) {
                                newDataObject[property] = eventValue[property];
                            }
                        }
                    }
                    event.dataObject = newDataObject;
                    event.postDate = new Date().toISOString();
                    my.eventBuffer.push(event)
                }
            }
        }
    };

    function getSelfDescription() {

        var self_description = {
            uuid: config.identity.uuid,
            name: config.identity.name,
            description: config.identity.description,
            token: config.identity.token,
            '@class': config.identity.class,
            events: [],
            functions: [],
            configuration: my.configuration
        };

        _.forIn(_.cloneDeep(my.events), function(value) {
            self_description.events.push(_.omit(value, ['implementation']));
        });
        _.forIn(_.cloneDeep(my.functions), function(value) {
            self_description.functions.push(_.omit(value, ['implementation']));
        });
        return self_description;
    }

    this.connect = function(broker_url) {
        if (!broker_url) {
            broker_url = config.broker_url;
        }
        console.log('Connecting to MSB @ ' + broker_url);
        my.mqtt = mqtt.connect(broker_url, {clientId: config.identity.uuid});

        my.mqtt.on('connect', function () {
            my.connected = true;
            console.log('Connected to MSB');
            console.log('Socket open');
            my.mqtt.publish('UP/R', JSON.stringify(getSelfDescription()));
            console.log(JSON.stringify(getSelfDescription()));
            checkBuffer();
            _.forIn(_.cloneDeep(my.functions), function(fvalue) {
                my.mqtt.subscribe('DOWN/C/' + config.identity.uuid + '/' + fvalue['functionId']);
            });
        });

        my.mqtt.on('message', function (topic, message) {
            console.log('Received message from MSB MQTT Broker on Topic: ' + topic);
            console.log('Message payload: ' + message);
            // if (e.type !== 'message') {
            //     return;
            // }

            // if (_.includes(MSBMessageTypes, e.data)) {
            //     my.functionEmitter.emit('connectionState', e.data);
            //     if(e.data === 'NIO_ALREADY_CONNECTED' || e.data === 'NIO_UNAUTHORIZED_CONNECTION'){
            //         my.connected = false;
            //         my.mqtt.close();
            //         my.functionEmitter.emit('connectionState', 'CLOSED_AND_RECONNECT');
            //     }
            // }
                var fId = topic.replace('DOWN/C/' + config.identity.uuid + '/', '');
                if(my.functions[fId]){
                    my.functions[fId].implementation(JSON.parse(message));
                }
            // else if (e.data.startsWith('K')){
            //     my.configuration = JSON.parse(e.data.slice(2));
            // }
        });

        // MSB connection error
        my.mqtt.on('close', function () {
            my.connected = false;
            console.log('CLOSE');
            my.functionEmitter.emit('connectionState', 'CLOSED_AND_RECONNECT');
            setTimeout(my.connect, 3000);
        });

        my.mqtt.on('error', function (error) {
            console.log('ERROR', error);
        });

    };

    this.isConnected = function() {
        return my.connected;
    };

    function isConnected(){
        return my.connected;
    };

    function checkBuffer() {
        if(isConnected() && my.eventBuffer.length>0){
            console.log('EventBuffer size: '+  my.eventBuffer.length);
            for (var i in my.eventBuffer) {
                var bufEv = my.eventBuffer[i];
                console.log('resending from buffer:');
                console.log(JSON.stringify(bufEv))
                my.mqtt.publish('UP/E/' + config.identity.uuid + '/' + event.eventId, JSON.stringify(bufEv));
                my.eventBuffer.splice(i, 1);
            }
            setTimeout(function () {
                checkBuffer();
            }, 1000);
        }
    };

    this.debug = function(bool) {
    if(!bool){
        if(!this.console) this.console = {};
        var methods = ['log', 'debug', 'warn', 'info'];
        for(var i=0;i<methods.length;i++){
            console[methods[i]] = function(){};
        }
    }
    };


};

module.exports = MSBClient;
