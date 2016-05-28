var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-websockets-client")(Y);
require("y-map")(Y);
var OakStreaming = require('./OakStreaming');
var myStreaming = new OakStreaming(42);

var theSharedMap = null;
var streamSource = false;


Y({
  db: {
    name: 'memory'
  },
  connector: {
     //url : "https://yjs.dbis.rwth-aachen.de:5078",
    name: 'websockets-client', // choose the webrtc connector
    room: 'Textarea-example-dev'
  },
  share: {
     myMap : 'Map'
   // textarea: 'Text' // y.share.textarea is of type Y.Text
  }
  // types: ['Richtext', 'Array'] // optional list of types you want to import
}).then(function (y) {
  // bind the textarea to a shared text element
  theSharedMap = y.share.myMap;
  y.share.myMap.observe(function(event){
      console.log("The following event-type was thrown: "+event.type)
      console.log("The event was executed on: "+event.name)
      console.log("The event object has more information:")
      console.log(event);
      if(!streamSource){
         console.log("Video gets loaded");
         myStreaming.loadVideo(theSharedMap.getPrimitive("message"));
         console.log("After myStreaming.loadVideo(..) in myMap.observe(..)");
         /*
         theSharedMap.get("message").then(function(streamInformationObject){
            console.log("Video gets loaded");
            myStreaming.loadVideo(streamInformationObject);
         }, function(){console.log("Promise was rejected");});
         */
      }
  });
});

window.handleFiles = function(files){
   streamSource = true;
   myStreaming.streamVideo(files[0], {XHRPath : "example.mp4"}, function(streamInformationObject){
      theSharedMap.set("message", streamInformationObject); 
   });
}