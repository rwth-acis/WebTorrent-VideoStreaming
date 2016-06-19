var fs = require('fs');
var OakStreaming = require('./OakStreaming_Node');

var myStreaming = new OakStreaming("Horst");
//var streamBuffers = require('stream-buffers');

console.log("Beastmaster");

var create_streamInformationObject = true;
var Path_where_save_streamInformationObject = "./secondExampleApplication/streamInformationObject.js";
//var seed_Video = true;
var Video_Name = "web/test.mp4";

//var PATH_TO_VIDEO = __dirname + "\\web\\example.mp4";
//console.log(PATH_TO_VIDEO);
var PATH_TO_VIDEO = "./web/test.mp4";



if(create_streamInformationObject){
   var videoFileStream = fs.createReadStream(PATH_TO_VIDEO);
   
   // This will wait until we know the readable stream is actually valid before piping
   videoFileStream.on('open', function (){
      console.log("Video file is open");
      myStreaming.streamVideo(videoFileStream, {XHRPath : "/" + Video_Name, XHRPort : 80, webTorrentTrackers: [["wss://tracker.webtorrent.io"]]}, function(streamInformationObject){
         console.log("streamInformationObject was successfully created");
         fs.writeFile(Path_where_save_streamInformationObject, "var streamInformationObject = " + JSON.stringify(streamInformationObject) + ";", function(err, data){
            if(err) {
               return console.log(err);
            }
            console.log("streamInformationObject was written to a file.");
         }); 
      });
   });

   // This catches any errors that happen while creating the readable stream (usually invalid names)
   videoFileStream.on('error', function(err) {
     console.log(err);
   });
}  



/*
if(create_streamInformationObject){      // [["ws://localhost:8081"]]  ["wss://tracker.webtorrent.io"],["wss://tracker.btorrent.xyz"],["wss://tracker.openwebtorrent.com"],["wss://tracker.fastcast.nz"]
   console.log("Before streamVideo");
   myStreaming.streamVideo(PATH_TO_VIDEO, {XHRPath : "/" + Video_Name, XHRPort : 8082, webTorrentTrackers: [["wss://tracker.btorrent.xyz"]]}, function(streamInformationObject){
      console.log("streamInformationObject was successfully created");
      fs.writeFile(Path_where_save_streamInformationObject, "var streamInformationObject = " + JSON.stringify(streamInformationObject) + ";", function(err, data){
         if(err) {
            return console.log(err);
         }
         console.log("streamInformationObject was written to a file.");
      });
   });
}   
*/

/* Gegen diesen Name sei nicht gesett Fheler. geht für stream als auch für buffer
var buf = new Buffer('Some file content')
buf.name = 'Some file name'
client.seed(buf, cb)
*/

/*
if(create_streamInformationObject){
   var videoFileStream = fs.createReadStream(PATH_TO_VIDEO);
   
   // This will wait until we know the readable stream is actually valid before piping
   videoFileStream.on('open', function (){
      console.log("Video file is open");
      videoFileStream.name = "Franz";
      myStreaming.streamVideo(videoFileStream, {XHRPath : "/" + Video_Name, XHRPort : 8082, webTorrentTrackers: [["ws://localhost:8081"]]}, function(streamInformationObject){
         console.log("streamInformationObject was successfully created");
         fs.writeFile(Path_where_save_streamInformationObject, "var streamInformationObject = " + JSON.stringify(streamInformationObject) + ";", function(err, data){
            if(err) {
               return console.log(err);
            }
            console.log("streamInformationObject was written to a file.");
         });
      });
   });

   // This catches any errors that happen while creating the readable stream (usually invalid names)
   videoFileStream.on('error', function(err) {
     console.log(err);
   });
} 
*/

/*
if(create_streamInformationObject){
   var videoFile = fs.readFile(PATH_TO_VIDEO, function(err, buf){
      console.log("File was read");
      if(err){
         console.log(err);
      }
      // Initialize stream
      var myReadableStreamBuffer = new streamBuffers.ReadableStreamBuffer({
        frequency: 10,       // in milliseconds.
        chunkSize: 2048     // in bytes.
      }); 

      // With a buffer
      myReadableStreamBuffer.put(buf);
      myStreaming.streamVideo(myReadableStreamBuffer, {XHRPath : "/" + Video_Name, XHRPort : 8082, webTorrentTrackers: [["ws://localhost:8081"]]}, function(streamInformationObject){
         console.log("streamInformationObject was successfully created");
         fs.writeFile(Path_where_save_streamInformationObject, "var streamInformationObject = " + JSON.stringify(streamInformationObject) + ";", function(err, data){
            if(err) {
               return console.log(err);
            }
            console.log("streamInformationObject was written to a file.");
         });
      });
   });
}   
*/

/*
if(create_streamInformationObject){
   var videoFileStream = fs.createReadStream(PATH_TO_VIDEO);
   
   // This will wait until we know the readable stream is actually valid before piping
   videoFileStream.on('open', function (){
      console.log("Video file is open");
      myStreaming.streamVideo(videoFileStream, {XHRPath : "/" + Video_Name, XHRPort : 8082, webTorrentTrackers: [["ws://localhost:8081"]]}, function(streamInformationObject){
         console.log("streamInformationObject was successfully created");
         fs.writeFile(Path_where_save_streamInformationObject, "var streamInformationObject = " + JSON.stringify(streamInformationObject) + ";", function(err, data){
            if(err) {
               return console.log(err);
            }
            console.log("streamInformationObject was written to a file.");
         }); 
      });
   });

   // This catches any errors that happen while creating the readable stream (usually invalid names)
   videoFileStream.on('error', function(err) {
     console.log(err);
   });
}  
*/