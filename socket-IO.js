var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var clientNumberCounter = 1;
var participantsSet = [];
	
function Participant(socketId, clientNumber){
	this.hisSocketId = socketId;
	this.clientNumber = clientNumber;
}

console.log('Current directory: ' + process.cwd());

app.get('/', function(req, res){
  res.sendFile(__dirname + '/build/index.html');
});

/*
app.get('/webtorrent.min.js', function(req, res){
  res.sendFile(__dirname + '/webtorrent.min.js');
});

app.get('/simplepeer.min.js', function(req, res){
	res.sendFile(__dirname + '/simplepeer.min.js');
});

app.get('/buffer.js', function(req, res){
	res.sendFile(__dirname + '/buffer.js');
});
*/

app.get("/example_application.js", function(req, res){
  res.sendFile(__dirname + "/build/" + "example_application.js");
});

app.get("/example.mp4", function(req, res){
  res.sendFile(__dirname + "/build/" + "example.mp4", {acceptRanges: true});
});

app.get("/sintel.mp4", function(req, res){
  res.sendFile(__dirname + "/build/" + "sintel.mp4", {acceptRanges: true});
});

/*
app.get('/Feross-sintel-1024-surround.mp4', function(req, res){
  res.sendFile(__dirname + '/Feross-sintel-1024-surround.mp4');
});

app.get('/bbb_sunflower_1080p_60fps_stereo_abl.mp4', function(req, res){
  res.sendFile(__dirname + '/bbb_sunflower_1080p_60fps_stereo_abl.mp4');
});
*/

io.on('connection', function(socket){
	console.log("Peer number " + clientNumberCounter + " connected");
	//Raus neu:  io.to(socket.id).emit('number', clientNumberCounter);
	
	console.log("socket.id: " + socket.id);
	participantsSet.push(new Participant(socket.id, clientNumberCounter));
	
	socket.on('magnetURI', function(magnetURI) {
		console.log("I received a magnetURI from one peer.");
		io.emit("magnetURI2", magnetURI);
	});	
	
	socket.on('disconnect', function(){
		console.log('A user disconnected');
		console.log('clientNumberCounter: ' + clientNumberCounter);
		console.log("socket.id: " + socket.id);
		for(var i=0, length=participantsSet.length; i<length; i++){
			if(participantsSet[i].hisSocketId === socket.id){
				console.log("I delete peer number " + participantsSet[i].clientNumber + " out of participantsSet");
				participantsSet.splice(i,1);
				break;
			}
		}	
	});
	clientNumberCounter++;
});

http.listen(9999, function(){
	console.log('listening on *:9999');
});