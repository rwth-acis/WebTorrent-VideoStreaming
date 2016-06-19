var OakStreaming = require('../OakStreaming');
var myStreaming = new OakStreaming("Sabrina");


myStreaming.loadVideo(streamInformationObject, function(){console.log("All video data has been received");});