# WebTorrent-VideoStreaming

## General information
This project is a JavaScript library which enables to easily integrate peer-assisted streaming into a Web page.
Peer-assisted delivery denotes a hybrid between peer-to-peer and server delivery.


## Build steps
1. Make sure to have *gulp* globally installed (```npm install -g gulp```)
2. Install development dependencies: run ```npm install``` in the project folder
3. Run ```gulp``` in the project folder
4. Now a Web server delivers a exemplary Web application which uses the library on http://localhost:8080
5. After gulp has ran successfully, the Jasmine test suites results can be seen by visiting the URL http://localhost:8888



## Usage of the exemplary Web application
1. Open the Web application in several browser tabs.
2. Choose via the *Choose File* button a video file, e.g. the *example.mp4* file in the project folder, that should be streamed to all browser tabs that currently visit the same URL.


## Addional information
The program code of the library itself is located in the *OakStreaming* folder.
The JSDoc documentation of the API can be find in the *out* folder.