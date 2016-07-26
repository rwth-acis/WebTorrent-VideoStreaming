var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-map")(Y);
var OakStreaming = require('./OakStreaming');
var myStreaming = new OakStreaming();

var theSharedMap = null;
var theSharedArray = null;
var streamSource = false;  
     

console.log("THis is the WebRTC version of example_application 1");


Y({
  db: {
    name: 'memory'
  },
  connector: {
    url : "http://gaudi.informatik.rwth-aachen.de:9914",  // "https://yjs.dbis.rwth-aachen.de:5078",  http://localhost:8897
    name: 'webrtc',
    room: 'WebTorrent-Streaming-yeah'
  },
  share: {
     myArray : 'Array'
  }
}).then(function (y){
   console.log("Yjs then gets executed");
  //theSharedMap = y.share.myMap;
  theSharedArray = y.share.myArray;

  
   theSharedArray.observe(function(event){
      console.log("The following event-type was thrown: "+ event.type)
      console.log("The event was executed on: "+ event.name)
      console.log("The event object has more information:")
      console.log(event);
      if(!streamSource){         
         myStreaming.loadVideo(theSharedArray.get(0), function(){console.log("loadVideo callback: All video data has been received");});  
      }
   });
});

window.upload = function (){     //webTorrent_trackers: [["ws://gaudi.informatik.rwth-aachen.de:9913"]]   "wss://tracker.webtorrent.io"  {XHR_server_URL : "localhost", XHR_port: 8080, path_to_file_on_XHR_server: "/videos/" + files[0].name, webTorrent_trackers: [["wss://tracker.webtorrent.io"]]} , "ws://localhost:8081"    "http://gaudi.informatik.rwth-aachen.de/WebTorrentVideo/:9917"  XHR_server_URL : "localhost"     hash_value : "/" + "ebe51389538b7e58cb5c9d2a9148a57d45f3238c61248513979a70ec8a6a084e", 
   /// XHR_server_URL : "gaudi.informatik.rwth-aachen.de", XHR_port: 9912, path_to_file_on_XHR_server: "/" + files[0].name         WICHTIG: Config XHR Server: XHR_server_URL : "gaudi.informatik.rwth-aachen.de", XHR_port: 9912, path_to_file_on_XHR_server: "/" + files[0].name
     // gaudi.informatik.rwth-aachen.de:9912  POST
      
      //files[0]
      addToSharedArray("http://gaudi.informatik.rwth-aachen.de:9912/file1");  
   });
}




function addToSharedArray(streamInformationObject){
   if(theSharedArray !== null){
      theSharedArray.insert(0, [streamInformationObject]);
   } else {
      setTimeout(function(){addToSharedArray(streamInformationObject);},250);
   }   
}