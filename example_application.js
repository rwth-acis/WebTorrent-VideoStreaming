var OakStreaming = require("./OakStreaming");
var oakStreaming = new OakStreaming();

console.log("Version Mounten Giant");

var theSharedMap = null;
var iAmSeeder = false;

console.log("This is task 4");
var step = 1; // New variable in task 4

Y({
  db: {
    name: 'memory'
  },
  connector: {
    url : "http://localhost:8889", // http://gaudi.informatik.rwth-aachen.de:9914
    name: 'webrtc',
    room: 'fdssfgsZVD23d'
  },
  share: {
     myMap : 'Map'
  }
}).then(function (y){
   theSharedMap = y.share.myMap;
  
  
  
   // Task 4.2
   //-------------------------------------------------------------------------
   theSharedMap.observe(function(event){
      console.log("The shared array got updated");
 
      // the step variable is initialized with 1
      // addToSharedMap(object, I)   adds object at index I of the shared array.
      // theSharedMap.get(I)   returns the object at index I of the shared array.

      if(iAmSeeder){
         if(step === 2){
            oakStreaming.createSignalingDataResponse(theSharedMap.get("2"), function(signalingData){
               console.log("result createSignalingDataResponse: " + JSON.stringify(signalingData));
               step++;
               addToSharedMap(signalingData, "3");
            });
         } else {
            step++;
         }
      } else {       
         if(step === 3){
            step++;
            console.log("step === 3");
            oakStreaming.processSignalingResponse(theSharedMap.get("3"), function(){console.log("processSignalingResponse has finished")});
         }
         if(step === 2) {
            step++;
         }
         if(step === 1){
            console.log('theSharedMap.get("1"): ' + JSON.stringify(theSharedMap.get("1")));
            oakStreaming.loadVideo(theSharedMap.get("1"));
            
            console.log("After oakStreaming.loadVideo");
            oakStreaming.createSignalingData(function(signalingData){
               console.log("result createSignalingData: " + JSON.stringify(signalingData));
               step++;
               addToSharedMap(signalingData, "2");
            });
         }
      }
      
   });
   //-------------------------------------------------------------------------   
});






// Task 4.1
//-------------------------------------------------------------------------
window.handleFiles = function (files) {
   iAmSeeder = true;
   
   
   // sha-256 hash value of video file:  fd461d08157e91b3811b6581d8abcfa55fc7e27b808f957878140a7bc117f5ea
   // files[0] is the video file that the user selected.
   // addToSharedMap(object, I)  adds object at index I of the shared array.
   
   // , {webTorrent_tracker: false, web_server_URL: "http://gaudi.informatik.rwth-aachen.de:9912"}   webTorrent_trackers: ["wss://tracker.openwebtorrent.com", "wss://tracker.webtorrent.io"]
   oakStreaming.streamVideo(files[0], {web_server_URL: false}, function(streamInformationObject){
      console.log("streamInformationObject" + JSON.stringify(streamInformationObject));
      addToSharedMap(streamInformationObject, "1");
   });
     
}
//-------------------------------------------------------------------------  


function updateChart(){
   document.getElementById("statistics").innerHTML = "Size of video file in byte: " + oakStreaming.get_file_size() + " Number ob bytes downloaded from peer-to-peer network: " + oakStreaming.get_number_of_bytes_downloaded_P2P() + "\n P2P uploaded: " + oakStreaming.get_number_of_bytes_uploaded_P2P() + "\n Progress P2P download: " + oakStreaming.get_percentage_downloaded_of_torrent() + "\n Bytes received from server: " + oakStreaming.get_number_of_bytes_downloaded_from_server();
   setTimeout(updateChart, 500);
}
updateChart(); 


function addToSharedMap(streamInformationObject, index){
   if(theSharedMap !== null){
      theSharedMap.set(index, streamInformationObject);
   } else {
      setTimeout(function(){addToSharedMap(streamInformationObject, index);},100);
   }   
}