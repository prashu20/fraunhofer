console.log("Twitter bot is running");
var Twit= require('twit');
var config=require('config');
console.log(config);
var T = new Twit(config);
