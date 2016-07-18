var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');
var path = require( 'path' );
var process = require( "process" );
var fs = require('fs');
var chokidar = require('chokidar');




var directoryPath = __dirname + "/web/videos";
var filesToProcess = 0;
var directoryWatcher = null;


// This function call calculates the hash values of all files in /web/videos and saves them in /web/hashValues.sha2
fs.readdir(directoryPath, function( err, files ){
   if( err ) {
      console.error( "Could not list the directory.", err );
      process.exit( 1 );
   } 
   filesToProcess = files.length;
   
   
   files.forEach( function( file, index ) {
      var hash = crypto.createHash('sha256');      
      var filePath = directoryPath + "/" + file;
      fs.stat( filePath, function( error, stat ){
         if( error ) {
            console.error( "Error stating file.", error );
            return;
         }

         if(stat.isFile()){
            console.log( "'%s' is a file.", filePath );
            var stream = fs.createReadStream(filePath);

            stream.on('data', function (data){
               hash.update(data, 'binary');
               //console.log("hash.update was called");
            });

            stream.on('end', function () {
               console.log("stream.on('end',..) was called");
               var finalHash = hash.digest('hex');
               console.log("__dirname: " + __dirname);
               fs.appendFile(__dirname + "/web/hashValues.sha2", file + "/////" + finalHash + '\n', function (err){
                  if(err){
                     return console.log(err);
                  }
               });
               app.get(file, function(req, res){
                  res.sendFile(__dirname + "/web/videos/" + file);                 
               }); 
               app.get(finalHash, function(req, res){
                  res.sendFile(__dirname + "/web/videos/" + file);                 
               });
               filesToProcess--;               
            });                        
         }
         else if( stat.isDirectory() ){
            console.log( "'%s' is a directory.", filePath );
         }
      });
   });
});



function calculateHashOfFile(filePath, callback){
   console.log("calculateHashOfFile is called");
   var hash = crypto.createHash('sha256');      
   
   fs.stat( filePath, function( error, stat ){
      if( error ) {
         console.error( "Error stating file.", error );
         return;
      }

      if(stat.isFile()){
         console.log( "'%s' is a file.", filePath );
         var stream = fs.createReadStream(filePath);

         stream.on('data', function (data){
            hash.update(data, 'binary');
            //console.log("hash.update was called");
         });

         stream.on('end', function () {
            console.log("stream.on('end',..) was called");
            callback(hash.digest('hex'));
         });
      }
   });
}


function checkStartingWatchingDirectory(){
   console.log("Hash values of video files get calculated");
   if(filesToProcess == 0){
      var directoryWatcher = chokidar.watch(__dirname + "/web/videos", {awaitWriteFinish: {stabilityThreshold: 500}});
    
      // gets called when a file is added to the videos directory
      directoryWatcher.on("add", function(absolutePath){
         var fileName = absolutePath.substring(absolutePath.lastIndexOf("/")+1);       
         //var unixPath = windowsPath;//.replace(/\\/g, "/");
         console.log("In on.add path function paramter: " + absolutePath);
         app.get("/" + fileName, function(req, res){
            console.log("Received a request for: " + "/" + fileName);
            res.sendFile(absolutePath);
         });
         calculateHashOfFile(absolutePath, function(hashValue){
            app.get("/" + hashValue, function(req, res){
               console.log("Received a request for: " + "/" + hashValue);
               res.sendFile(absolutePath);               
            });
         });
      });
      
      // gets called when a file is deleted in the videos directory
      directoryWatcher.on("unlink", function(absolutePath){
         var fileName = absolutePath.substring(absolutePath.lastIndexOf("/")+1);
         //var unixPath = windowsPath.replace(/\\/g, "/");
         app.get("/" + fileName, function(req, res){console.log("The requested file has been deleted");});
      });
      
      // gets called when a file in the videos directory gets changed
      directoryWatcher.on("change", function(absolutePath, stats){
         //var unixPath = windowsPath;//.replace(/\\/g, "/");
         calculateHashOfFile(absolutePath, function(hashValue){
            app.get("/" + hashValue, function(req, res){
               console.log("Received a request for: " + hashValue);
               res.sendFile(absolutePath);           
            });
         });
      });
      directoryWatcher.on("error", function(error){console.log("An error happend: " + error)});           
   } else {
      setTimeOut(checkStartingWatchingDirectory, 500);
   }
};

checkStartingWatchingDirectory();




console.log('Current directory: ' + process.cwd());

app.get('/', function(req, res){
  res.sendFile(__dirname + '/web/index.html');
});

app.get('/index.html', function(req, res){
  res.sendFile(__dirname + '/web/index.html');
});

app.get("/example_application.js", function(req, res){
  res.sendFile(__dirname + "/web/" + "example_application.js");
});

app.get("/y-webrtc.es6", function(req, res){
  res.sendFile(__dirname + "/web/" + "y-webrtc.es6");
});

app.get("/y-webrtc.js.map", function(req, res){
  res.sendFile(__dirname + "/web/" + "y-webrtc.js.map");
});

app.get("/y-webrtc.es6.map", function(req, res){
  res.sendFile(__dirname + "/web/" + "y-webrtc.es6.map");
});

app.get("/y-webrtc.js", function(req, res){
  res.sendFile(__dirname + "/web/" + "y-webrtc.js");
});

app.get("/example_application.js.map", function(req, res){
  res.sendFile(__dirname + "/web/" + "example_application.js.map");
});




http.listen(9912, function(){
	console.log('Listening on port 9912');
});