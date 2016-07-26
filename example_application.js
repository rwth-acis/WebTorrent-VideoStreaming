var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-map")(Y);
var OakStreaming = require('./OakStreaming');
var oakStreaming = new OakStreaming();


var theSharedArray = null;
var streamSource = false;

console.log("This is task 4");
var step 1; // New variable in task 4

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
      
      
      
      
      // Task 4.2
      
      // addToSharedArray(object, I)   adds object at index I of the shared array.
      // theSharedArray.get(I)   returns the object at index I of the shared array.
       
      if(streamSource){
         if(step === 2){
            // ###Write code here### 
         }
      } else {
         if(step === 1){
            // ###Write code here### 
         }
         if (step === 3){
            // ###Write code here### 
         }
      }
      step++;
      
      
      
      
   });
});

window.handleFiles = function (files) {
   streamSource = true;
   
   
   
   
   // Task 4.1
   
   // sha-256 hash value of video file fd461d08157e91b3811b6581d8abcfa55fc7e27b808f957878140a7bc117f5ea
   // Web server URL: gaudi.informatik.rwth-aachen.de
   // Web server port: 
   // files[0] is the video file that the user selected.
   // addToSharedArray(object, I)  adds object at index I of the shared array.
   
   
   oakStreaming.streamVideo(files[0], {/* ###Write code here### Set the appropriate values for the option object   */}, function(streamInformationObject){      
      addToSharedArray(streamInformationObject, 1);
   });
   
   
   
}



function updateChart(){
   document.getElementById("statistics").innerHTML = "webTorrentFile.length: " + oakStreaming.get_file_size() + "\n torrent.downloaded: " + oakStreaming.get_number_of_bystes_downloaded_P2P() + "\n torrent.uploaded: " + oakStreaming.get_number_of_bytes_uploaded_P2P() + "\n torrent.progress: " + oakStreaming.get_percentage_downloaded_of_torrent() + "\n Bytes received from server: " + oakStreaming.get_number_of_bytes_downloaded_from_server();
   setTimeout(updateChart, 500);
}
updateChart(); 


function addToSharedArray(streamInformationObject, index){
   if(theSharedArray !== null){
      theSharedArray.insert(index, [streamInformationObject]);
   } else {
      setTimeout(function(){addToSharedArray(streamInformationObject, index);},250);
   }   
}
