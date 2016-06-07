var http = require('http');
var MultiStream = require('multistream');
var util = require('util');
//var Readable = require('stream').Readable;
var readableStream = require('readable-stream');
var Videostream = require('videostream');
var WebTorrent = require('webtorrent');
var SimplePeer = require('simple-peer');
var ut_pex = require('ut_pex');


 /**
 * @module OakStreaming
 */
 
module.exports = OakStreaming;


 /**
 * Creates a new OakStreaming instance which has the methods streamVideo, loadVideo, addPeer and on.
 * @constructor
 */ 
function OakStreaming(){
   this.peerId = Math.floor(Math.random() * Math.pow(10,300) + 1);
   
   this.streamVideo = streamVideo;
   this.loadVideo = loadVideo;
   this.addSimplePeerInstance = function(){}; 
   this.createSignalingData = createSignalingData;
   this.createSignalingDataResponse = createSignalingDataResponse;
   this.processSignalingResponse = processSignalingResponse;
   this.on = function(){};
   this.forTesting_connectedToNewWebTorrentPeer = function(){};
}

 
 /**
 * @typedef StreamInformationObject
 * @type {object}
 * @property {string} magnetURI - Magnet URI of the torrent. If this property is undefined, no video data will be requested from the WebTorrent network.
 * @property {number} videoFileSize - The size in byte of the video file that was passed as an argument.
 * @property {string} XHRPath - The file path (e.g. /example.mp4 or /videos/example2.mp4) that will be used for the XML HTTP Requests to the Web server. Via these XML HTTP Requests, video data will be requested from the Web sever. If this property is undefined, no video data will be requested from the Web server.
 */
 
/**
 * @callback OakStreaming~streamVideoFinished
 * @param {StreamInformationObject} streamInformationObject - An object that other clients/peers can pass as an argument to their loadVideo method to download the video from other clients/peers and/or the Web Server.
 */ 

/**
 * Streams a video file to all other clients/peers.
 * @param {object} videoFile - The video file that should be streamed to the other clients/peers. This paramter can either be a {@link https://developer.mozilla.org/en-US/docs/Web/API/File|W3C File object}, a {@link https://developer.mozilla.org/en-US/docs/Web/API/FileList|W3C FileList}, a {@link https://nodejs.org/api/buffer.html|Node Buffer object} or a {@link https://nodejs.org/api/stream.html#stream_class_stream_readable|Readable stream object}.
 * @param {object} [options] - Options for the creation of the StreamInformationObject, that gets passed as an argument to the callback function.
 * @param {string} options.XHRPath - The path that will be used for the XML HTTP Request (XHR). If the option object or this property of the option object is undefined, no video data will be requested from the server.
 * @param {OakStreaming~streamVideoFinished} callback - This callback function gets called with the generated StreamInformationObject at the end of the execution of streamVideo.
 */
function streamVideo(videoFile, options, callback, isItATest, destroyTorrent){ 
   var webTorrentClient = new WebTorrent();
   ////console.log("streamVideo is executed");
   ////console.log("videoFile: " + videoFile);
   ////console.log("options: " + options);
   ////console.log("callback: " + callback);
   webTorrentClient.seed(videoFile, {announceList: options.webTorrentTrackers}, function(torrent){
      ////console.log("Video file was seeded");
      var streamInformationObject = {};
      //streamInformationObject.torrent = torrent;
      streamInformationObject.magnetURI = torrent.magnetURI;
      streamInformationObject.videoFileSize = torrent.files[0].length;
      streamInformationObject.XHRPath = options.XHRPath;
      streamInformationObject.torrentFile = torrent.torrentFile;
      streamInformationObject.webTorrentTrackers = options.webTorrentTrackers;
      
      //////console.log("Creaded streamInformationObject:\n" + JSON.stringify(streamInformationObject));
      if(isItATest === "It's a test"){
         if(destroyTorrent){
            torrent.destroy();
            delete webTorrentClient;
         }
         setTimeout(function(){callback(streamInformationObject, torrent);},0);
      } else {
         setTimeout(function(){callback(streamInformationObject);},0);
      }
   });
}


