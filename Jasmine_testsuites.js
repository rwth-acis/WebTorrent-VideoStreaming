var theVideoFileSize = 788493;


describe("Testing if manuallyAddingPeer methods", function(){
   var myStreaming1 = new OakStreaming();
   var myStreaming2 = new OakStreaming();
   var myStreaming3 = new OakStreaming();
   
   var twoPeersAreConnected = false;
   var threePeersAreConnected = false;
   var theTorrent;
   
   it("can establish a WebTorrent connection between two OakStreaming instances", function(done){
      var receivedCallbacks = 0;
         
      expect(true).toBe(true); // every Jasmine it has to have an expect expression
            
      myStreaming1.forTesting_connectedToNewWebTorrentPeer(function(){
         if(receivedCallbacks === 1){
            twoPeersAreConnected = true;
            done();
         } else {
            receivedCallbacks++;
         }
      });
      myStreaming2.forTesting_connectedToNewWebTorrentPeer(function(){
         if(receivedCallbacks === 1){
            twoPeersAreConnected = true;            
            done();
         } else {
            receivedCallbacks++;
         }
      });      
      myStreaming1.createSignalingData(function(signalingData){
         myStreaming2.createSignalingDataResponse(signalingData, function(signalingDataResponse){
            myStreaming1.processSignalingResponse(signalingDataResponse);
         });
      });
   }, 5000);
   
   it("can successfully connect two OakStreaming instances for streaming", function(done){
      expect(true).toBe(true); // every Jasmine it has to have an expect expression   
      
      function callback(streamInformationObject){
         myStreaming2.loadVideo(streamInformationObject, done, true);
      }
      
      function streamWhenConnectionEstablished(){
         if(twoPeersAreConnected){
            testTorrent = myStreaming1.streamVideo(res, {webTorrentTrackers: [["ws://localhost:8081"]]}, callback, 6257923579344);
         } else {
            setTimeout(streamWhenConnectionEstablished, 500);
         }
      }
      
      http.get({
         hostname: 'localhost',
         port: 8080,
         path: '/example.mp4',
         headers: {
            range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res){
            streamWhenConnectionEstablished();
      });
   }, 30000);
   
   it("can automatically establish a WebTorrent connections between three OakStreaming instances", function(done){
      expect(true).toBe(true); // every Jasmine it has to have an expect expression
      
      var receivedCallbacks = 0;
            
      myStreaming1.forTesting_connectedToNewWebTorrentPeer(function(){
         if(receivedCallbacks === 6){
            threePeersAreConnected = true;
            done();
         } else {
            receivedCallbacks++;
         }
      });
      myStreaming2.forTesting_connectedToNewWebTorrentPeer(function(){
         if(receivedCallbacks === 6){
            threePeersAreConnected = true;            
            done();
         } else {
            receivedCallbacks++;
         }
      });
      myStreaming3.forTesting_connectedToNewWebTorrentPeer(function(){
         if(receivedCallbacks === 6){
            threePeersAreConnected = true;            
            done();
         } else {
            receivedCallbacks++;
         }
      });      
      myStreaming2.createSignalingData(function(signalingData){
         myStreaming3.createSignalingDataResponse(signalingData, function(signalingDataResponse){
            myStreaming2.processSignalingResponse(signalingDataResponse);
         });
      });
      
   },20000);
   
   it("can successfully connect three OakStreaming instances for streaming", function(done){
      expect(true).toBe(true); // every Jasmine it has to have an expect expression   
      var oneStreamingCompleted = false;
      
      function callback(streamInformationObject){
         myStreaming1.loadVideo(streamInformationObject, function(){
            if(oneStreamingCompleted){
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
         myStreaming2.loadVideo(streamInformationObject,  function(){
            if(oneStreamingCompleted){
               done();
            } else {
               oneStreamingCompleted = true;
            }
         }, true);
      }
      
      function streamWhenConnectionEstablished(res){
         if(threePeersAreConnected){
            myStreaming3.streamVideo(res, {webTorrentTrackers: [["ws://localhost:8081"]]}, callback, 6257923579344);
         } else {
         setTimeout(function (){streamWhenConnectionEstablished(res);}, 500);
         }
      }
      
      http.get({
         hostname: 'localhost',
         port: 8080,
         path: '/example.mp4',
         headers: {
            range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res){
            streamWhenConnectionEstablished(res);
      });
   }, 30000);
}   



describe("Testing if streamVideo method", function(){
   var myStreaming = new OakStreaming();
      
   it("creates streamInformationObject correctly",  function(done){ 
      
      function callback (streamInformationObject){
         expect(streamInformationObject.videoFileSize).toEqual(theVideoFileSize);
         expect(streamInformationObject.XHRPath).toMatch("/example.mp4");
         done();
      }
      http.get({
         hostname: 'localhost',
         port: 8080,
         path: '/example.mp4',
         headers: {
            range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res){
         testTorrent = myStreaming.streamVideo(res, {XHRPath : "/example.mp4", webTorrentTrackers: [["ws://localhost:8081"]]}, callback, 6257923579344);
      });
   }, 30000); 
});

describe("Testing if loadVideo method", function(){
   var myStreaming = new OakStreaming();
   var myStreaming2 = new OakStreaming();
   var myStreaming3 = new OakStreaming();
   
   it("loads the video fast enough via server delivery", function(done){
      expect(true).toBe(true); // necessary because Jasmine wants at least one expect per it.
      myStreaming.loadVideo({XHRPath : "/example2.mp4", videoFileSize : theVideoFileSize}, done);
   }, 10000);
     
   describe("loads the video fast enough via WebTorrent delivery", function(){
      it("with one seeder and one downloader", function(done){
         expect(true).toBe(true);
         
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/example.mp4",
            headers: {
                range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {  
               myStreaming.streamVideo(res, {webTorrentTrackers: [["ws://localhost:8081"]]}, function(streamInformationObject){
                  myStreaming2.loadVideo(streamInformationObject, done);  
               });
         });
      }, 15000); 
      
      it("with two seeders and one downloader", function(done){
         expect(true).toBe(true);
         
         function callback(streamInformationObject){
            myStreaming2.loadVideo(streamInformationObject, function(){
               myStreaming3.loadVideo(streamInformationObject, done);
            });
         }
         
         req = http.get({
            hostname: 'localhost',
            port: 8080,
            path: "/example.mp4",
            headers: {
                range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {  
               myStreaming.streamVideo(res, {webTorrentTrackers: [["ws://localhost:8081"]]}, callback);
         });
      }, 20000);  

      it("with one seeder and two downloaders", function(done){
         expect(true).toBe(true);
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
            path: "/example.mp4",
            headers: {
                range: 'bytes=' + 0 + '-' + theVideoFileSize-1
            }
         }, function (res) {  
               myStreaming.streamVideo(res, {webTorrentTrackers: [["ws://localhost:8081"]]}, callback);
         });
      }, 20000);    
   });
   
   it("loads the video fast enough via peer-assisted delivery", function(done){
      expect(true).toBe(true); // every Jasmine it has to have an expect expression
      req = http.get({
         hostname: 'localhost',
         port: 8080,
         path: "/example.mp4",
         headers: {
             range: 'bytes=' + 0 + '-' + theVideoFileSize-1
         }
      }, function (res) {
         var webTorrentClient = new WebTorrent();
         webTorrentClient.seed(res, function onSeed (torrent){
            myStreaming.loadVideo({XHRPath: "/example3.mp4", torrentFile : torrent.torrentFile, webTorrentTrackers: [["ws://localhost:8081"]], videoFileSize : theVideoFileSize}, done);            
         });
      });
   }, 20000);
});