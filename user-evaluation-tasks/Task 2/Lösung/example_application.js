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
   oakStreaming.streamVideo(files[0], {web_server_URL: false, webTorrent_trackers: [["wss://tracker.webtorrent.io"]], peer_upload_limit_multiplier: 1.5}, function(streamInformationObject){      
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