/**
 * @callback OakStreaming~loadedVideoFinished
 */ 
 
/**
 * Streams a video file to all other clients/peers.
 * @param {StreamInformationObject} streamInformationObject - This object contains all data that is needed to initiate loading the video from other peers and/or a Web server. StreamInformationObjects can be created by the {@link streamVideo|streamVideo} method.
 * @param {OakStreaming~loadedVideoFinished} callback - This callback gets called when the video has been loaded entirely into the buffer of the video player.
 */
function loadVideo(streamInformationObject, callback, endIfVideoLoaded){
   //console.log("ape");
   
   //////console.log("I entered this.loadVideo");
   //////console.log("option paramter:\n" + JSON.stringify(streamInformationObject));
   var deliveryByServer = streamInformationObject.XHRPath ? true : false;
   var deliveryByWebtorrent = streamInformationObject.torrentFile ? true : false;
   var webTorrentTrackers = streamInformationObject.webTorrentTrackers;
   //var deliveryByWebtorrent = streamInformationObject.magnetURI ? true : false;
   var MAGNET_URI = streamInformationObject.magnetURI;
   //console.log("streamInformationObject.XHRPath: " + streamInformationObject.XHRPath);
   var PATH_TO_VIDEO_FILE = streamInformationObject.XHRPath;
   var SIZE_OF_VIDEO_FILE = streamInformationObject.videoFileSize;
   var THE_TORRENT = streamInformationObject.torrentFile;

   var DOWNLOAD_FROM_SERVER_TIME_RANGE = streamInformationObject.downloadFromServerTimeRange || 5; // in seconds
   var UPLOAD_LIMIT = streamInformationObject.uploadLimit || 2; // multiplied by number of downloaded bytes
   var ADDITION_TO_UPLOAD_LIMIT = streamInformationObject.additionToUploadLimit || 500000; // amount of byte added to upload limit
   var XHR_REQUEST_SIZE = streamInformationObject.xhrRequestSize || 50000; // in byte
   var THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM = streamInformationObject.thresholdForReturningAnswerStream || 50000; // in byte

   var CHECK_IF_BUFFER_FULL_ENOUGH_INTERVAL = streamInformationObject.checkIfBufferFullEnoughInterval || 300; // in miliseconds
   var CHECK_IF_ANSWERSTREAM_READY_INTERVAL = streamInformationObject.checkIfAnswerstreamReadyInterval || 200; // in miliseconds
   var UPDATE_CHART_INTERVAL = streamInformationObject.updateChartInterval || 1000; // in miliseconds
   var CHOKE_IF_NECESSARY_INTERVAL = streamInformationObject.chokeIfNecessaryInterval || 500; // in miliseconds
   
   
   var myVideo = document.getElementById("myVideo");
   var consoleCounter = 0;
   var globalvideostreamRequestNumber = 0;
   var bytesReceivedFromServer = 0;
   var webTorrentFile;
   var videostreamRequestHandlers = [];
   var inCritical = true;
   var wires = [];
   var videoCompletelyLoaded = false;
   var endStreaming = false;
   var webTorrentClient = null;
   var bytesTakenFromWebTorrent = 0;
   var bytesTakenFromServer = 0;
   var theTorrent;
   var peersToAdd = [];
   var bam = true;
   

   function MyReadableStream(options){
      readableStream.Readable.call(this, options);
   }
   util.inherits(MyReadableStream, readableStream.Readable);
   MyReadableStream.prototype._read = function(size){};
   
  
   if(deliveryByWebtorrent){
      webTorrentClient = new WebTorrent();
      webTorrentClient.add(THE_TORRENT, function (torrent){
         //////console.log("torrent meta data ready");         
         theTorrent = torrent;
         
         /* Kommt später wieder rein
         for(var i=0, length= peersToAdd.length; i<length; i++){
            theTorrent.addPeer(peersToAdd[i]);
         }
         peersToAdd = [];
         */
         
         webTorrentFile = torrent.files[0];

         var forTesting_connectedToNewWebTorrentPeer = function(callback){
            torrent.on('wire', function(wire){
               callback();
            });
         };
         
         torrent.on('wire', function (wire){
            wires.push(wire);
            if(!window.firstWire){
               window.firstWire = wire;
            }
            wire.use(ut_pex());
            wire.ut_pex.start();
         });

         for(var i=0, length=videostreamRequestHandlers.length; i<length; i++){
            var thisRequest = videostreamRequestHandlers[i];
            if(thisRequest.currentCB !== null){
               //console.log("In onTorrent nachträglich webtorrent stream erzeugen  thisRequest.start: " + thisRequest.start);
               //console.log("In onTorrent  webTorrentFile.length: " + webTorrentFile.length);
               thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : webTorrentFile.length-1});
               thisRequest.oldStartWebTorrent = thisRequest.start;
               thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
            }
         }
      });
   }
   
   
   var file = function (path){
      this.path = path;
   };
   file.prototype.createReadStream = function (opts){
      if(opts.start > SIZE_OF_VIDEO_FILE){
         //console.log("opts.start > SIZE_OF_VIDEO_FILE there cb(null,null) every time");
         return (new MultiStream(function (cb){cb(null,null);}));
      }
      inCritical = true;
      //console.log(consoleCounter++ + " called createreadStream ");
      //console.log(consoleCounter++ + " opts.start: " + opts.start);
      //console.log(consoleCounter++ + " opts.end: " + opts.end);

      var thisRequest = new VideostreamRequestHandler(++globalvideostreamRequestNumber, opts, this);
     
      if(opts.end && !isNaN(opts.end)){
         thisRequest.end = opts.end + 1;
      } else {
         thisRequest.end = SIZE_OF_VIDEO_FILE;
      }
      
      var MyWriteableStream = function(highWaterMark){
         readableStream.Writable.call(this, highWaterMark);
      };
      util.inherits(MyWriteableStream, readableStream.Writable);
      MyWriteableStream.prototype._write = function(chunk, encoding, done){
         if(bam){
            console.log(theTorrent);
            bam = false;
         }
         //////console.log("MyWriteableStream _write is called");       
         if(thisRequest.start-thisRequest.oldStartWebTorrent < chunk.length){
            ////////console.log("MyWriteableStream _write: pushing received data in answerStream")
            bytesTakenFromWebTorrent += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
            var streamHasMemoryLeft = thisRequest.answerStream.push(chunk.slice(thisRequest.start-thisRequest.oldStartWebTorrent, chunk.length));
            thisRequest.bytesInAnswerStream += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
            
            if(streamHasMemoryLeft){            
               if(thisRequest.currentCB !== null && thisRequest.start >= thisRequest.end){
                  var theCallbackFunction = thisRequest.currentCB;
                  thisRequest.currentCB = null;
                  thisRequest.answerStream.push(null);
                  thisRequest.bytesInAnswerStream = 0;
                  var res = thisRequest.answerStream;
                  thisRequest.answerStream = new MyReadableStream({highWaterMark: 5000000});
                  //console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.readStreamNumber);
                  theCallbackFunction(null, res);
               }
            } else {
               if(thisRequest.currentCB === null){
                  if(thisRequest.webTorrentStream){
                     thisRequest.webTorrentStream.pause();
                  }
                  thisRequest.noMoreData = true;
               } else {
                  var theCallbackFunction = thisRequest.currentCB;
                  thisRequest.currentCB = null;
                  thisRequest.answerStream.push(null);
                  thisRequest.bytesInAnswerStream = 0;
                  var res = thisRequest.answerStream;
                  thisRequest.answerStream = new MyReadableStream({highWaterMark: 5000000});
                  //console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.readStreamNumber);
                  theCallbackFunction(null, res);
               }
            }
               thisRequest.start += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
         }
         //ceckIfAnswerStreamReady(thisRequest);
         thisRequest.oldStartWebTorrent += chunk.length;
         done();
      };
      thisRequest.collectorStreamForWebtorrent = new MyWriteableStream({highWaterMark: 50000000});
      videostreamRequestHandlers.push(thisRequest);

      if(webTorrentFile && theTorrent.uploaded <= UPLOAD_LIMIT * theTorrent.downloaded + ADDITION_TO_UPLOAD_LIMIT){
         ////////console.log("after new videostreamRequest creating a corresponding webtorrent stream");
         ////console.log("opts.start: " + opts.start);
         ////console.log("webTorrentFile.length: " + webTorrentFile.length);
         var webTorrentStream = webTorrentFile.createReadStream({"start" : opts.start, "end" : webTorrentFile.length-1});
         thisRequest.webTorrentStream = webTorrentStream;
         thisRequest.oldStartWebTorrent = opts.start;
         webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
      }

      var multi = new MultiStream(function (cb){
         //console.log("ReadableStream request number " + thisRequest.readStreamNumber + "    does a cb request");
        
         if(thisRequest.end >= 0 && thisRequest.start >= thisRequest.end){
            //console.log("called cb(null,null) from " + thisRequest.readStreamNumber); 
            thisRequest.req = null;
            return cb(null, null);
         }
        
         thisRequest.CBNumber++;
         if(consoleCounter<20){
            //////console.log(consoleCounter++ + "    " + thisRequest.CBNumber + ". call of function(cb) from " + videostreamRequestNumber);
            ////////console.log(consoleCounter++ + "    start: " + thisRequest.start);
         }
         thisRequest.currentCB = cb;
         thisRequest.noMoreData = false;
      
         if(!ceckIfAnswerStreamReady(thisRequest)){
            if(thisRequest.webTorrentStream){
               thisRequest.webTorrentStream.resume();
            } else if(webTorrentFile){
               ////////console.log("New cb function was called and I subsequently create a new torrentStream for it because non existed before for this videostreamRequest");
               ////console.log("After new Multistream. thisRequest.start: " + thisRequest.start);
               ////console.log("webTorrentFile.length: " + webTorrentFile.length);
               thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : webTorrentFile.length-1});
               thisRequest.oldStartWebTorrent = thisRequest.start;
               thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
            }

            if(deliveryByServer && inCritical && !thisRequest.XHRConducted){
               conductXHR(thisRequest);
            }
         }
      });
      ////////console.log(consoleCounter++ + " terminate createReadStream");
      var destroy = multi.destroy;
      multi.destroy = function(){
         if (thisRequest.req) {
            thisRequest.req.destroy();
         }
         destroy.call(multi);
      };
      return multi;
   };

   function ceckIfAnswerStreamReady(thisRequest){
      ////////console.log("At the beginning of thisRequest.bytesInAnswerStream: " + thisRequest.bytesInAnswerStream);
      ////////console.log("In ceckIfAnswerStreamReady of videostreamRequest number " + thisRequest.readStreamNumber +  ". thisRequest.bytesInAnswerStream: " + thisRequest.bytesInAnswerStream + "     thisRequest.currentCB: " + thisRequest.currentCB);
      if (thisRequest.currentCB && ((thisRequest.bytesInAnswerStream >= THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM) || (thisRequest.start >= SIZE_OF_VIDEO_FILE))){
         ////////console.log("answerStream from videostream Request number " + thisRequest.readStreamNumber + " and CB number " + thisRequest.CBNumber + " gets returned");
         // //////console.log("Returing answerStream out of ceckIfAnswerStreamReady()");
         var theCallbackFunction = thisRequest.currentCB;
         thisRequest.currentCB = null;
         thisRequest.answerStream.push(null);
         if (thisRequest.webTorrentStream){
            thisRequest.webTorrentStream.pause();
         }
         thisRequest.bytesInAnswerStream = 0;
         var res = thisRequest.answerStream;
         thisRequest.answerStream = new MyReadableStream({highWaterMark: 5000000});
         //console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.readStreamNumber);
         theCallbackFunction(null, res);
         return true;
      }
      return false;
   };

   function chokeIfNecessary(){
      if (theTorrent && theTorrent.uploaded >= theTorrent.downloaded * UPLOAD_LIMIT + ADDITION_TO_UPLOAD_LIMIT) {
         if(videoCompletelyLoaded){
            theTorrent.destroy();
            delete webTorrentClient;
            endStreaming = true;
            return;
         }
         for (var i = 0, length = wires.length; i < length; i++){
            //console.log("I choked a peer");
            wires[i].choke();
         }
      }
      setTimeout(chokeIfNecessary, CHOKE_IF_NECESSARY_INTERVAL);
   }

   function updateChart(){
      if(endStreaming){
         return;
      }
      if (theTorrent) {
         document.getElementById("WebTorrent-received").innerHTML = "webTorrentFile.length: " + webTorrentFile.length + "\n torrent.downloaded: " + theTorrent.downloaded + "\n torrent.uploaded: " + theTorrent.uploaded + "\n torrent.progress: " + theTorrent.progress + "\n Bytes received from server: " + bytesReceivedFromServer + "\n Bytes taken from server delivery: " + bytesTakenFromServer + "\n Bytes taken from WebTorrent delivery: " + bytesTakenFromWebTorrent;
      }
      setTimeout(updateChart, UPDATE_CHART_INTERVAL);
   }
    
   function VideostreamRequestHandler(readStreamNumber, opts, self) {
      this.readStreamNumber = readStreamNumber;
      this.opts = opts;
      this.start = opts.start || 0;
      this.oldStartWebTorrent = -42;
      this.oldStartServer = -42;
      this.currentCB = null;
      this.CBNumber = 0;
      this.webTorrentStream = null;
      this.answerStream = new MyReadableStream({highWaterMark: 5000000});
      this.bytesInAnswerStream = 0;
      this.collectorStreamForWebtorrent = null;
      this.XHRConducted = false;
      this.end = -42;
      this.self = self;
      this.bytesTakenFromWebTorrent = 0;
      this.bytesTakenFromServer = 0;
      this.noMoreData = false;
      this.req = null;
   }

   function frequentlyCeckIfAnswerStreamReady(){
      if(videoCompletelyLoaded){
         return;
      }
      for (var i = 0, length = videostreamRequestHandlers.length; i < length; i++) {
         ceckIfAnswerStreamReady(videostreamRequestHandlers[i]);
      }
     setTimeout(frequentlyCeckIfAnswerStreamReady, CHECK_IF_ANSWERSTREAM_READY_INTERVAL);
   }

   function checkIfBufferFullEnough(){
      if(videoCompletelyLoaded){
         return;
      }
      var timeRanges = document.querySelector('video').buffered;
      if(TimeRanges.length >= 1){
         if(timeRanges.start(0) <= 0 && timeRanges.end(0) >= SIZE_OF_VIDEO_FILE-1){
            videoCompletelyLoaded = true;
            if(callback){
               callback();                 
            }
            if(endIfVideoLoaded){
               theTorrent.destroy();
               delete webTorrentClient;
               endStreaming = true;
               return;                  
            } 
         }
      }
      inCritical = true;
      for (var i = 0, length = timeRanges.length; i < length; i++) {
         ////////console.log("Time range number " + i + ": start(" + timeRanges.start(i) + ") end(" + timeRanges.end(i) + ")");
         if (myVideo.currentTime >= timeRanges.start(i) && myVideo.currentTime <= timeRanges.end(i)) {
            if (timeRanges.end(i) - myVideo.currentTime >= DOWNLOAD_FROM_SERVER_TIME_RANGE) {
               inCritical = false;
               ////////console.log("I set inCritical to false");
            }
         }
      }
      if (deliveryByServer && inCritical) {
         for (var j = 0, length = videostreamRequestHandlers.length; j < length; j++) {
            if (videostreamRequestHandlers[j].currentCB !== null && videostreamRequestHandlers[j].XHRConducted === false) {
               conductXHR(videostreamRequestHandlers[j]);
            }
         }
      }
      setTimeout(checkIfBufferFullEnough, CHECK_IF_BUFFER_FULL_ENOUGH_INTERVAL);
   }

   function conductXHR(thisRequest) {
      if(thisRequest.currentCB === null){
         return;
      }
      thisRequest.XHRConducted = true;
      var reqStart = thisRequest.start;
      var reqEnd = reqStart + XHR_REQUEST_SIZE;

      if (thisRequest.end >= 0 && reqEnd > thisRequest.end) {
         reqEnd = thisRequest.end;
      }
      if (reqStart >= reqEnd) {
         thisRequest.req = null;
         //console.log("called cb(null,null)");
         return thisRequest.currentCB(null, null);
      }

      /* glaube ich unnötiger und/oder gefährlicher müll
      if (reqStart >= reqEnd) {
      req = null;
      return thisRequest.currentCB(null, null);
      }
      */
      if (consoleCounter < 10000000) {
         //////////console.log(consoleCounter++ + "  videoStream " + thisRequest.readStreamNumber + "  CB number " + thisRequest.CBNumber + "    reqStart: " + reqStart);
         //////////console.log(consoleCounter++ + "  Multistream " + thisRequest.readStreamNumber + "   CB number " + thisRequest.CBNumber + "    reqEnd: " + reqEnd);
      }

      var XHRDataHandler = function (chunk){
         bytesReceivedFromServer += chunk.length;
         //console.log("ReadableStream request number " + thisRequest.readStreamNumber + " received a chunk of length " + chunk.length);
         if(thisRequest.noMoreData){
            thisRequest.oldStartServer += chunk.length;
            return;
         }
         if (thisRequest.start - thisRequest.oldStartServer < chunk.length){         
            bytesTakenFromServer += chunk.length - (thisRequest.start - thisRequest.oldStartServer);
            thisRequest.bytesInAnswerStream += chunk.length - (thisRequest.start - thisRequest.oldStartServer);
            var myBuffer = chunk.slice(thisRequest.start - thisRequest.oldStartServer, chunk.length);
            //console.log("In XHRDataHandler   myBuffer.length: " + myBuffer.length);
            var StreamHasMemoryLeft = thisRequest.answerStream.push(myBuffer);         
            if(!StreamHasMemoryLeft){
               if(thisRequest.currentCB !== null){
                  var theCallbackFunction = thisRequest.currentCB;
                  thisRequest.currentCB = null;
                  thisRequest.answerStream.push(null);
                  thisRequest.bytesInAnswerStream = 0;
                  var res = thisRequest.answerStream;
                  thisRequest.answerStream = new MyReadableStream({highWaterMark: 5000000});
                  //console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.readStreamNumber);
                  theCallbackFunction(null, res); 
               } else {
                  thisRequest.noMoreData = true;
                  if(thisRequest.webTorrentStream){
                     thisRequest.webTorrentStream.pause();
                  }
               }
            } else {
               if (thisRequest.start >= SIZE_OF_VIDEO_FILE && thisRequest.currentCB !== null){
                  var theCallbackFunction = thisRequest.currentCB;
                  thisRequest.currentCB = null;
                  thisRequest.answerStream.push(null);
                  thisRequest.bytesInAnswerStream = 0;
                  var res = thisRequest.answerStream;
                  thisRequest.answerStream = new MyReadableStream({highWaterMark: 5000000});
                  //console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.readStreamNumber);
                  theCallbackFunction(null, res);
               }
            } 
            thisRequest.start += chunk.length - (thisRequest.start - thisRequest.oldStartServer);            
         }
         thisRequest.oldStartServer += chunk.length;
      }

      var XHREnd = function (){
         //console.log("ReadableStream request number " + thisRequest.readStreamNumber + " XHREnd");
         if (consoleCounter < 1000000000000){
            //////////console.log("XHREnd from videostreamRequest number " + thisRequest.readStreamNumber);
         }
         if(thisRequest.bytesInAnswerStream > 0 && thisRequest.currentCB !== null){
            thisRequest.answerStream.push(null);
            thisRequest.bytesInAnswerStream = 0;
            var res = thisRequest.answerStream;
            thisRequest.answerStream = new MyReadableStream({highWaterMark: 5000000});
            var theCallbackFunction = thisRequest.currentCB;
            thisRequest.currentCB = null;
            //console.log("XHREnd: called CB with data out of answerStream from videostreamRequest number " + thisRequest.readStreamNumber);
            theCallbackFunction(null, res);
         }
         thisRequest.XHRConducted = false;
      }  
      
      thisRequest.oldStartServer = reqStart;
      
      //console.log("At htto.get   reqStart: " + reqStart + "     reqEnd: " + reqEnd);

      thisRequest.req = http.get({
            path: thisRequest.self.path,
            hostname: 'localhost',
            port: 8080,
            headers: {
               range: 'bytes=' + reqStart + '-' + (reqEnd-1)
            }
        }, function (res){
            var contentRange = res.headers['content-range'];
            if (contentRange) {
               thisRequest.fileSize = parseInt(contentRange.split('/')[1], 10);
            }
            //////////console.log("I return currentCB with http response stream");
            ////////////console.log("function(res) is executed from readstream number " + createReadStreamCounter + " and CB number " + thisCBNumber);
            res.on('end', XHREnd);
            res.on('data', XHRDataHandler);
         }
      );
   }
   chokeIfNecessary();
   updateChart();
   frequentlyCeckIfAnswerStreamReady();
   checkIfBufferFullEnough();

   var video = document.querySelector('video');
   video.addEventListener('error', function (err){
      console.error(video.error);
   });
   //////console.log("I call Videostream constructor");
   Videostream(new file(PATH_TO_VIDEO_FILE), video);
}



