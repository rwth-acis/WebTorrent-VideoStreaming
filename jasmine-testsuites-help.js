require('events').EventEmitter.prototype._maxListeners = 20;
window.OakStreaming = require('./OakStreaming');
window.http = require('http');

document.body = document.createElement("body");

for(var i=1; i<17; i++){
  var para = document.createElement("video");
  para.id = "myVideo" + i;
  para.style.display = "none";
  document.body.appendChild(para);
}