var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-map")(Y);
var OakStreaming = require('./OakStreaming');
var oakStreaming = new OakStreaming();


var theSharedArray = null;
var streamSource = false;  


console.log("This is task 2");


Y({
  db: {
    name: 'memory'
  },
  connector: {
    url : "http://gaudi.informatik.rwth-aachen.de:9914",
    name: 'webrtc',
    room: 'WebTorrent-Streaming-yeah'
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
         oakStreaming.loadVideo(theSharedArray.get(0), function(){console.log("loadVideo callback: All video data has been received");});  
      }
   });
});

window.handleFiles = function (files) {
   streamSource = true;
   oakStreaming.streamVideo(files[0], {webTorrent_trackers: [["wss://tracker.webtorrent.io"]], peer_upload_limit_multiplier: 1.5}, function(streamInformationObject){      
      addToSharedArray(streamInformationObject);
   });
}


function addToSharedArray(streamInformationObject){
   if(theSharedArray !== null){
      theSharedArray.insert(0, [streamInformationObject]);
   } else {
      setTimeout(function(){addToSharedArray(streamInformationObject);},250);
   }   
}


function updateChart(){
   document.getElementById("statistics").innerHTML = "webTorrentFile.length: " + oakStreaming.get_file_size() + "\n torrent.downloaded: " + oakStreaming.get_number_of_bystes_downloaded_P2P() + "\n torrent.uploaded: " + oakStreaming.get_number_of_bytes_uploaded_P2P() + "\n torrent.progress: " + oakStreaming.get_percentage_downloaded_of_torrent() + "\n Bytes received from server: " + oakStreaming.get_number_of_bytes_downloaded_from_server();
   setTimeout(updateChart, 500);
}
updateChart(); 