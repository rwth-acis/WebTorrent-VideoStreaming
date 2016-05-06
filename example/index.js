(function(){
var http = require('http');
var MultiStream = require('multistream');
var util = require('util');
var Readable = require('stream').Readable;
var videostream = require('../');
var myVideo = document.getElementById("myVideo");
var RequestedRanges = [];
var ReceivedRanges = [];
var theCoolCounter = 0;
var consoleCounter = 0;
var firstCreateReadStream = true;
var first500ByteBuffer = null;
var globalCreateReadStreamCounter = 0;
var xhrhappened = false;
var fileSize = -1;


console.log("Program starts");
var REQUEST_SIZE = 500000 // 500 kibibyte
var file = function (path) {
	this.path = path
}
file.prototype.createReadStream = function (opts){
   var createReadStreamCounter = ++globalCreateReadStreamCounter;
   console.log(consoleCounter++ + " called createreadStream " + createReadStreamCounter);
   opts = opts || {};
   var start = opts.start || 0;
   var self = this;
   console.log(consoleCounter++ + " opts.start: " + opts.start);
   console.log(consoleCounter++ + " opts.end: " + opts.end);   
   var req = null;
   //var end = opts.end ? (opts.end + 1) : fileSize;
   var end = isNaN(opts.end) ? fileSize : (opts.end + 1);
   var CBcount = 0;

   var multi = new MultiStream(function (cb){
      var thisCBNumber = ++CBcount;
      
      if(theCoolCounter<7){
         console.log(consoleCounter++ + "    " + thisCBNumber + ". call of function(cb) from " + createReadStreamCounter);
         console.log(consoleCounter++ + "    start: " + start);
      }
      var reqStart = start;
      if(!firstCreateReadStream && reqStart < 500){
         var rs = new Readable();
         rs.push(first500ByteBuffer.slice(reqStart, 501));
         rs.push(null);
         start += 500-reqStart;
         return cb(null, rs);
      }
      var reqEnd = reqStart + REQUEST_SIZE;
      if (end >= 0 && reqEnd > end){
         reqEnd = end;
      }
      if (reqStart >= reqEnd){
         req = null;
         return cb(null, null);
      }
      if(firstCreateReadStream){
         reqEnd = reqEnd - REQUEST_SIZE + 500;
      }
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
      var numberBytesOfResponse = 0;
      var videoDataBuffer = Buffer.allocUnsafe(reqEnd-reqStart); 
         
      function XHRDataHandler(chunk){
         if(theCoolCounter<7){
            console.log(consoleCounter++, "BAM In XHRDataHandler from readStream ", createReadStreamCounter, "and thisCBNumber", thisCBNumber , "and numberBytesOfResponse:", numberBytesOfResponse);
            console.log(consoleCounter++, "chunk size:", chunk.length);
         }
         videoDataBuffer.fill(chunk, numberBytesOfResponse, numberBytesOfResponse + chunk.length);
         numberBytesOfResponse += chunk.length; 
      }

      function XHREnd(){       
         if(theCoolCounter<7){
            console.log(consoleCounter++ + " XHREnd from readstreamNumber " + createReadStreamCounter + " and thisCBNumber " + thisCBNumber + " gets executed");
         }
         xhrhappened = true;
         var rs = new Readable();
         rs.push(videoDataBuffer);
         rs.push(null);
         if(theCoolCounter<7){
            console.log(consoleCounter++ + " In XHREnd numberBytesOfResponse: " + numberBytesOfResponse);
            theCoolCounter++;
         }
         start += numberBytesOfResponse;
 
         // Ist dafür da wenn es im Hybrid Modus läuft
         ReceivedRanges.push(
            {
            "start": reqStart,
            "end": reqEnd
            }            
         );
         if(firstCreateReadStream){
            first500ByteBuffer = Buffer.allocUnsafe(500);
            first500ByteBuffer.fill(videoDataBuffer, 0, 500);
            firstCreateReadStream = false;
         }
         cb(null, rs);
      }      

      req = http.get({
            path: self.path,
            headers: {
               range: 'bytes=' + reqStart + '-' + (reqEnd - 1)
               }
         }, function (res){
            var contentRange = res.headers['content-range']
            if (contentRange) {
               fileSize = parseInt(contentRange.split('/')[1], 10)
            }
            console.log("function(res) is executed from readstream number " + createReadStreamCounter + " and CB number " + thisCBNumber);
            if(theCoolCounter<7){
               console.log("fileSize: " + fileSize);
            }
            res.on('end', XHREnd);
            res.on('data', XHRDataHandler);             
         }
      ); 
   });
   console.log(consoleCounter++ + " terminate createReadStream");
   return multi;
};

var video = document.querySelector('video')
video.addEventListener('error', function (err) {
   console.error(video.error)
})
videostream(new file('bam.mp4'), video);
})();