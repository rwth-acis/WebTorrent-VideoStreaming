require('events').EventEmitter.prototype._maxListeners = 20;
window.OakStreaming = require('./OakStreaming');
window.http = require('http');
window.WebTorrent = require('webtorrent');


document.body = document.createElement("body");

for(var i=1; i<11; i++){
  var para = document.createElement("video");
  para.id = "myVideo" + i;
  para.style.display = "none";
  document.body.appendChild(para);
}

para = document.createElement("p");
para.id = "WebTorrent-received";
para.style.display = "none";
document.body.appendChild(para);