var theVideoFileSize = 788493;


describe("Testing if manuallyAddingPeer methods", function(){   
  var twoPeersConnectedForTest2 = false;
  var threePeersAreConnected = false;
  var twoPeersStreamedToAnother = false;
  var myStreaming12 = new OakStreaming();
  var myStreaming13 = new OakStreaming();
  var myStreaming14 = new OakStreaming();
  var myStreaming15 = new OakStreaming();
  var myStreaming16 = new OakStreaming();
  
  it("can establish a WebTorrent connection between two OakStreaming instances", function(done){
    console.log("Version Warden");
    
    expect(true).toBe(true); // every Jasmine spec has to have an expect expression

    myStreaming12.createSignalingData(function(signalingData){
      myStreaming13.createSignalingDataResponse(signalingData, function(signalingDataResponse){
        myStreaming12.processSignalingResponse(signalingDataResponse, function(){console.log("Test case 1: Peers are connected"); twoPeersConnectedForTest2 = true; done();});
      });
    });
  }, 20000);

  
  it("can successfully connect two OakStreaming instances for streaming", function(done){
    expect(true).toBe(true); // every Jasmine spec has to have an expect expression

    function callback(streamTicket, torrent){
      console.log("First spec, second test. Stream_Information: " + JSON.stringify(streamTicket));
      console.log("First spec, second test case: the callback from create_stream is called");
      myStreaming13.receive_stream(streamTicket, function(){console.log("First spec, second test. receive_stream callback is called: "); twoPeersStreamedToAnother = true; myStreaming12.destroy(); myStreaming12 = null; done();}, true);
    }
      
      function streamWhenConnectionEstablished(res){

         if(twoPeersConnectedForTest2){
            console.log("First spec, second test case: create_stream is called");
            myStreaming12.create_stream(res, {web_server_URL: false, webTorrent_trackers: []}, callback, "Return torrent");
            // {webTorrentTrackers: [["ws://localhost:8081"]]}
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
  }, 20000);
   
 
   it("can successfully connect three OakStreaming instances for streaming", function(done){
      expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.   
      var oneStreamingCompleted = false;
      var numberOfDirectlyEstablishedConnections = 0;
      
      
      myStreaming14.createSignalingData(function(signalingData){
        myStreaming15.createSignalingDataResponse(signalingData, function(signalingDataResponse){
          myStreaming14.processSignalingResponse(signalingDataResponse, function(){console.log("Test case 3: Peers are connected"); numberOfDirectlyEstablishedConnections++;});
        });
      });
      myStreaming15.createSignalingData(function(signalingData){
         myStreaming16.createSignalingDataResponse(signalingData, function(signalingDataResponse){
            myStreaming15.processSignalingResponse(signalingDataResponse, function(){console.log("For third spec peers connected"); numberOfDirectlyEstablishedConnections++});
         });
      });       
      
      function createStreamCallback(streamTicket, torrent){
         console.log("callback from last new spec is called");
         testTorrentC = torrent;
         myStreaming16.receive_stream(streamTicket, function(){
            console.log("last new spec. callback of myStreaming16.receive_stream");
            if(oneStreamingCompleted){
               myStreaming14.destroy();
               myStreaming14 = null;
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
         myStreaming15.receive_stream(streamTicket, function(){
            console.log("last new spec. callback of myStreaming15.receive_stream");
            if(oneStreamingCompleted){
               myStreaming14.destroy();
               myStreaming14 = null;
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
      }
      
      function streamWhenConnectionEstablished(res){
         if(numberOfDirectlyEstablishedConnections >= 2){
            console.log("last new spec. video gets streamed from myStreaming16");
            myStreaming14.create_stream(res, {web_server_URL: false, webTorrent_trackers: []}, createStreamCallback, "Return torrent", false);
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
   }, 20000);
});   


describe("Testing if create_stream method", function(){
   var myStreaming11 = new OakStreaming();
      
   it("creates streamTicket correctly",  function(done){     
      function callback (streamTicket){
         expect(streamTicket.SIZE_VIDEO_FILE).toEqual(theVideoFileSize);
         expect(streamTicket.path_to_file_on_web_server).toMatch("/videos/example.mp4");
         myStreaming11.destroy();
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
         testTorrent = myStreaming11.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], path_to_file_on_web_server: "/videos/example.mp4"}, callback, "Return torrent", true);
      });
   }, 20000); 
});


describe("Testing if receive_stream method", function(){
  
  var myStreaming1 = new OakStreaming();
  var myStreaming2 = new OakStreaming();
  var myStreaming3 = new OakStreaming();
   
  var myStreaming4 = new OakStreaming();
  var myStreaming5 = new OakStreaming();
 
  var myStreaming6 = new OakStreaming();
  var myStreaming7 = new OakStreaming();
  var myStreaming8 = new OakStreaming();
  var myStreaming9 = new OakStreaming();
  var myStreaming10 = new OakStreaming();

   
   it("loads the video fast enough via server delivery", function(done){
      expect(true).toBe(true); // necessary because Jasmine wants at least one expect per it.
      myStreaming1.receive_stream({xhr_hostname: "localhost", xhr_port: 8080, path_to_file_on_web_server: "/videos/example2.mp4", SIZE_VIDEO_FILE: theVideoFileSize}, document.getElementById("myVideo8"), function(){done()}, true);
   }, 20000);
     
   describe("loads the video fast enough via WebTorrent delivery", function(){
     
      it("with one seeder and one downloader", function(done){
         expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
         
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/videos/example.mp4",
            headers: {
               range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {    // webTorrentTrackers: [["ws://localhost:8081"]]
               myStreaming2.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], web_server_URL: false},  function(streamTicket){
                  myStreaming3.receive_stream(streamTicket, document.getElementById("myVideo8"), function(){myStreaming2.destroy(); myStreaming2 = null; done();}, true);  
               });
         });
      }, 20000); 
      
 
      it("with two seeders and one downloader", function(done){
         expect(true).toBe(true); // every Jasmine spec has to have an expect expression
         
         function createStreamCallback(streamTicket){
            myStreaming5.receive_stream(streamTicket, document.getElementById("myVideo5"), function(){
               myStreaming6.receive_stream(streamTicket, document.getElementById("myVideo6"), function(){myStreaming4.destroy(); myStreaming4 = null; myStreaming5.destroy(); myStreaming5 = null; done();}, true);
            });
         }
         
          function createStreamWhenOtherTestComplete(res){
            if(!myStreaming3){
              myStreaming4.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], web_server_URL: false}, createStreamCallback);
            } else {
              setTimeout(function(){createStreamWhenOtherTestComplete(res)},500);
            }
          }  
          
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/videos/example.mp4",
            headers: {
                range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {   // webTorrentTrackers: [["ws://localhost:8081"]]
            createStreamWhenOtherTestComplete(res);     
         });
      }, 20000);  
      
      it("with one seeder and two downloaders", function(done){
        
        myStreaming7.createSignalingData(function(signalingData){
          myStreaming8.createSignalingDataResponse(signalingData, function(signalingDataResponse){
            myStreaming7.processSignalingResponse(signalingDataResponse, function(){console.log("OakStreaming instances 7 and 8 are connected.");});
          });
        });
        myStreaming8.createSignalingData(function(signalingData){
           myStreaming9.createSignalingDataResponse(signalingData, function(signalingDataResponse){
              myStreaming8.processSignalingResponse(signalingDataResponse, function(){console.log("OakStreaming instances 8 and 9 are connected.");});
           });
        });
        
        var timer8 = null;
        var timer9 = null;
        
         expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
         var numberOfCompletedDownloads = 0;
         
         var checkIfSpecFinished = function() {
           console.log("checkIfSpecFinished is called");
           numberOfCompletedDownloads++;
            if(numberOfCompletedDownloads >= 2){
              clearInterval(timer8);
              clearInterval(timer9);
              myStreaming7.destroy();
              myStreaming7 = null;
              console.log("done is called");
              done();
            }
         };       
         var createStreamCallback = function (streamTicket){
            console.log("The two receive_stream calls");
            myStreaming8.receive_stream(streamTicket, document.getElementById("myVideo8"), checkIfSpecFinished, true);
            timer8 = setInterval(function(){console.log("myStreaming8 Downloaded: " + myStreaming8.get_number_of_bytes_downloaded_P2P()); console.log("myStreaming8 peers: " + myStreaming9.get_size_of_swarm());}, 2000);
            
            setTimeout(function(){myStreaming9.receive_stream(streamTicket, document.getElementById("myVideo9"), checkIfSpecFinished, true);
            timer9 = setInterval(function(){console.log("myStreaming9 Downloaded: " + myStreaming9.get_number_of_bytes_downloaded_P2P()); console.log("myStreaming9 peers: " + myStreaming9.get_size_of_swarm());}, 2000);}, 250);
         };   

          var createStreamWhenOtherTestComplete = function(res){
            console.log("createStreamWhenOtherTestComplete() is called");
            
               
            if(!myStreaming6){
              console.log("myStreaming7.create_stream() gets executed");
              setTimeout(function(){myStreaming7.create_stream(res, {webTorrent_trackers: [], web_server_URL: false}, createStreamCallback);}, 8000);
            } else {
              setTimeout(function(){createStreamWhenOtherTestComplete(res);},1000);
            }
          };        
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/videos/example.mp4",
            headers: {
                range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {   // webTorrentTrackers: [["ws://localhost:8081"]]
              console.log("res has been received");
              createStreamWhenOtherTestComplete(res);
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
            myStreaming10.receive_stream({webTorrent_trackers: ["ws://localhost:8085"], xhr_hostname: "localhost", xhr_port: 8080, path_to_file_on_web_server: "/videos/example3.mp4", torrent_file : torrent.torrentFile.toString('base64'), SIZE_VIDEO_FILE : theVideoFileSize}, document.getElementById("myVideo10"), function(){webTorrentClient.destroy(); webTorrentClient = null; done();}, true);            
         });
      });
   }, 20000);
});
 