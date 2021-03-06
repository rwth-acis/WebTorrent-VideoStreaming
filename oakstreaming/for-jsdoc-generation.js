/**
 * @module OakStreaming
 */
module.exports = OakStreaming;


 /**
 * This constructor creates a OakStreaming instance. OakStreaming instances can seed and/or receive and/or relay video streams.
 * In order to stream a video from one OakStreaming instance to another, a peer-to-peer connection between both OakStreaming instances has to be established.
 * To build up a peer-to-peer connection between two OakStreaming instances, signaling data has to be exchanged between both instances.
 * This exchange of signaling data can happen automatically via a signaling server or manually by using the signaling1, signaling2
 * and signaling3 methods of the OakStreaming instances. OakStreaming instances can seed a video stream by using the create_stream method.
 * OakStreaming instances can receive, play back and relay a video stream by using the receive_stream method.
 * OakStreaming instances can also (partly) receive a video stream from a Web server via XML HTTP Requests (XHRs). 
 * @constructor
 */ 
function OakStreaming(OakName){
   var self = this;
   
   
      /** 
      * This method returns the number of bytes downloaded from the Web server.
      * @public
      * @returns {Number}
      */      
      function get_number_of_bytes_downloaded_from_server (){}
      self.get_number_of_bytes_downloaded_from_server = get_number_of_bytes_downloaded_from_server;
      
      
      /** 
      * This method returns the number of bytes downloaded from the peer-to-peer network. The return value includes bytes that were sent by the seeder. 
      * @public
      * @returns {Number}
      */      
      function get_number_of_bytes_downloaded_P2P(){}
      self.get_number_of_bystes_downloaded_P2P = get_number_of_bystes_downloaded_P2P;
      
      
      /** This method returns the number of bytes uploaded to the peer-to-peer network. 
      * @public
      * @returns {Number}
      */       
      function get_number_of_bytes_uploaded_P2P(){};
      self.get_number_of_bytes_uploaded_P2P = get_number_of_bytes_uploaded_P2P;

      
      /** This method returns the percentage of the video file that the OakStreaming instance has already downloaded from the peer-to-peer network. 
      * @public
      * @returns {Number} A value between 0 and 1
      */      
      function get_percentage_downloaded_of_torrent(){};
      self.get_percentage_downloaded_of_torrent = get_percentage_downloaded_of_torrent;
      
      /** This method returns the size in bytes of the video file that is or has been streamed/received.
      * @public
      * @returns {Number}
      */   
      function get_file_size(){}
         self.get_file_size = get_file_size;


      /**
      * @public
      * @callback OakStreaming~signaling1_callback
      * @param {SignalingData} signalingDataObject - Other OakStreaming instances can pass this object as an argument to their signaling2 method in order to create another SignalingData object which is necessary for successfully finishing building up the peer-to-peer connection.
      */ 
      
      /** This method creates signaling data that can be put into the signaling2 method of another OakStreaming instance in order to manually building up a peer-to-peer connection between both OakStreaming instances.
      * @public
      * @param {OakStreaming~signaling1_callback} callback - This callback function gets called with the generated signalingData object as soon as the signaling data has been created.
      */      
      function signaling1(callback){};
      self.signaling1 = signaling1;
 
 
      /**
      * @callback OakStreaming~signaling2_callback
      * @param {SignalingData} signalingData - An object that the OakStreaming instance that created the initial signalingData object can pass as an argument to its signaling3 method in order to build up the peer-to-peer connection.
      */ 
      
      /** This method expects a SignalingData object that was created by the signaling1 method of another OakStreaming instance and generates the respective response SignalingData object. In order to complete the signaling data exchange, this response signalingData object then has to be put into the signaling3 method of the OakStreaming instance which has initialized the signaling.
      * @public
      * @param {SignalingData} signalingData - A signaling data object that was created by the signaling1 method of another OakStreaming instance.
      * @param {OakStreaming~signaling2_callback} callback - This callback function gets called with the generated signalingData object.
      */   
      function signaling2(signalingData, callback){ };
      self.signaling2 = signaling2;
      

    
      /**
      * @callback OakStreaming~signaling3_callback
      */ 
      
      /** This method expects a signaling data object that a signaling2 method of another OakStreaming has generated based on a signaling data object that the signaling1 method of this OakStreaming method created. After the signaling data object has been processed, this OakStreaming instance automatically builds up a peer-to-peer connection to the other OakStreaming instance. After the peer-to-peer connection has been established, both OakStreaming instances automatically exchange video fragments.
      * @public
      * @param {SignalingData} signalingData - A signaling data object that was created by the signaling2 method of another OakStreaming instance. A necessary requirement is that the signaling2 method created the signaling data object based on a signalingdata object that the signaling1 method of this OakStreaming instance generated.
      * @param {OakStreaming~signaling3_callback} [callback] - This callback function gets called with no arguments as soon as the peer-to-peer connection between the two OakStreaming instances has been established.
      */ 
      function signaling3(signalingData, callback){ }
      self.signaling3 = signaling3;
      
      
      /**
       * @typedef Stream_Ticket
       * @type {object}
       * @property {number} video_file_size - The size in byte of the video file that was passed as the first argument to the create_stream method.
       */
       
      /**
       * @callback OakStreaming~createStream_finished
       * @param {Stream_Ticket} stream_ticket - An object that other OakStreaming instances can pass as an argument to their receive_stream method to download the video from this and other OakStreaming instances and/or a Web server.
       */

      /**
       * This method creates a Stream_Ticket object that other OakStreaming instances can pass as an argument to their receive_stream method to download the video from this and other OakStreaming instances and/or a Web server.
       * @public
       * @method
       * @param {object} [video_file] - The video file that should be streamed peer-to-peer to other OakStreaming instances. This parameter can either be a {@link https://developer.mozilla.org/en-US/docs/Web/API/File |W3C File object}, a {@link https://developer.mozilla.org/en-US/docs/Web/API/FileList |W3C FileList}, a {@link https://nodejs.org/api/buffer.html |Node Buffer object} or a {@link https://nodejs.org/api/stream.html#stream_class_stream_readable |Readable stream object}.
       * @param {object} [options] - Options for the creation of the Stream_Ticket object. After its creation, the Stream_Ticket object gets passed by the create_stream method as an argument to the callback function.
       * @param {string} [options.web_server_URL] - URL of a Web server that can serve the video file. If this property is not set, XML HTTP Requests (XHRs) will be send to the Web server that served the Web page. If this property is set to false (not only falsy), no Web server will be requested. The default port value is 80.
       * @param {string} [options.path_to_file_on_web_server] - This path will be used for the XML HTTP Requests (XHRs). For example, a valid path could be "/videos/aVideoFile.mp4". The default value of this property is "/" concatenated with the name of the file that is seeded.
       * @param {string} [options.hash_value] - The SHA-256 hash value of the video file that should by (partially) requested from the Web server. If this hash_value property is defined, it instead of the path_to_file_on_Web_server property will be used for XHRs.
       * @param {number} [options.download_from_server_time_range = 5] - How many seconds of video playback must be buffered in advance such that no data is requested from the Web server.
       * @param {string[]} [options.webTorrent_trackers] - Array of WebTorrent torrent tracker URLs (strings). One of these torrent trackers will be used to connect to other OakStreaming instances. The OakStreaming client will first try to connect to the torrent tracker URL at index 0 of the array, then to the URL at index 1 and so forth. If this parameter is set to false (not only falsy), the OakStreaming instance will not build up a connection to any torrent tracker. If this parameter is not set, the following URL list will be used: ["wss://tracker.webtorrent.io", "wss://tracker.openwebtorrent.com", "wss://tracker.fastcast.nz", "wss://tracker.btorrent.xyz"]
       * @param {number} [options.sequential_requests_time_range = 20] - How many seconds of video playback must be buffered in advance such that no sequential data streams are requested from the WebTorrent network and instead video fragments are requested according to the rarest-peace-first strategy.
       * @param {number} [options.size_of_sequential_requests = 5000000] - The size of the sequential byte range requests to the WebTorrent network. Keeping the default value is sufficient for most use cases.
       * @param {number} [options.peer_upload_limit_multiplier = 2] - The OakStreaming client will severely throttle the video data upload to other peers when (bytes_uploaded_to_other_peers * peer_upload_limit_multiplier + peer_upload_limit_addend >  bytes_downloaded_from_other_peers). The OakStreaming client will stop the throttling as soon as the before mentioned inequality is no longer true.
       * @param {number} [options.peer_upload_limit_addend = 3000000] - The OakStreaming client will severely throttle the video data upload to other peers when (bytes_uploaded_to_other_peers * peer_upload_limit_multiplier + peer_upload_limit_addend >  bytes_downloaded_from_other_peers). The OakStreaming client will stop the throttling as soon as the before mentioned inequality is no longer true.
       * @param {OakStreaming~createStream_finished} callback - This callback function gets called with the generated Stream_Ticket object at the end of the execution of create_stream.
       */
      function create_stream(video_file, options, callback, returnTorrent, destroyTorrent){}
      self.create_stream = create_stream;

      
      
      /**
       * @callback OakStreaming~downloadingVideoFinished
       */ 
       
      /**
       * This method tries to receive the video stream described in the Stream_Ticket object.
       * After this method has been called, the OakStreaming instance offers received video data to all OakStreaming instances with whom it is connected.
       * The received video data will be streamed into the first HTML video element of the DOM.
       * @public
       * @method
       * @param {Stream_Ticket} stream_ticket - This object contains all data that is needed to initiate downloading the video from other OakStreaming instances and/or a Web server. Stream_Ticket objects can be created by the {@link create_stream|create_stream} method.
       * @param {object} html_video_element - The HTML video element which should play back the received video stream(s).
       * @param {OakStreaming~downloadingVideoFinished} [callback] - This callback gets called when the video has been buffered entirely.
       * @param {boolean} [stop_uploading_when_video_downloaded] - If this argument is true, all uploading to other OakStreaming instances is permanently canceled and all processing of the receive_stream method permanently stopped as soon as the video has been downloaded completely.
       */
      function receive_stream(stream_ticket, callback, end_streaming_when_video_loaded){}
      self.receive_stream = receive_stream;
      
}