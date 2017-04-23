console.log("Twitter bot is running");
var Twit= require('twit');
var config=require('./config');

var T = new Twit(config);
tweetIt();
function tweetIt() {

  var tweet={
    status:'#systemubuntu from node.js'
  }
  T.post('statuses/update', tweet, tweeted);
  function tweeted (err, data, response) {
    if(err){
      console.log("Something went wrong!");
    }
    else{
      console.log(data);
    }
}

}
