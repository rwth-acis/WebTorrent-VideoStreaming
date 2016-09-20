// WebTorrent-Hybrid in der aktuellen version in Windows nicht benutzbar, da xvfb gebraucht wird.

var Xvfb = require('xvfb');
var xvfb = new Xvfb();
xvfb.startSync();

var WebTorrent = require('webtorrent-hybrid');

module.exports = OakStreaming;


function OakStreaming(OakName){
   this.peerId = 1234567898765;
   this.OakName = OakName;     
   this.streamVideo = function (videoFile, options, callback){ 
      var webTorrentClient = new WebTorrent(); 
      
      var seedingOptions = {};
      seedingOptions.announceList = options.webTorrentTrackers;     
      seedingOptions.path = options.path;
      
      webTorrentClient.seed(videoFile, seedingOptions, function(torrent){
         console.log("torrent file is seeded");
         var streamInformationObject = {
            bufferSize : options.bufferSize,
            videoFileSize : torrent.files[0].length,
            XHRPath : options.XHRPath,
            torrentFile : torrent.torrentFile,
            XHRPort : options.XHRPort,
            magnetURI : torrent.magnetURI
         };             
         callback(streamInformationObject);
      });
   };
}