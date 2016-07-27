var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-map")(Y);

var socket = io(); // This is needed such that the server can send messages to this client.



console.log("This is task 1");


// Save HTML5 video element in myVideo
var myVideo = document.getElementsByTagName('video')[0];
myVideo.addEventListener('error', function (err){
   console.error(myVideo.error);
});



function addSourceURLToVideoElement(videoElement, src, type){
   var source = document.createElement('source');
   source.src = src;
   source.type = type;
   element.appendChild(source);
}


// When the participant has uploaded a video, the server sends the video URL to all running instances of the Web application.
socket.on('newVideo1', function(URL){
   console.log("I received a video URL from the server");
   
   // Share the URL via Yjs
   addToSharedArray(URL);
});
 

var theSharedArray = null;
 
      
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
         console.log("I received the following URL via Yjs: " + videoURL);
         addSourceURLToVideoElement(myVideo, videoURL, "video/mp4");
         myVideo.play();

      
   });
   
   
});



function addToSharedArray(URL){
   console.log("addToSharedArray with the following URL is called: " + URL);
   if(theSharedArray !== null){
      theSharedArray.insert(0, [URL]);
   } else {
      setTimeout(function(){addToSharedArray(URL);}, 250);
   }   
}