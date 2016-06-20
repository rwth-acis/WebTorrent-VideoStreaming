var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');
var path = require( 'path' );
var process = require( "process" );
var fs = require('fs');
var chokidar = require('chokidar');



var clientNumberCounter = 1;
var participantsSet = [];

var myGlobal = this;


var directoryPath = __dirname + "\\web\\videos";
var filesToProcess = 0;
var directoryWatcher = null;

// Code stehen lassen. Der war gut. Fürs automatische Speichern der hashwerte in textfile
fs.readdir(directoryPath, function( err, files ){
   if( err ) {
      console.error( "Could not list the directory.", err );
      process.exit( 1 );
   } 
   filesToProcess = files.length;
   
   
   files.forEach( function( file, index ) {
      var hash = crypto.createHash('sha256');      
      var filePath = directoryPath + "\\" + file;
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
               fs.appendFile(__dirname + "\\web\\hashValues.sha2", file + "/////" + finalHash + '\n', function (err){
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

/*
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
   if(filesToProcess == 0){
      var directoryWatcher = chokidar.watch(__dirname + "\\web\\videos", {awaitWriteFinish: {stabilityThreshold: 500}});
      
      directoryWatcher.on("unlink", function(windowsAbsolutePath){
         var fileName = windowsAbsolutePath.substring(windowsAbsolutePath.lastIndexOf("\\")+1);
         //var unixPath = windowsPath.replace(/\\/g, "/");
         app.get("/" + fileName, function(req, res){console.log("File was deleted");});
      });
      directoryWatcher.on("add", function(windowsAbsolutePath){
         var fileName = windowsAbsolutePath.substring(windowsAbsolutePath.lastIndexOf("\\")+1);
         
         //var unixPath = windowsPath;//.replace(/\\/g, "/");
         console.log("In on.add path function paramter: " + windowsAbsolutePath);
         app.get("/" + fileName, function(req, res){
            console.log("Received a request for: " + "/" + fileName);
            res.sendFile(windowsAbsolutePath);
         });
         calculateHashOfFile(windowsAbsolutePath, function(hashValue){
            app.get("/" + hashValue, function(req, res){
               console.log("Received a request for: " + hashValue);
               res.sendFile(windowsAbsolutePath);                
            });
         });
      });
      directoryWatcher.on("change", function(windowsAbsolutePath, stats){
         //var unixPath = windowsPath;//.replace(/\\/g, "/");
         calculateHashOfFile(windowsAbsolutePath, function(hashValue){
            app.get("/" + hashValue, function(req, res){
               console.log("Received a request for: " + hashValue);
               res.sendFile(windowsAbsolutePath);           
            });
         });
      });
      directoryWatcher.on("error", function(error){console.log("An error happend: " + error)});           
   } else {
      setTimeOut(checkStartingWatchingDirectory, 500);
   }
};

checkStartingWatchingDirectory();




function Participant(socketId, clientNumber){
	this.hisSocketId = socketId;
	this.clientNumber = clientNumber;
}

console.log('Current directory: ' + process.cwd());

app.get('/', function(req, res){
  res.sendFile(__dirname + '/web/index.html');
});

app.get("/example_application.js", function(req, res){
  res.sendFile(__dirname + "/web/" + "example_application.js");
});
*/

/*
app.get("/example.mp4", function(req, res){
  res.sendFile(__dirname + "/web/videos/" + "example.mp4", {acceptRanges: true});
});

app.get("/sintel.mp4", function(req, res){
  res.sendFile(__dirname + "/web/videos/" + "sintel.mp4", {acceptRanges: true});
});

app.get("/test.mp4", function(req, res){
  res.sendFile(__dirname + "/web/videos/" + "test.mp4", {acceptRanges: true});
});
*/

/*
app.get('/Feross-sintel-1024-surround.mp4', function(req, res){
  res.sendFile(__dirname + '/Feross-sintel-1024-surround.mp4');
});

app.get('/bbb_sunflower_1080p_60fps_stereo_abl.mp4', function(req, res){
  res.sendFile(__dirname + '/bbb_sunflower_1080p_60fps_stereo_abl.mp4');
});
*/

io.on('connection', function(socket){
	console.log("Peer number " + clientNumberCounter + " connected");
	//Raus neu:  io.to(socket.id).emit('number', clientNumberCounter);
	
	console.log("socket.id: " + socket.id);
	participantsSet.push(new Participant(socket.id, clientNumberCounter));
		
	socket.on('disconnect', function(){
		console.log('A user disconnected');
		console.log('clientNumberCounter: ' + clientNumberCounter);
		console.log("socket.id: " + socket.id);
		for(var i=0, length=participantsSet.length; i<length; i++){
			if(participantsSet[i].hisSocketId === socket.id){
				console.log("I delete peer number " + participantsSet[i].clientNumber + " out of participantsSet");
				participantsSet.splice(i,1);
				break;
			}
		}	
	});
	clientNumberCounter++;
});

http.listen(9918, function(){
	console.log('listening on *:9999');
});