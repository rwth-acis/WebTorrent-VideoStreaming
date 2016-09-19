var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-map")(Y);


var theSharedArray = null;
     

console.log("This is task 1");


function addSourceToVideoElement(element, src, type){
   var source = document.createElement('source');
   source.src = src;
   source.type = type;
   element.appendChild(source);
}

var myVideo = document.getElementsByTagName('video')[0];
myVideo.addEventListener('error', function (err){
   console.error(myVideo.error);
});


var socket = io();
socket.on('connect', function(){console.log("Connected to socket.io server")});
socket.on('disconnect', function(){"Disconnected from socket.io server"});


socket.on('newVideo', function(URL){
   console.log("socket.on is called");
   addToSharedArray(URL);
});
  
      
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
      console.log("The following event-type was thrown: "+ event.type)
      console.log("The event object has more information:")
      console.log(event);
      
      
         var videoURL = theSharedArray.get(0);
         console.log("I received the URL: " + videoURL);
         addSourceToVideoElement(myVideo, videoURL, "video/mp4");
         myVideo.play();

      
   });
});

/*
window.upload = function (filename){     //webTorrent_trackers: [["ws://gaudi.informatik.rwth-aachen.de:9913"]]   "wss://tracker.webtorrent.io"  {XHR_server_URL : "localhost", XHR_port: 8080, path_to_file_on_XHR_server: "/videos/" + files[0].name, webTorrent_trackers: [["wss://tracker.webtorrent.io"]]} , "ws://localhost:8081"    "http://gaudi.informatik.rwth-aachen.de/WebTorrentVideo/:9917"  XHR_server_URL : "localhost"     hash_value : "/" + "ebe51389538b7e58cb5c9d2a9148a57d45f3238c61248513979a70ec8a6a084e", 
   /// XHR_server_URL : "gaudi.informatik.rwth-aachen.de", XHR_port: 9912, path_to_file_on_XHR_server: "/" + files[0].name         WICHTIG: Config XHR Server: XHR_server_URL : "gaudi.informatik.rwth-aachen.de", XHR_port: 9912, path_to_file_on_XHR_server: "/" + files[0].name
     // gaudi.informatik.rwth-aachen.de:9912  POST
      streamSource = false;
      //files[0]
      addToSharedArray("http://gaudi.informatik.rwth-aachen.de:9912/upload/");  
   });
}
*/


function addToSharedArray(URL){
   console.log("addToSharedArray with the following URL is called: " + URL);
   if(theSharedArray !== null){
      theSharedArray.insert(0, [URL]);
   } else {
      setTimeout(function(){addToSharedArray(URL);}, 250);
   }   
}