(function(){
var http = require('http');
var MultiStream = require('multistream');
var util = require('util');
var Readable = require('stream').Readable;
var readableStream = require('readable-stream');
var videostream = require('../');
var WebTorrent = require('webtorrent');
var myVideo = document.getElementById("myVideo");
var theCoolCounter = 0;
var consoleCounter = 0;
//var firstCreateReadStream = true;
//var first500ByteBuffer = Buffer.allocUnsafe(500);
var globalCreateReadStreamCounter = 0;
//var xhrhappened = false;
var fileSize = -1;
//var first500ByteBufferFull = false;
var bytesReceivedFromServer = 0;
var theTorrent;
var webTorrentFile;
var createReadStreamHandlers = [];
var inCritical = true;


var client = new WebTorrent();
client.add('magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d&dn=sintel.mp4&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=wss%3A%2F%2Ftracker.webtorrent.io', function (torrent){
   console.log("torrent meta data ready");
   theTorrent = torrent;
   webTorrentFile = torrent.files[0];
   webTorrentFile.deselect();
   
   for(var i=0, length=createReadStreamHandlers.length; i<length; i++){
      var thisRequest = createReadStreamHandlers[i];
      if(thisRequest.webTorrentStream !==  null && thisRequest.currentCB !== null){
         thisRequest.webTorrentStream = webTorrentFile.createReadStream({"start" : thisRequest.start, "end" : webTorrentFile.length});
         webTorrentStream.pause();
         thisRequest.oldStartWebTorrent = thisRequest.start;
         thisRequest.webTorrentStream = webTorrentStream;
         webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
         webTorrentStream.resume();
         /*
         (thisRequest.webTorrentStream).on('readable', () => {
           var chunk;
           if(null !== (chunk = (thisRequest.webTorrentStream).read())){
               if(thisRequest.start-thisRequest.oldStartWebTorrent < chunk.length){
                  var videoDataBuffer = Buffer.allocUnsafe(chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent));
                  thisRequest.answerStream.push(videoDataBuffer.fill(chunk, thisRequest.start-thisRequest.oldStartWebTorrent, chunk.length));
                  thisRequest.bytesInAnswerStream += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
                  thisRequest.start += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
               }
               thisRequest.oldStartWebTorrent += chunk.length;
               ceckIfAnswerStreamReady(thisRequest); 
            }
         });
         */
      }
   }
});   


updateChart();
frequentlyCeckIfAnswerStreamReady();
checkIfBufferFullEnough();
console.log("Program starts");
var REQUEST_SIZE = 500000 // 500 kibibyte
var file = function (path) {
	this.path = path
}
file.prototype.createReadStream = function (opts){
   console.log(consoleCounter++ + " opts.start: " + opts.start);
   console.log(consoleCounter++ + " opts.end: " + opts.end);
   var createReadStreamCounter = ++globalCreateReadStreamCounter;
   var CBcount = 0;
   console.log(consoleCounter++ + " called createreadStream " + createReadStreamCounter);
   var thisRequest = new VideostreamRequestHandler(createReadStreamCounter, opts);
   var MyWriteableStream = function(){ // step 2
      readableStream.Writable.call(this);
   };
   util.inherits(MyWriteableStream, readableStream.Writable); // step 1
   MyWriteableStream.prototype._write = function(chunk, encoding, done){ // step 3
      if(thisRequest.start-thisRequest.oldStartWebTorrent < chunk.length){
         var videoDataBuffer = Buffer.allocUnsafe(chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent));
         thisRequest.answerStream.push(videoDataBuffer.fill(chunk, thisRequest.start-thisRequest.oldStartWebTorrent, chunk.length));
         thisRequest.bytesInAnswerStream += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
         thisRequest.start += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
      }
      thisRequest.oldStartWebTorrent += chunk.length;
      if(ceckIfAnswerStreamReady(thisRequest)){
         return;
      } 
      done();
   };
   thisRequest.collectorStreamForWebtorrent = new MyWriteableStream(); // instanciate your brand new stream
   createReadStreamHandlers.push(thisRequest);
   
   if(webTorrentFile){
      var webTorrentStream = webTorrentFile.createReadStream({"start" : opts.start, "end" : webTorrentFile.length});
      webTorrentStream.pause();
      thisRequest.webTorrentStream = webTorrentStream;
      webTorrentStream.pipe(thisRequest.collectorStreamForWebtorrent);
      webTorrentStream.resume();
      /*
      webTorrentStream.on('data', (chunk) => {
         if(thisRequest.start-thisRequest.oldStartWebTorrent < chunk.length){
            var videoDataBuffer = Buffer.allocUnsafe(chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent));
            thisRequest.answerStream.push(videoDataBuffer.fill(chunk, thisRequest.start-thisRequest.oldStartWebTorrent, chunk.length));
            thisRequest.bytesInAnswerStream += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
            thisRequest.start += chunk.length - (thisRequest.start-thisRequest.oldStartWebTorrent);
         }
         thisRequest.oldStartWebTorrent += chunk.length;
         ceckIfAnswerStreamReady(thisRequest); 
      });
      */
   }
              
   var self = this;   
   var req = null;
   //var end = opts.end ? (opts.end + 1) : fileSize;
   var end = isNaN(thisRequest.opts.end) ? fileSize : (thisRequest.opts.end + 1);     
   var conductingXHRRequest = false;
   
   
   var multi = new MultiStream(function (cb){
      thisRequest.currentCB = cb;
      if(ceckIfAnswerStreamReady(thisRequest)){
         return;
      }
      if(thisRequest.webTorrentStream){
         thisRequest.webTorrentStream.resume();
      }
      var thisCBNumber = ++CBcount;
      
      if(inCritical && !conductingXHRRequest){
         conductingXHRRequest = true;
         if(theCoolCounter<7){
            console.log(consoleCounter++ + "    " + thisCBNumber + ". call of function(cb) from " + createReadStreamCounter);
            console.log(consoleCounter++ + "    start: " + thisRequest.start);
         }
         var reqStart = thisRequest.start;
         /*
         if(!firstCreateReadStream && reqStart < 500){
            var rs = new Readable();
            rs.push(first500ByteBuffer.slice(reqStart, 501));
            rs.push(null);
            start += 500-reqStart;
            return cb(null, rs);
         }
         */
         var reqEnd = reqStart + REQUEST_SIZE;
         if (end >= 0 && reqEnd > end){
            reqEnd = end;
         }
         if (reqStart >= reqEnd){
            req = null;
            return cb(null, null);
         }
         /*
         if(firstCreateReadStream){
            reqEnd = reqEnd - REQUEST_SIZE + 500;
         }
         */
         if(theCoolCounter<7){
            console.log(consoleCounter++ + " reqStart: " + reqStart);
            console.log(consoleCounter++ + " reqEnd: " + reqEnd);
         }
        
         //console.log("reqStart before ceck: " + reqStart);
         //console.log("reqEnd before ceck: " + reqEnd);
         /* NFUT64 Brauche ich glaube ich garnicht
         for(var k=0, length=RequestedRanges.length; k<length; k++){
            if(RequestedRanges[k].end >= reqStart && reqEnd >= RequestedRanges[k].start){
               if(reqEnd >= RequestedRanges[k].end){
                  reqStart = RequestedRanges[k].end+1;
               } else {
                  reqEnd = RequestedRanges[k].start-1;
               }           
            }    
         }
         */ 
         //console.log("reqStart AFTER ceck: " + reqStart);
         //console.log("reqEnd AFTER ceck: " + reqEnd);
         //Belong to NFUT64: RequestedRanges.push(theReq);
         //endXHRRequest = false;
         console.log("Conducting XHR request");
           
         function XHRDataHandler(chunk){
            if(theCoolCounter<7){
               console.log(consoleCounter++, "BAM In XHRDataHandler from readStream ", createReadStreamCounter, "and thisCBNumber", thisCBNumber);
               console.log(consoleCounter++, "chunk size:", chunk.length);
            }
            bytesReceivedFromServer += chunk.length;
            if(thisRequest.start-thisRequest.oldStartServer < chunk.length){
               var videoDataBuffer = Buffer.allocUnsafe(chunk.length - (thisRequest.start-thisRequest.oldStartServer));
               thisRequest.answerStream.push(videoDataBuffer.fill(chunk, thisRequest.start-thisRequest.oldStartServer, chunk.length));
               thisRequest.start += chunk.length - (thisRequest.start-thisRequest.oldStartServer);
            }
            thisRequest.oldStartServer += chunk.length;
            if(ceckIfAnswerStreamReady(thisRequest)){
               return;
            }
         }
         
         function XHREnd(){
            conductingXHRRequest = false;               
         }
      
         req = http.get({
               path: self.path,
               headers: {
                  range: 'bytes=' + reqStart + '-' + (reqEnd - 1)
                  }
            }, function (res){
               var contentRange = res.headers['content-range']
               if (contentRange){
                  fileSize = parseInt(contentRange.split('/')[1], 10)
               }
               console.log("function(res) is executed from readstream number " + createReadStreamCounter + " and CB number " + thisCBNumber);
               res.on('end', XHREnd);
               res.on('data', XHRDataHandler);             
            }
         ); 
      }
   });
   console.log(consoleCounter++ + " terminate createReadStream");
   return multi;
};

function ceckIfAnswerStreamReady(thisRequest){
   if(webTorrentFile && (thisRequest.bytesInAnswerStream >= 500 || thisRequest.start >= webTorrentFile.length)){ 
      thisRequest.answerStream.push(null);
      thisRequest.webTorrentStream.pause();
      thisRequest.bytesInAnswerStream = 0;
      var res = thisRequest.answerStream; 
      thisRequest.answerStream = new readable();
      var theCallbackFunction = thisRequest.currentCB;
      thisRequest.currentCB = null;
      theCallbackFunction(null, res);
      return true;
   }
   return false;
}

function updateChart(){
   if(theTorrent){
      document.getElementById("WebTorrent-received").innerHTML = "file.length: " + webTorrentFile.length + "\n torrent.downloaded: " + theTorrent.downloaded + "\n torrent.uploaded: " + theTorrent.uploaded + "\n torrent.progress: " + theTorrent.progress + "\n Bytes received from server: " + bytesReceivedFromServer;
   }
   setTimeout(updateChart, 2000);
}

function VideostreamRequestHandler(readStreamNumber, opts){
   this.readStreamNumber = readStreamNumber;
   this.opts = opts;
   this.start = opts.start;
   this.oldStartWebTorrent = opts.start;
   this.oldStartServer = opts.start;
   this.currentCB = null;
   this.webTorrentStream = null;
   this.answerStream = new Readable();
   this.bytesInAnswerStream = 0;
   this.collectorStreamForWebtorrent = null;
}

function frequentlyCeckIfAnswerStreamReady(){
   for(var i=0, length=createReadStreamHandlers.length; i<length; i++){
      var thisRequest = createReadStreamHandlers[i];
      ceckIfAnswerStreamReady(thisRequest);
   }
   setTimeout(frequentlyCeckIfAnswerStreamReady,500);
}

function checkIfBufferFullEnough(){
   var timeRanges = document.querySelector('video').buffered;
   for(var i=0, length=timeRanges.length; i<length; i++){
      if(myVideo.currentTime >= timeRanges.start(i) && myVideo.currentTime <= timeRanges.end(i)){
         if(timeRanges.end(i)-myVideo.currentTime >= 2){
            inCritical = false;
            criticalByteCounter = -1;
            console.log("I set inCritical to false");
         } else {
            if(criticalByteCounter === -1){
               criticalByteCounter = 0;
            }
            inCritical = true;
            // startXHRRequest(); füge ich später hinzu
            console.log("I set inCritical to true;");
         }
      }   
   }
   setTimeout(checkIfBufferFullEnough,500);   
}

var video = document.querySelector('video')
video.addEventListener('error', function (err) {
   console.error(video.error)
})
videostream(new file('sintel.mp4'), video);
})();