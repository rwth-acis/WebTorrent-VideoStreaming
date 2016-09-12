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
    var theTorrentSession = null;
    var webtorrentFile = null;
    var peersToAdd = [];
    var bytesReceivedFromServer = 0;
    var notificationsBecauseNewWire = 0;
    var SIZE_OF_VIDEO_FILE = 0;
      

    // Only methods should be part of the OakStreaming API, i.e. only methods should be publically accessible.
    // The OakStreaming API comprises only the OakStreaming constructor and all public methods of the object that
    // the constructor creates. In this paragraph, all keys (i.e. properties) of the object that the OakStreaming
    // constructor creates are set.
    self.create_stream = create_stream;
    self.receive_stream = receive_stream;
    self.forTesting_connectedToNewWebTorrentPeer = null;  
  
  
    // The methods whose name begin with "get" return statistical data about the streaming session.
    // A (new) streaming session begins when the create_stream or receive_stream method is called. 
    self.get_number_of_bytes_downloaded_from_server = function(){
      return bytesReceivedFromServer;
    };
    

    self.get_number_of_bytes_downloaded_P2P = function(){
      if(theTorrentSession){
        return theTorrentSession.downloaded;
      } else {
        return 0;
      }
    };
      
       
    self.get_number_of_bytes_uploaded_P2P = function(){
      if(theTorrentSession){
        return theTorrentSession.uploaded;
      } else {
        return 0;
      }
    }; 

         
    self.get_percentage_downloaded_of_torrent = function(){
      if(theTorrentSession){
        return theTorrentSession.progress;
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
      console.log("Version AM");
      
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
        
        // This event fires as soon as the torrentSession object has been created.
        webtorrentClient.on('torrent', function (torrentSession) {
          theTorrentSession = torrentSession;
          webtorrentFile = theTorrentSession.files[0];
          
          // New peers can only be added to the swarm of torrentSession object, i.e. the set of peers that are used
          // for video data exchange, when the infoHash of the torrentSession object has already been created.
          if(theTorrentSession.infoHash){
            for(var j=0; j< peersToAdd.length; j++){
              theTorrentSession.addPeer(peersToAdd[j][0]);
              if(peersToAdd[j][1]){
                (peersToAdd[j][1])();
              }
            }                  
          } else {
            theTorrentSession.on('infoHash', function(){                    
              // Peers which used the offered methods to manually/explicitly connect to this OakStreaming instance
              // before a torrent file has been loaded are added now to the swarm of the torrentSession object. 
              for(var j=0; j< peersToAdd.length; j++){
                theTorrentSession.addPeer(peersToAdd[j][0]);
                if(peersToAdd[j][1]){
                  (peersToAdd[j][1])();
                }
              }
            });
            theTorrentSession.on('metadata', function(){
              // Peers which used the offered methods to manually connect to this OakStreaming instance
              // before a torrent file was loaded are added now to the swarm of the torrentSession object.
              for(var j=0; j< peersToAdd.length; j++){               
                theTorrentSession.addPeer(peersToAdd[j][0]);
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
          // For some Jasmine tests, it is appropriate that the torrentSession object gets destroyed immediately after
          // the streamTicket has been created. The destruction of the torrentSession object stops the seeding.
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
        if(theTorrentSession && webtorrentFile){
          document.getElementById("WebTorrent-received").innerHTML = "webtorrentFile.length: " +
                  webtorrentFile.length + "\n torrent.uploaded: " + theTorrentSession.uploaded;
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
      var htmlVideoTag = document.getElementsByTagName('video')[0];
      htmlVideoTag.addEventListener('error', function (err){
        console.error(htmlVideoTag.error);
      });
      
      /* This block of code is solely for conducting Technical Evaluations.
      htmlVideoTag.onplay = function(){
        onsole.log("event onplay is thrown");
        play = true;
        if(canplay){
          startUpTime = Date.now() - timeLoadVideoMethodWasCalled;
          timePlaybackWasStalled += startUpTime;
          videoStartUpOver = true;
        }
      };

      var userPausedVideo = false;

      htmlVideoTag.pause = function(){
        userPausedVideo = true;
      };

      htmlVideoTag.onwaiting = function() {
        ////console.log("Video is holded at " + (Date.now() - timeLoadVideoMethodWasCalled) + 
                " miliseconds after loadVideo has been called.");
        lastTimeWhenVideoHolded = Date.now();
      };

      htmlVideoTag.onstalled = function() {
        ////console.log("Video is stalled at " + (Date.now() - timeLoadVideoMethodWasCalled) + 
                " miliseconds after loadVideo has been called.");
        lastTimeWhenVideoHolded = Date.now();
      };
        
      htmlVideoTag.onplaying = function(){
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
              streamTicket.path_to_file_on_web_server || streamTicket.hash_value)) ? true : false;
      var deliveryByWebtorrent = streamTicket.torrentFile ? true : false;
      console.log("deliveryByServer:" + deliveryByServer);
      
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
      var THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM = streamTicket.thresholdForReturningnextStreamForMultistream ||
              1000000; // in byte
      var WATERMARK_HEIGHT_OF_ANSWERSTREAM = streamTicket.watermarkHeightOfnextStreamForMultistream ||
              1999999; // in byte
       
      var CHECK_IF_BUFFER_FULL_ENOUGH_INTERVAL = streamTicket.checkIfBufferFullEnoughInterval || 
              500; // in milliseconds
      var CHECK_IF_nextStreamForMultistream_READY_INTERVAL = streamTicket.checkIfnextStreamForMultistreamReadyInterval || 
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
      
       
      // Node.js readable streams are used to buffer received video data before it gets put into the source buffer object.
      function MyReadableStream(options){
        readableStream.Readable.call(this, options);
      }
      util.inherits(MyReadableStream, readableStream.Readable);
      MyReadableStream.prototype._read = function(size){};
       
      
      if(deliveryByWebtorrent){
        webtorrentClient = new WebTorrent();
        var webtorrentOptions = {};
          
        /*
        if(streamTicket.pathToFileToSeed){
          webtorrentOptions.path = streamTicket.pathToFileToSeed;
        }
        */


        webtorrentClient.add(THE_RECEIVED_TORRENT_FILE, webtorrentOptions, function (torrentSession){
          // From this point of time onwards, the WebTorrent instance will start downloading video data from the
          // WebTorrent network. This downloading happens in the background and according to the rarest-peace-first
          // strategy. The OakStreaming client downloads the video data as fast as possible. 
          // Sequential stream requests, for example created by calls to the WebTorrent function createReadStream, are
          // prioritized over the before mentioned rarest-piece-first background downloading.
          
          // A torrentSession object has many accessible properties and methods. One property of a
          // torrentSession object is uploaded which returns the total number of bytes uploaded to
          // other peers. One method of the torrentSession object is addPeer which enables to add an existing WebRTC
          // connection directly to its (peer) swarm.
          // Due to the fact that only one video can be received by an OakStreaming instance at the same time,
          // at each moment the OakStreaming instance has at most one torrentSession running. The current torrentSession
          // is saved in the theTorrentSession variable.
          theTorrentSession = torrentSession; 
      
          /*
          if(infoHashReady){
            // Peers which used the offered methods to manually connect to this OakStreaming instance
            // before a torrent file was loaded are added now to the set of peers that are used for video data exchange.
            for(var j=0; j< peersToAdd.length; j++){  // Vorher hatte ich das onInfohash gemacht
              //console.log("I manually added a peer to the swarm");                     
              theTorrentSession.addPeer(peersToAdd[j][0]);
              if(peersToAdd[j][1]){
                (peersToAdd[j][1])();
              }
            }                         
          } else { 
          */
          
          // Add peers which have been directly connected to this OakStreaming instance by the library user to 
          // the (peer) swarm of this OakStreaming instance. Peers can be added to the swarm instance
          // as soon as the infoHash property is accessible.
          if(theTorrentSession.infoHash){
            for(var j=0; j< peersToAdd.length; j++){             
              theTorrentSession.addPeer(peersToAdd[j][0]);
              if(peersToAdd[j][1]){
                (peersToAdd[j][1])();
              }
            }                  
          } else {              
            theTorrentSession.on('infoHash', function(){
              for(var j=0; j< peersToAdd.length; j++){                   
                theTorrentSession.addPeer(peersToAdd[j][0]);
                if(peersToAdd[j][1]){
                  (peersToAdd[j][1])();
                }
              } 
            });
            theTorrentSession.on('metadata', function(){   
              // This case is necessary because WebTorrents infoHash eventListener is not reliable.
              // The metadata event listener gets called when all meta data about the torrent has been determined
              // (including the info hash of the torrent).
              for(var j=0; j< peersToAdd.length; j++){                  
                theTorrentSession.addPeer(peersToAdd[j][0]);
                if(peersToAdd[j][1]){
                  (peersToAdd[j][1])();
                }
              } 
            });
          }          
          webtorrentFile = theTorrentSession.files[0];

          // Emitted as soon as the complete video file has been downloaded via the WebTorrent network.
          theTorrentSession.on('done', function () {
            videoCompletelyLoadedByWebtorrent = true;
          });
          
          // If this OakStreaming instance is already connected to another peer, this function calls the callback
          // function, which has been passed to it, immediately. Otherwise, the callback function gets called as soon as
          // this OakStreaming instance connects to another peer.
          self.forTesting_connectedToNewWebTorrentPeer = function(callback){
            if(notificationsBecauseNewWire <= 0){
              notificationsBecauseNewWire--;
              var callbackCalled = false;
                 
              theTorrentSession.on('wire', function(wire){
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

          // This event listener gets called when a peer has been added to the swarm of this OakStreaming instance.
          theTorrentSession.on('wire', function (wire){
            wires.push(wire);
            if(!window.firstWire){
              window.firstWire = wire;
            }
            notificationsBecauseNewWire++;
              
            // This command activates the ut_pex extension for the communication with the new peer.
            // The ut_pex extension enables to automatically establish WebRTC connections to the neighbors of
            // ones neighbors.
            wire.use(ut_pex());
            /* wire.ut_pex.start(); */
              
            /*
            wire.ut_pex.on('peer', function (peer){
              theTorrentSession.addPeer(peer);
              // got a peer
              // probably add it to peer connections queue
            });
            */
          });

          // For video playback, the client-side library videostream is used.
          // This library requests video data from the OakStreaming client.
          // Requests from the videostream library which happened before the webtorrentClient.add method has called
          // this function are saved in the videostreamRequestHandlers array and are now worked off.
          for(var i=0, length=videostreamRequestHandlers.length; i<length; i++){
            var thisRequest = videostreamRequestHandlers[i];
              
            // To answer a request from the videostream library, a Multistream 
            // (https://www.npmjs.com/package/multistream) is returned. This Multistream requests a so-called
            // readableStream from the OakStreaming client as soon as its buffer has went dry.
            // The callback of the last request from the Multistream is saved in the callbackOfMultistream variable.
            // This callback should be called with the created readableStream which contains the next video data.
            if(thisRequest.callbackOfMultistream !== null){

              if(htmlVideoTag.duration){
                timeOfLastWebtorrentRequest = htmlVideoTag.currentTime;
              } else {
                timeOfLastWebtorrentRequest = 0;
              }
           
              var endCreateReadStream;
              if(thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE > webtorrentFile.length-1){
                endCreateReadStream = webtorrentFile.length-1;
              } else {
                endCreateReadStream = thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE;
              }
     
              // The createReadStream method of the WebTorrent API conducts a sequential byte range request to the
              // WebTorrent network.
              thisRequest.webtorrentStream = webtorrentFile.createReadStream({"start" : thisRequest.nextNeededByte, "end" : endCreateReadStream});
              
              /*
              thisRequest.on('end', function(){
                if(thisRequest.callbackOfMultistream !== null && thisRequest.nextNeededByte > thisRequest.lastEndCreateReadStream && thisRequest.nextNeededByte < thisRequest.videoFileSize){
                  var endCreateReadStream;
                  if(thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE >= webtorrentFile.length-1){
                    endCreateReadStream = webtorrentFile.length-1;
                  } else {
                    endCreateReadStream = thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE;
                  }                
                  thisRequest.webtorrentStream = webtorrentFile.createReadStream({"start" : thisRequest.nextNeededByte, "end" : endCreateReadStream});
                  thisRequest.nextByteWebtorrent = thisRequest.nextNeededByte;
                  thisRequest.webtorrentStream.unpipe();
                  thisRequest.webtorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
                }             
              });
              */
                 
              // Every videostreamRequestHandler has to save the byte index that it expects next from the WebTorrent
              // network.
              thisRequest.nextByteWebtorrent = thisRequest.nextNeededByte;
              thisRequest.lastEndCreateReadStream = endCreateReadStream;
                 
              // Data that is received from the sequential byte range request gets immediately pumped into a writeable 
              // stream called collectorStreamForWebtorrent which processes the new data.
              thisRequest.webtorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);           
            }
          }
        });
      }    
      // first2000BytesOfVideo = new MyReadableStream({highWaterMark: 2000});    hatte ich ja rausgenommen weil verfangen

      
      var fileLikeObject = function (pathToFileOnXHRServer){
        this.pathToFileOnXHRServer = pathToFileOnXHRServer;
      };
      
      // The videostream library will call createReadStream several times with different values for the start property 
      // of opts. The OakStreaming client has to return the byte range specified by the start and end property of opts.
      fileLikeObject.prototype.createReadStream = function (opts){
        if(opts.start >= SIZE_OF_VIDEO_FILE){
          return (new MultiStream(function (cb){cb(null, null);}));
        }
        inCritical = true;      
        var thisRequest = new VideostreamRequestHandler(++globalVideostreamRequestNumber, opts, this);
                  
        // Every time I printed out the value of opts.end, it was NaN.
        // I suppose that should be interpreted as "till the end of the file".
        // In this case, the stream that this createReadStream method will return should, nevertheless, not buffer the hole video file 
        // in advance but instead retrieve and put out chunks of video data on-demand.        
        if(opts.end && !isNaN(opts.end)){
          thisRequest.endIndex = opts.end + 1;
        } else {
          if(SIZE_OF_VIDEO_FILE !== 0){
            thisRequest.endIndex = SIZE_OF_VIDEO_FILE;
          }
        }
                 
        // This writeable Node.js stream will process every data that is received from sequential WebTorrent streams.
        thisRequest.CollectorStreamForWebtorrent = function(highWaterMark){
          readableStream.Writable.call(this, highWaterMark);
        };
        util.inherits(thisRequest.CollectorStreamForWebtorrent, readableStream.Writable);
        thisRequest.CollectorStreamForWebtorrent.prototype._write = function(chunk, encoding, done){         
          if(thisRequest.nextNeededByte - thisRequest.nextByteWebtorrent < chunk.length){
            bytesTakenFromWebtorrent += chunk.length - 
                    (thisRequest.nextNeededByte - thisRequest.nextByteWebtorrent);
            var streamHasMemoryLeft = thisRequest.nextStreamForMultistream.push(chunk.slice(
                    thisRequest.nextNeededByte - thisRequest.nextByteWebtorrent, chunk.length));
            thisRequest.bytesInNextStreamForMultistream += chunk.length - (thisRequest.nextNeededByte - 
                    thisRequest.nextByteWebtorrent);
            thisRequest.nextNeededByte += chunk.length - (thisRequest.nextNeededByte - 
                    thisRequest.nextByteWebtorrent);
        
            if(streamHasMemoryLeft){            
              if(thisRequest.callbackOfMultistream !== null && thisRequest.nextNeededByte >= thisRequest.endIndex){
                var theCallbackFunction = thisRequest.callbackOfMultistream;
                thisRequest.callbackOfMultistream = null;
                thisRequest.nextStreamForMultistream.push(null);
                thisRequest.bytesInNextStreamForMultistream = 0;
                var res = thisRequest.nextStreamForMultistream;
                thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: 
                        WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                if (thisRequest.webtorrentStream){
                  //thisRequest.webtorrentStream.pause(); 11.07.16  Unsure if this should be done. Probably not.
                }
                theCallbackFunction(null, res);
              } else {
                ceckIfNextStreamForMultistreamReady(thisRequest);
              }
            } else {
              if(thisRequest.callbackOfMultistream === null){
                if(thisRequest.webtorrentStream){
                  //thisRequest.webtorrentStream.pause(); 11.07.16  Unsure if this should be done. Probably not.
                }
                thisRequest.forNowNoDataNeeded = true;
              } else {
                var theCallbackFunction = thisRequest.callbackOfMultistream;
                thisRequest.callbackOfMultistream = null;
                thisRequest.nextStreamForMultistream.push(null);
                thisRequest.bytesInNextStreamForMultistream = 0;
                var res = thisRequest.nextStreamForMultistream;
                thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                if (thisRequest.webtorrentStream){
                  //thisRequest.webtorrentStream.pause(); 11.07.16  Unsure if this should be done. Probably not.
                }
                theCallbackFunction(null, res);
              }
            }
          }    
          thisRequest.nextByteWebtorrent += chunk.length;
          done();
        };
        thisRequest.collectorStreamForWebtorrent = new thisRequest.CollectorStreamForWebtorrent({highWaterMark: 16});
        videostreamRequestHandlers.push(thisRequest);

        if(webtorrentFile){
          if(htmlVideoTag.duration){
            timeOfLastWebtorrentRequest = htmlVideoTag.currentTime;
          } else {
            timeOfLastWebtorrentRequest = 0;
          }
          
          var endCreateReadStream;
          if(thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE >= webtorrentFile.length-1){
            endCreateReadStream = webtorrentFile.length-1;
          } else {
            endCreateReadStream = thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE;
          }
          thisRequest.webtorrentStream = webtorrentFile.createReadStream({"start" : thisRequest.nextNeededByte, "end" : endCreateReadStream});
          thisRequest.lastEndCreateReadStream = endCreateReadStream;
          thisRequest.nextByteWebtorrent = thisRequest.nextNeededByte;
          thisRequest.webtorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
        }

        
        function streamFactory(cb){      
          if(thisRequest.endIndex >= 0 && thisRequest.nextNeededByte >= thisRequest.endIndex){          
            if (thisRequest.xhrRequest) {
              thisRequest.xhrRequest.destroy();
              thisRequest.xhrRequest = null;
            }
            return cb(null, null);
          }
            
          thisRequest.callbackNumber++;

          thisRequest.callbackOfMultistream = cb;
          thisRequest.forNowNoDataNeeded = false;
             
          /* Erstmal rausgenommen, da ich mich beim XHRHanlder part dazu irgendwie verhäddert habe
            if(firstBytesOfVideo && (thisRequest.nextNeededByte < firstBytesOfVideo.length - 200) && thisRequest.createReadStreamNumber < 5){ // Beim 10 mins big buck bunny video ist eben der erste lange createReadStream (und einzige?) createReadStream Nummer 5
              thisRequest.nextStreamForMultistream.push(firstBytesOfVideo.slice(thisRequest.nextNeededByte, firstBytesOfVideo.length));
              bytesTakenFromServer += firstBytesOfVideo.length - thisRequest.nextNeededByte;
              thisRequest.nextNeededByte += firstBytesOfVideo.length - thisRequest.nextNeededByte;
              var theCallbackFunction = thisRequest.callbackOfMultistream;
              thisRequest.callbackOfMultistream = null;
              thisRequest.nextStreamForMultistream.push(null);
              thisRequest.bytesInNextStreamForMultistream = 0;
              var res = thisRequest.nextStreamForMultistream;
              if(thisRequest.createReadStreamNumber < 4){
                thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: 2000});
              } else {
                thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});                    
              }
              ////console.log("A CB has been answered with a part of firstBytesOfVideo for readstream number " + thisRequest.createReadStreamNumber + " with callback number " + thisRequest.callbackNumber);
              theCallbackFunction(null, res);
              return;
            }
          */
          
          if(!ceckIfNextStreamForMultistreamReady(thisRequest)){
            if(thisRequest.webtorrentStream){
              // thisRequest.webtorrentStream.resume();  11.07.16 more a try
            } else if(webtorrentFile){
              var endCreateReadStream;
              if(thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE - 1 >= webtorrentFile.length-1){
                endCreateReadStream = webtorrentFile.length-1;
              } else {
                endCreateReadStream = thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE - 1;
              }
              thisRequest.webtorrentStream = webtorrentFile.createReadStream({"start" : thisRequest.nextNeededByte, "end" : endCreateReadStream});
              thisRequest.lastEndCreateReadStream = endCreateReadStream;
              thisRequest.nextByteWebtorrent = thisRequest.nextNeededByte;
              thisRequest.webtorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
            }

            if(deliveryByServer && inCritical && !thisRequest.XHRConducted){
              if(!webtorrentFile || !videoCompletelyLoadedByWebtorrent){
                conductXHR(thisRequest);                      
              }
            }
          }
        }
          
        // A new Multistream gets created which will be the answer the the request from the VideoStream request
        var multi = new MultiStream(streamFactory);
          
        var deconstructorAlreadyCalled = false;
        var destroy = multi.destroy;
        multi.destroy = function(){
          if(deconstructorAlreadyCalled){
            return;
          }
          deconstructorAlreadyCalled = true;
          if (thisRequest.xhrRequest) {
            thisRequest.xhrRequest.destroy();
          }
          var theCallback = thisRequest.callbackOfMultistream;
          thisRequest.callbackOfMultistream = null;
          thisRequest.forNowNoDataNeeded = true;
          if(thisRequest.webtorrentStream){
            thisRequest.webtorrentStream.pause();
            thisRequest.webtorrentStream.unpipe();
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
          // thisRequest.webtorrentStream.destroy();                  Glaube ich unnötig!!!!
          thisRequest.nextStreamForMultistream.resume();  // To avoid memory leaks. Ich sammel ja schon datan während ich auf den nächsten call von der streamFactoryFunction warte 
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
        if(htmlVideoTag.duration){
          //////console.log("In if(htmlVideoTag.duration)");                 
          if(theTorrentSession && (htmlVideoTag.currentTime - timeOfLastWebtorrentRequest >= MINIMAL_TIMESPAN_BEFORE_NEW_WEBTORRENT_REQUEST)){
            for (var j = 0, length = videostreamRequestHandlers.length; j < length; j++) {
              var thisRequest = videostreamRequestHandlers[j];
              ////console.log("createReadStream enlargement for request " + thisRequest.createReadStreamNumber);
              if(thisRequest.callbackOfMultistream !== null && thisRequest.nextNeededByte > thisRequest.lastEndCreateReadStream && thisRequest.nextNeededByte < SIZE_OF_VIDEO_FILE){
                timeOfLastWebtorrentRequest = htmlVideoTag.currentTime;
                var endCreateReadStream;
                if(thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE >= webtorrentFile.length-1){
                  endCreateReadStream = webtorrentFile.length-1;
                } else {
                  endCreateReadStream = thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE;
                }
                ////console.log("I set a new createReadstream for videostream request number " + thisRequest.createReadStreamNumber);
                thisRequest.webtorrentStream.unpipe();
                thisRequest.webtorrentStream = webtorrentFile.createReadStream({"start" : thisRequest.nextNeededByte, "end" : endCreateReadStream});
                thisRequest.lastEndCreateReadStream = endCreateReadStream;
                thisRequest.nextByteWebtorrent = thisRequest.nextNeededByte;
                thisRequest.collectorStreamForWebtorrent = new thisRequest.CollectorStreamForWebtorrent({highWaterMark:16});
                thisRequest.webtorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
              }
            }                                   
          }
        }        
        */

          
        // Alte Variante wo ich mir noch die Buffer Bereiche des video players angeschaut habe
        var timeRanges = htmlVideoTag.buffered;
        for (var i = 0, length = timeRanges.length; i < length; i++){
          if (htmlVideoTag.currentTime >= timeRanges.start(i) && htmlVideoTag.currentTime <= timeRanges.end(i)+1){ // war vorher timeRanges.end(i)+3
            if (timeRanges.end(i) - htmlVideoTag.currentTime <= DOWNLOAD_FROM_P2P_TIME_RANGE) {
              for (var j = 0, length2 = videostreamRequestHandlers.length; j < length2; j++) {
                var thisRequest = videostreamRequestHandlers[j];
                if(theTorrentSession && thisRequest.callbackOfMultistream !== null && thisRequest.nextNeededByte > thisRequest.lastEndCreateReadStream && thisRequest.nextNeededByte < SIZE_OF_VIDEO_FILE){
                  var endCreateReadStream;
                  if(thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE >= webtorrentFile.length-1){
                    endCreateReadStream = webtorrentFile.length-1;
                  } else {
                    endCreateReadStream = thisRequest.nextNeededByte + CREATE_READSTREAM_REQUEST_SIZE;
                  }
                  thisRequest.webtorrentStream.unpipe();
                  thisRequest.webtorrentStream = webtorrentFile.createReadStream({"start" : thisRequest.nextNeededByte, "end" : endCreateReadStream});
                  thisRequest.lastEndCreateReadStream = endCreateReadStream;
                  thisRequest.nextByteWebtorrent = thisRequest.nextNeededByte;
                  thisRequest.collectorStreamForWebtorrent = new thisRequest.CollectorStreamForWebtorrent({highWaterMark:16});
                  thisRequest.webtorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
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
        if(theTorrentSession && webtorrentFile){
          document.getElementById("WebTorrent-received").innerHTML = "webtorrentFile.length: " + webtorrentFile.length + "\n torrent.downloaded: " + theTorrentSession.downloaded + "\n torrent.received: " + theTorrentSession.downloaded + "\n torrent.uploaded: " + theTorrentSession.uploaded + "\n torrent.progress: " + theTorrentSession.progress + "\n Bytes received from server: " + bytesReceivedFromServer + "\n Bytes taken from server delivery: " + bytesTakenFromServer + "\n Bytes taken from WebTorrent delivery: " + bytesTakenFromWebtorrent;
        }
        setTimeout(updateChart, UPDATE_CHART_INTERVAL);
      }         
      */
       
      // This function checks for a given videostreamRequestHandler if we have called enough video data to call the callback function.
      // If it is the case, the callback function gets called togehter with the buffered data.
      function ceckIfNextStreamForMultistreamReady(thisRequest){
        if ((thisRequest.createReadStreamNumber < 4 && thisRequest.callbackOfMultistream && thisRequest.bytesInNextStreamForMultistream >= 2000) || (thisRequest.callbackOfMultistream && ((thisRequest.bytesInNextStreamForMultistream >= THRESHOLD_FOR_RETURNING_OF_ANSWER_STREAM) || (thisRequest.nextNeededByte >= SIZE_OF_VIDEO_FILE)))){
          var theCallbackFunction = thisRequest.callbackOfMultistream;
          thisRequest.callbackOfMultistream = null;
          thisRequest.nextStreamForMultistream.push(null);
          if (thisRequest.webtorrentStream){
            //thisRequest.webtorrentStream.pause();
          }
          thisRequest.bytesInNextStreamForMultistream = 0;
          var res = thisRequest.nextStreamForMultistream;
          thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
          theCallbackFunction(null, res);
          return true;
        }
        return false;
      }

      // This function frequently checks if video data upload should be throttled because the peer_upload_limit is reached
      // If it should be throttled, then every peer gets choked which means there will be no more data send to other peers for approximately 800 milliseconds.
      function chokeIfNecessary(){
        if (theTorrentSession && theTorrentSession.uploaded >= theTorrentSession.downloaded * UPLOAD_LIMIT + ADDITION_TO_UPLOAD_LIMIT) {
          /* mache ich schon in einer anderen frequent methode
          if(videoCompletelyLoaded){
            theTorrentSession.destroy();
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
    

      /**
       * This constructor creates an object which serves as a container for all necessary information to handle the
       * respective createReadStream call (which is a byte range request).
       * @private
       * @constructor
       * @param {number} createReadStreamNumber - The number of the createReadStream call.
       * @param {object} opts - An object that specifies the start and end index of the createReadStream (which is
       * a byte range request).
       * @param {object} self - A reference to the OakStreaming instance.
       */
      function VideostreamRequestHandler(createReadStreamNumber, opts, self){
        this.createReadStreamNumber = createReadStreamNumber;
        this.nextNeededByte = opts.start || 0;
        this.nextByteWebtorrent = -42;
        this.nextByteServer = -42;
        this.callbackOfMultistream = null;
        this.callbackNumber = 0;
        this.webtorrentStream = null;
        if(createReadStreamNumber < 4){
          this.nextStreamForMultistream = new MyReadableStream({highWaterMark: 2000});
        } else {
          this.nextStreamForMultistream = new MyReadableStream({
                    highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
        }        
        this.bytesInNextStreamForMultistream = 0;
        this.collectorStreamForWebtorrent = null;
        this.XHRConducted = false;
        this.endIndex = -42;
        this.self = self;
        this.bytesTakenFromWebtorrent = 0;
        this.bytesTakenFromServer = 0;
        this.forNowNoDataNeeded = false;
        this.xhrRequest = null;
        this.lastEndCreateReadStream = -42;
        this.xhrFilesize = -42;
      }

      // This function frequently checks for every videostreamRequestHandler if there is enough data buffer to call the corresponding callback function with the buffered data
      /* Brauche ich soviel ich weiß nicht
      function frequentlyceckIfNextStreamForMultistreamReady(){
        if(videoCompletelyLoadedByVideoPlayer){
          return;
        }
        for (var i = 0, length = videostreamRequestHandlers.length; i < length; i++) {
          ceckIfNextStreamForMultistreamReady(videostreamRequestHandlers[i]);
        }
        setTimeout(frequentlyceckIfNextStreamForMultistreamReady, CHECK_IF_nextStreamForMultistream_READY_INTERVAL);
      }
      */
       
      // The job of this function is to frequently check to things.
      // First, if the video is completely loaded.
      // Second, if less than DOWNLOAD_FROM_SERVER_TIME_RANGE seconds of video playback are buffered in advance.
      function checkIfBufferFullEnough(justOnce){
        if(videoCompletelyLoadedByVideoPlayer){
          return;
        }
        if(htmlVideoTag.duration){
          var timeRanges = htmlVideoTag.buffered;
          if(timeRanges.length >= 1){
            if(timeRanges.start(0) == 0 && timeRanges.end(0) == htmlVideoTag.duration){
              videoCompletelyLoadedByVideoPlayer = true;   // brauche da verschiende boolean werte
              if(callback){
                if(stop_uploading_when_video_downloaded){
                  callback();
                } else {
                  callback(theTorrentSession);
                }
              }
              if(stop_uploading_when_video_downloaded){
                if(theTorrentSession){
                  theTorrentSession.destroy();
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
            if (htmlVideoTag.currentTime >= timeRanges.start(i) && htmlVideoTag.currentTime <= timeRanges.end(i)+1) {
              if (timeRanges.end(i) - htmlVideoTag.currentTime >= DOWNLOAD_FROM_SERVER_TIME_RANGE) {
                inCritical = false;
              }
            }
          }
          if (deliveryByServer && inCritical) {
            for (var j = 0, length = videostreamRequestHandlers.length; j < length; j++) {
              if ((!webtorrentFile || !videoCompletelyLoadedByWebtorrent) && videostreamRequestHandlers[j].callbackOfMultistream !== null && videostreamRequestHandlers[j].XHRConducted === false) {
                conductXHR(videostreamRequestHandlers[j]);
              }
            }
          }
        }
          

        // Added at 08.08
        if(theTorrentSession && theTorrentSession.progress === 1){
          videoCompletelyLoadedByVideoPlayer = true;   // brauche da verschiende boolean werte
          if(callback){
            if(stop_uploading_when_video_downloaded){
              callback();
            } else {
              callback(theTorrentSession);
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
        console.log("A XHR is conducted");
        
        if(thisRequest.callbackOfMultistream === null){
          return;
        }
        thisRequest.XHRConducted = true;
        var reqStart = thisRequest.nextNeededByte;
          
        if(thisRequest.createReadStreamNumber < 4){    // War vorher === 1     statt < 4
          var reqEnd = reqStart + 2000;
        } else {
          var reqEnd = reqStart + XHR_REQUEST_SIZE;
        }
          
        if(thisRequest.xhrFilesize > 0 && reqEnd > thisRequest.xhrFilesize){
          reqEnd = thisRequest.xhrFilesize;
        } else if (thisRequest.endIndex >= 0 && reqEnd > thisRequest.endIndex) {
          reqEnd = thisRequest.endIndex;
        }
          
        if (reqStart >= reqEnd){
             
          // !!!!!!!!! dieser if block neu fix versuch
          if(thisRequest.xhrRequest){
            thisRequest.xhrRequest.destroy();
          }
          thisRequest.XHRConducted = false;
             
             
          if(thisRequest.callbackOfMultistream){
            return thisRequest.callbackOfMultistream(null, null);
          } else {
            return;
          }                  
        }

        /* glaube ich unnötiger und/oder gefährlicher müll
        if (reqStart >= reqEnd) {
          xhrRequest = null;
          return thisRequest.callbackOfMultistream(null, null);
        }
        */

        var XHRDataHandler = function (chunk){
          bytesReceivedFromServer += chunk.length;
          // thisRequest.nextByteServer += chunk.length; War noch vom meinem 2000 byte buffer versuch
             
             
          /* Erstmal rausgenommen weil ich darauf net klar kam. Etwas zu verwirrend
          if(numberBytesInfirst2000BytesOfVideo < 2000 && thisRequest.nextNeededByte == numberBytesInfirst2000BytesOfVideo){
            ////console.log("Size of firstBytesOfVideo in bytes: " + chunk.length);
            numberBytesInFirst2000BytesOfVideo += chunk.length; //<= (2000-numberBytesInFirst2000BytesOfVideo) ? chunk.length : 2000;
            first2000BytesOfVideo = Buffer.concat([first2000BytesOfVideo, chunk]); // chunk.slice(0, 2000-numberBytesInFirst2000BytesOfVideo)
          }
          if(thisRequest.callbackOfMultistream){
            if(thisRequest.createReadStreamNumber<5 && thisRequest.callbackNumber <5){
              if(thisRequest.bytesInNextStreamForMultistream > 0){
                thisRequest.nextStreamForMultistream.push(chunk);
                thisRequest.nextNeededByte += chunk.length;
                thisRequest.bytesTakenFromServer += chunk.length;
                var theCallbackFunction = thisRequest.callbackOfMultistream;
                thisRequest.callbackOfMultistream = null;
                thisRequest.nextStreamForMultistream.push(null);
                thisRequest.bytesInNextStreamForMultistream = 0;
                var res = thisRequest.nextStreamForMultistream;
                if(thisRequest.createReadStreamNumber <4){
                  thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: 2000});
                } else {
                  thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});                              
                }
                theCallbackFunction(null, res);
              } else {
                var returnStream = new MyReadableStream(numberBytesInfirst2000BytesOfVideo - thisRequest.nextNeededByte);
                returnStream.push(first2000BytesOfVideo.slice(this.start, numberBytesInFirst2000BytesOfVideo);
                returnStream.push(null);
                bytesTakenFromServer += numberBytesInfirst2000BytesOfVideo-thisRequest.nextNeededByte;  
                thisRequest.nextNeededByte += numberBytesInfirst2000BytesOfVideo;
                var theCallbackFunction = thisRequest.callbackOfMultistream;
                thisRequest.callbackOfMultistream = null;
                theCallbackFunction(null, returnStream);    
              }
            }
          }
          */        

             
          if(thisRequest.forNowNoDataNeeded){
            thisRequest.nextByteServer += chunk.length;
            return;
          }
          if (thisRequest.nextNeededByte - thisRequest.nextByteServer < chunk.length){         
            bytesTakenFromServer += chunk.length - (thisRequest.nextNeededByte - thisRequest.nextByteServer);
            thisRequest.bytesInNextStreamForMultistream += chunk.length - (thisRequest.nextNeededByte - thisRequest.nextByteServer);
            var myBuffer = chunk.slice(thisRequest.nextNeededByte - thisRequest.nextByteServer, chunk.length);
            var StreamHasMemoryLeft = thisRequest.nextStreamForMultistream.push(myBuffer);         
            if(!StreamHasMemoryLeft){
              if(thisRequest.callbackOfMultistream !== null){
                var theCallbackFunction = thisRequest.callbackOfMultistream;
                thisRequest.callbackOfMultistream = null;
                thisRequest.nextStreamForMultistream.push(null);
                thisRequest.bytesInNextStreamForMultistream = 0;
                var res = thisRequest.nextStreamForMultistream;
                thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                if (thisRequest.webtorrentStream){
                   //thisRequest.webtorrentStream.pause();
                }
                theCallbackFunction(null, res); 
              } else {
                thisRequest.forNowNoDataNeeded = true;
                if(thisRequest.webtorrentStream){
                  //thisRequest.webtorrentStream.pause();
                }
              }
            } else {
              if (thisRequest.nextNeededByte >= thisRequest.endIndex && thisRequest.callbackOfMultistream !== null){
                var theCallbackFunction = thisRequest.callbackOfMultistream;
                thisRequest.callbackOfMultistream = null;
                thisRequest.nextStreamForMultistream.push(null);
                thisRequest.bytesInNextStreamForMultistream = 0;
                var res = thisRequest.nextStreamForMultistream;
                thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
                if (thisRequest.webtorrentStream){
                  //thisRequest.webtorrentStream.pause();
                }
                theCallbackFunction(null, res);
              }
            } 
            thisRequest.nextNeededByte += chunk.length - (thisRequest.nextNeededByte - thisRequest.nextByteServer);            
          }
          thisRequest.nextByteServer += chunk.length;
        }

        var XHREnd = function (){        
          if(thisRequest.createReadStreamNumber < 4 && thisRequest.callbackOfMultistream){
            var theCallbackFunction = thisRequest.callbackOfMultistream;
            thisRequest.callbackOfMultistream = null;
            thisRequest.nextStreamForMultistream.push(null);
            thisRequest.bytesInNextStreamForMultistream = 0;
            var res = thisRequest.nextStreamForMultistream;
            if(thisRequest.createReadStreamNumber <3){
              thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: 2000});
            } else {
              thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});                              
            }
            theCallbackFunction(null, res);
            
            thisRequest.XHRConducted = false;
            return;
          }
    
             
          /* Want to solve example_application.js:14013 Uncaught Error: Data too short   Daher das hier auskommentiert
          if(thisRequest.bytesInNextStreamForMultistream > 0 && thisRequest.callbackOfMultistream !== null){
            thisRequest.nextStreamForMultistream.push(null);
            thisRequest.bytesInNextStreamForMultistream = 0;
            var res = thisRequest.nextStreamForMultistream;
            thisRequest.nextStreamForMultistream = new MyReadableStream({highWaterMark: WATERMARK_HEIGHT_OF_ANSWERSTREAM});
            var theCallbackFunction = thisRequest.callbackOfMultistream;
            thisRequest.callbackOfMultistream = null;
            ////////console.log("XHREnd: called CB with data out of nextStreamForMultistream from videostreamRequest number " + thisRequest.createReadStreamNumber);
            theCallbackFunction(null, res);
          }
          */
         
          /*
          if(!noMoreData){
            if(thisRequest.nextNeededByte < SIZE_OF_VIDEO_FILE && thisRequest.nextNeededByte < thisRequest.xhrFilesize){
              if(thisRequest.endIndex > 0 ){
                if(thisRequest.nextNeededByte < thisRequest.endIndex){
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
          ceckIfNextStreamForMultistreamReady(thisRequest);
          checkIfBufferFullEnough(true);
          //ceckIfNextStreamForMultistreamReady(thisRequest);  // Unsicher ob es drinn bleiben soll
          //}                 
        };
          
        thisRequest.nextByteServer = reqStart;

                
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
          
        thisRequest.xhrRequest = http.get(XHROptionObject, function (res){
          var contentRange = res.headers['content-range'];
          if (contentRange) {
            // Hat zu bugs geführt. Hat geringe priorität einzubauen das file_size auch vom XHR server erfragt wird.
            //SIZE_OF_VIDEO_FILE = parseInt(contentRange.split('/')[1], 10);
            //if(thisRequest.endIndex === 0){
            thisRequest.xhrFilesize = parseInt(contentRange.split('/')[1], 10);
            //}
          }
           
          // res.setHeader('Access-Control-Allow-Headers', thisRequest.xhrRequest.header.origin);
           
          res.on('end', XHREnd);
          res.on('data', XHRDataHandler);
          res.on('error', function(err){
            // To-Do yield real error instead of simple console output
            console.log("The http.get response object has yield the following error"); console.error(err);
          });
        });
        thisRequest.xhrRequest.on('error', function(err){
          // To-Do yield real error instead of simple console output
          console.log("The XHR has yield the following error message: " + err.message);
        });
      }
      frequentlyCheckIfNewCreateReadStreamNecessary();
      chokeIfNecessary();
      // updateChart();   NIcht löschen. Aber gehört nicht in production!!
      // frequentlyceckIfNextStreamForMultistreamReady(); Am 17.07 entschlossen das rauszunehmen. Ich hatte mir das ja schon mehrmals überlegt
      checkIfBufferFullEnough();

      if(hashValue){
        Videostream(new fileLikeObject(hashValue), htmlVideoTag);
      } else {
        Videostream(new fileLikeObject(pathToFileOnXHRServer), htmlVideoTag);
      }
    }

    // This function adds a simple-peer connection to the WebTorrent swarm of the OakStreaming instance.
    // A simple-peer is a wrapper for a Web-RTC connection.
    function addSimplePeerInstance(simplePeerInstance, options, callback){
      // The method add a simplePeer to the WebTorrent swarm instance
      if(theTorrentSession){
        if(theTorrentSession.infoHash){  // Vorher war das wenn info hash ready
          theTorrentSession.addPeer(simplePeerInstance);
          if(callback){
            callback();
          }
        } else {
          var pair = [];
          pair.push(simplePeerInstance);
          pair.push(callback);
          peersToAdd.push(pair);               
          // theTorrentSession.on('infoHash', function() {infoHashReady = true; theTorrentSession.addPeer(simplePeerInstance); //console.log("addSimplePeerInstance successfully added a peer connection"); if(callback){callback();}});
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