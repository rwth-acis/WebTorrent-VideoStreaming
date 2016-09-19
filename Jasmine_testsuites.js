var theVideoFileSize = 788493;


describe("Testing if manuallyAddingPeer methods", function(){   
  var twoPeersAreConnected = false;
  var threePeersAreConnected = false;
  var twoPeersStreamedToAnother = false;
  var testTorrentA, testTorrentB;
   
  it("can establish a WebTorrent connection between two OakStreaming instances", function(done){
    expect(true).toBe(true); // every Jasmine spec has to have an expect expression
      
      /*
      var receivedCallbacks = 0;    
            
      var tryToSetCallbackA = (function(){
         return function(){
            if(myStreamingA.forTesting_connectedToNewWtorrentPeer){
               console.log(" callback of myStreamingA.forTesting_connectedToNewWtorrentPeer is set");
               myStreamingA.forTesting_connectedToNewWtorrentPeer(function(){
                  if(receivedCallbacks === 1){
                     twoPeersAreConnected = true;
                     done();
                  } else {
                     receivedCallbacks++;
                  }
               });
            } else {
               console.log("tryToSetCallbackA setTimeout is set");
               setTimeout(tryToSetCallbackA, 500);
            }
         };
      })();
      tryToSetCallbackA();
      
      
      var tryToSetCallbackB = (function(){
         return function(){
            if(myStreamingB.forTesting_connectedToNewWtorrentPeer){
                  console.log("callback of myStreamingB.forTesting_connectedToNewWtorrentPeer is set");
                  myStreamingB.forTesting_connectedToNewWtorrentPeer(function(){
                     if(receivedCallbacks === 1){
                        twoPeersAreConnected = true;            
                        done();
                     } else {
                        receivedCallbacks++;
                     }
                  });
            } else {
               console.log("tryToSetCallbackB setTimeout is set");
               setTimeout(tryToSetCallbackB, 500);
            }         
         };
      })();
      tryToSetCallbackB();
      */

    myStreamingA.createSignalingData(function(signalingData){
      myStreamingB.createSignalingDataResponse(signalingData, function(signalingDataResponse){
        myStreamingA.processSignalingResponse(signalingDataResponse, function(){console.log("Test case 1: Peers are connected"); twoPeersAreConnected = true; done();});
      });
    });
  }, 20000);

  
  it("can successfully connect two OakStreaming instances for streaming", function(done){
    expect(true).toBe(true); // every Jasmine spec has to have an expect expression
      
      
    function callback(streamInformationObject){
      console.log("First spec, second test. Stream_Information: " + JSON.stringify(streamInformationObject));
      console.log("First spec, second test case: the callback from streamVideo is called");
      myStreamingB.loadVideo(streamInformationObject, function(){console.log("First spec, second test. loadVideo callback is called: "); twoPeersStreamedToAnother = true; done();}, false);
    }
      
      function streamWhenConnectionEstablished(res){
         if(twoPeersAreConnected){
            console.log("First spec, second test case: streamVideo is called");
            myStreamingA.streamVideo(res, {web_server_URL: false}, callback, "It's a test", false);
            // {webTorrentTrackers: [["ws://localhost:8081"]]}   19.09: webTorrent_trackers: []
         } else {
            setTimeout(function(){streamWhenConnectionEstablished(res);}, 1000);
         }
      }
      
      http.get({
         hostname: 'localhost',
         port: 8080,
         path: '/videos/example.mp4',
         headers: {
            range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res){
            console.log("Test2 received video stream from server");
            streamWhenConnectionEstablished(res);
      });
  }, 40000);
   
   it("can automatically establish WebTorrent connections between three OakStreaming instances", function(done){
      expect(true).toBe(true); // every Jasmine spec has to have an expect expression  
                
      var receivedCallbacks = 0;     
    
    
      function checkIfnewConnectionsAreCreated(){
         console.log("In second last sec. checkIfnewConnectionsAreCreated is called");
         if(twoPeersStreamedToAnother){
            console.log("In second last spec. In if clause.");
            myStreamingA.forTesting_connectedToNewWtorrentPeer(function(){
                console.log("In second last spec. " + "myStreamingA.forTesting_connectedToNewWtorrentPeer gots called");
               if(receivedCallbacks === 1){
                  threePeersAreConnected = true;
                  done();
               } else {
                  receivedCallbacks++;
               }
            });
            myStreamingB.forTesting_connectedToNewWtorrentPeer(function(){
               console.log("In second last spec. " + "myStreamingB.forTesting_connectedToNewWtorrentPeer gots called");
               if(receivedCallbacks === 1){
                  threePeersAreConnected = true;            
                  done();
               } else {
                  receivedCallbacks++;
               }
            });
         } else {
            setTimeout(checkIfnewConnectionsAreCreated, 500);
         }
      }
      checkIfnewConnectionsAreCreated();
      
      /* I think not needed
      myStreamingC.forTesting_connectedToNewWtorrentPeer(function(){
         if(receivedCallbacks === 4){
            threePeersAreConnected = true;            
            done();
         } else {
            receivedCallbacks++;
         }
      });
      */
    
      myStreamingA.createSignalingData(function(signalingData){
         myStreamingC.createSignalingDataResponse(signalingData, function(signalingDataResponse){
            myStreamingA.processSignalingResponse(signalingDataResponse, function(){console.log("For third spec peers connected");});
         });
      });    
   }, 25000);

 
   it("can successfully connect three OakStreaming instances for streaming", function(done){
      expect(true).toBe(true); // every Jasmine spec has to have an expect expression   
      var oneStreamingCompleted = false;
      var testTorrent;
      
      function callback(streamInformationObject, torrent){
         console.log("callback from last new sepc is called");
         testTorrent = torrent;
         myStreamingA.loadVideo(streamInformationObject, function(){
            console.log("last new spec. callback of myStreamingA.loadVideo");
            if(oneStreamingCompleted){
               testTorrent.destroy();
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
         myStreamingB.loadVideo(streamInformationObject,  function(){
            console.log("last new spec. callback of myStreamingB.loadVideo");
            if(oneStreamingCompleted){
               testTorrent.destroy();
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
      }
      
      function streamWhenConnectionEstablished(res){
         console.log("In last new spec streamWhenConnectionEstablished gets called");
         if(threePeersAreConnected){
            console.log("last new spec. video gets streamed from myStreamingC");
            myStreamingC.streamVideo(res, {web_server_delivery: false, webTorrent_trackers: []}, callback, "It's a test", false);
            // webTorrentTrackers: [["ws://localhost:8081"]]
         } else {
            setTimeout(function(){streamWhenConnectionEstablished(res);}, 500);
         }
      }
      
      http.get({
         hostname: 'localhost',
         port: 8080,
         path: '/videos/example.mp4',
         headers: {
            range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res){
            console.log("Last new spec XHR response stream received");
            streamWhenConnectionEstablished(res);
      });
   }, 30000);
});   


describe("Testing if streamVideo method", function(){
   var myStreaming = new OakStreaming();
      
   it("creates streamInformationObject correctly",  function(done){     
      function callback (streamInformationObject){
         expect(streamInformationObject.size_of_video_file).toEqual(theVideoFileSize);
         expect(streamInformationObject.path_to_file_on_Web_server).toMatch("/videos/example.mp4");
         done();
      }
      http.get({
         hostname: 'localhost',
         port: 8080,
         path: '/videos/example.mp4',
         headers: {
            range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res){   // webTorrentTrackers: [["ws://localhost:8081"]]
         testTorrent = myStreaming.streamVideo(res, {path_to_file_on_Web_server : "/videos/example.mp4"}, callback, "It's a test", true);
      });
   }, 30000); 
});

describe("Testing if loadVideo method", function(){
   var myStreaming = new OakStreaming();
   var myStreaming2 = new OakStreaming();
   var myStreaming3 = new OakStreaming();
   
   it("loads the video fast enough via server delivery", function(done){
      expect(true).toBe(true); // necessary because Jasmine wants at least one expect per it.
      myStreaming.loadVideo({XHR_hostname: "localhost", XHR_port: 8080, path_to_file_on_Web_server: "/videos/example2.mp4", size_of_video_file: theVideoFileSize}, done);
   }, 10000);
     
   describe("loads the video fast enough via WebTorrent delivery", function(){
      it("with one seeder and one downloader", function(done){
         expect(true).toBe(true); // every Jasmine spec has to have an expect expression
         
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/videos/example.mp4",
            headers: {
               range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {    // webTorrentTrackers: [["ws://localhost:8081"]]
               myStreaming.streamVideo(res, {},  function(streamInformationObject){
                  myStreaming2.loadVideo(streamInformationObject, done);  
               });
         });
      }, 15000); 
      
      it("with two seeders and one downloader", function(done){
         expect(true).toBe(true); // every Jasmine spec has to have an expect expression
         
         function callback(streamInformationObject){
            myStreaming2.loadVideo(streamInformationObject, function(){
               myStreaming3.loadVideo(streamInformationObject, done);
            });
         }
         
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/videos/example.mp4",
            headers: {
                range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {   // webTorrentTrackers: [["ws://localhost:8081"]]
               myStreaming.streamVideo(res, {}, callback);
         });
      }, 20000);  

      it("with one seeder and two downloaders", function(done){
         expect(true).toBe(true); // every Jasmine spec has to have an expect expression
         var numberOfCompletedDownloads = 0;
         
         function checkIfSpecFinished(){
            if(++numberOfCompletedDownloads >= 2){
               done();
            }
         }       
         function callback(streamInformationObject){
            myStreaming2.loadVideo(streamInformationObject, checkIfSpecFinished); 
            myStreaming3.loadVideo(streamInformationObject, checkIfSpecFinished);
         }       
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/videos/example.mp4",
            headers: {
                range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {   // webTorrentTrackers: [["ws://localhost:8081"]]
               myStreaming.streamVideo(res, {}, callback);
         });
      }, 20000);    
   });
   
   it("loads the video fast enough via peer-assisted delivery", function(done){
      expect(true).toBe(true); // every Jasmine spec has to have an expect expression
      req = http.get({
         hostname: 'localhost',
         port: 8080,
         path: "/videos/example.mp4",
         headers: {
             range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res) {
         var webTorrentClient = new WebTorrent();
         webTorrentClient.seed(res, function onSeed (torrent){ // webTorrentTrackers: [["ws://localhost:8081"]]
            myStreaming.loadVideo({XHRPath: "/videos/example3.mp4", torrentFile : torrent.torrentFile, videoFileSize : theVideoFileSize}, done);            
         });
      });
   }, 20000);
});
 