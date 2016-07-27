/**
 * @module OakStreaming
 */
module.exports = OakStreaming;


 /**
 * This constructor creates a OakStreaming instance. OakStreaming instances can seed and/or receive and/or relay video streams.
 * In order to stream a video from one OakStreaming instance to another, a peer-to-peer connection between both OakStreaming instances has to be established.
 * To build up a peer-to-peer connection between two OakStreaming instances, signaling data has to be exchanged between both instances.
 * This exchange of signaling data can happen automatically via a signaling server or manually by using the createSignalingData, createSignalingDataResponse
 * and procressSignalingData methods of the OakStreaming instances. OakStreaming instances can seed a video stream by using the streamVideo method.
 * OakStreaming instances can receive, play back and relay a video stream by using the loadVideo method.
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
      function get_number_of_bystes_downloaded_P2P(){}
      self.get_number_of_bystes_downloaded_P2P = get_number_of_bystes_downloaded_P2P;
      
      
      /** This method returns the number of bytes uploaded to the peer-to-peer network. 
      * @public
      * @returns {Number}
      */       
      function get_number_of_bytes_uploaded_P2P(){};
      self.get_number_of_bytes_uploaded_P2P = get_number_of_bytes_uploaded_P2P;

      
      /** This method returns the number of bytes downloaded from the peer-to-peer network. 
      * @public
      * @returns {Number}
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
      * @callback OakStreaming~createSignalingData1_callback
      * @param {SignalingData} signalingDataObject - Other OakStreaming instances can pass this object as an argument to their createSignalingDataResponse method in order to create another SignalingData object which is necessary for successfully finishing building up the peer-to-peer connection.
      */ 
      
      /** This method creates signaling data that can be put into the createSignalingDataResponse method of another OakStreaming instance in order to manually building up a peer-to-peer connection between both OakStreaming instances.
      * @public
      * @param {OakStreaming~createSignalingData_callback} callback - This callback function gets called as soon as the signaling data has been created.
      */      
      function createSignalingData(callback){};
      self.createSignalingData = createSignalingData;
 
 
      /**
      * @callback OakStreaming~createSignalingData2_callback
      * @param {SignalingData} signalingData - An object that the OakStreaming instance that created the initial signalingData object can pass as an argument to its processSignalingResponse method in order to build up the peer-to-peer connection.
      */ 
      
      /** This method expects a signaling data object that was created by the createSignalingData method of another OakStreaming instance and generates the respective response signaling data object. In order to complete the signaling data exchange, this response signaling data object then has to be put into the processSignalingResponse method of the OakStreaming instance which has initialized the signaling.
      * @public
      * @param {SignalingData} signalingData - A signaling data object that was created by the createSignalingData method of another OakStreaming instance.
      * @param {OakStreaming~createSignalingData2_callback} callback - This callback function gets called as soon as the response signaling data object has been created.
      */   
      function createSignalingDataResponse(signalingData, callback){ };
      self.createSignalingDataResponse = createSignalingDataResponse;
      

    
      /**
      * @callback OakStreaming~createSignalingData3_callback
      */ 
      
      /** This method expects a signaling data object that a createSignalingResponse method of another OakStreaming has generated based on a signaling data object that the createSignalingData method of this OakStreaming method created. After the signaling data object has been processed, this OakStreaming instance automatically builds up a peer-to-peer connection to the other OakStreaming instance. After the peer-to-peer connection has been established, both OakStreaming instances automatically exchange video fragments.
      * @public
      * @param {SignalingData} signalingData - A signaling data object that was created by the createSignalingResponse method of another OakStreaming instance. A necessary requirement is that the createSigngalingResponse method created the signaling data object based on a signalingdata object that the createSignalingData method of this OakStreaming instance generated.
      * @param {OakStreaming~createSignalingData3_callback} callback - This callback function gets called as soon as the peer-to-peer connection between the two OakStreaming instances has been established.
      */ 
      function processSignalingResponse(signalingData, callback){ }
      self.createSignalingDataResponse = createSignalingDataResponse;
      
      
      /**
       * @typedef Stream_Information
       * @type {object}
       * @property {number} video_file_size - The size in byte of the video file that was passed as the first argument to the streamVideo method.
       */
       
      /**
       * @callback OakStreaming~streamVideoFinished
       * @param {Stream_Information} stream_information_object - An object that other OakStreaming instances can pass as an argument to their loadVideo method to download the video from this and other OakStreaming instances and/or a Web server.
       */

      /**
       * This method creates a Stream_Information object that other OakStreaming instances can pass as an argument to their loadVideo method to download the video from this and other OakStreaming instances and/or a Web server.
       * @public
       * @method
       * @param {object} video_file - The video file that should be streamed peer-to-peer to other OakStreaming instances. This parameter can either be a {@link https://developer.mozilla.org/en-US/docs/Web/API/File |W3C File object}, a {@link https://developer.mozilla.org/en-US/docs/Web/API/FileList |W3C FileList}, a {@link https://nodejs.org/api/buffer.html |Node Buffer object} or a {@link https://nodejs.org/api/stream.html#stream_class_stream_readable |Readable stream object}.
       * @param {object} options - Options for the creation of the Stream_Information object. After its creation, the Stream_Information object gets passed by the streamVideo method as an argument to the callback function.
       * @param {string} [options.web_server_URL] - URL of a Web server that can serve the video file. If this property is not set, XML HTTP Requests (XHRs) will be send to the Web server that served the Web page. If this property is set to false (not only falsy), no Web server will be requested.
       * @param {number} [options.web_server_port = 80] - Port that will be used when communicating with the Web server that was specified in the web_server_URL property. This property should only be set when the web_server_URL property is set too.
       * @param {string} [options.path_to_file_on_Web_server] - This path will be used for the XML HTTP Requests (XHRs). For example, a valid path could be "/videos/aVideoFile.mp4". The default value of this property is "/" concatenated with the name of the file that is seeded.
       * @param {string} [options.hash_value] - The SHA-256 hash value of the video file that should by (partially) requested from the Web server. If this hash_value property is defined, it instead of the path_to_file_on_Web_server property will be used for XHRs.
       * @param {number} [options.download_from_server_time_range = 5] - How many seconds of video playback must be buffered in advance such that no data is requested from the Web server.
       * @param {string[][]} options.webTorrent_trackers - Array of arrays of WebTorrent tracking server URLs (strings). These WebTorrent trackers will be used to connect to other OakStreaming instances. In which order these tracking server a contacted is described in {@link http://www.bittorrent.org/beps/bep_0012.html}.
       * @param {number} [options.Sequential_Requests_time_range = 20] - How many seconds of video playback must be buffered in advance such that no sequential data streams are requested from the WebTorrent network and instead video fragments are requested according to the rarest-peace-first strategy.
       * @param {number} [options.create_readStream_request_size = 5000000] - The size of the sequential byte range requests to the WebTorrent network. Keeping the default value is sufficient for most use cases.
       * @param {number} [options.peer_upload_limit_multiplier = 2] - The OakStreaming client will severelythrottle the video data upload to other peers when (bytes_uploaded_to_other_peers * peer_upload_limit_multiplier + peer_upload_limit_addend >  bytes_downloaded_from_other_peers). The OakStreaming client will stop the throttling as soon as the before mentioned inequality is no longer true.
       * @param {number} [options.peer_upload_limit_addend = 3000000] - The OakStreaming client will severelythrottle the video data upload to other peers when (bytes_uploaded_to_other_peers * peer_upload_limit_multiplier + peer_upload_limit_addend >  bytes_downloaded_from_other_peers). The OakStreaming client will stop the throttling as soon as the before mentioned inequality is no longer true.
       * @param {OakStreaming~streamVideoFinished} callback - This callback function gets called with the generated Stream_Information object at the end of the execution of streamVideo.
       */
      function streamVideo(video_file, options, callback, returnTorrent, destroyTorrent){}
      self.streamVideo = streamVideo;

      
      
      /**
       * @callback OakStreaming~downloadingVideoFinished
       */ 
       
      /**
       * This method tries to receive the video stream described in the stream_information object.
       * After this method has been called, the OakStreaming instance offers received video data to all OakStreaming instances with whom it is connected.
       * The received video data will be streamed into the first HTML video element of the DOM.
       * @public
       * @method
       * @param {Stream_Information} stream_information_object - This object contains all data that is needed to initiate downloading the video from other OakStreaming instances and/or a Web server. Stream_Information objects can be created by the {@link streamVideo|streamVideo} method.
       * @param {OakStreaming~downloadingVideoFinished} callback - This callback gets called when the video has been buffered entirely.
       * @param {boolean} end_streaming_when_video_downloaded - If this argument is true, all uploading to other OakStreaming instances is permanently cancelled and all processing of the loadVideo method permanently stopped as soon as the video has been downloaded completely.
       */
      function loadVideo(stream_information_object, callback, end_streaming_when_video_loaded){}
      self.loadVideo = loadVideo;
      
}