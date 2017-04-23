console.log("Twitter follow bot is running");
var Twit= require('twit');
var config=require('./config');

var T = new Twit(config);

  // Setting up a user stream
var stream = T.stream('user');
 //Anytime someone follows me
stream.on('follow',followed);

function followed(event){
   console.log("follow event occurs");
   var name =event.source.name;
   var screenName= event.source.screen_name;
   tweetIt('.@'+screenName+'Thanks for folowing my twitter blog');
}


//setInterval(tweetIt,1000*20);
//tweetIt();
function tweetIt(txt) {
  //var r = Math.floor(Math.random()*100);
  var tweet={
    //status:'Random number generated'+r+' #systemubuntu from node.js'
    status:txt
  }
  T.post('statuses/update', tweet, tweeted);
  function tweeted (err, data, response) {
    if(err) {
      console.log("Something went wrong!");
    }
    else {
      console.log("Awesome");
      }
}

}
