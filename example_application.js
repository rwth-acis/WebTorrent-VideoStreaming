var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-websockets-client")(Y);
require("y-map")(Y);
var OakStreaming = require('./OakStreaming');
var myStreaming = new OakStreaming();

var theSharedMap = null;
var streamSource = false;

/*
document.querySelector('form').addEventListener('submit', function (ev) {
  ev.preventDefault();
   myStreaming.loadVideo(JSON.parse(document.querySelector('#incoming').value), function(){console.log("All video data has been received");});
});
*/

Y({
  db: {
    name: 'memory'
  },
  connector: {
     //url : "https://yjs.dbis.rwth-aachen.de:5078",
    name: 'websockets-client', // choose the WebRTC connector
    room: 'WebTorrent-Streaming-yeah'
  },
  share: {
     myMap : 'Map'
   // textarea: 'Text' // y.share.textarea is of type Y.Text
  }
  // types: ['Richtext', 'Array'] // optional list of types you want to import
}).then(function (y){
  // bind the textarea to a shared text element
  theSharedMap = y.share.myMap;
  y.share.myMap.observe(function(event){
      console.log("The following event-type was thrown: "+ event.type)
      console.log("The event was executed on: "+ event.name)
      console.log("The event object has more information:")
      console.log(event);
      if(!streamSource){
         console.log("Video gets loaded");
         myStreaming.loadVideo(theSharedMap.getPrimitive("streamInformationObject"), function(){console.log("All video data has been received");});
         console.log("After myStreaming.loadVideo(..) in myMap.observe(..)");
      }
  });
});

window.handleFiles = function(files){     // ,["wss://tracker.webtorrent.io"]   "ws://localhost:8081"    "http://gaudi.informatik.rwth-aachen.de/WebTorrentVideo/:9917"  hashValue : "/" + "ebe51389538b7e58cb5c9d2a9148a57d45f3238c61248513979a70ec8a6a084e"    XHRPort: 8080, 
   streamSource = true;
   myStreaming.streamVideo(files[0], {pathToFileOnXHRServer: "/videos/test.mp4", webTorrentTrackers: [["wss://tracker.webtorrent.io"]]}, function(streamInformationObject){
      console.log("streamInformationObject:\n" + JSON.stringify(streamInformationObject));
      theSharedMap.set("streamInformationObject", streamInformationObject);
   });
}