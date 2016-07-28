// Task 2.1
//--------------------------------

// The OakStreaming constructor is available as a global variable

/* ### Write code here ### */

//---------------------------------



var theSharedYjsArray = null;
var streamSource = false;  


console.log("This is task 2");


window.handleFiles = function (files) {
   streamSource = true;  
   
   
   
   // Task 2.2
   //--------------------------------------------------
   
   // files[0] contains the video file that has been selected by the user
   // webTorrent_trackers: [["wss://tracker.webtorrent.io"]]  specifies the WebTorrent trackers (which also function as signaling servers) that will by contacted
   // peer_upload_limit_multiplier: 1.5    specifies that each peer is not allowed to upload more than 1.5 times as much as it has downloaded.
   
   /* ### Write code here ### */
   
   //--------------------------------------------------

   
   
}


function addToSharedArray(streamInformationObject){
   if(theSharedArray !== null){
      theSharedArray.insert(0, [streamInformationObject]);
   } else {
      setTimeout(function(){addToSharedArray(streamInformationObject);},250);
   }   
}



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
   theSharedYjsArray = y.share.myArray;
  
   theSharedYjsArray.observe(function(event){
      console.log("The following event-type was thrown: "+ event.type);
      console.log("The event object has more information:");
      console.log(event);
      if(!streamSource){


      // Task 2.3
      //--------------------------------------------------
      
      /* ### Write code here ### */
      
      //--------------------------------------------------


      }
   });
});