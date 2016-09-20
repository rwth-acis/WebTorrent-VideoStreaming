var WebtorrentTracker = require('bittorrent-tracker').Server;

// An OakStreaming tracker is simply a specifically configured version of Feross's bittorrent-tracker Node.js module
// (https://github.com/feross/bittorrent-tracker).
// The purpose of an OakStreaming tracker is to establish WebRTC connections between WebTorrent instances 
// of different OakStreaming instances. Every OakStreaming instance instantiates up to one WebTorrent instance.


var tracker = new WebtorrentTracker({
  // This server should only connect to clients via WebSocket connections because OakStreaming instances support
  // only this kind of connections to trackers.
  udp: false, 
  http: false, 
  ws: true,
  
  stats: true,
  
  // Blacklist/whitelist function for allowing/disallowing torrents.
  filter: function (infoHash, params, cb) {
    // Blacklist/whitelist function for allowing/disallowing torrents. If this option is
    // omitted, all torrents are allowed. It is possible to interface with a database or
    // external system before deciding to allow/deny, because this function is async.

    // It is possible to block by peer id (whitelisting torrent clients) or by secret
    // key (private trackers). Full access to the original HTTP/UDP request parameters
    // are available in `params`.

    // For our use case, we allow all torrents.
    cb(true)

    // In addition to returning a boolean (`true` for allowed, `false` for disallowed),
    // you can return an `Error` object to disallow and provide a custom reason.
  }
});


tracker.on('error', function (err) {
  // Fatal server error!
  console.log(err.message)
})


tracker.on('warning', function (err) {
  // Client sent bad data. Probably not a problem, just a buggy client.
  console.log(err.message)
})



tracker.on('listening', function (){
  // Fires when the WebSocket server is listening.

  console.log('The OakStreaming tracker is listening on WebSocket port: ' + tracker.ws.address().port);  
});


// Give the torrent tracker the command to listen on a specific hostname and port.
// tracker.listen(port, hostname, onlistening)
tracker.listen(8085, "localhost", function(){});


// This event listener is fired when a client connects to the tracker:
tracker.on('start', function (addr) {
  console.log('Got start message from ' + addr)
})

tracker.on('complete', function (addr) {"Server complete"})
tracker.on('update', function (addr) {"Server update"})
tracker.on('stop', function (addr) {console.log("Server stopped")})


// Get info hashes for all torrents the torrent tracker manages.
//Object.keys(server.torrents)

// Get the number of seeders for a particular torrent.
//server.torrents[infoHash].complete

// Get the number of leechers for a particular torrent.
//server.torrents[infoHash].incomplete

// Get the peers who are in a particular torrent swarm.
//server.torrents[infoHash].peers