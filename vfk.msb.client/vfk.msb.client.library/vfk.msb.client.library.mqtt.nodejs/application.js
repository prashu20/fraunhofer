/*
 * Copyright (c) 2016
 * Fraunhofer Institute for Manufacturing Engineering
 * and Automation (IPA)
 * Author: das
 */

'use strict';

// Import the required modules:
const MSBClient = require('./msb_client');
const msbClient = new MSBClient();

// // add new configuration parameters like this. Configuration parameters are published to the MSB and can be changed from the MSB GUI in real time.
msbClient.addConfigParam('testParam1', true, 'BOOLEAN');
msbClient.addConfigParam('testParam2', 'StringValue', 'STRING');
msbClient.addConfigParam('testParam3', 1000, 'INTEGER', 'INT32');

// Add events to the client
// You can add events with simple data formats like this:
// addevent('eventId', 'eventName', 'eventDescription', 'dataType', 'priority', isArray)
// dataType: string, byte, date-time, int32, int64, float, double, boolean
// priority: 0, 1, 2
// isArray: true, false;
msbClient.addEvent('SIMPLE_EVENT1', 'Simple event 1', 'Description simple event 1', 'string', 2, false);
msbClient.addEvent('SIMPLE_EVENT2', 'Simple event 2', 'Description simple event 2', 'int64', 2, true);

// You can define events manually, this is needed for custom complex dataObjects:
msbClient.addEvent({
    eventId: 'EVENT1',
    name: 'Event 1',
    description: 'Description for Event 1',
    dataFormat: { dataObject: { type : 'string' }},
    implementation: {
        priority: 2,
        dataObject: '100'
    }
});

msbClient.addEvent({
    eventId: 'EVENT2',
    name: 'Event 2',
    description: 'Description for Event 2',
    dataFormat: { dataObject: { type: 'number',  format: 'float' }},
    implementation: {
        priority: 2,
        dataObject: 200
    }
});

msbClient.addEvent({
    eventId: 'EVENT3',
    name: 'Event 3',
    description: 'Description for Event 3',
    dataFormat: {
    dataObject: { '$ref': '#/definitions/Device' },
        Device:{
            type: 'object',
            properties:{
                value1:{
                    type: 'number', format: 'float'
                },
                value2:{
                    type: 'number', format: 'float'
                },
                value3:{
                    type: 'number', format: 'float'
                }
            }
        }
    },
    implementation: {
        priority: 2,
        dataObject: { value1: 0.0,  value2: 0.0, value3: 0.0}
    }
});

msbClient.addEvent({
    eventId: 'EVENT4',
    name: 'Event 4',
    description: 'Description for Event 4',
    dataFormat: {
        dataObject: {
            type: 'array',
            items: {
                type: 'integer',
                format: 'int32'
            }
        }
    },
    implementation: {
        priority: 2,
        dataObject: [0]
    }
});

msbClient.addEvent({
    eventId: 'EVENT5',
    name: 'Event 5',
    description: 'Description for Event 5',
    dataFormat: {
        dataObject: {
            type: 'array',
            items: {
                '$ref': '#/definitions/Device'
            }
        },
        Device: {
            type: 'object',
            properties: {
                value1: { type: 'number', format: 'float' },
                value2: { type: 'number', format: 'float' },
                value3: { type: 'number', format: 'float' },
                value4: {
                    type: 'array',
                     items: {
                        type: 'number', format: 'float'
                    }
                }
            }
        }
    },
    implementation: {
        priority: 2,
        dataObject: [0]
    }
});

// add custom functions to the client
msbClient.addFunction({
    functionId: 'function1',
    name: 'Function 1',
    description: 'Description for Function 1',
    dataFormat: { messageString: { type: 'string' }},
    implementation: function(msg) {
        console.log('function1 has been called, message: ' + msg.messageString);
    }
});

// Optionally, you can add responseEvents by their eventId (define and add the respective events first)
msbClient.addFunction({
    functionId: 'function2',
    name: 'Function 2',
    description: 'Description for Function 2',
    dataFormat: { messageParam: { type: 'number', format: 'float' }},
    responseEvents: ['EVENT1', 'EVENT2'],
    implementation: function(msg) {
        console.log('function1 has been called, message:' + msg.messageParam);
    }
});

// connect to the MSB, if you call the .connect function without any parameters, the standard values from the application.properties and self_description.js files will be used.
msbClient.connect();

// set this to false to disable all console logs.
msbClient.debug(true);

// send an event with a short delay, check the connection state before you send events. 
// You can also send events directly, but they will be put in the event buffer if no connection has been established yet.
setTimeout(function () {
    if (msbClient.isConnected()) {
        setInterval(sendData, 1000);
    } else {
        console.log('Client not connected to MSB!');
    }
}, 3000);

function sendData(){
    msbClient.setEventValue('EVENT1', randomInt(50,100));
    msbClient.setEventValue('EVENT2', randomInt(50,100));
    // When setting an event value the provided dataObject has to have the exact format as the dataObject in the event description.
    // msbClient.setEventValue('EVENT3', { value1: 3.3, value2: 4.4, value3: 5.5 });
    msbClient.setEventValue('EVENT4', [1,2,3,4,5,6]);
    var dev1Arr = [];
    dev1Arr[3] = 0.4;
    msbClient.setEventValue('EVENT5', [{ value1: '0.0', value2: '0.0', value3: '0.0', value4: dev1Arr}, { value1: '0.0', value2: '0.0', value3: '0.0', value4: '[0.0, 0.0, 0.0, 0.0, 0.0]' }]);
    msbClient.sendEvent('EVENT1');
    msbClient.sendEvent('EVENT2');
    // sendChangeEvent() can take in JSON objects which have missing properties, for example if you want to send only a set of values which have changed.
    // since the dataObject will have missing fields, you can only map the whole object in your flow and not the dataObject properties.
    msbClient.sendChangeEvent('EVENT3', { value2: 4.4 });
    // msbClient.sendEvent('EVENT3');
    msbClient.sendEvent('EVENT4');
    msbClient.sendEvent('EVENT5');
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}
