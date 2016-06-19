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
      if(options.webTorrentTrackers){
         seedingOptions = {announceList : options.webTorrentTrackers};
      }   
      
      webTorrentClient.seed(videoFile, seedingOptions, function(torrent){
         console.log("torrent file is seeded");
         streamInformationObject = {
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