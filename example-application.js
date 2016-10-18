var OakStreaming = require("./oakstreaming");
var oakStreaming = new OakStreaming();


var theSharedArray = null;
var streamSource = false;
var theHtmlVideoTag = document.getElementById("myVideo");  


console.log("This is the live demo");


Y({
  db: {
    name: 'memory'
  },
  connector: {
    url : "http://gaudi.informatik.rwth-aachen.de:9914",
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
      // returns the received Stream_Ticket object:    theSharedArray.get(0)
      
      
      // {xhr_hostname: "localhost", xhr_port: 8080, 
      //        path_to_file_on_web_server: "/videos/grassland.mp4", SIZE_VIDEO_FILE: 374824780, 
      //        webTorrent_trackers: []}

      oakStreaming.receive_stream(theSharedArray.get(0), theHtmlVideoTag, function(){
        console.log("receive_stream callback: All video data has been received");
      });  
    }
  });
});


window.handleFiles = function (files) {
  streamSource = true;
  // files[0] contains the file from the user
  // addToSharedArray(content)   transfers content to all other peers
  // Maybe useful: webTorrent_trackers: [["wss://tracker.webtorrent.io"]] web_server_URL : "http://gaudi.informatik.rwth-aachen.de:9912"
  oakStreaming.create_stream(files[0], {web_server_URL: "localhost:8080", webTorrent_trackers: ["ws://localhost:8085"]}, function(streamInformationObject){      
    addToSharedArray(streamInformationObject);
  });
}


function updateChart(){
  document.getElementById("A").innerHTML = "File size in byte: " + oakStreaming.get_file_size();
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