function addSimplePeerInstance(simplePeerInstance, options, callback){
   // The method add a simplePeer to the WebTorrent swarm instance 
   if(theTorrent){
      if(theTorrent.infoHash){
         theTorrent.addPeer(simplePeerInstance);
         callback();
      } else {
         theTorrent.on('infoHash', function() {theTorrent.addPeer(simplePeerInstance); callback();});
      }
   } else {
      peersToAdd.push(simplePeerInstance);
   }
}

var simplePeerCreationCounter = 0;
var connectionsWaitingForSignalingData = [];


function createSignalingData(callback){
   var myPeer = new SimplePeer({initiator: true, tickle: false});
   myPeer.on('signal', function (signalingData){
      signalingData.oakNumber = ++simplePeerCreationCounter;
      connectionsWaitingForSignalingData[simplePeerCreationCounter] = myPeer;
      callback(signalingData);
   });
}

function createSignalingDataResponse(signalingData, callback){
   var oakNumber;
   var myPeer = new SimplePeer({initiator: false, tickle: false});
   myPeer.on('signal', function (answerSignalingData){
      answerSignalingData.oaknumber = oakNumber;
      callback(answerSignalingData);
   });
   oakNumber = answerSignalingData.oakNumber;
   delete answerSignalingData.oakNumber;    
   myPeer.signal(signalingData);
   myPeer.on('connect', function(){
      addSimplePeerInstance(myPeer);
   });
}

function processSignalingResponse(signalingData, callback){
   var oakNumber = signalingData.oakNumber;
   delete signalingData.oakNumber;
   myPeer.on('connect', function (){
      console.log('CONNECT');
      addSimplePeerInstance(myPeer);
      delete connectionsWaitingForSignalingData[oakNumber];    
   });
   myPeer.signal(signalingData);  
}

function on(type, callback){
   // call callback when event of type "type" happend
   // bisher nur das event "foundNewPeerViaTracker" geplant
}