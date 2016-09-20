# OakStreaming

## General information
This project is a JavaScript library which enables to easily integrate peer-assisted streaming into a Web page.
Peer-assisted delivery denotes a hybrid between peer-to-peer and server delivery.


## Build steps for example-application.html
1. Make sure to have *gulp* globally installed (```npm install -g gulp```)
2. Install development dependencies: run ```npm install``` in the project folder
3. Run ```node oakstreaming-tracker.js``` in the *oakstreaming-tracker* folder to start the OakStreaming tracking server
4. Run ```gulp``` in the project folder
5. Now a Web server delivers the exemplary Web application, which uses the OakStreaming library, at http://localhost:8080



## Usage of the exemplary Web application
1. Open the Web application in several browser tabs.
2. Choose via the *Choose File* button a video file, e.g. the *example.mp4* file in the project folder (a larger video file like https://durian.blender.org/download/ is probably more suitable to show the power of the OakStreaming library), that should be streamed to all browser tabs that currently visit the same URL. If the video file (identical content and file name) can also be found in the *web/videos* folder, the video will be streamed via peer-assisted delivery. Otherwise, the video will be streamed purely peer-to-peer. <br />


## Additional information
- The program code of the library itself is located in the *oakstreaming* folder.
- The JSDoc documentation of the library API can be found in the *Final JSDoc documentation* folder.
- The file *example-application.html* in the project folder contains the html code of the example application.
- The file *example-application.js* contains the JavaScript code of the example application.
- In the *web* folder, the minified html page (*index.html*) and the built JavaScript code of the example application are located. The *web* folder contains additional files which are needed for the example application but not for the OakStreaming library. Moreover, the *web* folder contains a *videos* folder where some example videos files are located. The *web* folder is the root directory of the gulp Web server. Video files that the gulp Web server should serve have to be put into the *videos* folder.
- The source code of the example application is commented and does not comprise a large number of lines. Therefore, it is probably not a bad idea to change the code in order to experiment with the OakStreaming library.
- To use all features of the OakStreaming library, a special Web server is necessary. The program code of this Web server can be found in the *oakstreaming-web-server* folder. This extended Web server is Node.js program which consists out of one file named *oakstreaming-web-server.js*. This Web server can be configured by changing the values of the constants at the beginning of the program code. This Web server can be started by running ```node oakstreaming-web-server.js```.
- The example application uses a via Yjs (https://github.com/y-js/yjs) synchronized data structure to transfer the Stream_Ticket object from the seeder to the other peers. Therefore, the application needs to connect to a special kind of WebRTC signaling server. The signaling server can be downloaded at https://github.com/DadaMonad/signalmaster. By default, the example application connects to a free, public WebRTC signaling server.
- If the create_stream method of the OakStreaming library does not get a handed over URLs to one or more torrent tracker, it tries to connect to several public WebTorrent tracking servers, which support all functionality needed by the OakStreaming library. The example application only tries to connect to a local torrent tracker.