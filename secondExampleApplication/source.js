var OakStreaming = require('../OakStreaming');
var myStreaming = new OakStreaming();


myStreaming.loadVideo(streamInformationObject, function(){console.log("All video data has been received");});