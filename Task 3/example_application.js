var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-map")(Y);
var OakStreaming = require('./OakStreaming');
var oakStreaming = new OakStreaming();


var theSharedArray = null;
var streamSource = false;  


console.log("This is task 3");


Y({
  db: {
    name: 'memory'
  },
  connector: {
    url : "http://gaudi.informatik.rwth-aachen.de:9914",
    name: 'webrtc',
    room: 'User1'
  },
  share: {
     myArray : 'Array'
  }
}).then(function (y){
   theSharedArray = y.share.myArray;
  
   theSharedArray.observe(function(event){
      console.log("The following event-type was thrown: "+ event.type);
      console.log("The event object has more information:");
      console.log(event);
      if(!streamSource){
         // theSharedArray.get(0) returns the received Stream_Information object.   
         // Task 3.2
      }
   });
});

window.handleFiles = function (files) {
   streamSource = true;
   // files[0] contains the file from the user
   // addToSharedArray(content)  sends content to all other peers
   // Task 3.1
}


// Task 3.3
function updateChart(){
   document.getElementById("statistics").innerHTML = "Size of video file in byte: " + oakStreaming.get_file_size() + " Number ob bytes downloaded from peer-to-peer network: ";  // add something here
   setTimeout(updateChart, 500);
}
updateChart(); 





function addToSharedArray(streamInformationObject){
   if(theSharedArray !== null){
      theSharedArray.insert(0, [streamInformationObject]);
   } else {
      setTimeout(function(){addToSharedArray(streamInformationObject);},250);
   }   
}
