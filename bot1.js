console.log("Twitter bot is running");
var Twit= require('twit');
var config=require('./config');
console.log(config);
var T = new Twit(config);
var params={
  q: 'Germany',
  count: 2
};

T.get('search/tweets',params,gotdata);
function gotdata(err,data,reponse) {
  var tweets=data.statuses;
  for(var i=0;i<tweets.length;i++)
  console.log(tweets[i].text);
}
