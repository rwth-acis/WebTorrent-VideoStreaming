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
   videoElement.appendChild(source);
   console.log("I have added the URL to the HTML 5 video element");
}



//  Task 1.4
//--------------------------------------------------------------------------------------------------

// When the participant has uploaded a video, the server sends back the video URL.
socket.on('newVideo1', function(URL){
   console.log("I received a video URL from the server");
   
   // Share the URL via Yjs
   // addToSharedArray(string)  puts a string in the shared array
   
   /* ### Write code here ### */
   
});
//---------------------------------------------------------------------------------------------------- 



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

  
  
  
  
   // Task 1.5
   //-----------------------------------------------------------------------------
   
   // This function is called when the shared array gets changed.
   theSharedArray.observe(function(event){      
         var videoURL = theSharedArray.get(0);
         console.log("I have received the following URL via Yjs: " + videoURL);
          
         // The variable myVideo contains the HTML video element. "video/mp4" specifies the type of the video.
         addSourceURLToVideoElement(/*### Add HTML 5 video Element ####*/, /*### Add URL to the video file on the server ###*/, "video/mp4");
         myVideo.play();

      
   });
   //-----------------------------------------------------------------------------
   
   
   
   
   
});



function addToSharedArray(URL){
   if(theSharedArray !== null){
      theSharedArray.insert(0, [URL]);
   } else {
      setTimeout(function(){addToSharedArray(URL);}, 250);
   }   
}