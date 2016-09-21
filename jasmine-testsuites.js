var theVideoFileSize = 788493;

/*
describe("Testing if manuallyAddingPeer methods", function(){   
  var twoPeersConnectedForTest2 = false;
  var threePeersAreConnected = false;
  var twoPeersStreamedToAnother = false;
  var testTorrentA, testTorrentB, testTorrentC, testTorrentD, testTorrentE;
  var myStreamingA = new OakStreaming();
  var myStreamingB = new OakStreaming();
  var myStreamingC = new OakStreaming();
  var myStreamingD = new OakStreaming();
  var myStreamingE = new OakStreaming();
  
  it("can establish a WebTorrent connection between two OakStreaming instances", function(done){
    expect(true).toBe(true); // every Jasmine spec has to have an expect expression

    myStreamingA.createSignalingData(function(signalingData){
      myStreamingB.createSignalingDataResponse(signalingData, function(signalingDataResponse){
        myStreamingA.processSignalingResponse(signalingDataResponse, function(){console.log("Test case 1: Peers are connected"); twoPeersConnectedForTest2 = true; done();});
      });
    });
  }, 40000);

  
  it("can successfully connect two OakStreaming instances for streaming", function(done){
    expect(true).toBe(true); // every Jasmine spec has to have an expect expression

    function callback(streamTicket, torrent){
      testTorrentA = torrent;
      console.log("First spec, second test. Stream_Information: " + JSON.stringify(streamTicket));
      console.log("First spec, second test case: the callback from create_stream is called");
      myStreamingB.receive_stream(streamTicket, function(){console.log("First spec, second test. receive_stream callback is called: "); testTorrentA.destroy(); twoPeersStreamedToAnother = true; myStreamingA = null; myStreamingB = null; done();}, true); // vorher false
    }
      
      function streamWhenConnectionEstablished(res){

         if(twoPeersConnectedForTest2){
            console.log("First spec, second test case: create_stream is called");
            myStreamingA.create_stream(res, {web_server_URL: false, webTorrent_trackers: []}, callback, "Return torrent");
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
  }, 40000);
   
 
   it("can successfully connect three OakStreaming instances for streaming", function(done){
      expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.   
      var oneStreamingCompleted = false;
      //var testTorrent;
      var numberOfDirectlyEstablishedConnections = 0;
      
      
      myStreamingC.createSignalingData(function(signalingData){
        myStreamingD.createSignalingDataResponse(signalingData, function(signalingDataResponse){
          myStreamingC.processSignalingResponse(signalingDataResponse, function(){console.log("Test case 3: Peers are connected"); numberOfDirectlyEstablishedConnections++;});
        });
      });
      myStreamingD.createSignalingData(function(signalingData){
         myStreamingE.createSignalingDataResponse(signalingData, function(signalingDataResponse){
            myStreamingD.processSignalingResponse(signalingDataResponse, function(){console.log("For third spec peers connected"); numberOfDirectlyEstablishedConnections++});
         });
      });       
      
      function createStreamCallback(streamTicket, torrent){
         console.log("callback from last new spec is called");
         testTorrentC = torrent;
         myStreamingE.receive_stream(streamTicket, function(){
            console.log("last new spec. callback of myStreamingE.receive_stream");
            if(oneStreamingCompleted){
               testTorrentC.destroy();
               myStreamingC = null;
               myStreamingD = null;
               myStreamingE = null;
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
         myStreamingD.receive_stream(streamTicket, function(){
            console.log("last new spec. callback of myStreamingD.receive_stream");
            if(oneStreamingCompleted){
               testTorrentC.destroy();
               myStreamingC = null;
               myStreamingD = null;
               myStreamingE = null;
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
      }
      
      function streamWhenConnectionEstablished(res){
         if(numberOfDirectlyEstablishedConnections >= 2){
            console.log("last new spec. video gets streamed from myStreamingE");
            myStreamingC.create_stream(res, {web_server_URL: false, webTorrent_trackers: []}, createStreamCallback, "Return torrent", false);
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


describe("Testing if create_stream method", function(){
   var myStreaming = new OakStreaming();
      
   it("creates streamTicket correctly",  function(done){     
      function callback (streamTicket){
         expect(streamTicket.SIZE_VIDEO_FILE).toEqual(theVideoFileSize);
         expect(streamTicket.path_to_file_on_web_server).toMatch("/videos/example.mp4");
         myStreaming = null;
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
         testTorrent = myStreaming.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], path_to_file_on_web_server: "/videos/example.mp4"}, callback, "Return torrent", true);
      });
   }, 30000); 
});
*/
describe("Testing if receive_stream method", function(){
  /*
  var myStreaming1 = new OakStreaming();
  var myStreaming2 = new OakStreaming();
  var myStreaming3 = new OakStreaming();
   */
  var myStreaming4 = new OakStreaming();
  var myStreaming5 = new OakStreaming();
 
  var myStreaming3 = null;
  var myStreaming6 = new OakStreaming();
  var myStreaming7 = new OakStreaming();
  var myStreaming8 = new OakStreaming();
  var myStreaming9 = new OakStreaming();
  // var myStreaming10 = new OakStreaming();

   /*
   it("loads the video fast enough via server delivery", function(done){
      expect(true).toBe(true); // necessary because Jasmine wants at least one expect per it.
      myStreaming1.receive_stream({webTorrent_trackers: ["ws://localhost:8085"], xhr_hostname: "localhost", xhr_port: 8080, path_to_file_on_web_server: "/videos/example2.mp4", SIZE_VIDEO_FILE: theVideoFileSize}, function(){myStreaming1 = null; done()});
   }, 20000);
    */ 
   describe("loads the video fast enough via WebTorrent delivery", function(){
     /*
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
                  myStreaming3.receive_stream(streamTicket, function(){myStreaming2 = null; myStreaming3 = null; done();});  
               });
         });
      }, 400000); 
      */
      it("with two seeders and one downloader", function(done){
        console.log("Version AM");
         expect(true).toBe(true); // every Jasmine spec has to have an expect expression
         
         //myStreaming3 = null; // nur zum Test nicht drinn lassen!!
         function createStreamCallback(streamTicket){
            myStreaming5.receive_stream(streamTicket, function(){
               myStreaming6.receive_stream(streamTicket, function(){myStreaming4.destroy(); myStreaming4 = null; myStreaming5.destroy(); myStreaming5 = null; myStreaming6.destroy(); myStreaming6 = null; done();});
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
      }, 600000);  

      it("with one seeder and two downloaders", function(done){
         expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
         var numberOfCompletedDownloads = 0;
         
         var checkIfSpecFinished = function() {
           console.log("checkIfSpecFinished is called");
           numberOfCompletedDownloads++;
            if(numberOfCompletedDownloads >= 2){
                myStreaming7 = null;
                myStreaming8 = null;
                myStreaming9 = null;
                console.log("done is called");
               done();
            }
         };       
         var createStreamCallback = function (streamTicket){
            console.log("The two receive_stream calls");
            setTimeout(function(){myStreaming8.receive_stream(streamTicket, checkIfSpecFinished);},1000);
            setTimeout(function(){myStreaming9.receive_stream(streamTicket, checkIfSpecFinished);},500);
         };   

          var createStreamWhenOtherTestComplete = function(res){
            console.log("createStreamWhenOtherTestComplete() is called");
            if(!myStreaming6){
              console.log("myStreaming7.create_stream() gets executed");
              myStreaming7.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], web_server_URL: false}, createStreamCallback);
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
      }, 600000);    
   });
   /*
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
            myStreaming10.receive_stream({webTorrent_trackers: ["ws://localhost:8085"], xhr_hostname: "localhost", xhr_port: 8080, path_to_file_on_web_server: "/videos/example3.mp4", torrent_file : torrent.torrentFile.toString('base64'), SIZE_VIDEO_FILE : theVideoFileSize}, function(){webTorrentClient = null; myStreaming10 = null; done();});            
         });
      });
   }, 400000);
   */
});
 