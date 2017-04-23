/*
 * Copyright (c) 2016
 * Fraunhofer Institute for Manufacturing Engineering
 * and Automation (IPA)
 * Author: das
 */

'use strict';

var fs = require('fs');

var config = {
    // broker_url: 'http://localhost:8085/websocket/data',
    broker_url: 'http://ipa.virtualfortknox.de/msb/websocket/data',
    identity: {
        class: 'SmartObject',

        uuid: '22801d88-34cf-4836-8cc1-7e0d9c5dca12c4',  // https://www.uuidgenerator.net/version4
        token: 'testToken',

        name: 'nodeJS test client',
        description: 'Test client description goes here.'
    }
};


// added possibility to inject configuration data to docker instances
////////////////////////////////////////////////////////////////////////////
var getParam = function (param_name) {
    var param_value, i;
    if(fs.existsSync(__dirname + '/../application.properties')) {
        var configArray = fs.readFileSync(__dirname + '/../application.properties').toString().split(/\r?\n/);
    }
    else if(fs.existsSync(__dirname + '/application.properties')){
        var configArray = fs.readFileSync(__dirname + '/application.properties').toString().split(/\r?\n/);
    }

    for (i in configArray) {
        var params = configArray[i].split('=');
        if (configArray[i] != '' && params[1] != undefined) {
            if (params[0] == param_name) {
                param_value = params[1];
            }
        }
    }
    return param_value
};

if (fs.existsSync(__dirname + '/../application.properties') || fs.existsSync(__dirname + '/application.properties')) {
    config.server = {};
    config.identity = {};
    config.settings = {};

    // Broker server URL config
    config.broker_url = getParam('broker') + '/websocket/data';
    console.log('config.broker_url: ' + config.broker_url + '/websocket/data');
    // UUID
    config.identity.uuid = getParam('uuid');
    console.log('config.identity.uuid: ' + config.identity.uuid);
    // Name
    config.identity.name = getParam('name');
    console.log('config.identity.name: ' + config.identity.name);
    // Description
    config.identity.description = getParam('description');
    console.log('config.identity.desc: ' + config.identity.description);
    // token
    config.identity.token = getParam('token');
    console.log('config.identity.token: ' + config.identity.token);

    // Class - Change class type accordingly (Application/SmartObject)
    config.identity.class = getParam('class');
    console.log('config.identity.class: ' + config.identity.class);

    // additional settings
    config.settings.value_1 = '1';
    config.settings.value_2 = '2';
}

module.exports = config;
