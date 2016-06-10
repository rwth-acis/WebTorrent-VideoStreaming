window.OakStreaming = require('./OakStreaming');
window.http = require('http');
window.WebTorrent = require('webtorrent');


document.body = document.createElement("body");

var para = document.createElement("video");
para.id = "myVideo";
para.style.display = "none";
document.body.appendChild(para);

para = document.createElement("p");
para.id = "WebTorrent-received";
para.style.display = "none";
document.body.appendChild(para);

window.myStreamingA = new OakStreaming();
window.myStreamingB = new OakStreaming();
window.myStreamingC = new OakStreaming();