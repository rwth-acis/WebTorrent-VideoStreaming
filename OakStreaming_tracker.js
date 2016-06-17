var WebtorrentTracker = require('bittorrent-tracker').Server;

console.log("Version Panda");
   
var tracker = new WebtorrentTracker({
  udp: false, 
  http: false, 
  ws: true, 
  stats: true,
  filter: function (infoHash, params, cb) {
    // Blacklist/whitelist function for allowing/disallowing torrents. If this option is
    // omitted, all torrents are allowed. It is possible to interface with a database or
    // external system before deciding to allow/deny, because this function is async.

    // It is possible to block by peer id (whitelisting torrent clients) or by secret
    // key (private trackers). Full access to the original HTTP/UDP request parameters
    // are available in `params`.

    // This example only allows one torrent.

    //var allowed = (infoHash === 'aaa67059ed6bd08362da625b3ae77f6f4a075aaa')
    cb(true)

    // In addition to returning a boolean (`true` for allowed, `false` for disallowed),
    // you can return an `Error` object to disallow and provide a custom reason.
  }
})

// Internal http, udp, and websocket servers exposed as public properties.
//server.http
//server.udp
//console.log("server.ws: " + server.ws);

tracker.on('error', function (err) {
  // fatal server error!
  console.log(err.message)
})

tracker.on('warning', function (err) {
  // client sent bad data. probably not a problem, just a buggy client.
  console.log(err.message)
})

tracker.on('listening', function (){
  // fired when all requested servers are listening
  //console.log('listening on http port:' + server.http.address().port)
  //console.log('listening on udp port:' + server.udp.address().port)
  console.log('listening on ws port:' + tracker.ws.address().port);

/*  
   if(create_streamInformationObject){
      var videoFile = fs.readFile(PATH_TO_VIDEO, function (error,data){
        if (error) {
            return console.log(error);
         }
         console.log("File was read");
      });
   }   
*/   
});

// start tracker server listening! Use 0 to listen on a random free port.
//server.listen(port, hostname, onlistening)
tracker.listen(8081, "localhost", function(){console.log("the onlisten function from tracker.listen is called");});

// listen for individual tracker messages from peers:

tracker.on('start', function (addr) {
  console.log('got start message from ' + addr)
})

tracker.on('complete', function (addr) {"server complete"})
tracker.on('update', function (addr) {"server update"})
tracker.on('stop', function (addr) {console.log("Server stopped")})

// get info hashes for all torrents in the tracker server
//Object.keys(server.torrents)

// get the number of seeders for a particular torrent
//server.torrents[infoHash].complete

// get the number of leechers for a particular torrent
//server.torrents[infoHash].incomplete

// get the peers who are in a particular torrent swarm
//server.torrents[infoHash].peers