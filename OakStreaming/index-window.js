var http = require('http');
var MultiStream = require('multistream');
var util = require('util');
var readableStream = require('readable-stream');
var Videostream = require('videostream');
var ut_pex = require('ut_pex');
var WebTorrent = require('webtorrent');
var SimplePeer = require('simple-peer');




/**
 * @module OakStreaming
 */
window.OakStreaming = OakStreaming;


 /**
 * This constructor creates a OakStreaming instance. OakStreaming instances can seed and/or receive and/or relay video streams.
 * In order to stream a video from one OakStreaming instance to another, a peer-to-peer connection between both OakStreaming instances has to be established.
 * To build up a peer-to-peer connection between two OakStreaming instances, signaling data has to be exchanged between both instances.
 * This exchange of signaling data can happen automatically via a signaling server or manually by using the createSignalingData, createSignalingDataResponse
 * and procressSignalingData methods of the OakStreaming instances. OakStreaming instances can seed a video stream by using the streamVideo method.
 * OakStreaming instances can receive, play back and relay a video stream by using the loadVideo method.
 * OakStreaming instances can also (partly) receive a video stream from a Web server via XML HTTP Requests (XHRs). 
 * @constructor
 */ 
function OakStreaming(OakName){
   var self = this;
   (function(){  
      var OakName = OakName || Math.floor(Math.random() * Math.pow(10,300) + 1);
      //console.log("Version: Archer   In OakStreaming constructor. this.name: " + OakName);
      
      // Only methods should be part of the API, i.e. only methods should be publically accessible.
      // Every method should have access to these variables. Therefore they are defined at this high scope.
      var simplePeerCreationCounter = 0;
      var connectionsWaitingForSignalingData = [];
      var theTorrent = null;
      var infoHashReady = false;
      var peersToAdd = [];
      var bytesReceivedFromServer = 0;
      var notificationsBecauseNewWires = 0;
      var SIZE_OF_VIDEO_FILE = 0;
      
      
      self.streamVideo = streamVideo;
      self.loadVideo = loadVideo;
      self.forTesting_connectedToNewWebTorrentPeer = null;

      
      /** This method returns the number of bytes downloaded from the Web server.
      * @pulic
      * @method
      * @returns {Number}
      */      
      self.get_number_of_bytes_downloaded_from_server = function(){
         return bytesReceivedFromServer;
      };

      
      /** This method returns the number of bytes downloaded from the peer-to-peer network. The return value includes bytes that were sent by the seeder. 
      * @pulic
      * @method
      * @returns {Number}
      */      
      self.get_number_of_bytes_downloaded_P2P = function(){
         if(theTorrent){
            return theTorrent.downloaded;
         } else {
            return 0;
         }
      };


      /** This method returns the number of bytes uploaded to the peer-to-peer network. 
      * @pulic
      * @method
      * @returns {Number}
      */       
      self.get_number_of_bytes_uploaded_P2P = function(){
         if(theTorrent){
            return theTorrent.uploaded;
         } else {
            return 0;
         }
      };

      
      /** This method returns the number of bytes downloaded from the peer-to-peer network. 
      * @pulic
      * @method
      * @returns {Number}
      */      
      self.get_percentage_downloaded_of_torrent = function(){
         if(theTorrent){
            return theTorrent.progress;
         } else {
            return 0;
         }
      };
      
      
      /** This method returns the size in bytes of the video file that is or has been streamed/received.
      * @pulic
      * @method
      * @returns {Number}
      */   
      self.get_file_size = function(){
         return SIZE_OF_VIDEO_FILE;
      };
      


      /**
      * @callback OakStreaming~createSignalingData1_callback
      * @param {SignalingData} signalingDataObject - Other OakStreaming instances can pass this object as an argument to their createSignalingDataResponse method in order to create another SignalingData object which is necessary for successfully finishing building up the peer-to-peer connection.
      */ 
      
      /** This method creates signaling data that can be put into the createSignalingDataResponse method of another OakStreaming instance in order to manually building up a peer-to-peer connection between both OakStreaming instances.
      * @pulic
      * @method
      * @param {OakStreaming~createSignalingData_callback} callback - This callback function gets called as soon as the signaling data has been created.
      */      
      self.createSignalingData = function (callback){
         var alreadyCalledCallback = false;
         var oakNumber = simplePeerCreationCounter;
         ////console.log("In createSignalingData for oakNumber: " + oakNumber);
         connectionsWaitingForSignalingData[oakNumber] = new SimplePeer({initiator: true, trickle: false});
         simplePeerCreationCounter++;
         
         connectionsWaitingForSignalingData[oakNumber].on('signal', function (signalingData){
            if(!alreadyCalledCallback){
               alreadyCalledCallback = true;
               signalingData.oakNumber = oakNumber;
               callback(signalingData);
            }
         });
      };
 
 
      // This method creates (WebRTC-)signaling data as a response to singaling data of a createSignalingData method of another OakStreaming instance.
      // This mehtod returns new (WebRTC-)signaling data which has to be put into processSignalingResponse method of the OakStreaming instance which created the original singaling data.     
      /**
      * @callback OakStreaming~createSignalingData2_callback
      * @param {SignalingData} signalingData - An object that the OakStreaming instance that created the initial signalingData object can pass as an argument to its processSignalingResponse method in order to build up the peer-to-peer connection.
      */ 
      
      /** This method expects a signaling data object that was created by the createSignalingData method of another OakStreaming instance and generates the respective response signaling data object. In order to complete the signaling data exchange, this response signaling data object then has to be put into the processSignalingResponse method of the OakStreaming instance which has initialized the signaling.
      * @pulic
      * @method
      * @param {SignalingData} signalingData - A signaling data object that was created by the createSignalingData method of another OakStreaming instance.
      * @param {OakStreaming~createSignalingData2_callback} callback - This callback function gets called as soon as the response signaling data object has been created.
      */   
      self.createSignalingDataResponse = function (signalingData, callback){
         var oakNumber = signalingData.oakNumber;
         ////console.log("In createSignalingDataResponse. In the beginning oakNumber: " + oakNumber);
         signalingData.oakNumber = undefined;
         
         var myPeer = new SimplePeer({initiator: false, trickle: false});
         var index = simplePeerCreationCounter;
         connectionsWaitingForSignalingData[index] = myPeer;
         simplePeerCreationCounter++;
         
         myPeer.on('signal', function (answerSignalingData){
            ////console.log("In createSignalingDataResponse, after onSignal oakNumber: " + oakNumber);
            answerSignalingData.oakNumber = oakNumber;
            ////console.log("In createSignalingDataResponse,  object that is returned with callback: " + JSON.stringify(answerSignalingData));
            callback(answerSignalingData);
         });
         myPeer.signal(signalingData);
         
         var self = this;
         myPeer.on('connect', function(){
            console.log('Established a simple-peer connection');
            addSimplePeerInstance(connectionsWaitingForSignalingData[index], {}, function(){/*console.log("addSimplePeerInstance ended");*/});
         });
      };
      

      // This method finally establishes a Web-RTC connection between the two OakStreaming instances. From now on both OakStreaming instances exchange video fragments.
      /**
      * @callback OakStreaming~createSignalingData3_callback
      */ 
      
      /** This method expects a signaling data object that a createSignalingResponse method of another OakStreaming has generated based on a signaling data object that the createSignalingData method of this OakStreaming method created. After the signaling data object has been processed, this OakStreaming instance automatically builds up a peer-to-peer connection to the other OakStreaming instance. After the peer-to-peer connection has been established, both OakStreaming instances automatically exchange video fragments.
      * @pulic
      * @method
      * @param {SignalingData} signalingData - A signaling data object that was created by the createSignalingResponse method of another OakStreaming instance. A necessary requirement is that the createSigngalingResponse method created the signaling data object based on a singaling data object that the createSignalingData method of this OakStreaming instance generated.
      * @param {OakStreaming~createSignalingData3_callback} [callback] - This callback function gets called as soon as the peer-to-peer connection between the two OakStreaming instances has been established.
      */ 
      self.processSignalingResponse = function (signalingData, callback){
         ////console.log("In processSignalingResponse,  signalingData paramter: " + JSON.stringify(signalingData));
         var oakNumber = signalingData.oakNumber;
         signalingData.oakNumber = undefined;
         ////console.log("In processSignalingResponse,  oakNumber: " + oakNumber);
         ////console.log("connectionsWaitingForSignalingData: " + connectionsWaitingForSignalingData);
         var self = this;
         (connectionsWaitingForSignalingData[oakNumber]).on('connect', function (){
            console.log('Established a simple-peer connection');
            addSimplePeerInstance(connectionsWaitingForSignalingData[oakNumber]);
            connectionsWaitingForSignalingData[oakNumber] = undefined;
            if(callback){
               callback();
            }
         });
         ////console.log("In processSignalingResponse,  object that is passed to .signal(): " + JSON.stringify(signalingData));
         connectionsWaitingForSignalingData[oakNumber].signal(signalingData);
      };
       
       
       /**
       * @typedef Stream_Information
       * @type {object}
       * @property {number} video_file_size - The size in byte of the video file that was passed as the first argument to this method.
       */
       
      /**
       * @callback OakStreaming~streamVideoFinished
       * @param {Stream_Information} stream_information_object - An object that other OakStreaming instances can pass as an argument to their loadVideo method to download the video from this and other OakStreaming instances and/or a Web server.
       */

      /**
       * This method creates a Stream_Information object that other OakStreaming instances can pass as an argument to their loadVideo method to download the video from this and other OakStreaming instances and/or a Web server.
       * @pulic
       * @method
       * @param {object} video_file - The video file that should be streamed peer-to-peer to other OakStreaming instances. This paramter can either be a {@link https://developer.mozilla.org/en-US/docs/Web/API/File |W3C File object}, a {@link https://developer.mozilla.org/en-US/docs/Web/API/FileList |W3C FileList}, a {@link https://nodejs.org/api/buffer.html |Node Buffer object} or a {@link https://nodejs.org/api/stream.html#stream_class_stream_readable |Readable stream object}.
       * @param {object} options - Options for the creation of the Stream_Information object. After its creation, the Stream_Information object gets passed by the streamVideo method as an argument to the callback function.
       * @param {string} [options.web_server_URL] - URL of a Web server that can serve the video file. If this property is not set, XML HTTP Requests (XHRs) will be send to the Web server that served the Web page. If this property is set to false (not only falsy), no Web server will be requested.
       * @param {number} [options.web_server_port = 80] - Port that will be used when communicating with the Web server that was specified in the web_server_URL property. This property should only be set when the web_server_URL property is set too.
       * @param {string} [options.path_to_file_on_Web_server] - This path will be used for the XML HTTP Requests (XHRs). For example, a valid path could be "/videos/aVideoFile.mp4". The default value of this property is "/" concatenated with the name of the file that is seeded.
       * @param {string} [options.hash_value] - The SHA-256 hash value of the video file that should by (partially) requested from the Web server. If this hash_value property is defined, it instead of the path_to_file_on_Web_server property will be used for XHRs.
       * @param {number} [options.download_from_server_time_range = 5] - How many seconds of video playback must be buffered in advance such that no data is requested from the Web server.
       * @param {string[][]} options.webTorrent_trackers - Array of arrays of WebTorrent tracking server URLs (strings). These WebTorrent trackers will be used to connect to other OakStreaming instances. In which order these tracking server a contacted is described in {@link http://www.bittorrent.org/beps/bep_0012.html}.
       * @param {number} [options.Sequential_Requests_time_range = 20] - How many seconds of video playback must be buffered in advance such that no sequential data streams are requested from the WebTorrent network and instead video fragments are requested according to the rarest-peace-first strategy.
       * @param {number} [options.create_readStream_request_size = 5000000] - The size of the sequential byte range requests to the WebTorrent network. Keeping the default value is sufficient for most use cases.
       * @param {number} [options.peer_upload_limit_multiplier = 2] - The OakStreaming client will severly throttle the video data upload to other peers when (bytes_uploaded_to_other_peers * peer_upload_limit_multiplier + peer_upload_limit_addend >  bytes_downloaded_from_other_peers). The OakStreaming client will stop the throtting as soon as the before mentioned inequality is no longer true.
       * @param {number} [options.peer_upload_limit_addend = 3000000] - The OakStreaming client will severly throttle the video data upload to other peers when (bytes_uploaded_to_other_peers * peer_upload_limit_multiplier + peer_upload_limit_addend >  bytes_downloaded_from_other_peers). The OakStreaming client will stop the throtting as soon as the before mentioned inequality is no longer true.
       * @param {OakStreaming~streamVideoFinished} callback - This callback function gets called with the generated Stream_Information object at the end of the execution of streamVideo.
       */
      function streamVideo(video_file, options, callback, returnTorrent, destroyTorrent){ 
         var webTorrentClient = new WebTorrent();
         //////console.log("streamVideo is executed");
         //////console.log("videoFile: " + videoFile);
         //////console.log("options: " + options);
         //////console.log("callback: " + callback);         
        

         // options.web_server_URL &&
         if(options &&  !options.path_to_file_on_XHR_server){
            options.path_to_file_on_XHR_server = "/" + video_file.name;
         }
        
         if(options){
            var stream_information_object = options;
         } else {
            stream_information_object = {};
         }
        
       
         if(video_file){
            var seedingOptions = {
               name: video_file.name + " - (Created by an OakStreaming client)"
            };
            if(options.webTorrent_trackers){
               seedingOptions.announceList = options.webTorrent_trackers;
            } 
            else {
               seedingOptions.announceList  = [];
            }

            var self = this; 
            webTorrentClient.seed(video_file, seedingOptions, function(torrent){
               theTorrent = torrent;
               
               
               infoHashReady = true;
                  
               // Peers which used the offered methods to manually connect to this OakStreaming instance
               // before a torrent file was loaded are added now to the set of peers that are used for video data exchange.
               for(var j=0; j< peersToAdd.length; j++){    // Vorher hatte ich das onInfohash gemacht
                  theTorrent.addPeer(peersToAdd[j][0]);
                  console.log("I manually added a peer to the swarm");
                  if(peersToAdd[j][1]){
                     (peersToAdd[j][1])();
                  }
               } 
               
               webTorrentFile = torrent.files[0];
               ////console.log("torrent file is seeded");
               
               /* K42 Maybe I will need this later
               var torrentFileAsBlobURL = torrent.torrentFileBlobURL;
               var xhr = new XMLHttpRequest();
               var XHROrMethodEndHappend = false;
               xhr.open('GET', torrentFileAsBlobURL, true);
               xhr.responseType = 'blob';
               xhr.onload = function(e) {
                 if (this.status == 200) {
                   stream_information_object.torrentAsBlob = this.response;
                   if(XHROrMethodEndHappend){
                      callback(stream_information_object);
                   } else {
                      XHROrMethodEndHappend = true;
                   }
                 }
               };
               xhr.send();
               */
               SIZE_OF_VIDEO_FILE = 0;
               stream_information_object.size_of_video_file = 0;
               for(var i=0, length=torrent.files.length; i<length; i++){
                  SIZE_OF_VIDEO_FILE += torrent.files[i].length;
                  stream_information_object.size_of_video_file += torrent.files[i].length;
               }
               
               stream_information_object.magnetURI = torrent.magnetURI;
               ////console.log("torrent.magnetURI: " + torrent.magnetURI);
               stream_information_object.infoHash = torrent.infoHash;
               
              
               stream_information_object.torrentFile = torrent.torrentFile.toString('base64');
               ////console.log("Creaded stream_information_object:\n" + JSON.stringify(stream_information_object));

               
               // var bufferTorrent = parseTorrent(stream_information_object.parsedTorrent); K42
              
               
               ////console.log("In streamVideo    " + self.OakName + ".forTesting_connectedToNewWebTorrentPeer gets created");
               // This function calls the callback function when this OakStreaming instance already connected to another peer
               // or as soon as it connects to another peer.
               self.forTesting_connectedToNewWebTorrentPeer = function(callback){
                  ////console.log("In streamVideo    " + self.OakName + ".forTesting_connectedToNewWebTorrentPeer gets executed");
                  if(notificationsBecauseNewWires <= 0){
                     notificationsBecauseNewWires--;
                     var callbackCalled = false;
                     
                     torrent.on('wire', function(wire){
                        if(!callbackCalled){
                           callback();
                           callbackCalled = true;
                        }
                     });
                  } else {
                     notificationsBecauseNewWires--;            
                     callback();
                  }
               };
               
               // This is necessary such that the forTesting_connectedToNewWebTorrentPeer function knows how many peers already connected to this OakStreaming instance.
               torrent.on('wire', function (wire){
                  notificationsBecauseNewWires++;  
               });
               // For some Jasmine tests it is appropriate that the torrent gets destroyed immediately after the stream_information_object has been created. The destruction of the torrent stops the seeding.
               if(returnTorrent === "It's a test"){
                  if(destroyTorrent){
                     notificationsBecauseNewWires = 0;
                     torrent.destroy();
                     webTorrentClient = undefined;
                  }
                  callback(stream_information_object, torrent);
               } else {
                  callback(stream_information_object);
                  return stream_information_object;
               }    
            });
         } else {
            callback(stream_information_object);
            /* K42
            if(XHROrMethodEndHappend){
               callback(stream_information_object);
            } else {
                XHROrMethodEndHappend = true;
            }
            */
         }
         
         /* Nicht löschen!!!
         function updateChart(){
            if(theTorrent && webTorrentFile){
               document.getElementById("WebTorrent-received").innerHTML = "webTorrentFile.length: " + webTorrentFile.length + "\n torrent.uploaded: " + theTorrent.uploaded;
            }
            setTimeout(updateChart, 1000);
         }      
         updateChart();
         */
      }

      function waitStartPlayingOffset(stream_information_object, callback, end_streaming_when_video_loaded){
         if(Date.now() - timeReceiptStreamInformationObject >= startPlayingOffset){
            //console.log("Video gets loaded");
            timeLoadVideoMethodWasCalled = Date.now();
            self.loadVideo(stream_information_object, callback, end_streaming_when_video_loaded);  
         } else {
            setTimeout(function(){waitStartPlayingOffset(stream_information_object, callback, end_streaming_when_video_loaded);},10);
         }
      }
      
      //A Wrapper for the Technical Evaluation
      function loadVideo_technical_evaluation(stream_information_object, callback, end_streaming_when_video_loaded){
         timeReceiptStreamInformationObject = Date.now();      
         waitStartPlayingOffset(stream_information_object, callback, end_streaming_when_video_loaded);      
      }


      /**
       * @callback OakStreaming~downloadingVideoFinished
       */ 
       
      /**
       * This method tries to receive the video stream described in the stream_information object.
       * After this method has been called, the OakStreaming instance offers received video data to all OakStreaming instances with whom it is connected.
       * The received video data will be streamed into the first HTML video element of the DOM.
       * @pulic
       * @method
       * @param {Stream_Information} stream_information_object - This object contains all data that is needed to initiate downloading the video from other OakStreaming instances and/or a Web server. Stream_Information objects can be created by the {@link streamVideo|streamVideo} method.
       * @param {OakStreaming~downloadingVideoFinished} callback - This callback gets called when the video has been buffered entirely.
       * @param {boolean} end_streaming_when_video_downloaded - If this argument is true, all uploading to other OakStreaming instances is permanently cancelled and all processing of the loadVideo method permanently stopped as soon as the video has been downloaded completely.
       */
      function loadVideo(stream_information_object, callback, end_streaming_when_video_loaded){       
         ////console.log("loadVideo is called");
         ////console.log("option paramter:\n" + JSON.stringify(stream_information_object));
         
         
         // This block is solely for the Technical Evaluation   
         
         /*
         var timeLoadVideoMethodWasCalled = -42;
         var timePlaybackWasStalled = 0;
         var startUpTime = 0;
         var timeTillTorrentOnDone = -42;
         var startPlayingOffset = Math.floor(Math.random() * 10) + 1;  
         */        
                  
         var myVideo = document.getElementsByTagName('video')[0];
         myVideo.addEventListener('error', function (err){
            console.error(myVideo.error);
         });
         /*
         myVideo.onplay = function(){
            onsole.log("event onplay is thrown");
            play = true;
            if(canplay){
               startUpTime = Date.now() - timeLoadVideoMethodWasCalled;
               timePlaybackWasStalled += startUpTime;
               videoStartUpOver = true;
            }
         };
         */
         //var userPausedVideo = false;
         /*
         myVideo.pause = function(){
            userPausedVideo = true;
         };
         */
         
         /*
         myVideo.onwaiting = function() {
            //console.log("Video is holded at " + (Date.now() - timeLoadVideoMethodWasCalled) + " miliseconds after loadVideo has been called.");
            lastTimeWhenVideoHolded = Date.now();
         };
         */
         
         /*
         myVideo.onstalled = function() {
            //console.log("Video is stalled at " + (Date.now() - timeLoadVideoMethodWasCalled) + " miliseconds after loadVideo has been called.");
            lastTimeWhenVideoHolded = Date.now();
         };
         */
         
         
         /*
         myVideo.onplaying = function(){
            if(playbackStopped){// && !userPausedVideo){
               //console.log("Video is playing again after " + (Date.now() - lastTimeWhenVideoHolded) + " miliseconds.");
               timePlaybackWasStalled += Date.now() - lastTimeWhenVideoHolded;
               playbackStopped = false;
            }
            //userPausedVideo = false;
         };
         */
         
         
         // All these declared varibales until 'var self = this' are intended to be constants
         var deliveryByServer = (stream_information_object.web_server_URL !== false && (stream_information_object.path_to_file_on_XHR_server || stream_information_object.hash_value)) ? true : false;
         var deliveryByWebtorrent = stream_information_object.torrentFile ? true : false;
         var XHRServerURL = stream_information_object.web_server_URL || false;
         var XHR_PORT = stream_information_object.web_server_port || 80;
         var pathToFileOnXHRServer = stream_information_object.path_to_file_on_XHR_server;
         var hashValue = stream_information_object.hash_value;
         //var webTorrentTrackers = stream_information_object.webTorrent_trackers;
         var MAGNET_URI = stream_information_object.magnetURI;
         ////console.log("MAGNET_URI: "  + MAGNET_URI);
         var THE_RECEIVED_TORRENT_FILE = Buffer.from(stream_information_object.torrentFile, 'base64');
         SIZE_OF_VIDEO_FILE = stream_information_object.size_of_video_file;
         ////console.log("stream_information_object.size_of_video_file: "  + stream_information_object.size_of_video_file);

         var DOWNLOAD_FROM_P2P_TIME_RANGE = stream_information_object.Sequential_Requests_time_range || 20; // eigentlich 20
         var CREATE_READSTREAM_REQUEST_SIZE = stream_information_object.create_readStream_request_size || 6000000; // 12000000
         var MINIMAL_TIMESPAN_BEFORE_NEW_WEBTORRENT_REQUEST = stream_information_object.minimal_timespan_before_new_webtorrent_request || 3; // in seconds
         var DOWNLOAD_FROM_SERVER_TIME_RANGE = stream_information_object.download_from_server_time_range || 3; // vorher 3  (Das mit den 6MB beim start-up) eigentlich 5
         var UPLOAD_LIMIT = stream_information_object.peer_upload_limit_multiplier || 2;
         var ADDITION_TO_UPLOAD_LIMIT = stream_information_object.peer_upload_limit_addend || 3000000; // war vorer 500000
         
         
         var XHR_REQUEST_SIZE = stream_information_object.xhrRequestSize || 2000000; // in byte    2000000
         var THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM = stream_information_object.thresholdForReturningAnswerStream || 1000000; // in byte  1000000
         var WATERMARK_HEIGHT_OF_ANSWERSTREAM = stream_information_object.watermarkHeightOfAnswerStream || 1999999; // in byte 1999999
         
         var CHECK_IF_BUFFER_FULL_ENOUGH_INTERVAL = stream_information_object.checkIfBufferFullEnoughInterval || 500; // in miliseconds
         var CHECK_IF_ANSWERSTREAM_READY_INTERVAL = stream_information_object.checkIfAnswerstreamReadyInterval || 200; // in miliseconds
         var UPDATE_CHART_INTERVAL = stream_information_object.updateChartInterval || 1000; // in miliseconds
         var CHOKE_IF_NECESSARY_INTERVAL = stream_information_object.chokeIfNecessaryInterval || 300; // in miliseconds    Eigentlich erst 500 dann 200 dann 100
         var CHECK_IF_NEW_CREATE_READSTREAM_NECESSARY_INTERVAL = stream_information_object.checkIfNewCreateReadstreamInterval || 2000 ; // 2000
         
         
         // From here on most newly declared variables are not indeted to function as constants
         // These variables are declared in this high scope in order to allow every function that is declared in loadVideo to access and manipulate these variables
         var self = this;
         var endStreaming = false;
         var webTorrentClient = null;
         var wires = []; // a wire is a connection to another peer out of the WebTorrent network
         var globalvideostreamRequestNumber = 0;
         bytesReceivedFromServer = 0; // This variable gets only initialized not declared
         var webTorrentFile;
         var videostreamRequestHandlers = [];
         var inCritical = true; // incritical means that XHR requests will be conducted because there is less than DOWNLOAD_FROM_SERVER_TIME_RANGE seconds of video playback buffered.
         var videoCompletelyLoadedByVideoPlayer = false;
         var bytesTakenFromWebTorrent = 0;
         var bytesTakenFromServer = 0;
         var consoleCounter = 0; // This variable is only for debugging purposes
         // var first2000BytesOfVideo = null; war zu verwirrend
         // var numberBytesInFirst2000BytesOfVideo = 0; war zu verwirrend
         var VideoCompletelyLoadedByWebtorrent = false;
         var timeOfLastWebTorrentRequest = 0;
         
      
         
         // Node.js readable streams are used to buffer video data before it gets put into the source buffer
         function MyReadableStream(options){
            readableStream.Readable.call(this, options);
         }
         util.inherits(MyReadableStream, readableStream.Readable);
         MyReadableStream.prototype._read = function(size){};
         
        
         if(deliveryByWebtorrent){
            ////console.log("entered if(deliveryByWebtorrent)");
            webTorrentClient = new WebTorrent();
                    
            var webTorrentOptions = {}; // {announce: []};
            
            /* Weiß nicht mehr warum das hier steht
            if(stream_information_object.pathToFileToSeed){
               webTorrentOptions.path = stream_information_object.pathToFileToSeed;
            }
            */
            
            
            // A magnetURI contains URLs to tracking servers and the info hash of the torrent.
            //The client receives the complete torrent file from a tracking server.
            webTorrentClient.add(THE_RECEIVED_TORRENT_FILE, webTorrentOptions, function (torrent){
               // From this point on the WebTorrent instance will download video data from the WebTorrent network in the background in a rarest-peace-first manner as fast as possible.
               // Sequential stream request like createreadstrime are prioritized over this rarest-peace-first background downloading.
               
               ////console.log("webTorrentClient.add   torrent meta data ready");         
               theTorrent = torrent;
               theTorrent.on('infoHash', function(){
                  infoHashReady = true;
                  
                  // Peers which used the offered methods to manually connect to this OakStreaming instance
                  // before a torrent file was loaded are added now to the set of peers that are used for video data exchange.
                  for(var j=0; j< peersToAdd.length; j++){  // Vorher hatte ich das onInfohash gemacht
                     console.log("I manually added a peer to the swarm");                     
                     theTorrent.addPeer(peersToAdd[j][0]);
                     if(peersToAdd[j][1]){
                        (peersToAdd[j][1])();
                     }
                  } 
               });
               webTorrentFile = torrent.files[0];
                     
               torrent.on('done', function () {
                  VideoCompletelyLoadedByWebtorrent = true;
               });
               


               // This function has the same purpose 
               ////console.log("In loadVideo    " + self.OakName + ".forTesting_connectedToNewWebTorrentPeer gets created");
               // This function calls the callback function when this OakStreaming instance already connected to another peer
               // or as soon as it connects to another peer.
               self.forTesting_connectedToNewWebTorrentPeer = function(callback){
                  ////console.log("In loadVideo     " + self.OakName + ".forTesting_connectedToNewWebTorrentPeer   gets called");
                  if(notificationsBecauseNewWires <= 0){
                     notificationsBecauseNewWires--;
                     var callbackCalled = false;
                     
                     torrent.on('wire', function(wire){
                        if(!callbackCalled){
                           callback();
                           callbackCalled = true;
                        }
                     });
                  } else {
                     notificationsBecauseNewWires--;            
                     callback();
                  }
               };
               
               torrent.on('wire', function (wire){
                  ////console.log("torrent.on('wire', ..) is fired");
                  wires.push(wire);
                  if(!window.firstWire){
                     window.firstWire = wire;
                  }
                  notificationsBecauseNewWires++;
                  
                  // This activates the ut_pex extension for this peer
                  // which is necessary to exchange peers between WebTorrent instances
                  wire.use(ut_pex());
                  //wire.ut_pex.start();
                  
                  /*
                  wire.ut_pex.on('peer', function (peer){
                     theTorrent.addPeer(peer);
                     // got a peer
                     // probably add it to peer connections queue
                  });
                  */
               });

               // The Videostream object conducts, depending on the current playback position, creaReadstream requests for video data that the loadVideo method has to answer in order to play back the video successfully
               // The Videostream object probably has been created during the time webTorrentClient.add was called until its called the callback function.
               // In this time the VideoStream object created by the videostream library probably has conducted some createReadstream requests whose handlers are saved in the videostreamRequestHandlers array.
               // For these requests we now intialize WebTorrent streams.
               for(var i=0, length=videostreamRequestHandlers.length; i<length; i++){
                  var thisRequest = videostreamRequestHandlers[i];
                  
                  // To answer a createReadStream request a Multistream (https://www.npmjs.com/package/multistream) is returned which requests a Node readableStream as soon as its buffer has went dry.
                  // The current callback which should be called with the created readableStream is saved in currentlyExpectedCallback
                  if(thisRequest.currentlyExpectedCallback !== null){
                     ////console.log("In onTorrent nachträglich webtorrent stream erzeugen  thisRequest.start: " + thisRequest.start);
                     //////console.log("In onTorrent  webTorrentFile.length: " + webTorrentFile.length);
                      
                     if(myVideo.duration){
                        timeOfLastWebTorrentRequest = myVideo.currentTime;
                     } else {
                        timeOfLastWebTorrentRequest = 0;
                     }
               
                     var endCreateReadStream;
                     if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE > webTorrentFile.length-1){
                        endCreateReadStream = webTorrentFile.length-1;
                     } else {
                        endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
                     }
                         
                     thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : endCreateReadStream});
                     /*
                     thisRequest.on('end', function(){
                        if(thisRequest.currentlyExpectedCallback !== null && thisRequest.start > thisRequest.lastEndCreateReadStream && thisRequest.start < thisRequest.videoFileSize){
                           var endCreateReadStream;
                           if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE >= webTorrentFile.length-1){
                              endCreateReadStream = webTorrentFile.length-1;
                           } else {
                              endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
                           }                
                           thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : endCreateReadStream});
                           thisRequest.oldStartWebTorrent = thisRequest.start;
                           thisRequest.webTorrentStream.unpipe();
                           thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
                        }             
                     });
                     */
                     
                     // Every videostreamRequestHandler has to save the byte index that it expects next
                     thisRequest.oldStartWebTorrent = thisRequest.start;
                     thisRequest.lastEndCreateReadStream = endCreateReadStream;
                     
                     // Data that is received from the WebTorrent readable gets immmediately pumped into a writeable stream called  collectorStreamForWebtorrent which processes the new data.
                     thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
               
                  }
               }
            });
         }
         
         // first2000BytesOfVideo = new MyReadableStream({highWaterMark: 2000});    hatte ich ja rausgenommen weil verfangen
         
         
         var fileLikeObject = function (pathToFileOnXHRServer){
            this.pathToFileOnXHRServer = pathToFileOnXHRServer;
         };
         // The VideoStream object will call createReadStream several times with different values for the start property of ops.
         fileLikeObject.prototype.createReadStream = function (opts){
            if(opts.start >= SIZE_OF_VIDEO_FILE){
               ////console.log("opts.start > SIZE_OF_VIDEO_FILE therefore cb(null,null) every time");
               return (new MultiStream(function (cb){cb(null, null);}));
            }
            inCritical = true;
            
            var thisRequest = new VideostreamRequestHandler(++globalvideostreamRequestNumber, opts, this);
           
            //console.log(" called createreadStream: createRequestNumber: " + thisRequest.createReadStreamNumber);
            //console.log("opts.start: " + opts.start);
            //console.log(" opts.end: " + opts.end);
            
            
            // Everytime I printed out the value of opts.end is was NaN.
            // I suppose that should be interpreted as "till the end of the file"
            // Of course, our returned stream should, nevertheless, not buffer a giant amount of video data in advance but instead retrieve and put out chunks of video data on-demand
            
            if(opts.end && !isNaN(opts.end)){
               thisRequest.end = opts.end + 1;
            } else {
               if(SIZE_OF_VIDEO_FILE !== 0){
                  thisRequest.end = SIZE_OF_VIDEO_FILE;
               }
            }
            
            
            // This writeable Node.js stream will process every data that is received from sequential WebTorrent streams
            thisRequest.MyWriteableStream = function(highWaterMark){
               readableStream.Writable.call(this, highWaterMark);
            };
            util.inherits(thisRequest.MyWriteableStream, readableStream.Writable);
            thisRequest.MyWriteableStream.prototype._write = function(chunk, encoding, done){
               //console.log("A chunk from the WebTorrent network has been received. It's size is: " + chunk.length);
               ////console.log("MyWriteableStream _write is called");   
               ////console.log("A byte range request to the WebTorrent network received a chunk");
               
               if(thisRequest.start-thisRequest.oldStartWebTorrent < chunk.length){
                  ////////////console.log("MyWriteableStream _write: pushing received data in answerStream")
                  bytesTakenFromWebTorrent += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
                  var streamHasMemoryLeft = thisRequest.answerStream.push(chunk.slice(thisRequest.start-thisRequest.oldStartWebTorrent, chunk.length));
                  thisRequest.bytesInAnswerStream += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
                  thisRequest.start += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
                                                
                  if(streamHasMemoryLeft){            
                     if(thisRequest.currentlyExpectedCallback !== null && thisRequest.start >= thisRequest.end){
                        var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                        thisRequest.currentlyExpectedCallback = null;
                        thisRequest.answerStream.push(null);
                        thisRequest.bytesInAnswerStream = 0;
                        var res = thisRequest.answerStream;
                        thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                        //////console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.createReadStreamNumber);
                        if (thisRequest.webTorrentStream){
                           //thisRequest.webTorrentStream.pause();   11.07.16  more a try   Sollte höchst wahrscheinlich aus code raus
                        }
                        theCallbackFunction(null, res);
                     } else {
                        ceckIfAnswerStreamReady(thisRequest);
                     }
                  } else {
                     if(thisRequest.currentlyExpectedCallback === null){
                        if(thisRequest.webTorrentStream){
                           //thisRequest.webTorrentStream.pause();
                        }
                        thisRequest.noMoreData = true;
                     } else {
                        var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                        thisRequest.currentlyExpectedCallback = null;
                        thisRequest.answerStream.push(null);
                        thisRequest.bytesInAnswerStream = 0;
                        var res = thisRequest.answerStream;
                        thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                        //////console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.createReadStreamNumber);
                        if (thisRequest.webTorrentStream){
                           //thisRequest.webTorrentStream.pause();
                        }
                        theCallbackFunction(null, res);
                     }
                  }
               }    
               thisRequest.oldStartWebTorrent += chunk.length;
               //ceckIfAnswerStreamReady(thisRequest);
               done();
            };
            thisRequest.collectorStreamForWebtorrent = new thisRequest.MyWriteableStream({highWaterMark: 16});
            videostreamRequestHandlers.push(thisRequest);

            if(webTorrentFile){ // Um Einhaltung des Upload limits kümmert sich doch chokeIfNecessary   && theTorrent.uploaded <= UPLOAD_LIMIT * theTorrent.downloaded + ADDITION_TO_UPLOAD_LIMIT){
               ////////////console.log("after new videostreamRequest creating a corresponding webtorrent stream");
               ////////console.log("opts.start: " + opts.start);
               ////////console.log("webTorrentFile.length: " + webTorrentFile.length);
               
               if(myVideo.duration){
                  timeOfLastWebTorrentRequest = myVideo.currentTime;
               } else {
                  timeOfLastWebTorrentRequest = 0;
               }
               var endCreateReadStream;
               if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE >= webTorrentFile.length-1){
                  endCreateReadStream = webTorrentFile.length-1;
               } else {
                  endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
               }
               thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : endCreateReadStream});
               thisRequest.lastEndCreateReadStream = endCreateReadStream;
               thisRequest.oldStartWebTorrent = thisRequest.start;
               thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
            }

            
            function factoryFunctionForStreamCreation(cb){
               //console.log("ReadableStream request number " + thisRequest.createReadStreamNumber + "    does a cb request");         
               if(thisRequest.end >= 0 && thisRequest.start >= thisRequest.end){
                  ////console.log("called cb(null,null) from " + thisRequest.createReadStreamNumber);             
                  if (thisRequest.req) {
                     thisRequest.req.destroy();
                     thisRequest.req = null;
                  }
                  ////console.log("cb(null, null) is called");
                  return cb(null, null);
               }
              
               thisRequest.callbackNumber++;
                  //////////console.log(thisRequest.callbackNumber + ". call of function(cb) from " + videostreamRequestNumber);
                  ////////////console.log(start: " + thisRequest.start);

               thisRequest.currentlyExpectedCallback = cb;
               thisRequest.noMoreData = false;
               
               /* Erstmal rausgenommen, da ich mich beim XHRHanlder part dazu irgendwie verhäddert habe
               if(firstBytesOfVideo && (thisRequest.start < firstBytesOfVideo.length - 200) && thisRequest.createReadStreamNumber < 5){ // Beim 10 mins big buck bunny video ist eben der erste lange createReadStream (und einzige?) createReadStream Nummer 5
                  thisRequest.answerStream.push(firstBytesOfVideo.slice(thisRequest.start, firstBytesOfVideo.length));
                  bytesTakenFromServer += firstBytesOfVideo.length - thisRequest.start;
                  thisRequest.start += firstBytesOfVideo.length - thisRequest.start;
                  var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                  thisRequest.currentlyExpectedCallback = null;
                  thisRequest.answerStream.push(null);
                  thisRequest.bytesInAnswerStream = 0;
                  var res = thisRequest.answerStream;
                  if(thisRequest.createReadStreamNumber < 4){
                     thisRequest.answerStream = new MyReadableStream({highWaterMark: 2000});
                  } else {
                     thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});                    
                  }
                  //console.log("A CB has been answered with a part of firstBytesOfVideo for readstream number " + thisRequest.createReadStreamNumber + " with callback number " + thisRequest.callbackNumber);
                  theCallbackFunction(null, res);
                  return;
               }
               */
            
               if(!ceckIfAnswerStreamReady(thisRequest)){
                  if(thisRequest.webTorrentStream){
                     // thisRequest.webTorrentStream.resume();  11.07.16 more a try
                  } else if(webTorrentFile){
                     ////////////console.log("New cb function was called and I subsequently create a new torrentStream for it because non existed before for this videostreamRequest");
                     ////////console.log("After new Multistream. thisRequest.start: " + thisRequest.start);
                     ////////console.log("webTorrentFile.length: " + webTorrentFile.length);
                     var endCreateReadStream;
                     if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE >= webTorrentFile.length-1){
                        endCreateReadStream = webTorrentFile.length-1;
                     } else {
                        endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
                     }
                     thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : endCreateReadStream});
                     thisRequest.lastEndCreateReadStream = endCreateReadStream;
                     thisRequest.oldStartWebTorrent = thisRequest.start;
                     thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
                  }

                  if(deliveryByServer && inCritical && !thisRequest.XHRConducted){
                     if(!webTorrentFile || !VideoCompletelyLoadedByWebtorrent){
                        conductXHR(thisRequest);                      
                     }
                  }
               }
            }
            
            // A new Multistream gets created which will be the answer the the request from the VideoStream request
            var multi = new MultiStream(factoryFunctionForStreamCreation);
            
            var deconstructorAlreadyCalled = false;
            ////////////console.log(" terminate createReadStream");
            var destroy = multi.destroy;
            multi.destroy = function(){
               if(deconstructorAlreadyCalled){
                  ////console.log("Deconstructor of " + thisRequest.createReadStreamNumber + " has already been called");
                  return;
               }
               //console.log("Deconstructor of " + thisRequest.createReadStreamNumber + " is called");
               ////console.log("In deconstructor call thisRequest.start has value: " + thisRequest.start);
               ////console.log("In deconstructor call thisRequest.end has value: " + thisRequest.end);
               ////console.log("In deconstructor call thisRequest.currentlyExpectedCallback === null: " + (thisRequest.currentlyExpectedCallback === null));
               deconstructorAlreadyCalled = true;
               if (thisRequest.req) {
                  thisRequest.req.destroy();
               }
               var theCallback = thisRequest.currentlyExpectedCallback;
               thisRequest.currentlyExpectedCallback = null;
               thisRequest.noMoreData = true;
               if(thisRequest.webTorrentStream){
                  thisRequest.webTorrentStream.pause();
                  thisRequest.webTorrentStream.unpipe();
               }
               
               for(var i=0; i<videostreamRequestHandlers.length; i++){
                  if(videostreamRequestHandlers[i] === thisRequest){
                     videostreamRequestHandlers.splice(i, 1);
                  }
               }
               /*
               if(theCallback){
                  theCallback(null,null);
               }
               */
               // thisRequest.webTorrentStream.destroy();                  Glaube ich unnötig!!!!
               thisRequest.answerStream.resume();  // To avoid memory leaks. Ich sammel ja schon datan während ich auf den nächsten call von der streamFactoryFunction warte 
               // thisRequest.collectorStreamForWebtorrent.destroy(); Verbraucht ja eh nur ein paar byte
               destroy.call(multi);
            };
            return multi;
         };
        
         
         // This function frequently checks if less than DOWNLOAD_FROM_P2P_TIME_RANGE seconds of video data is buffered in advance.
         // If it is the case this function conducts a new sequential byte range request to the WebTorrent network
         function frequentlyCheckIfNewCreateReadStreamNecessary(){
            if(videoCompletelyLoadedByVideoPlayer){
               return;
            }  
            ////console.log("frequentlyCheckIfNewCreateReadStreamNecessary gets executed");
            
            /* Working version where only a minimal time limit is set when a new createReadStream to WebTorrent network is conducted
            if(myVideo.duration){
               ////console.log("In if(myvideo.duration)");                 
               if(theTorrent && (myVideo.currentTime - timeOfLastWebTorrentRequest >= MINIMAL_TIMESPAN_BEFORE_NEW_WEBTORRENT_REQUEST)){
                  for (var j = 0, length = videostreamRequestHandlers.length; j < length; j++) {
                     var thisRequest = videostreamRequestHandlers[j];
                     //console.log("createReadStream enlargement for request " + thisRequest.createReadStreamNumber);
                     if(thisRequest.currentlyExpectedCallback !== null && thisRequest.start > thisRequest.lastEndCreateReadStream && thisRequest.start < SIZE_OF_VIDEO_FILE){
                        timeOfLastWebTorrentRequest = myVideo.currentTime;
                        var endCreateReadStream;
                        if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE >= webTorrentFile.length-1){
                           endCreateReadStream = webTorrentFile.length-1;
                        } else {
                           endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
                        }
                        //console.log("I set a new createReadstream for videostream request number " + thisRequest.createReadStreamNumber);
                        thisRequest.webTorrentStream.unpipe();
                        thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : endCreateReadStream});
                        thisRequest.lastEndCreateReadStream = endCreateReadStream;
                        thisRequest.oldStartWebTorrent = thisRequest.start;
                        thisRequest.collectorStreamForWebtorrent = new thisRequest.MyWriteableStream({highWaterMark:16});
                        thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
                     }
                  }                                   
               }
            }        
            */

            
            // Alte Variante wo ich mir noch die Buffer Bereiche des video players angeschaut habe
            var timeRanges = myVideo.buffered;
            for (var i = 0, length = timeRanges.length; i < length; i++){
               if (myVideo.currentTime >= timeRanges.start(i) && myVideo.currentTime <= timeRanges.end(i)+1){ // war vorher timeRanges.end(i)+3
                  if (timeRanges.end(i) - myVideo.currentTime <= DOWNLOAD_FROM_P2P_TIME_RANGE) {
                     for (var j = 0, length2 = videostreamRequestHandlers.length; j < length2; j++) {
                        var thisRequest = videostreamRequestHandlers[j];
                        //console.log("createReadStream enlargement for request " + thisRequest.createReadStreamNumber);
                        if(theTorrent && thisRequest.currentlyExpectedCallback !== null && thisRequest.start > thisRequest.lastEndCreateReadStream && thisRequest.start < SIZE_OF_VIDEO_FILE){
                           var endCreateReadStream;
                           if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE >= webTorrentFile.length-1){
                              endCreateReadStream = webTorrentFile.length-1;
                           } else {
                              endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
                           }
                           //console.log("I set a new createReadstream for videostream request number " + thisRequest.createReadStreamNumber);
                           thisRequest.webTorrentStream.unpipe();
                           thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : endCreateReadStream});
                           thisRequest.lastEndCreateReadStream = endCreateReadStream;
                           thisRequest.oldStartWebTorrent = thisRequest.start;
                           thisRequest.collectorStreamForWebtorrent = new thisRequest.MyWriteableStream({highWaterMark:16});
                           thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
                        }
                     }
                  }
               }
            }
            
            //
            setTimeout(frequentlyCheckIfNewCreateReadStreamNecessary, CHECK_IF_NEW_CREATE_READSTREAM_NECESSARY_INTERVAL);
         }   
         
         // The final version of the library should not include this function. This function updates the statistics that are shown above the video. This version shows values which are not intended for end user use.
         /*   NICHT LÖSCHEN!!!!!!!!!!!!!!!!!
        function updateChart(){
            if(endStreaming){
               return;
            }
            if(theTorrent && webTorrentFile){
               document.getElementById("WebTorrent-received").innerHTML = "webTorrentFile.length: " + webTorrentFile.length + "\n torrent.downloaded: " + theTorrent.downloaded + "\n torrent.received: " + theTorrent.downloaded + "\n torrent.uploaded: " + theTorrent.uploaded + "\n torrent.progress: " + theTorrent.progress + "\n Bytes received from server: " + bytesReceivedFromServer + "\n Bytes taken from server delivery: " + bytesTakenFromServer + "\n Bytes taken from WebTorrent delivery: " + bytesTakenFromWebTorrent;
            }
            setTimeout(updateChart, UPDATE_CHART_INTERVAL);
         }         
         */
         
         // This function checks for a given videostreamRequestHandler if we have called enough video data to call the callback function.
         // If it is the case, the callback function gets called togehter with the buffered data.
         function ceckIfAnswerStreamReady(thisRequest){
            ////////////console.log("At the beginning of thisRequest.bytesInAnswerStream: " + thisRequest.bytesInAnswerStream);
            ////////////console.log("In ceckIfAnswerStreamReady of videostreamRequest number " + thisRequest.createReadStreamNumber +  ". thisRequest.bytesInAnswerStream: " + thisRequest.bytesInAnswerStream + "     thisRequest.currentlyExpectedCallback: " + thisRequest.currentlyExpectedCallback);
            if ((thisRequest.createReadStreamNumber < 4 && thisRequest.currentlyExpectedCallback && thisRequest.bytesInAnswerStream >= 2000) || (thisRequest.currentlyExpectedCallback && ((thisRequest.bytesInAnswerStream >= THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM) || (thisRequest.start >= SIZE_OF_VIDEO_FILE)))){
               ////////////console.log("answerStream from videostream Request number " + thisRequest.createReadStreamNumber + " and CB number " + thisRequest.callbackNumber + " gets returned");
               // //////////console.log("Returing answerStream out of ceckIfAnswerStreamReady()");
               var theCallbackFunction = thisRequest.currentlyExpectedCallback;
               thisRequest.currentlyExpectedCallback = null;
               thisRequest.answerStream.push(null);
               if (thisRequest.webTorrentStream){
                  //thisRequest.webTorrentStream.pause();
               }
               thisRequest.bytesInAnswerStream = 0;
               var res = thisRequest.answerStream;
               thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
               //////console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.createReadStreamNumber);
               theCallbackFunction(null, res);
               return true;
            }
            return false;
         }

         // This function frequently checks if video data upload should be throttled because the peer_upload_limit is reached
         // If it should be throttled, then every peer gets choked which means there will be no more data send to other peers for approximately 800 milliseconds.
         function chokeIfNecessary(){
            if (theTorrent && theTorrent.uploaded >= theTorrent.downloaded * UPLOAD_LIMIT + ADDITION_TO_UPLOAD_LIMIT) {
               /* mache ich schon in einer anderen frequent methode
               if(videoCompletelyLoaded){
                  theTorrent.destroy();
                  webTorrentClient = undefined;
                  endStreaming = true;
                  return;
               }
               */
               for (var i = 0, length = wires.length; i < length; i++){
                  //////console.log("I choked a peer");
                  wires[i].choke();
               }
            }
            setTimeout(chokeIfNecessary, CHOKE_IF_NECESSARY_INTERVAL);
         }
         
         function VideostreamRequestHandler(createReadStreamNumber, opts, self){
            this.createReadStreamNumber = createReadStreamNumber;
            this.opts = opts;
            this.start = opts.start || 0;
            this.oldStartWebTorrent = -42;
            this.oldStartServer = -42;
            this.currentlyExpectedCallback = null;
            this.callbackNumber = 0;
            this.webTorrentStream = null;
            if(createReadStreamNumber < 4){ // war vorher === 1 stat < 4
               this.answerStream = new MyReadableStream({highWaterMark: 2000});
            } else {
               this.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
            }        
            this.bytesInAnswerStream = 0;
            this.collectorStreamForWebtorrent = null;
            this.XHRConducted = false;
            this.end = -42;
            this.self = self;
            this.bytesTakenFromWebTorrent = 0;
            this.bytesTakenFromServer = 0;
            this.noMoreData = false;
            this.req = null;
            this.lastEndCreateReadStream = -42;
            this.XHR_filesize = -42;
            this.MyWriteableStream = null;
         }

         // This function frequently checks for every videostreamRequestHandler if there is enough data buffer to call the corresponding callback function with the buffered data
         /* Brauche ich soviel ich weiß nicht
         function frequentlyCeckIfAnswerStreamReady(){
            if(videoCompletelyLoadedByVideoPlayer){
               return;
            }
            for (var i = 0, length = videostreamRequestHandlers.length; i < length; i++) {
               ceckIfAnswerStreamReady(videostreamRequestHandlers[i]);
            }
            setTimeout(frequentlyCeckIfAnswerStreamReady, CHECK_IF_ANSWERSTREAM_READY_INTERVAL);
         }
         */
         
         // The job of this function is to frequently check to things.
         // First, if the video is completely loaded.
         // Second, if less than DOWNLOAD_FROM_SERVER_TIME_RANGE seconds of video playback are buffered in advance.
         function checkIfBufferFullEnough(justOnce){
            //////console.log("checkIfBufferFullEnough is called");
            if(videoCompletelyLoadedByVideoPlayer){
               return;
            }
            //////console.log("video.duration: " + myVideo.duration);
            if(myVideo.duration){
               var timeRanges = myVideo.buffered;
               if(timeRanges.length >= 1){
                  //////console.log("timeRanges.start(0): " + timeRanges.start(0));
                  //////console.log("timeRanges.end(0): " + timeRanges.end(0));
                  if(timeRanges.start(0) == 0 && timeRanges.end(0) == myVideo.duration){
                    // ////console.log("In checkIfBufferFullEnough: callback should be called");
                     videoCompletelyLoadedByVideoPlayer = true;   // brauche da verschiende boolean werte
                     //console.log("My program thinks the wohle video has been loaded into the video Player buffer");
                     if(callback){
                        if(end_streaming_when_video_loaded){
                           callback();
                        } else {
                           callback(theTorrent);
                        }
                     }
                     if(end_streaming_when_video_loaded){
                        if(theTorrent){
                           theTorrent.destroy();
                           webTorrentClient = null;
                        }
                        endStreaming = true;
                        return;                 
                     } 
                  }
               }
               
               // From here on it is checked wether there are less seconds buffered than DOWNLOAD_FROM_SERVER_TIME_RANGE
               inCritical = true;              
               for (var i = 0, length = timeRanges.length; i < length; i++) {
                  ////////////console.log("Time range number " + i + ": start(" + timeRanges.start(i) + ") end(" + timeRanges.end(i) + ")");
                  if (myVideo.currentTime >= timeRanges.start(i) && myVideo.currentTime <= timeRanges.end(i)+1) {
                     if (timeRanges.end(i) - myVideo.currentTime >= DOWNLOAD_FROM_SERVER_TIME_RANGE) {
                        inCritical = false;
                        ////////////console.log("I set inCritical to false");
                     }
                  }
               }
               if (deliveryByServer && inCritical) {
                  for (var j = 0, length = videostreamRequestHandlers.length; j < length; j++) {
                     if ((!webTorrentFile || !VideoCompletelyLoadedByWebtorrent) && videostreamRequestHandlers[j].currentlyExpectedCallback !== null && videostreamRequestHandlers[j].XHRConducted === false) {
                        conductXHR(videostreamRequestHandlers[j]);
                     }
                  }
               }
            }
            if(!justOnce){
               setTimeout(checkIfBufferFullEnough, CHECK_IF_BUFFER_FULL_ENOUGH_INTERVAL);
            }
         }

         
         // This function conductes a XHR reuqest for the videostreamRequestHandler which is handed over to the function as its first and only paramter.
         function conductXHR(thisRequest) {
            //console.log("In conductXHR");
            if(thisRequest.currentlyExpectedCallback === null){
               return;
            }
            thisRequest.XHRConducted = true;
            var reqStart = thisRequest.start;
            
            if(thisRequest.createReadStreamNumber < 4){    // War vorher === 1     statt < 4
               //console.log("Because createReadStreamNumber <4 only a 2000byte XHR is conducted");
               var reqEnd = reqStart + 2000;
            } else {
               var reqEnd = reqStart + XHR_REQUEST_SIZE;
            }
            
            if(thisRequest.XHR_filesize > 0 && reqEnd > thisRequest.XHR_filesize){
               reqEnd = thisRequest.XHR_filesize;
            } else if (thisRequest.end >= 0 && reqEnd > thisRequest.end) {
               reqEnd = thisRequest.end;
            }
            
            if (reqStart >= reqEnd){
               //////console.log("called cb(null,null)");
               
               // !!!!!!!!! dieser if block neu fix versuch
               if(thisRequest.req){
                  thisRequest.req.destroy();
               }
               thisRequest.XHRConducted = false;
               
               
               if(thisRequest.currentlyExpectedCallback){
                  return thisRequest.currentlyExpectedCallback(null, null);
               } else {
                  return;
               }                  
            }

            /* glaube ich unnötiger und/oder gefährlicher müll
            if (reqStart >= reqEnd) {
            req = null;
            return thisRequest.currentlyExpectedCallback(null, null);
            }
            */
            if (consoleCounter < 10000000) {
               //////////////console.log(consoleCounter++ + "  videoStream " + thisRequest.createReadStreamNumber + "  CB number " + thisRequest.callbackNumber + "    reqStart: " + reqStart);
               //////////////console.log(consoleCounter++ + "  Multistream " + thisRequest.createReadStreamNumber + "   CB number " + thisRequest.callbackNumber + "    reqEnd: " + reqEnd);
            }

            var XHRDataHandler = function (chunk){
               bytesReceivedFromServer += chunk.length;
               // thisRequest.oldStartServer += chunk.length; War noch vom meinem 2000 byte buffer versuch
               //////console.log("ReadableStream request number " + thisRequest.createReadStreamNumber + " received a chunk of length " + chunk.length);
               
               
               /* Erstmal rausgenommen weil ich darauf net klar kam. Etwas zu verwirrend
               if(numberBytesInfirst2000BytesOfVideo < 2000 && thisRequest.start == numberBytesInfirst2000BytesOfVideo){
                  //console.log("Size of firstBytesOfVideo in bytes: " + chunk.length);
                  numberBytesInFirst2000BytesOfVideo += chunk.length; //<= (2000-numberBytesInFirst2000BytesOfVideo) ? chunk.length : 2000;
                  first2000BytesOfVideo = Buffer.concat([first2000BytesOfVideo, chunk]); // chunk.slice(0, 2000-numberBytesInFirst2000BytesOfVideo)
               }
               if(thisRequest.currentlyExpectedCallback){
                  if(thisRequest.createReadStreamNumber<5 && thisRequest.callbackNumber <5){
                     if(thisRequest.bytesInAnswerStream > 0){
                        thisRequest.answerStream.push(chunk);
                        thisRequest.start += chunk.length;
                        thisRequest.bytesTakenFromServer += chunk.length;
                        var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                        thisRequest.currentlyExpectedCallback = null;
                        thisRequest.answerStream.push(null);
                        thisRequest.bytesInAnswerStream = 0;
                        var res = thisRequest.answerStream;
                        if(thisRequest.createReadStreamNumber <4){
                           thisRequest.answerStream = new MyReadableStream({highWaterMark: 2000});
                        } else {
                           thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});                              
                        }
                        theCallbackFunction(null, res);
                     } else {
                        var returnStream = new MyReadableStream(numberBytesInfirst2000BytesOfVideo - thisRequest.start);
                        returnStream.push(first2000BytesOfVideo.slice(this.start, numberBytesInFirst2000BytesOfVideo);
                        returnStream.push(null);
                        bytesTakenFromServer += numberBytesInfirst2000BytesOfVideo-thisRequest.start;  
                        thisRequest.start += numberBytesInfirst2000BytesOfVideo;
                        var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                        thisRequest.currentlyExpectedCallback = null;
                        theCallbackFunction(null, returnStream);    
                     }
                  }
               }
               */        
 
               
               if(thisRequest.noMoreData){
                  thisRequest.oldStartServer += chunk.length;
                  return;
               }
               if (thisRequest.start - thisRequest.oldStartServer < chunk.length){         
                  bytesTakenFromServer += chunk.length - (thisRequest.start - thisRequest.oldStartServer);
                  thisRequest.bytesInAnswerStream += chunk.length - (thisRequest.start - thisRequest.oldStartServer);
                  var myBuffer = chunk.slice(thisRequest.start - thisRequest.oldStartServer, chunk.length);
                  //////console.log("In XHRDataHandler   myBuffer.length: " + myBuffer.length);
                  var StreamHasMemoryLeft = thisRequest.answerStream.push(myBuffer);         
                  if(!StreamHasMemoryLeft){
                     if(thisRequest.currentlyExpectedCallback !== null){
                        var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                        thisRequest.currentlyExpectedCallback = null;
                        thisRequest.answerStream.push(null);
                        thisRequest.bytesInAnswerStream = 0;
                        var res = thisRequest.answerStream;
                        thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                        //////console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.createReadStreamNumber);
                        if (thisRequest.webTorrentStream){
                           //thisRequest.webTorrentStream.pause();
                        }
                        theCallbackFunction(null, res); 
                     } else {
                        thisRequest.noMoreData = true;
                        if(thisRequest.webTorrentStream){
                           //thisRequest.webTorrentStream.pause();
                        }
                     }
                  } else {
                     if (thisRequest.start >= thisRequest.end && thisRequest.currentlyExpectedCallback !== null){
                        var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                        thisRequest.currentlyExpectedCallback = null;
                        thisRequest.answerStream.push(null);
                        thisRequest.bytesInAnswerStream = 0;
                        var res = thisRequest.answerStream;
                        thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                        //////console.log("called CB with data out of answerStream from videostreamRequest number " + thisRequest.createReadStreamNumber);
                        if (thisRequest.webTorrentStream){
                           //thisRequest.webTorrentStream.pause();
                        }
                        theCallbackFunction(null, res);
                     }
                  } 
                  thisRequest.start += chunk.length - (thisRequest.start - thisRequest.oldStartServer);            
               }
               thisRequest.oldStartServer += chunk.length;
            }

            var XHREnd = function (){
               ////console.log("ReadableStream request number " + thisRequest.createReadStreamNumber + " XHREnd");
               if (consoleCounter < 1000000000000){
                  //////////////console.log("XHREnd from videostreamRequest number " + thisRequest.createReadStreamNumber);
               }
               
               
               if(thisRequest.createReadStreamNumber < 4 && thisRequest.currentlyExpectedCallback){
                  var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                  thisRequest.currentlyExpectedCallback = null;
                  thisRequest.answerStream.push(null);
                  thisRequest.bytesInAnswerStream = 0;
                  var res = thisRequest.answerStream;
                  if(thisRequest.createReadStreamNumber <3){
                     thisRequest.answerStream = new MyReadableStream({highWaterMark: 2000});
                  } else {
                     thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});                              
                  }
                  theCallbackFunction(null, res);
                  
                  thisRequest.XHRConducted = false;
                  return;
               }
      
               
               /* Want to solve example_application.js:14013 Uncaught Error: Data too short   Daher das hier auskommentiert
               if(thisRequest.bytesInAnswerStream > 0 && thisRequest.currentlyExpectedCallback !== null){
                  thisRequest.answerStream.push(null);
                  thisRequest.bytesInAnswerStream = 0;
                  var res = thisRequest.answerStream;
                  thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                  var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                  thisRequest.currentlyExpectedCallback = null;
                  //////console.log("XHREnd: called CB with data out of answerStream from videostreamRequest number " + thisRequest.createReadStreamNumber);
                  theCallbackFunction(null, res);
               }
               */
               
               /*
               if(!noMoreData){
                  if(thisRequest.start < SIZE_OF_VIDEO_FILE && thisRequest.start < thisRequest.XHR_filesize){
                     if(thisRequest.end > 0 ){
                        if(thisRequest.start < thisRequest.end){
                           conductXHR(thisRequest); // try to solve example_application.js:14013 Uncaught Error: Data too short
                        } else {
                           thisRequest.XHRConducted = false
                        }
                     } else {
                        conductXHR(thisRequest);
                     }
                  } else {
                     thisRequest.XHRConducted = false;
                  }
               } else {
                  thisRequest.XHRConducted = false;
               }
               */
                  //////console.log("XHREnd from videostreamRequest number " + thisRequest.createReadStreamNumber + " thisRequest.currentlyExpectedCallback === null : " + (thisRequest.currentlyExpectedCallback === null));
               thisRequest.XHRConducted = false;
               ceckIfAnswerStreamReady(thisRequest);
               checkIfBufferFullEnough(true);
               //ceckIfAnswerStreamReady(thisRequest);  // Unsicher ob es drinn bleiben soll
               //}                 
            };
            
            thisRequest.oldStartServer = reqStart;
            
            //////console.log("At htto.get   reqStart: " + reqStart + "     reqEnd: " + reqEnd);

                  
            var XHROptionObject = {
               path: thisRequest.self.pathToFileOnXHRServer,
               headers: {
                  range: 'bytes=' + reqStart + '-' + (reqEnd-1),
                  connection : 'keep-alive',
                  //protocol: 'http:'
                  //???? method: 'CONNECT',
               }
            };
            if(XHRServerURL){
               XHROptionObject.hostname = XHRServerURL;
               XHROptionObject.port = XHR_PORT;
            }
            
            thisRequest.req = http.get(XHROptionObject, function (res){
               var contentRange = res.headers['content-range'];
               if (contentRange) {
                  //////console.log("parseInt(contentRange.split('/')[1], 10) XHR: " + parseInt(contentRange.split('/')[1], 10));
                  // Hat zu bugs geführt. Hat geringe priorität einzubauen das file_size auch vom XHR server erfragt wird.
                  //SIZE_OF_VIDEO_FILE = parseInt(contentRange.split('/')[1], 10);
                  //if(thisRequest.end === 0){
                  thisRequest.XHR_filesize = parseInt(contentRange.split('/')[1], 10);
                  //}
                  
               }
               //////////////console.log("I return currentlyExpectedCallback with http response stream");
               ////////////////console.log("function(res) is executed from readstream number " + createReadStreamCounter + " and CB number " + thiscallbackNumber);
               res.on('end', XHREnd);
               res.on('data', XHRDataHandler);
               res.on('error', function(err){//console.log("The http.get response object has yield the following error"); console.error(err);});
               });
               thisRequest.req.on('error', function(err){
                  //console.log("thisRequest.req has yield the following error message: " + err.message);
               });
            });
         }
         frequentlyCheckIfNewCreateReadStreamNecessary();
         chokeIfNecessary();
         // updateChart();   NIcht löschen. Aber gehört nicht in production!!
         // frequentlyCeckIfAnswerStreamReady(); Am 17.07 entschlossen das rauszunehmen. Ich hatte mir das ja schon mehrmals überlegt
         checkIfBufferFullEnough();

         //////////console.log("I call Videostream constructor");
         if(hashValue){
            Videostream(new fileLikeObject(hashValue), myVideo);
         } else {
            Videostream(new fileLikeObject(pathToFileOnXHRServer), myVideo);
         }
      }

      // This function adds a simple-peer connection to the WebTorrent swarm of the OakStreaming instance.
      // A simple-peer is a wrapper for a Web-RTC connection.
      function addSimplePeerInstance(simplePeerInstance, options, callback){
         // The method add a simplePeer to the WebTorrent swarm instance
         if(theTorrent){
            if(infoHashReady){  // Vorher war das wenn info hash ready
               theTorrent.addPeer(simplePeerInstance);
               console.log("addSimplePeerInstance successfully added a peer connection");
               if(callback){
                  callback();
               }
            } else {
               theTorrent.on('infoHash', function() {infoHashReady = true; theTorrent.addPeer(simplePeerInstance); console.log("addSimplePeerInstance successfully added a peer connection"); if(callback){callback();}});
            }
         } else {
            console.log("In addSimplePeerInstance theTorrent is not yet ready");
            var pair = [];
            pair.push(simplePeerInstance);
            pair.push(callback);
            peersToAdd.push(pair);
         }
      }
   })();
}