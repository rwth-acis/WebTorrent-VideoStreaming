var theVideoFileSize = 788493;


describe("Testing if streamVideo method", function(){
   var myStreaming = new OakStreaming(42);
      
   it("creates streamInformationObject correctly",  function(done){
      function callback (streamInformationObject){
         //expect(streamInformationObject.magnetURI).toMatch("magnet:?xt=urn:btih:1b5169e27e943cd615b1e10ba98e9e4a0b2086b8&dn=example.mp4&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io");
         expect(streamInformationObject.videoFileSize).toEqual(theVideoFileSize);
         expect(streamInformationObject.XHRPath).toMath("example.mp4");
         streamInformationObject.torrent.destroy();
         done();
      }
      req = http.get({
         hostname: 'localhost',
         port: 8080,
         path: "/example.mp4",
         headers: {
             range: 'bytes=' + 0 + '-' + theVideoFileSize
         }
      }, function (res) {
         myStreaming.streamVideo(res, {XHRPath : "example.mp4"}, callback);
      });
   }, 30000); 
   
   it("seeds the passed video file successfully", function(callback){
      var webTorrentClient = new WebTorrent();
      webTorrentClient.add("magnet:?xt=urn:btih:1b5169e27e943cd615b1e10ba98e9e4a0b2086b8&dn=example.mp4&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io", {}, function(){
         torrent.on('done', function(){
            torrent.destroy();
            callback();
         });
      });
   }, 15000);
});

describe("Testing if loadVideo method", function(){
   var myStreaming = new OakStreaming(42);
   
   it("loads the video fast enough via server delivery", function(done){
      myStreaming.loadVideo({XHRPath : "example.mp4", videoFileSize : theVideoFileSize}, done);
   }, 11000);
   
   
   it("loads the video fast enough via WebTorrent delivery", function(done){
      req = http.get({
         hostname: 'localhost',
         port: 8080,
         path: "/example.mp4",
         headers: {
             range: 'bytes=' + 0 + '-' + theVideoFileSize
         }
      }, function (res) {
         var webTorrentClient = new WebTorrent();
         webTorrentClient.seed(res, {}, function onSeed (torrent){
            myStreaming.loadVideo({magnetURI : torrent.magnetURI, videoFileSize : theVideoFileSize}, done);            
         });
      });
   }, 20000);
   
   
   it("loads the video fast enough via peer-assisted delivery", function(done){
      req = http.get({
         hostname: 'localhost',
         port: 8080,
         path: "/example.mp4",
         headers: {
             range: 'bytes=' + 0 + '-' + theVideoFileSize
         }
      }, function (res) {
         var webTorrentClient = new WebTorrent();
         webTorrentClient.seed(res, function onSeed (torrent){
            myStreaming.loadVideo({XHRPath: "example.mp4", magnetURI : torrent.magnetURI, videoFileSize : theVideoFileSize}, done);            
         });
      });
   }, 20000);
});
