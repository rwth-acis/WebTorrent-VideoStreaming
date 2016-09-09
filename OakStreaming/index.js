var http = require('http');
var MultiStream = require('multistream');
var util = require('util');
var readableStream = require('readable-stream');
var Videostream = require('videostream');
var ut_pex = require('ut_pex');
var WebTorrent = require('webtorrent');
var SimplePeer = require('simple-peer');



module.exports = OakStreaming;



function OakStreaming(OakName){
  var self = this;
  (function(){  
    var OakName = OakName || Math.floor(Math.random() * Math.pow(10,300) + 1);
      
      
    // Every method should have access to these variables.
    // Therefore, they are defined at this high scope.
    var simplePeerCreationCounter = 0;
    var connectionsWaitingForSignalingData = [];
    var theTorrent = null;
    var webTorrentFile = null;
    var peersToAdd = [];
    var bytesReceivedFromServer = 0;
    var notificationsBecauseNewWire = 0;
    var SIZE_OF_VIDEO_FILE = 0;
      

    // Only methods should be part of the OakStreaming API, i.e. only methods should be publically accessible.
    // The OakStreaming API comprises only the OakStreaming constructor and all public methods of the object that
    // the constructor creates. In this paragraph, all keys (i.e. properties) of the object that the OakStreaming
    // constructor creates are set.
    self.streamVideo = streamVideo;
    self.loadVideo = loadVideo;
    self.forTesting_connectedToNewWebTorrentPeer = null;  
  
  
    // The methods whose name begin with "get" return statistical data about the streaming session.
    // A (new) streaming session begins when the create_stream or receive_stream method is called. 
    self.get_number_of_bytes_downloaded_from_server = function(){
      return bytesReceivedFromServer;
    };
    

    self.get_number_of_bytes_downloaded_P2P = function(){
      if(theTorrent){
        return theTorrent.downloaded;
      } else {
        return 0;
      }
    };
      
       
    self.get_number_of_bytes_uploaded_P2P = function(){
      if(theTorrent){
        return theTorrent.uploaded;
      } else {
        return 0;
      }
    }; 

         
    self.get_percentage_downloaded_of_torrent = function(){
      if(theTorrent){
        return theTorrent.progress;
      } else {
        return 0;
      }
    };
      
      
    self.get_file_size = function(){
      return SIZE_OF_VIDEO_FILE;
    };
 

    self.signaling1 = function (callback){
      var alreadyCalledCallback = false;
      var oakNumber = simplePeerCreationCounter;
      connectionsWaitingForSignalingData[oakNumber] = new SimplePeer({initiator: true,
              trickle: false,  config: { iceServers: [{ url: 'stun:23.21.150.121' } ] }});
      simplePeerCreationCounter++;
         
      connectionsWaitingForSignalingData[oakNumber].on('signal', function (signalingData){
        if(!alreadyCalledCallback){
          alreadyCalledCallback = true;
          signalingData.oakNumber = oakNumber;
          callback(signalingData);
        }
      });
    };

      
    // This method creates (WebRTC-)signaling data as a response to signaling data of a signaling1 call of
    // another OakStreaming instance. This method returns new (WebRTC-)signaling data which has to be put into
    // signaling2 method of the OakStreaming instance which created the original signaling data.        
    self.signaling2 = function (signalingData, callback){
      var oakNumber = signalingData.oakNumber;
      signalingData.oakNumber = undefined;
         
      var myPeer = new SimplePeer({initiator: false, trickle: false, config: { iceServers: [{
              url: 'stun:23.21.150.121' }] }});
      var index = simplePeerCreationCounter;
      connectionsWaitingForSignalingData[index] = myPeer;
      simplePeerCreationCounter++;
         
      myPeer.on('signal', function (answerSignalingData){
        answerSignalingData.oakNumber = oakNumber;
        callback(answerSignalingData);
      });
      myPeer.signal(signalingData);
         
      var self = this;
      myPeer.on('connect', function(){
        addSimplePeerInstance(connectionsWaitingForSignalingData[index], {}, function(){});
      });
    };

      
    // This method finally establishes a WebRTC connection between both OakStreaming instances.
    // From now on, both OakStreaming instances exchange video fragments.
    self.signaling3 = function (signalingData, callback){
      var oakNumber = signalingData.oakNumber;
      signalingData.oakNumber = undefined;
      var self = this;
      (connectionsWaitingForSignalingData[oakNumber]).on('connect', function (){
        addSimplePeerInstance(connectionsWaitingForSignalingData[oakNumber]);
        connectionsWaitingForSignalingData[oakNumber] = undefined;
        if(callback){
          callback();
        }
      });
      connectionsWaitingForSignalingData[oakNumber].signal(signalingData);
    };
       
     
    function create_stream(){
      var video_file;
      var options = {};
      var callback = function(){};
      var returnTorrent = arguments[3];
      var destroyTorrent = arguments[4];
      
      // In order to enable that all but the callback parameter (i.e. the third parameter) of the create_stream method
      // are optional, the arguments variable has to be read.
      if(arguments[0].name || arguments[0].items || arguments[0].length || arguments[0].read){
        video_file = arguments[0];
        if(typeof arguments[1] !== 'function'){
          options = arguments[1];
          callback = arguments[2];
        } else {
          callback = arguments[1];
        }
      } else {
        options = arguments[0];
        callback = arguments[1];
      }

      
      var streamTicket = options;  
         
      if(!streamTicket.path_to_file_on_web_server){
        streamTicket.path_to_file_on_web_server = "/" + video_file.name;
      }    
        
      // The web_server_URL parameter gets parsed such that it can later easily be used for
      // XML HTTP Requests (XHRs) commands of the Node.js http module.
      if(streamTicket.web_server_URL === false){
        streamTicket.XHR_hostname = false;
      } else if(streamTicket.web_server_URL === undefined){
        streamTicket.XHR_hostname = undefined;
      } else if(streamTicket.web_server_URL){
        var XHR_hostname =  "";
        var XHR_port = -1;
        var portNumberAsString = "";   
             
        if(streamTicket.web_server_URL.indexOf("]") === -1){
          // In this case, the URL does not contain a IPv6 address.
               
          if(streamTicket.web_server_URL.indexOf("http://") === 0 ){
            XHR_hostname = streamTicket.web_server_URL.substring(7);
          } else {
            XHR_hostname = streamTicket.web_server_URL;
          }
                  
          if(XHR_hostname.lastIndexOf(":") === -1){
            XHR_port = 80;
          } else {
            portNumberAsString = XHR_hostname.substring(XHR_hostname.lastIndexOf(":")+1);
            XHR_port = parseInt(portNumberAsString, 10);
            XHR_hostname = XHR_hostname.substring(0, XHR_hostname.lastIndexOf(":"));
          }
        } else {          
          // In this case, the URL contains a IPv6 address.
               
          if(streamTicket.web_server_URL.indexOf("http://") === 0 ){
            XHR_hostname = streamTicket.web_server_URL.substring(7);
          } else {
            XHR_hostname = streamTicket.web_server_URL;
          }
               
          var indexOfClosingBracket = XHR_hostname.lastIndexOf("]");
               
          if(charAt(indexOfClosingBracket+1) === ":"){
            portNumberAsString = XHR_hostname.substring(indexOfClosingBracket+2)
            XHR_port = parseInt(portNumberAsString, 10);
          } else {
            XHR_port = 80;
          }           
        }
        streamTicket.XHR_hostname = XHR_hostname;
        streamTicket.XHR_port = XHR_port;
      }
       
      var webtorrentClient = new WebTorrent({dht: false, tracker: true});
       
      if(video_file){
        var seedingOptions = {
          name: video_file.name + " - (Created by an OakStreaming client)"
        };
            
        // In contrast to the OakStreaming library, the WebTorrent library expects an array of arrays of
        // WebTorrent trackers.
        if(options.webTorrent_trackers){
          var myAnounceList = [];
          for(var k=0; k<options.webTorrent_trackers.length; k++){
            myAnounceList.push([options.webTorrent_trackers[k]]);
          }
          seedingOptions.announceList = myAnounceList;
        } else {
          if(options.webTorrent_trackers === undefined){
            // In this case, we use default tracking servers.
            seedingOptions.announceList = [["wss://tracker.webtorrent.io"],["wss://tracker.openwebtorrent.com"],
                    ["wss://tracker.fastcast.nz"],["wss://tracker.btorrent.xyz"]];
          } else {
            // In this case, no tracking server will be used and consequently the user of the library
            // has to use the signaling1, signaling2 and signaling3 method to connect OakStreaming instances.
            seedingOptions.announceList  = [];
          }
        }

        var self = this; 
        
        // This event fires as soon as the torrent object has been created.
        webtorrentClient.on('torrent', function (torrentSession) {
          theTorrent = torrentSession;
          webTorrentFile = theTorrent.files[0];
          
          // New peers can only be added to the swarm of torrent object, i.e. the set of peers that are used
          // for video data exchange, when the infoHash of the torrent object has already been created.
          if(theTorrent.infoHash){
            for(var j=0; j< peersToAdd.length; j++){
              theTorrent.addPeer(peersToAdd[j][0]);
              if(peersToAdd[j][1]){
                (peersToAdd[j][1])();
              }
            }                  
          } else {
            theTorrent.on('infoHash', function(){                    
              // Peers which used the offered methods to manually/explicitly connect to this OakStreaming instance
              // before a torrent file has been loaded are added now to the swarm of the torrent object. 
              for(var j=0; j< peersToAdd.length; j++){
                theTorrent.addPeer(peersToAdd[j][0]);
                if(peersToAdd[j][1]){
                  (peersToAdd[j][1])();
                }
              }
            });
            theTorrent.on('metadata', function(){
              // Peers which used the offered methods to manually connect to this OakStreaming instance
              // before a torrent file was loaded are added now to the swarm of the torrent object.
              for(var j=0; j< peersToAdd.length; j++){               
                theTorrent.addPeer(peersToAdd[j][0]);
                if(peersToAdd[j][1]){
                  (peersToAdd[j][1])();
                }
              } 
            });
          }
        });
            
        webtorrentClient.seed(video_file, seedingOptions, function onSeed(torrent){   
          /* K42 Maybe I will need this later
          var torrentFileAsBlobURL = torrent.torrentFileBlobURL;
          var xhr = new XMLHttpRequest();
          var XHROrMethodEndHappend = false;
          xhr.open('GET', torrentFileAsBlobURL, true);
          xhr.responseType = 'blob';
          xhr.onload = function(e) {
            if (this.status == 200) {
              streamTicket.torrentAsBlob = this.response;
              if(XHROrMethodEndHappend){
                callback(streamTicket);
              } else {
                XHROrMethodEndHappend = true;
              }
            }
          };
          xhr.send();
          */
          streamTicket.torrentFile = torrent.torrentFile.toString('base64');
          streamTicket.magnetURI = torrent.magnetURI;
          streamTicket.infoHash = torrent.infoHash;
          
          // If a large video files is seeded, WebTorrent creates several torrent.files entries for it.
          SIZE_OF_VIDEO_FILE = 0;
          streamTicket.size_of_video_file = 0;
          for(var i=0, length=torrent.files.length; i<length; i++){
            SIZE_OF_VIDEO_FILE += torrent.files[i].length;
            streamTicket.size_of_video_file += torrent.files[i].length;
          }
           
          // var bufferTorrent = parseTorrent(streamTicket.parsedTorrent); K42
                 
          // If this OakStreaming instance is already connected to another peer, this function calls the callback
          // function, which has been passed to it, immediately. Otherwise, the callback function gets called as soon as
          // this OakStreaming instance connects to another peer.
          self.forTesting_connectedToNewWebTorrentPeer = function(callback){
            if(notificationsBecauseNewWire <= 0){
              notificationsBecauseNewWire--;
              var callbackCalled = false;
                 
              torrent.on('wire', function(wire){
                if(!callbackCalled){
                  callback();
                  callbackCalled = true;
                }
              });
            } else {
              notificationsBecauseNewWire--;            
              callback();
            }
          };
           
          // This is necessary such that the forTesting_connectedToNewWebTorrentPeer function knows how many peers
          // are already connected to this OakStreaming instance.
          torrent.on('wire', function (wire){
            notificationsBecauseNewWire++;  
          });
          // For some Jasmine tests, it is appropriate that the torrent object gets destroyed immediately after
          // the streamTicket has been created. The destruction of the torrent object stops the seeding.
          if(returnTorrent === "It's a test"){
            if(destroyTorrent){
              notificationsBecauseNewWire = 0;
              torrent.destroy();
              webtorrentClient = undefined;
            }
            callback(streamTicket, torrent);
          } else {
            callback(streamTicket);
            return streamTicket;
          }    
        });
      } else {
        callback(streamTicket);
        /* K42
        if(XHROrMethodEndHappend){
          callback(streamTicket);
        } else {
          XHROrMethodEndHappend = true;
        }
        */
      }  
      /* Nicht löschen!!!
      function updateChart(){
        if(theTorrent && webTorrentFile){
          document.getElementById("WebTorrent-received").innerHTML = "webTorrentFile.length: " +
                  webTorrentFile.length + "\n torrent.uploaded: " + theTorrent.uploaded;
        }
        setTimeout(updateChart, 1000);
      }      
      updateChart();
      */
    }

    // A function to start the video playback with a random time offset.
    function waitStartPlayingOffset(streamTicket, callback, stop_uploading_when_video_downloaded){
      if(Date.now() - timeReceiptStreamInformationObject >= startPlayingOffset){
        timeLoadVideoMethodWasCalled = Date.now();
        self.loadVideo(streamTicket, callback, stop_uploading_when_video_downloaded);  
      } else {
        setTimeout(function(){waitStartPlayingOffset(streamTicket, callback,
                stop_uploading_when_video_downloaded);},10);
      }
    }
   
    // In a Technical Evaluation, this method gets called instead of the receive_stream method.
    function loadVideo_technical_evaluation(streamTicket, callback,
              stop_uploading_when_video_downloaded){
      timeReceiptStreamInformationObject = Date.now();      
      waitStartPlayingOffset(streamTicket, callback, stop_uploading_when_video_downloaded);      
    }

    
    function receive_stream(){               
      /* This block of code is solely for conducting Technical Evaluations. 
      var timeLoadVideoMethodWasCalled = -42;
      var timePlaybackWasStalled = 0;
      var startUpTime = 0;
      var timeTillTorrentOnDone = -42;
      var startPlayingOffset = Math.floor(Math.random() * 10) + 1;  
      */
      
      
      // In order to enable that all but the stream_ticket_object parameter (i.e. the first parameter) of the
      // receive_stream method are optional, the arguments variable has to be read.
      var streamTicket = arguments[0];
      var callback = function(){};
      var stop_uploading_when_video_downloaded = false;
       
      if(typeof arguments[1] === 'function'){
        callback = arguments[1];
        stop_uploading_when_video_downloaded = arguments[2];
      } else {
        callback = undefined;
        stop_uploading_when_video_downloaded = arguments[1];
      }

      // I was stupid and forgot to implement that the used video tag can be handed over to the receive_stream method.
      var myVideo = document.getElementsByTagName('video')[0];
      myVideo.addEventListener('error', function (err){
        console.error(myVideo.error);
      });
      
      /* This block of code is solely for conducting Technical Evaluations.
      myVideo.onplay = function(){
        onsole.log("event onplay is thrown");
        play = true;
        if(canplay){
          startUpTime = Date.now() - timeLoadVideoMethodWasCalled;
          timePlaybackWasStalled += startUpTime;
          videoStartUpOver = true;
        }
      };

      var userPausedVideo = false;

      myVideo.pause = function(){
        userPausedVideo = true;
      };

      myVideo.onwaiting = function() {
        ////console.log("Video is holded at " + (Date.now() - timeLoadVideoMethodWasCalled) + 
                " miliseconds after loadVideo has been called.");
        lastTimeWhenVideoHolded = Date.now();
      };

      myVideo.onstalled = function() {
        ////console.log("Video is stalled at " + (Date.now() - timeLoadVideoMethodWasCalled) + 
                " miliseconds after loadVideo has been called.");
        lastTimeWhenVideoHolded = Date.now();
      };
        
      myVideo.onplaying = function(){
        if(playbackStopped){// && !userPausedVideo){
          ////console.log("Video is playing again after " + (Date.now() - lastTimeWhenVideoHolded) + " miliseconds.");
          timePlaybackWasStalled += Date.now() - lastTimeWhenVideoHolded;
          playbackStopped = false;
        }
        //userPausedVideo = false;
      };
      */
       
       
      // All these declared variables until 'var self = this' are intended to be constants.
      var deliveryByServer = (streamTicket.XHR_hostname !== false && (
              streamTicket.path_to_file_on_XHR_server || streamTicket.hash_value)) ? true : false;
      var deliveryByWebtorrent = streamTicket.torrentFile ? true : false;
       
      var XHR_hostname = streamTicket.XHR_hostname;
      var XHR_port = streamTicket.XHR_port;
         
      var pathToFileOnXHRServer = streamTicket.path_to_file_on_web_server;
      var hashValue = streamTicket.hash_value;
      var MAGNET_URI = streamTicket.magnetURI;
      if(deliveryByWebtorrent){
        var THE_RECEIVED_TORRENT_FILE = Buffer.from(streamTicket.torrentFile, 'base64');
      }
      SIZE_OF_VIDEO_FILE = streamTicket.size_of_video_file; // in byte

      var DOWNLOAD_FROM_P2P_TIME_RANGE = streamTicket.sequential_requests_time_range || 20; // in seconds
      var CREATE_READSTREAM_REQUEST_SIZE = streamTicket.size_of_sequential_requests || 6000000; // in byte
      
      var DOWNLOAD_FROM_SERVER_TIME_RANGE = streamTicket.download_from_server_time_range || 
      3; // in seconds
      var UPLOAD_LIMIT = streamTicket.peer_upload_limit_multiplier || 2;
      var ADDITION_TO_UPLOAD_LIMIT = streamTicket.peer_upload_limit_addend || 3000000; // in byte

      var XHR_REQUEST_SIZE = streamTicket.xhrRequestSize || 2000000; // in byte
      var THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM = streamTicket.thresholdForReturningAnswerStream ||
              1000000; // in byte
      var WATERMARK_HEIGHT_OF_ANSWERSTREAM = streamTicket.watermarkHeightOfAnswerStream ||
              1999999; // in byte
       
      var CHECK_IF_BUFFER_FULL_ENOUGH_INTERVAL = streamTicket.checkIfBufferFullEnoughInterval || 
              500; // in milliseconds
      var CHECK_IF_ANSWERSTREAM_READY_INTERVAL = streamTicket.checkIfAnswerstreamReadyInterval || 
              200; // in milliseconds
      var UPDATE_CHART_INTERVAL = streamTicket.updateChartInterval || 
              1000; // in milliseconds
      var CHOKE_IF_NECESSARY_INTERVAL = streamTicket.chokeIfNecessaryInterval || 
              300; // in milliseconds 
      var CHECK_IF_NEW_CREATE_READSTREAM_NECESSARY_INTERVAL = 
              streamTicket.checkIfNewCreateReadstreamInterval || 2000; // in milliseconds 
       
       
      // These variables are declared in this high scope in order to enable every function that is declared in 
      // receive_stream to access and manipulate these variables.
      var self = this;
      var endStreaming = false;
      var webtorrentClient = null;
      var wires = []; // A wire is a P2P connection to another peer out of the WebTorrent network.
      var globalVideostreamRequestNumber = 0;
      bytesReceivedFromServer = 0; // This variable gets only initialized not declared.
      var videostreamRequestHandlers = [];
      var inCritical = true; // inCritical === true means that there is less than DOWNLOAD_FROM_SERVER_TIME_RANGE
              // seconds of video playback buffered and consequently XHRs will be conducted.
      var videoCompletelyLoadedByVideoPlayer = false;
      var bytesTakenFromWebtorrent = 0;
      var bytesTakenFromServer = 0;
      var consoleCounter = 0; // This variable is only for debugging purposes.
      // var first2000BytesOfVideo = null; Feature was too confusing to implement.
      // var numberBytesInFirst2000BytesOfVideo = 0; Feature was too confusing to implement.
      var videoCompletelyLoadedByWebtorrent = false;
      var timeOfLastWebtorrentRequest = 0;
       
    
       
      // Node.js readable streams are used to buffer video data before it gets put into the source buffer
      function MyReadableStream(options){
        readableStream.Readable.call(this, options);
      }
      util.inherits(MyReadableStream, readableStream.Readable);
      MyReadableStream.prototype._read = function(size){};
       
      
      if(deliveryByWebtorrent){
        webtorrentClient = new WebTorrent();
                  
        var webTorrentOptions = {}; // {announce: []};
          
        /* Weiß nicht mehr warum das hier steht
        if(streamTicket.pathToFileToSeed){
          webTorrentOptions.path = streamTicket.pathToFileToSeed;
        }
        */
          
          
        // A magnetURI contains URLs to tracking servers and the info hash of the torrent.
        //The client receives the complete torrent file from a tracking server.
        webtorrentClient.add(THE_RECEIVED_TORRENT_FILE, webTorrentOptions, function (torrentSession){
          // From this point on the WebTorrent instance will download video data from the WebTorrent network in the background in a rarest-peace-first manner as fast as possible.
          // Sequential stream request like createreadstrime are prioritized over this rarest-peace-first background downloading.
                  
          theTorrent = torrentSession;
             
          /*
          if(infoHashReady){
            // Peers which used the offered methods to manually connect to this OakStreaming instance
            // before a torrent file was loaded are added now to the set of peers that are used for video data exchange.
            for(var j=0; j< peersToAdd.length; j++){  // Vorher hatte ich das onInfohash gemacht
              //console.log("I manually added a peer to the swarm");                     
              theTorrent.addPeer(peersToAdd[j][0]);
              if(peersToAdd[j][1]){
                (peersToAdd[j][1])();
              }
            }                         
          } else { 
          */
          if(theTorrent.infoHash){
            for(var j=0; j< peersToAdd.length; j++){             
              theTorrent.addPeer(peersToAdd[j][0]);
              if(peersToAdd[j][1]){
                (peersToAdd[j][1])();
              }
            }                  
          } else {              
            theTorrent.on('infoHash', function(){
                 
              // Peers which used the offered methods to manually connect to this OakStreaming instance
              // before a torrent file was loaded are added now to the set of peers that are used for video data exchange.
              for(var j=0; j< peersToAdd.length; j++){                   
                theTorrent.addPeer(peersToAdd[j][0]);
                if(peersToAdd[j][1]){
                  (peersToAdd[j][1])();
                }
              } 
            });
            theTorrent.on('metadata', function(){   
              // Peers which used the offered methods to manually connect to this OakStreaming instance
              // before a torrent file was loaded are added now to the set of peers that are used for video data exchange.
              for(var j=0; j< peersToAdd.length; j++){                  
                theTorrent.addPeer(peersToAdd[j][0]);
                if(peersToAdd[j][1]){
                  (peersToAdd[j][1])();
                }
              } 
            });
          }
           
          webTorrentFile = theTorrent.files[0];
                 
          theTorrent.on('done', function () {
            videoCompletelyLoadedByWebtorrent = true;
          });
           


          // This function has the same purpose 
          // This function calls the callback function when this OakStreaming instance already connected to another peer
          // or as soon as it connects to another peer.
          self.forTesting_connectedToNewWebTorrentPeer = function(callback){
            if(notificationsBecauseNewWire <= 0){
              notificationsBecauseNewWire--;
              var callbackCalled = false;
                 
              theTorrent.on('wire', function(wire){
                if(!callbackCalled){
                  callback();
                  callbackCalled = true;
                }
              });
            } else {
              notificationsBecauseNewWire--;            
              callback();
            }
          };
           
          theTorrent.on('wire', function (wire){
            wires.push(wire);
            if(!window.firstWire){
              window.firstWire = wire;
            }
            notificationsBecauseNewWire++;
              
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
          // The Videostream object probably has been created during the time webtorrentClient.add was called until its called the callback function.
          // In this time the VideoStream object created by the videostream library probably has conducted some createReadstream requests whose handlers are saved in the videostreamRequestHandlers array.
          // For these requests we now intialize WebTorrent streams.
          for(var i=0, length=videostreamRequestHandlers.length; i<length; i++){
            var thisRequest = videostreamRequestHandlers[i];
              
            // To answer a createReadStream request a Multistream (https://www.npmjs.com/package/multistream) is returned which requests a Node readableStream as soon as its buffer has went dry.
            // The current callback which should be called with the created readableStream is saved in currentlyExpectedCallback
            if(thisRequest.currentlyExpectedCallback !== null){
                  
              if(myVideo.duration){
                timeOfLastWebtorrentRequest = myVideo.currentTime;
              } else {
                timeOfLastWebtorrentRequest = 0;
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
          return (new MultiStream(function (cb){cb(null, null);}));
        }
        inCritical = true;
          
        var thisRequest = new VideostreamRequestHandler(++globalVideostreamRequestNumber, opts, this);
          
          
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
          if(thisRequest.start-thisRequest.oldStartWebTorrent < chunk.length){
            bytesTakenFromWebtorrent += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
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

        if(webTorrentFile){ // Um Einhaltung des Upload limits kümmert sich doch chokeIfNecessary   && theTorrent.uploaded <= UPLOAD_LIMIT * theTorrent.downloaded + ADDITION_TO_UPLOAD_LIMIT)
             
          if(myVideo.duration){
            timeOfLastWebtorrentRequest = myVideo.currentTime;
          } else {
            timeOfLastWebtorrentRequest = 0;
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
          if(thisRequest.end >= 0 && thisRequest.start >= thisRequest.end){          
            if (thisRequest.req) {
              thisRequest.req.destroy();
              thisRequest.req = null;
            }
            return cb(null, null);
          }
            
          thisRequest.callbackNumber++;

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
              ////console.log("A CB has been answered with a part of firstBytesOfVideo for readstream number " + thisRequest.createReadStreamNumber + " with callback number " + thisRequest.callbackNumber);
              theCallbackFunction(null, res);
              return;
            }
          */
          
          if(!ceckIfAnswerStreamReady(thisRequest)){
            if(thisRequest.webTorrentStream){
              // thisRequest.webTorrentStream.resume();  11.07.16 more a try
            } else if(webTorrentFile){
              var endCreateReadStream;
              if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE - 1 >= webTorrentFile.length-1){
                endCreateReadStream = webTorrentFile.length-1;
              } else {
                endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE - 1;
              }
              thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : endCreateReadStream});
              thisRequest.lastEndCreateReadStream = endCreateReadStream;
              thisRequest.oldStartWebTorrent = thisRequest.start;
              thisRequest.webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
            }

            if(deliveryByServer && inCritical && !thisRequest.XHRConducted){
              if(!webTorrentFile || !videoCompletelyLoadedByWebtorrent){
                conductXHR(thisRequest);                      
              }
            }
          }
        }
          
        // A new Multistream gets created which will be the answer the the request from the VideoStream request
        var multi = new MultiStream(factoryFunctionForStreamCreation);
          
        var deconstructorAlreadyCalled = false;
        var destroy = multi.destroy;
        multi.destroy = function(){
          if(deconstructorAlreadyCalled){
            return;
          }
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
          
        /* Working version where only a minimal time limit is set when a new createReadStream to WebTorrent network is conducted
        if(myVideo.duration){
          //////console.log("In if(myvideo.duration)");                 
          if(theTorrent && (myVideo.currentTime - timeOfLastWebtorrentRequest >= MINIMAL_TIMESPAN_BEFORE_NEW_WEBTORRENT_REQUEST)){
            for (var j = 0, length = videostreamRequestHandlers.length; j < length; j++) {
              var thisRequest = videostreamRequestHandlers[j];
              ////console.log("createReadStream enlargement for request " + thisRequest.createReadStreamNumber);
              if(thisRequest.currentlyExpectedCallback !== null && thisRequest.start > thisRequest.lastEndCreateReadStream && thisRequest.start < SIZE_OF_VIDEO_FILE){
                timeOfLastWebtorrentRequest = myVideo.currentTime;
                var endCreateReadStream;
                if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE >= webTorrentFile.length-1){
                  endCreateReadStream = webTorrentFile.length-1;
                } else {
                  endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
                }
                ////console.log("I set a new createReadstream for videostream request number " + thisRequest.createReadStreamNumber);
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
                if(theTorrent && thisRequest.currentlyExpectedCallback !== null && thisRequest.start > thisRequest.lastEndCreateReadStream && thisRequest.start < SIZE_OF_VIDEO_FILE){
                  var endCreateReadStream;
                  if(thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE >= webTorrentFile.length-1){
                    endCreateReadStream = webTorrentFile.length-1;
                  } else {
                    endCreateReadStream = thisRequest.start + CREATE_READSTREAM_REQUEST_SIZE;
                  }
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
          
        setTimeout(frequentlyCheckIfNewCreateReadStreamNecessary, CHECK_IF_NEW_CREATE_READSTREAM_NECESSARY_INTERVAL);
      }   
       
      // The final version of the library should not include this function. This function updates the statistics that are shown above the video. This version shows values which are not intended for end user use.
      /*   NICHT LÖSCHEN!!!!!!!!!!!!!!!!!
      function updateChart(){
        if(endStreaming){
          return;
        }
        if(theTorrent && webTorrentFile){
          document.getElementById("WebTorrent-received").innerHTML = "webTorrentFile.length: " + webTorrentFile.length + "\n torrent.downloaded: " + theTorrent.downloaded + "\n torrent.received: " + theTorrent.downloaded + "\n torrent.uploaded: " + theTorrent.uploaded + "\n torrent.progress: " + theTorrent.progress + "\n Bytes received from server: " + bytesReceivedFromServer + "\n Bytes taken from server delivery: " + bytesTakenFromServer + "\n Bytes taken from WebTorrent delivery: " + bytesTakenFromWebtorrent;
        }
        setTimeout(updateChart, UPDATE_CHART_INTERVAL);
      }         
      */
       
      // This function checks for a given videostreamRequestHandler if we have called enough video data to call the callback function.
      // If it is the case, the callback function gets called togehter with the buffered data.
      function ceckIfAnswerStreamReady(thisRequest){
        if ((thisRequest.createReadStreamNumber < 4 && thisRequest.currentlyExpectedCallback && thisRequest.bytesInAnswerStream >= 2000) || (thisRequest.currentlyExpectedCallback && ((thisRequest.bytesInAnswerStream >= THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM) || (thisRequest.start >= SIZE_OF_VIDEO_FILE)))){
          var theCallbackFunction = thisRequest.currentlyExpectedCallback;
          thisRequest.currentlyExpectedCallback = null;
          thisRequest.answerStream.push(null);
          if (thisRequest.webTorrentStream){
            //thisRequest.webTorrentStream.pause();
          }
          thisRequest.bytesInAnswerStream = 0;
          var res = thisRequest.answerStream;
          thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
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
            webtorrentClient = undefined;
            endStreaming = true;
            return;
          }
          */
          for (var i = 0, length = wires.length; i < length; i++){
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
        this.bytesTakenFromWebtorrent = 0;
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
        if(videoCompletelyLoadedByVideoPlayer){
          return;
        }
        if(myVideo.duration){
          var timeRanges = myVideo.buffered;
          if(timeRanges.length >= 1){
            if(timeRanges.start(0) == 0 && timeRanges.end(0) == myVideo.duration){
              videoCompletelyLoadedByVideoPlayer = true;   // brauche da verschiende boolean werte
              if(callback){
                if(stop_uploading_when_video_downloaded){
                  callback();
                } else {
                  callback(theTorrent);
                }
              }
              if(stop_uploading_when_video_downloaded){
                if(theTorrent){
                  theTorrent.destroy();
                  webtorrentClient = null;
                }
                endStreaming = true;
                return;                 
              } 
            }
          }
             
          // From here on it is checked wether there are less seconds buffered than DOWNLOAD_FROM_SERVER_TIME_RANGE
          inCritical = true;              
          for (var i = 0, length = timeRanges.length; i < length; i++) {
            if (myVideo.currentTime >= timeRanges.start(i) && myVideo.currentTime <= timeRanges.end(i)+1) {
              if (timeRanges.end(i) - myVideo.currentTime >= DOWNLOAD_FROM_SERVER_TIME_RANGE) {
                inCritical = false;
              }
            }
          }
          if (deliveryByServer && inCritical) {
            for (var j = 0, length = videostreamRequestHandlers.length; j < length; j++) {
              if ((!webTorrentFile || !videoCompletelyLoadedByWebtorrent) && videostreamRequestHandlers[j].currentlyExpectedCallback !== null && videostreamRequestHandlers[j].XHRConducted === false) {
                conductXHR(videostreamRequestHandlers[j]);
              }
            }
          }
        }
          

        // Added at 08.08
        if(theTorrent && theTorrent.progress === 1){
          videoCompletelyLoadedByVideoPlayer = true;   // brauche da verschiende boolean werte
          if(callback){
            if(stop_uploading_when_video_downloaded){
              callback();
            } else {
              callback(theTorrent);
            }
          }
          if(stop_uploading_when_video_downloaded){
            endStreaming = true;
            return;                 
          }        
        }
          
          
        if(!justOnce){
          setTimeout(checkIfBufferFullEnough, CHECK_IF_BUFFER_FULL_ENOUGH_INTERVAL);
        }
      }

       
      // This function conductes a XHR reuqest for the videostreamRequestHandler which is handed over to the function as its first and only paramter.
      function conductXHR(thisRequest) {
        if(thisRequest.currentlyExpectedCallback === null){
          return;
        }
        thisRequest.XHRConducted = true;
        var reqStart = thisRequest.start;
          
        if(thisRequest.createReadStreamNumber < 4){    // War vorher === 1     statt < 4
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

        var XHRDataHandler = function (chunk){
          bytesReceivedFromServer += chunk.length;
          // thisRequest.oldStartServer += chunk.length; War noch vom meinem 2000 byte buffer versuch
             
             
          /* Erstmal rausgenommen weil ich darauf net klar kam. Etwas zu verwirrend
          if(numberBytesInfirst2000BytesOfVideo < 2000 && thisRequest.start == numberBytesInfirst2000BytesOfVideo){
            ////console.log("Size of firstBytesOfVideo in bytes: " + chunk.length);
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
            var StreamHasMemoryLeft = thisRequest.answerStream.push(myBuffer);         
            if(!StreamHasMemoryLeft){
              if(thisRequest.currentlyExpectedCallback !== null){
                var theCallbackFunction = thisRequest.currentlyExpectedCallback;
                thisRequest.currentlyExpectedCallback = null;
                thisRequest.answerStream.push(null);
                thisRequest.bytesInAnswerStream = 0;
                var res = thisRequest.answerStream;
                thisRequest.answerStream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
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
            ////////console.log("XHREnd: called CB with data out of answerStream from videostreamRequest number " + thisRequest.createReadStreamNumber);
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
          thisRequest.XHRConducted = false;
          ceckIfAnswerStreamReady(thisRequest);
          checkIfBufferFullEnough(true);
          //ceckIfAnswerStreamReady(thisRequest);  // Unsicher ob es drinn bleiben soll
          //}                 
        };
          
        thisRequest.oldStartServer = reqStart;

                
        var XHROptionObject = {
          path: thisRequest.self.pathToFileOnXHRServer,
          headers: {
            range: 'bytes=' + reqStart + '-' + (reqEnd-1),
            connection : 'keep-alive'
              
            //protocol: 'http:'
            //???? method: 'CONNECT',
          }
        };
        if(XHR_hostname){
          XHROptionObject.hostname = XHR_hostname;
          XHROptionObject.port = XHR_port;
        }
          
        thisRequest.req = http.get(XHROptionObject, function (res){
          var contentRange = res.headers['content-range'];
          if (contentRange) {
            // Hat zu bugs geführt. Hat geringe priorität einzubauen das file_size auch vom XHR server erfragt wird.
            //SIZE_OF_VIDEO_FILE = parseInt(contentRange.split('/')[1], 10);
            //if(thisRequest.end === 0){
            thisRequest.XHR_filesize = parseInt(contentRange.split('/')[1], 10);
            //}
          }
           
          // res.setHeader('Access-Control-Allow-Headers', thisRequest.req.header.origin);
           
          res.on('end', XHREnd);
          res.on('data', XHRDataHandler);
          res.on('error', function(err){
            // To-Do yield real error instead of simple console output
            console.log("The http.get response object has yield the following error"); console.error(err);
          });
        });
        thisRequest.req.on('error', function(err){
          // To-Do yield real error instead of simple console output
          console.log("The XHR has yield the following error message: " + err.message);
        });
      }
      frequentlyCheckIfNewCreateReadStreamNecessary();
      chokeIfNecessary();
      // updateChart();   NIcht löschen. Aber gehört nicht in production!!
      // frequentlyCeckIfAnswerStreamReady(); Am 17.07 entschlossen das rauszunehmen. Ich hatte mir das ja schon mehrmals überlegt
      checkIfBufferFullEnough();

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
        if(theTorrent.infoHash){  // Vorher war das wenn info hash ready
          theTorrent.addPeer(simplePeerInstance);
          if(callback){
            callback();
          }
        } else {
          var pair = [];
          pair.push(simplePeerInstance);
          pair.push(callback);
          peersToAdd.push(pair);               
          // theTorrent.on('infoHash', function() {infoHashReady = true; theTorrent.addPeer(simplePeerInstance); //console.log("addSimplePeerInstance successfully added a peer connection"); if(callback){callback();}});
        }
      } else {
        var pair = [];
        pair.push(simplePeerInstance);
        pair.push(callback);
        peersToAdd.push(pair);
      }
    }
    self.createSignalingData = self.signaling1;
    self.createSignalingDataResponse = self.signaling2;
    self.processSignalingResponse = self.signaling3;  
    self.streamVideo = self.create_stream;
    self.loadVideo = self.receive_stream;
  })();
}