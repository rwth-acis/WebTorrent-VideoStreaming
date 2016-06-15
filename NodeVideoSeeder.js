var fs = require('fs');
var OakStreaming = require('./OakStreaming');
var myStreaming = new OakStreaming("Horst");   



var create_streamInformationObject = true;
var Path_where_save_streamInformationObject = "./secondExampleApplication/streamInformationObject.js";
//var seed_Video = true;
var Video_Name = "sintel.mp4";

var PATH_TO_VIDEO = __dirname + "/build/sintel.mp4";




if(create_streamInformationObject){
   var videoFile = fs.readFile(PATH_TO_VIDEO, function (error, data){
      if (error) {
         return console.log(error);
      }
      myStreaming.streamVideo(data, {XHRPath : "/" + Video_Name, XHRPort : 8082, webTorrentTrackers: [["ws://localhost:8081"]]}, function(streamInformationObject){
         console.log("streamInformationObject was successfully created");
         fs.writeFile(Path_where_save_streamInformationObject, "var streamInformationObject = " + JSON.stringify(streamInformationObject) + ";", function(err, data){
            if(err) {
               return console.log(err);
            }
            console.log("streamInformationObject was written to a file.");
         }); 
      });
      console.log("File was read");
   });
}  


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
