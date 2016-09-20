var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var crypto = require('crypto');
var path = require( 'path' );
var process = require( "process" );
var fs = require('fs');
var chokidar = require('chokidar');
var formidable = require('formidable');



// It could be useful to change this constants sometime.

// Port on which the server should listen.
var PORT = 9912;

// Path to the folder which contains all video files that this Web server should be able to serve via 
// hash value identification.
var PATH_TO_VIDEO_FOLDER = __dirname + "/web/videos";

// Path where the text file hashValues.sha2 will be saved. This text file will contain the hash values of
// all files in PATH_TO_VIDEO_FOLDER.
var HASH_VALUES_FILE_PATH = __dirname + "/web";




io.on('connection', function(socket){console.log("An OakStreaming instance has established a connection " + 
        "to this server via socket.io")});
io.on('disconnect', function(socket){console.log("An OakStreaming instance disconnected")});


var numberOfFilesToProcess = -1;

// This call of app.use is necessary to allow Cross-Origin Resource Sharing (CORS).
// It enables OakStreaming instances of other domains to successfully request byte ranges of 
// video files from this Web server.
app.use(function(req, res, next) { 
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
  next();
});


// This function call effects that all files in PATH_TO_VIDEO_FOLDER are served by the Web server. 
// Moreover, the function calculates the hash values of all files in PATH_TO_VIDEO_FOLDER and 
// saves them in HASH_VALUES_FILE_PATH.
fs.readdir(PATH_TO_VIDEO_FOLDER, function( err, files ){
  if( err ) {
    console.error("Could not list the directory.", err );
    process.exit( 1 );
  }
  numberOfFilesToProcess = files.length;
   
  files.forEach( function( file, index ) {
    var hash = crypto.createHash('sha256');      
    var filePath = PATH_TO_VIDEO_FOLDER + "/" + file;
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
        });

        stream.on('end', function () {
          var finalHash = hash.digest('hex');
          console.log("__dirname: " + __dirname);            
            
          fs.appendFile(HASH_VALUES_FILE_PATH + "/hashValues.sha2", file + "/////" + finalHash + '\n', 
                  function (err){
            if(err){
              return console.log(err);
            }
          });
          
          // After this function call, the Web server serves the file.
          // The requester must specify the file he/it wants by its name.
          app.get(file, function(req, res){
            res.sendFile(PATH_TO_VIDEO_FOLDER + "/" + file);                 
          });

          // After this function call, the Web server serves the file.
          // The requester must specify the file he/it wants by its SHA-2 hash value. 
          app.get(finalHash, function(req, res){
            res.sendFile(PATH_TO_VIDEO_FOLDER + "/" + file);                 
          });
          
          numberOfFilesToProcess--;               
        });                        
      }
      else if( stat.isDirectory() ){
        console.log( "'%s' is a directory.", filePath );
      }
    });
  });
});


function calculateHashOfFile(filePath, callback){
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
      });

      stream.on('end', function () {
        callback(hash.digest('hex'));
      });
    }
  });
}


function watchDirectory(){
  if(numberOfFilesToProcess == 0){
    var directoryWatcher = chokidar.watch(PATH_TO_VIDEO_FOLDER, {awaitWriteFinish: {
            stabilityThreshold: 500}});
    
    // This event listener gets called whenever a file is added to PATH_TO_VIDEO_FOLDER.
    directoryWatcher.on("add", function(absolutePath){
      var fileName = absolutePath.substring(absolutePath.lastIndexOf("/")+1);
      
      // After this app.get function call, the Web server serves the file.
      // The requester must specify the file he/it wants by its name.
      app.get("/" + fileName, function(req, res){
        console.log("Received a request for: " + "/" + fileName);
        res.sendFile(absolutePath);
      });
      
      
      calculateHashOfFile(absolutePath, function(hashValue){
        
        // After this app.get function call, the Web server serves the file.
        // The requester must specify the file he/it wants by its hash value.
        app.get("/" + hashValue, function(req, res){
          console.log("Received a request for: " + "/" + hashValue);
          res.sendFile(absolutePath);               
        });
      });
    });
      
    // This event listener gets called whenever in PATH_TO_VIDEO_FOLDER a file is deleted.
    directoryWatcher.on("unlink", function(absolutePath){
      var fileName = absolutePath.substring(absolutePath.lastIndexOf("/")+1);
      app.get("/" + fileName, function(req, res){console.log("The requested file has been deleted");});
    });
      
    // This event listener gets called whenever a file in PATH_TO_VIDEO_FOLDER gets changed.
    directoryWatcher.on("change", function(absolutePath, stats){
      calculateHashOfFile(absolutePath, function(hashValue){
        
        // After this app.get function call, the Web server serves the file.
        // The requester must specify the file he/it wants by its hash value.
        app.get("/" + hashValue, function(req, res){
          console.log("Received a request for: " + hashValue);
          res.sendFile(absolutePath);           
        });
      });
    });
    directoryWatcher.on("error", function(error){console.log("The following error happened: " + error)});           
  } else {
    setTimeOut(watchDirectory, 500);
  }
};

