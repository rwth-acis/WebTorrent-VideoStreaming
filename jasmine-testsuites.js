var theVideoFileSize = 788493;


describe("Testing whether the methods to explicitly add a peer to the swarm", function(){
  console.log("Version 2");
  
  var myStreaming12 = new OakStreaming();
  var myStreaming13 = new OakStreaming();
  var myStreaming14 = new OakStreaming();
  var myStreaming15 = new OakStreaming();
  var myStreaming16 = new OakStreaming();
  
  
  it("can establish a WebTorrent connection between two OakStreaming instances", function(done){    
    expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.

    myStreaming12.createSignalingData(function(signalingData){
      myStreaming13.createSignalingDataResponse(signalingData, function(signalingDataResponse){
        myStreaming12.processSignalingResponse(signalingDataResponse, done);
      });
    });
  }, 40000);

  
  it("can successfully connect two OakStreaming instances for streaming", function(done){
    expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.

    function callback(streamTicket){
      myStreaming13.receive_stream(streamTicket, document.getElementById("myVideo13"), function(){
        myStreaming12.destroy();
        myStreaming12 = null;
        done();
      }, true);
    }
      
    http.get({
      hostname: 'localhost',
      port: 8080,
      path: '/videos/example.mp4',
      headers: {
        range: 'bytes=' + 0 + '-' + theVideoFileSize-1
      }
    }, function (res){
      myStreaming12.create_stream(res, {web_server_URL: false, webTorrent_trackers: []}, callback);
    });
  }, 40000);
  
  
  it("can successfully connect three OakStreaming instances for streaming", function(done){
    expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
    var oneStreamingFinished = false;
    var numberOfEstablishedConnections = 0;
       
    myStreaming14.createSignalingData(function(signalingData){
      myStreaming15.createSignalingDataResponse(signalingData, function(signalingDataResponse){
        myStreaming14.processSignalingResponse(signalingDataResponse, function(){
                numberOfEstablishedConnections++;});
      });
    });
    myStreaming15.createSignalingData(function(signalingData){
      myStreaming16.createSignalingDataResponse(signalingData, function(signalingDataResponse){
        myStreaming15.processSignalingResponse(signalingDataResponse, function(){
                numberOfEstablishedConnections++;});
      });
    });       
      
    function createStreamCallback(streamTicket){ 
      myStreaming15.receive_stream(streamTicket, document.getElementById("myVideo15"), function(){
        if(oneStreamingFinished){
          myStreaming14.destroy();
          myStreaming14 = null;
          done();
        } else {
          oneStreamingFinished = true;
        }
      }, true);
      
      setTimeout(function(){
        myStreaming16.receive_stream(streamTicket, document.getElementById("myVideo16"), function(){
          if(oneStreamingFinished){
            myStreaming14.destroy();
            myStreaming14 = null;
            done();
          } else {
            oneStreamingFinished = true;
          }
        }, true);
      }, 500);
    }
      
    function streamWhenConnectionEstablished(res){
      if(numberOfEstablishedConnections === 2){
        myStreaming14.create_stream(res, {web_server_URL: false, webTorrent_trackers: []}, 
                createStreamCallback);
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
      streamWhenConnectionEstablished(res);
    });
  }, 40000);
});   


describe("Testing whether the create_stream method", function(){
  var myStreaming11 = new OakStreaming();
      
  it("creates the streamTicket object correctly",  function(done){     
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
    }, function (res){
      testTorrent = myStreaming11.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], 
              path_to_file_on_web_server: "/videos/example.mp4"}, callback);
    });
  }, 40000); 
});


