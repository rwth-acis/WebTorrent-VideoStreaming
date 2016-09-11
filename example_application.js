var OakStreaming = require("./OakStreaming");
var oakStreaming = new OakStreaming();


var theSharedArray = null;
var streamSource = false;  


console.log("This is the live demo");


Y({
  db: {
    name: 'memory'
  },
  connector: {
    url : "http://gaudi.informatik.rwth-aachen.de:9914",                           //"http://localhost:8084" ,
    name: 'webrtc',
    room: 'schduukfherkn32k3289h821'
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
         // returns the received Stream_Information object:    theSharedArray.get(0)
         // Task 3.2
         oakStreaming.loadVideo(theSharedArray.get(0), function(){console.log("loadVideo callback: All video data has been received");});  
      }
   });
});

window.handleFiles = function (files) {
   streamSource = true;
   // files[0] contains the file from the user
   // addToSharedArray(content)   transfers content to all other peers
   // Task 3.1    // webTorrent_trackers: [["wss://tracker.webtorrent.io"]] web_server_URL : "http://gaudi.informatik.rwth-aachen.de:9912"  download_from_server_time_range: 4
   oakStreaming.streamVideo(files[0], {web_server_URL: "localhost:8080"}, function(streamInformationObject){      
      addToSharedArray(streamInformationObject);
   });
}


// Task 3.3
function updateChart(){
   document.getElementById("A").innerHTML = "File length in byte: " + oakStreaming.get_file_size();
   document.getElementById("B").innerHTML = "Bytes downloaded from other peers: " + oakStreaming.get_number_of_bytes_downloaded_P2P();
   document.getElementById("C").innerHTML = "Bytes uploaded to other peers: " + oakStreaming.get_number_of_bytes_uploaded_P2P();
   document.getElementById("D").innerHTML = "Percentage of video file downloaded from P2P network: " + oakStreaming.get_percentage_downloaded_of_torrent();
   document.getElementById("E").innerHTML = "Bytes downloaded from server: " + oakStreaming.get_number_of_bytes_downloaded_from_server();
   setTimeout(updateChart, 50);
}
updateChart(); 





function addToSharedArray(streamInformationObject){
   if(theSharedArray !== null){
      theSharedArray.insert(0, [streamInformationObject]);
   } else {
      setTimeout(function(){addToSharedArray(streamInformationObject);}, 10);
   }   
}
