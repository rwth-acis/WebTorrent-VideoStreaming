# In-Memory database adapter for [Yjs](https://github.com/y-js/yjs)

Use the Memory database adapter to store your shared data efficiently in-memory. The next time you join the session, your changes will be lost

* Supported by all browsers
* Very fast access

## Use it!
Install this with bower or npm.

##### Bower
```
bower install y-memory --save
```

##### NPM
```
npm install y-memory --save
```

### Example

```
Y({
  db: {
    name: 'memory'
  },
  connector: {
    name: 'websockets-client', // choose the websockets connector
    // name: 'webrtc'
    // name: 'xmpp'
    room: 'Textarea-example-dev'
  },
  sourceDir: '/bower_components', // location of the y-* modules
  share: {
    textarea: 'Text' // y.share.textarea is of type Y.Text
  }
  // types: ['Richtext', 'Array'] // optional list of types you want to import
}).then(function (y) {
  // bind the textarea to a shared text element
  y.share.textarea.bind(document.getElementById('textfield'))
}
```

## License
Yjs is licensed under the [MIT License](./LICENSE).

<kevin.jahns@rwth-aachen.de>