describe("Testing whether the receive_stream method", function(){
  var myStreaming0 = new OakStreaming();
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


  it("is able to receive a video stream from a Web server", function(done){
    expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
    myStreaming1.receive_stream({xhr_hostname: "localhost", xhr_port: 8080, 
            path_to_file_on_web_server: "/videos/example2.mp4", SIZE_VIDEO_FILE: theVideoFileSize, 
            webTorrent_trackers: []}, 
            document.getElementById("myVideo1"), done, true);
  }, 80000);

  
  describe("is able to download the video via WebTorrent", function(){
    
    it("with one seeder and one downloader", function(done){
      expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
         
      req = http.get({
        hostname: 'localhost',
        port: 8080,
        path: "/videos/example.mp4",
        headers: {
          range: 'bytes=' + 0 + '-' + theVideoFileSize-1
        }
      }, function (res) {
        myStreaming2.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], 
                web_server_URL: false},  function(streamTicket){
          myStreaming3.receive_stream(streamTicket, document.getElementById("myVideo3"), 
          function(){
            myStreaming2.destroy();
            myStreaming2 = null;
            done();
          }, true);
        });
      });
    }, 80000); 

 
    it("with two seeders and one downloader", function(done){
      expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
       
      function createStreamCallback(streamTicket){
        setTimeout(function(){
          myStreaming5.receive_stream(streamTicket, document.getElementById("myVideo5"), function(){
            myStreaming6.receive_stream(streamTicket, document.getElementById("myVideo6"), function(){
              myStreaming4.destroy();
              myStreaming4 = null;
              myStreaming5.destroy();
              myStreaming5 = null;
              done();
            }, true);
          }, false);
        }, 500);
      }
       
      req = http.get({
        hostname: 'localhost',
        port: 8080,
        path: "/videos/example.mp4",
        headers: {
          range: 'bytes=' + 0 + '-' + theVideoFileSize-1
        }
      }, function (res){
        myStreaming4.create_stream(res, {webTorrent_trackers: ["ws://localhost:8085"], web_server_URL: 
                false}, createStreamCallback);  
      });
    }, 80000);  
  
   
    it("with one seeder and two downloaders", function(done){
      expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
      var numberOfPeersConnected = 0;
      var numberOfCompletedDownloads = 0;
      
      myStreaming7.createSignalingData(function(signalingData){
        myStreaming8.createSignalingDataResponse(signalingData, function(signalingDataResponse){
          myStreaming7.processSignalingResponse(signalingDataResponse, function(){
                  numberOfPeersConnected++;});
        });
      });
      myStreaming8.createSignalingData(function(signalingData){
        myStreaming9.createSignalingDataResponse(signalingData, function(signalingDataResponse){
          myStreaming8.processSignalingResponse(signalingDataResponse, function(){
                  numberOfPeersConnected++;});
        });
      });
     
      function checkFinished(){
        numberOfCompletedDownloads++;
        if(numberOfCompletedDownloads === 2){
          myStreaming7.destroy();
          myStreaming7 = null;
          done();
        }
      }
      
      function createStreamCallback (streamTicket){
        myStreaming8.receive_stream(streamTicket, document.getElementById("myVideo8"), checkFinished,
                true);
          
        setTimeout(function(){myStreaming9.receive_stream(streamTicket, document.getElementById("myVideo9"), 
                checkFinished, true);}, 300);
      };   

      function streamWhenInstancesConnected(res){
        if(numberOfPeersConnected === 2){
          myStreaming7.create_stream(res, {webTorrent_trackers: [], web_server_URL: false}, 
                  createStreamCallback);
        } else {
          setTimeout(function(){streamWhenInstancesConnected(res)}, 500); 
        }
      };
      req = http.get({
        hostname: 'localhost',
        port: 8080,
        path: "/videos/example.mp4",
        headers: {
          range: 'bytes=' + 0 + '-' + theVideoFileSize-1
        }
      }, function (res){            
        streamWhenInstancesConnected(res);
      });
    }, 40000);    
  });
   
   
  it("is able to receive a video stream via peer-assisted delivery", function(done){    
    expect(true).toBe(true); // Every Jasmine spec has to have an expect expression.
    req = http.get({
      hostname: 'localhost',
      port: 8080,
      path: "/videos/example.mp4",
      headers: {
        range: 'bytes=' + 0 + '-' + theVideoFileSize-1
      }
    }, function (res){
      myStreaming0.create_stream({webTorrent_trackers: ["ws://localhost:8085"], web_server_URL: 
              "http://localhost:8080", path_to_file_on_web_server: "/videos/example3.mp4"}, 
              function(streamTicket){
        myStreaming10.receive_stream(streamTicket, document.getElementById("myVideo10"), function(){
          myStreaming0.destroy();
          myStreaming0 = null;
          done();
        }, true);        
      });            
    });
  }, 40000);
});