watchDirectory();


console.log('Current directory: ' + process.cwd());


// This function call does not implement a feature of the OakStreaming library but 
// has been put here so that the participants of the user evaluation can solve
// task 1.
app.post('/upload1', function(req, res){
  console.log("app.post('upload1', ...) is called");
  
  // Create an incoming form object.
  var form = new formidable.IncomingForm();
  var fileName = "";
  
  // Specify that we want to allow the user to upload multiple files in a single request.
  form.multiples = true;

  // Store all uploads in the __dirname + '/web/videos' directory.
  form.uploadDir = path.join(__dirname, '/web/videos');

  // Every time a file has been uploaded successfully,
  // rename it to it's original name.
  form.on('file', function(field, file){
    fileName = file.name;
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

  // Log any errors that occur.
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // Once all the files have been uploaded, send a response to the client.
  form.on('end', function() {
    console.log("form.on('end'..) of app.post('upload1', ...) is called");
    console.log("fileName: " + fileName);
    io.emit("newVideo1", "http://gaudi.informatik.rwth-aachen.de:9912/uploads/example1.mp4");
    res.end('success');
  });

  // Parse the incoming request containing the form data.
  form.parse(req);
});


// This function call does not implement a feature of the OakStreaming library but 
// has been put here so that the participants of the user evaluation can solve
// task 1.
app.post('/upload2', function(req, res){
  console.log("app.post('upload2', ...) is called");
  
  // Create an incoming form object.
  var form = new formidable.IncomingForm();
  var fileName = "";
  
  // Specify that we want to allow the user to upload multiple files in a single request.
  form.multiples = true;

  // Store all uploads in the __dirname + '/web/videos' directory.
  form.uploadDir = path.join(__dirname, '/web/videos');

  // Every time a file has been uploaded successfully,
  // rename it to it's original name.
  form.on('file', function(field, file){
    fileName = file.name;
    fs.rename(file.path, path.join(form.uploadDir, file.name));
  });

  // Log any errors that occur.
  form.on('error', function(err) {
    console.log('An error has occured: \n' + err);
  });

  // Once all the files have been uploaded, send a response to the client.
  form.on('end', function() {
    console.log("form.on('end'..) of app.post('upload2', ...) is called");
    console.log("fileName: " + fileName);
    io.emit("newVideo2", "http://gaudi.informatik.rwth-aachen.de:9912/uploads/example2.mp4");
    res.end('success');
  });

  // Parse the incoming request containing the form data.
  form.parse(req);
});


// The following calls to the app.get function configure the Web server to serve several files.

app.get('/', function(req, res){
  res.sendFile(__dirname + '/web/index.html');
});

app.get('/index.html', function(req, res){
  res.sendFile(__dirname + '/web/index.html');
});

app.get('/uploads/example1.mp4', function(req, res){
  console.log("Received a request for example1.mp4");
  res.sendFile(__dirname + '/uploads/example1.mp4');
});

app.get('/uploads/example2.mp4', function(req, res){
  res.sendFile(__dirname + '/uploads/example2.mp4');
});

app.get('/uploads/test1.mp4', function(req, res){   
  res.sendFile(__dirname + '/uploads/test1.mp4');
});

app.get('/uploads/test2.mp4', function(req, res){
  res.sendFile(__dirname + '//uploads/test2.mp4');
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


  
http.listen(PORT, function(){
	console.log('Listening on port ' + PORT);
});