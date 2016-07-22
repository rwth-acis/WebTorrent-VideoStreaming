var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
//require("y-websockets-client")(Y);
//require("y-webrtc")(Y);
require("y-map")(Y);
var OakStreaming = require('./OakStreaming');
var myStreaming = new OakStreaming();

var theSharedMap = null;
var theSharedArray = null;
var streamSource = false;  
     

/*
document.querySelector('form').addEventListener('submit', function (ev) {
  ev.preventDefault();
   myStreaming.loadVideo(JSON.parse(document.querySelector('#incoming').value), function(){console.log("All video data has been received");});
});
*/

console.log("THis is the WebRTC version of example_application 1");


Y({
  db: {
    name: 'memory'
  },
  connector: {
    url : "http://gaudi.informatik.rwth-aachen.de:9914",  // "https://yjs.dbis.rwth-aachen.de:5078",  http://localhost:8897
    //name: 'websockets-client',
    name: 'webrtc',
    room: 'WebTorrent-Streaming-yeah'
  },
  share: {
     //myMap : 'Map',
     myArray : 'Array'
  }
}).then(function (y){
   console.log("Yjs then gets executed");
  //theSharedMap = y.share.myMap;
  theSharedArray = y.share.myArray;
  /*
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
  */
  
   theSharedArray.observe(function(event){
      console.log("The following event-type was thrown: "+ event.type)
      console.log("The event was executed on: "+ event.name)
      console.log("The event object has more information:")
      console.log(event);
      if(!streamSource){         
         myStreaming.loadVideo_technical_evaluation(theSharedArray.get(0), function(){console.log("loadVideo callback: All video data has been received");});  
      }
   });
});

window.handleFiles = function (files){     //webTorrent_trackers: [["ws://gaudi.informatik.rwth-aachen.de:9913"]]   "wss://tracker.webtorrent.io"  {XHR_server_URL : "localhost", XHR_port: 8080, path_to_file_on_XHR_server: "/videos/" + files[0].name, webTorrent_trackers: [["wss://tracker.webtorrent.io"]]} , "ws://localhost:8081"    "http://gaudi.informatik.rwth-aachen.de/WebTorrentVideo/:9917"  XHR_server_URL : "localhost"     hash_value : "/" + "ebe51389538b7e58cb5c9d2a9148a57d45f3238c61248513979a70ec8a6a084e", 
   streamSource = true;   /// XHR_server_URL : "gaudi.informatik.rwth-aachen.de", XHR_port: 9912, path_to_file_on_XHR_server: "/" + files[0].name         WICHTIG: Config XHR Server: XHR_server_URL : "gaudi.informatik.rwth-aachen.de", XHR_port: 9912, path_to_file_on_XHR_server: "/" + files[0].name
   myStreaming.streamVideo(files[0], {XHR_server_URL : "gaudi.informatik.rwth-aachen.de", XHR_port: 9912, path_to_file_on_XHR_server: "/" + files[0].name}, function(streamInformationObject){
      //console.log("streamInformationObject:\n" + JSON.stringify(streamInformationObject));
      console.log("In example.js video file got seeded.");
      
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

// This function updates the statistics that is shown above the video
// updateChart in loadVideo shows more infos but is not indent for enduser use. This is intended as enduser example.
/*
function updateChart(){
   document.getElementById("WebTorrent-received").innerHTML = "webTorrentFile.length: " + myStreaming.get_file_size() + "\n torrent.downloaded: " + myStreaming.get_number_of_bystes_downloaded_P2P() + "\n torrent.uploaded: " + myStreaming.get_number_of_bytes_uploaded_P2P() + "\n torrent.progress: " + myStreaming.get_percentage_downloaded_of_torrent() + "\n Bytes received from server: " + myStreaming.get_number_of_bytes_downloaded_from_server();
   setTimeout(updateChart, 500);
}
updateChart();
*/   