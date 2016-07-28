var oakStreaming = new OakStreaming();


var theSharedArray = null;
var streamSource = false;  


console.log("This is task 3");


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
  
  
   // Task 3.2
   //------------------------------------------------------------  
   theSharedArray.observe(function(event){
      console.log("The shared array has changed");
      if(!streamSource){
      
         // theSharedArray.get(0) returns the Stream_Information object what has been received via Yjs.
         
         // ### Write code here ###
         
      }
   });
   //-------------------------------------------------------------
   
   
});


// Task 3.1
//------------------------------------------------------------
window.handleFiles = function (files) {
   streamSource = true;
     
   // files[0] contains the file the user selected
   // addToSharedArray(content)  sends content to all other peers via Yjs
   
   // ### Write code here ###

}
//-------------------------------------------------------------



// Task 3.3
//------------------------------------------------------------
function updateChart(){
   
   // Look at the end of this line
   document.getElementById("statistics").innerHTML = "Size of video file in byte: " + oakStreaming.get_file_size() + " Number ob bytes downloaded from peer-to-peer network: "  // ### Add code here ###
   
   setTimeout(updateChart, 500);
}
updateChart();
//------------------------------------------------------------ 




function addToSharedArray(streamInformationObject){
   if(theSharedArray !== null){
      theSharedArray.insert(0, [streamInformationObject]);
   } else {
      setTimeout(function(){addToSharedArray(streamInformationObject);},250);
   }   
}
