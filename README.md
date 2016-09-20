# OakStreaming

## General information
This project is a JavaScript library which enables to easily integrate peer-assisted streaming into a Web page.
Peer-assisted delivery denotes a hybrid between peer-to-peer and server delivery.


## Build steps
1. Make sure to have *gulp* globally installed (```npm install -g gulp```)
2. Install development dependencies: run ```npm install``` in the project folder
3. Run ```node webtorrent_tracker.js``` in the program folder to start the webtorrent tracker.
4. Run ```gulp``` in the project folder
5. Now a Web server delivers a exemplary Web application which uses the library on http://localhost:8080
6. After gulp has ran successfully, the Jasmine test suites results can be seen by visiting the URL http://localhost:8888



## Usage of the exemplary Web application
1. Open the Web application in several browser tabs.
2. Choose via the *Choose File* button a video file, e.g. the *example.mp4* file in the project folder, that should be streamed to all browser tabs that currently visit the same URL.<br />
When the video file (identical content and file name) also lays in the *build* folder, the video will be streamed via peer-assisted delivery. Otherwise, the video will be streamed purely peer-to-peer.


## Addional information
- The program code of the library itself is located in the *OakStreaming* folder.
- The JSDoc documentation of the library API can be find in the *JSDoc* folder.
- The file *example_application.html* in the project folder contains the html code of the example application.
- The file *example_application.js* contains the JavaScript code of the example application.
- The file *Jasmine_testsuites.js* contains the JavaScript code of the Jasmine test suites.
- The file *Jasmine_testsuites_help.js* contains the JavaScript code to create the appropriate environment for the Jasmine test suites. It is needed because we want to import node modules that should then get browserified, which is not possible in the main Jasmine test suites file.
- The built Jasmine test suites are located in the *Jasmine_testsuites_build* folder.
- In the *build* folder the minified html page (*index.html*) and the built JavaScript code of the example application are located. In the *build* folder are, additionally, three example video files loctated which are necessary for the successful run of the Jasmine test suites. The *build* folder is the root directory of the Web server. 