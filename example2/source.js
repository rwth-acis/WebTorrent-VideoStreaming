var OakStreaming = require('../OakStreaming');
var myStreaming = new OakStreaming("Peter");


myStreaming.loadVideo(streamInformationObject, function(){console.log("All video data has been received");});