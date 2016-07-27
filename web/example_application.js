(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var Y = require("yjs");
require("y-array")(Y);
require("y-memory")(Y);
require("y-map")(Y);

var socket = io(); // This is needed such that the server can send messages to this client.

console.log("This is task 1");

// Save HTML5 video element in myVideo
var myVideo = document.getElementsByTagName('video')[0];
myVideo.addEventListener('error', function (err) {
   console.error(myVideo.error);
});

function addSourceURLToVideoElement(videoElement, src, type) {
   var source = document.createElement('source');
   source.src = src;
   source.type = type;
   videoElement.appendChild(source);
   console.log("I have added the URL to the HTML 5 video element");
}

// When the participant has uploaded a video, the server sends the video URL to all running instances of the Web application.
socket.on('newVideo1', function (URL) {
   console.log("I received a video URL from the server");

   // Share the URL via Yjs
   addToSharedArray(URL);
});

var theSharedArray = null;

Y({
   db: {
      name: 'memory'
   },
   connector: {
      url: "http://gaudi.informatik.rwth-aachen.de:9914",
      name: 'webrtc',
      room: 'User1'
   },
   share: {
      myArray: 'Array'
   }
}).then(function (y) {
   theSharedArray = y.share.myArray;

   // This function is called when the shared array gets changed.
   theSharedArray.observe(function (event) {
      var videoURL = theSharedArray.get(0);
      console.log("I have received the following URL via Yjs: " + videoURL);
      addSourceURLToVideoElement(myVideo, videoURL, "video/mp4");
      myVideo.play();
   });
});

function addToSharedArray(URL) {
   if (theSharedArray !== null) {
      theSharedArray.insert(0, [URL]);
   } else {
      setTimeout(function () {
         addToSharedArray(URL);
      }, 250);
   }
}

},{"y-array":2,"y-map":3,"y-memory":4,"yjs":12}],2:[function(require,module,exports){
/* global Y */
'use strict'

function extend (Y) {
  class YArray {
    constructor (os, _model, _content) {
      this.os = os
      this._model = _model
      // Array of all the neccessary content
      this._content = _content
      this.eventHandler = new Y.utils.EventHandler((op) => {
        if (op.struct === 'Insert') {
          let pos
          // we check op.left only!,
          // because op.right might not be defined when this is called
          if (op.left === null) {
            pos = 0
          } else {
            pos = 1 + this._content.findIndex(function (c) {
              return Y.utils.compareIds(c.id, op.left)
            })
            if (pos <= 0) {
              throw new Error('Unexpected operation!')
            }
          }
          var values
          var length
          if (op.hasOwnProperty('opContent')) {
            this._content.splice(pos, 0, {
              id: op.id,
              type: op.opContent
            })
            let opContent = op.opContent
            length = 1
            values = () => {
              return new Promise((resolve) => {
                this.os.requestTransaction(function *() {
                  var type = yield* this.getType(opContent)
                  resolve([type])
                })
              })
            }
          } else {
            var contents = op.content.map(function (c, i) {
              return {
                id: [op.id[0], op.id[1] + i],
                val: c
              }
            })
            // insert value in _content
            this._content.splice.apply(this._content, [pos, 0].concat(contents))
            values = op.content
            length = op.content.length
          }
          this.eventHandler.callEventListeners({
            type: 'insert',
            object: this,
            index: pos,
            values: values,
            // valueId: valueId, // TODO: does this still work as expected?
            length: length
          })
        } else if (op.struct === 'Delete') {
          var i = 0 // current position in _content
          for (; i < this._content.length && op.length > 0; i++) {
            var c = this._content[i]
            if (Y.utils.inDeletionRange(op, c.id)) {
              // is in deletion range!
              var delLength
              // check how many character to delete in one flush
              for (delLength = 1;
                    delLength < op.length && i + delLength < this._content.length && Y.utils.inDeletionRange(op, this._content[i + delLength].id);
                    delLength++) {}
              // last operation thas will be deleted
              c = this._content[i + delLength - 1]
              // update delete operation
              op.length -= c.id[1] - op.target[1] + 1
              op.target = [c.id[0], c.id[1] + 1]
              // apply deletion & find send event
              let content = this._content.splice(i, delLength)
              // TODO: how about return types
              let values = content.map(function (c) { return c.val })
              this.eventHandler.callEventListeners({
                type: 'delete',
                object: this,
                index: i,
                values: values,
                _content: content,
                length: delLength
              })
              // with the fresh delete op, we can continue
              // note: we don't have to increment i, because the i-th content was deleted
              // but on the other had, the (i+delLength)-th was not in deletion range
              // So we don't do i--
            }
          }
        } else {
          throw new Error('Unexpected struct!')
        }
      })
    }
    _destroy () {
      this.eventHandler.destroy()
      this.eventHandler = null
      this._content = null
      this._model = null
      this.os = null
    }
    get length () {
      return this._content.length
    }
    get (pos) {
      if (pos == null || typeof pos !== 'number') {
        throw new Error('pos must be a number!')
      }
      if (pos >= this._content.length) {
        return undefined
      }
      if (this._content[pos].type == null) {
        return this._content[pos].val
      } else {
        var oid = this._content[pos].type
        return new Promise((resolve) => {
          this.os.requestTransaction(function *() {
            var type = yield* this.getType(oid)
            resolve(type)
          })
        })
      }
    }
    // only returns primitive values
    toArray () {
      return this._content.map(function (x, i) {
        return x.val
      })
    }
    push (contents) {
      return this.insert(this._content.length, contents)
    }
    insert (pos, contents) {
      if (typeof pos !== 'number') {
        throw new Error('pos must be a number!')
      }
      if (!(contents instanceof Array)) {
        throw new Error('contents must be an Array of objects!')
      }
      if (contents.length === 0) {
        return
      }
      if (pos > this._content.length || pos < 0) {
        throw new Error('This position exceeds the range of the array!')
      }
      var mostLeft = pos === 0 ? null : this._content[pos - 1].id

      var ops = []
      var newTypes = []
      var prevId = mostLeft
      for (var i = 0; i < contents.length;) {
        var op = {
          left: prevId,
          origin: prevId,
          // right: mostRight,
          // NOTE: I intentionally do not define right here, because it could be deleted
          // at the time of inserting this operation (when we get the transaction),
          // and would therefore not defined in this._content
          parent: this._model,
          struct: 'Insert'
        }
        var _content = []
        var typeDefinition
        while (i < contents.length) {
          var val = contents[i++]
          typeDefinition = Y.utils.isTypeDefinition(val)
          if (!typeDefinition) {
            _content.push(val)
          } else if (_content.length > 0) {
            i-- // come back again later
            break
          } else {
            break
          }
        }
        if (_content.length > 0) {
          // content is defined
          op.content = _content
          op.id = this.os.getNextOpId(_content.length)
        } else {
          // otherwise its a type
          var typeid = this.os.getNextOpId(1)
          newTypes.push([typeDefinition, typeid])
          op.opContent = typeid
          op.id = this.os.getNextOpId(1)
        }
        ops.push(op)
        prevId = op.id
      }
      var eventHandler = this.eventHandler
      this.os.requestTransaction(function *() {
        // now we can set the right reference.
        var mostRight
        if (mostLeft != null) {
          var ml = yield* this.getInsertionCleanEnd(mostLeft)
          mostRight = ml.right
        } else {
          mostRight = (yield* this.getOperation(ops[0].parent)).start
        }
        for (var i = 0; i < newTypes.length; i++) {
          yield* this.createType.apply(this, newTypes[i])
        }
        for (var j = 0; j < ops.length; j++) {
          var op = ops[j]
          op.right = mostRight
        }
        yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [ops])
      })
      eventHandler.awaitAndPrematurelyCall(ops)
    }
    delete (pos, length) {
      if (length == null) { length = 1 }
      if (typeof length !== 'number') {
        throw new Error('length must be a number!')
      }
      if (typeof pos !== 'number') {
        throw new Error('pos must be a number!')
      }
      if (pos + length > this._content.length || pos < 0 || length < 0) {
        throw new Error('The deletion range exceeds the range of the array!')
      }
      if (length === 0) {
        return
      }
      var eventHandler = this.eventHandler
      var dels = []
      for (var i = 0; i < length; i = i + delLength) {
        var targetId = this._content[pos + i].id
        var delLength
        // how many insertions can we delete in one deletion?
        for (delLength = 1; i + delLength < length; delLength++) {
          if (!Y.utils.compareIds(this._content[pos + i + delLength].id, [targetId[0], targetId[1] + delLength])) {
            break
          }
        }
        dels.push({
          target: targetId,
          struct: 'Delete',
          length: delLength
        })
      }
      eventHandler.awaitAndPrematurelyCall(dels)
      this.os.requestTransaction(function *() {
        yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [dels])
      })
    }
    observe (f) {
      this.eventHandler.addEventListener(f)
    }
    unobserve (f) {
      this.eventHandler.removeEventListener(f)
    }
    * _changed (transaction, op) {
      if (!op.deleted) {
        if (op.struct === 'Insert') {
          var l = op.left
          var left
          while (l != null) {
            left = yield* transaction.getInsertion(l)
            if (!left.deleted) {
              break
            }
            l = left.left
          }
          op.left = l
        }
        this.eventHandler.receivedOp(op)
      }
    }
  }

  Y.extend('Array', new Y.utils.CustomType({
    name: 'Array',
    class: YArray,
    struct: 'List',
    initType: function * YArrayInitializer (os, model) {
      var _content = []
      yield* Y.Struct.List.map.call(this, model, function (op) {
        if (op.hasOwnProperty('opContent')) {
          _content.push({
            id: op.id,
            type: op.opContent
          })
        } else {
          op.content.forEach(function (c, i) {
            _content.push({
              id: [op.id[0], op.id[1] + i],
              val: op.content[i]
            })
          })
        }
      })
      return new YArray(os, model.id, _content)
    }
  }))
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}

},{}],3:[function(require,module,exports){
/* global Y */
'use strict'

function extend (Y /* :any */) {
  class YMap {
    /* ::
    _model: Id;
    os: Y.AbstractDatabase;
    map: Object;
    contents: any;
    opContents: Object;
    eventHandler: Function;
    */
    constructor (os, model, contents, opContents) {
      this._model = model.id
      this.os = os
      this.map = Y.utils.copyObject(model.map)
      this.contents = contents
      this.opContents = opContents
      this.eventHandler = new Y.utils.EventHandler(op => {
        var oldValue
        // key is the name to use to access (op)content
        var key = op.struct === 'Delete' ? op.key : op.parentSub

        // compute oldValue
        if (this.opContents[key] != null) {
          let prevType = this.opContents[key]
          oldValue = () => {// eslint-disable-line
            return new Promise((resolve) => {
              this.os.requestTransaction(function *() {// eslint-disable-line
                var type = yield* this.getType(prevType)
                resolve(type)
              })
            })
          }
        } else {
          oldValue = this.contents[key]
        }
        // compute op event
        if (op.struct === 'Insert') {
          if (op.left === null) {
            var value
            // TODO: what if op.deleted??? I partially handles this case here.. (maybe from the previous version)
            if (op.opContent != null) {
              value = () => {// eslint-disable-line
                return new Promise((resolve) => {
                  this.os.requestTransaction(function *() {// eslint-disable-line
                    var type = yield* this.getType(op.opContent)
                    resolve(type)
                  })
                })
              }
              delete this.contents[key]
              if (op.deleted) {
                delete this.opContents[key]
              } else {
                this.opContents[key] = op.opContent
              }
            } else {
              value = op.content[0]
              delete this.opContents[key]
              if (op.deleted) {
                delete this.contents[key]
              } else {
                this.contents[key] = op.content[0]
              }
            }
            this.map[key] = op.id
            if (oldValue === undefined) {
              this.eventHandler.callEventListeners({
                name: key,
                object: this,
                type: 'add',
                value: value
              })
            } else {
              this.eventHandler.callEventListeners({
                name: key,
                object: this,
                oldValue: oldValue,
                type: 'update',
                value: value
              })
            }
          }
        } else if (op.struct === 'Delete') {
          if (Y.utils.compareIds(this.map[key], op.target)) {
            delete this.opContents[key]
            delete this.contents[key]
            this.eventHandler.callEventListeners({
              name: key,
              object: this,
              oldValue: oldValue,
              type: 'delete'
            })
          }
        } else {
          throw new Error('Unexpected Operation!')
        }
      })
    }
    _destroy () {
      this.eventHandler.destroy()
      this.eventHandler = null
      this.contents = null
      this.opContents = null
      this._model = null
      this.os = null
      this.map = null
    }
    get (key) {
      // return property.
      // if property does not exist, return null
      // if property is a type, return a promise
      if (key == null || typeof key !== 'string') {
        throw new Error('You must specify a key (as string)!')
      }
      if (this.opContents[key] == null) {
        return this.contents[key]
      } else {
        return new Promise((resolve) => {
          var oid = this.opContents[key]
          this.os.requestTransaction(function *() {
            var type = yield* this.getType(oid)
            resolve(type)
          })
        })
      }
    }
    keys () {
      return Object.keys(this.contents).concat(Object.keys(this.opContents))
    }
    keysPrimitives () {
      return Object.keys(this.contents)
    }
    keysTypes () {
      return Object.keys(this.opContents)
    }
    /*
      If there is a primitive (not a custom type), then return it.
      Returns all primitive values, if propertyName is specified!
      Note: modifying the return value could result in inconsistencies!
        -- so make sure to copy it first!
    */
    getPrimitive (key) {
      if (key == null) {
        return Y.utils.copyObject(this.contents)
      } else if (typeof key !== 'string') {
        throw new Error('Key is expected to be a string!')
      } else {
        return this.contents[key]
      }
    }
    getType (key) {
      if (key == null || typeof key !== 'string') {
        throw new Error('You must specify a key (as string)!')
      } else if (this.opContents[key] != null) {
        return new Promise((resolve) => {
          var oid = this.opContents[key]
          this.os.requestTransaction(function *() {
            var type = yield* this.getType(oid)
            resolve(type)
          })
        })
      } else {
        return Promise.reject('No property specified for this key!')
      }
    }
    delete (key) {
      var right = this.map[key]
      if (right != null) {
        var del = {
          target: right,
          struct: 'Delete'
        }
        var eventHandler = this.eventHandler
        var modDel = Y.utils.copyObject(del)
        modDel.key = key
        this.os.requestTransaction(function *() {
          yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [[del]])
        })
        // always remember to do that after this.os.requestTransaction
        // (otherwise values might contain a undefined reference to type)
        eventHandler.awaitAndPrematurelyCall([modDel])
      }
    }
    set (key, value) {
      // set property.
      // if property is a type, return a promise
      // if not, apply immediately on this type an call event

      var right = this.map[key] || null
      var insert /* :any */ = {
        id: this.os.getNextOpId(1),
        left: null,
        right: right,
        origin: null,
        parent: this._model,
        parentSub: key,
        struct: 'Insert'
      }
      var eventHandler = this.eventHandler
      return new Promise((resolve) => {
        var typeDefinition = Y.utils.isTypeDefinition(value)
        if (typeDefinition !== false) {
          var typeid = this.os.getNextOpId(1)
          insert.opContent = typeid
          // construct a new type
          this.os.requestTransaction(function *() {
            var type = yield* this.createType(typeDefinition, typeid)
            yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [[insert]])
            resolve(type)
          })
          // always remember to do that after this.os.requestTransaction
          // (otherwise values might contain a undefined reference to type)
          eventHandler.awaitAndPrematurelyCall([insert])
        } else {
          insert.content = [value]
          this.os.requestTransaction(function * () {
            yield* eventHandler.awaitOps(this, this.applyCreatedOperations, [[insert]])
          })
          // always remember to do that after this.os.requestTransaction
          // (otherwise values might contain a undefined reference to type)
          eventHandler.awaitAndPrematurelyCall([insert])
          resolve(value)
        }
      })
    }
    observe (f) {
      this.eventHandler.addEventListener(f)
    }
    unobserve (f) {
      this.eventHandler.removeEventListener(f)
    }
    /*
      Observe a path.

      E.g.
      ```
      o.set('textarea', Y.TextBind)
      o.observePath(['textarea'], function(t){
        // is called whenever textarea is replaced
        t.bind(textarea)
      })

      returns a Promise that contains a function that removes the observer from the path.
    */
    observePath (path, f) {
      var self = this
      function observeProperty (event) {
        // call f whenever path changes
        if (event.name === propertyName) {
          // call this also for delete events!
          var property = self.get(propertyName)
          if (property instanceof Promise) {
            property.then(f)
          } else {
            f(property)
          }
        }
      }

      if (path.length < 1) {
        f(this)
        return Promise.resolve(function () {})
      } else if (path.length === 1) {
        var propertyName = path[0]
        var property = self.get(propertyName)
        if (property instanceof Promise) {
          property.then(f)
        } else {
          f(property)
        }
        this.observe(observeProperty)
        return Promise.resolve(function () {
          self.unobserve(f)
        })
      } else {
        var deleteChildObservers
        var resetObserverPath = function () {
          var promise = self.get(path[0])
          if (!promise instanceof Promise) {
            // its either not defined or a primitive value
            promise = self.set(path[0], Y.Map)
          }
          return promise.then(function (map) {
            return map.observePath(path.slice(1), f)
          }).then(function (_deleteChildObservers) {
            // update deleteChildObservers
            deleteChildObservers = _deleteChildObservers
            return Promise.resolve() // Promise does not return anything
          })
        }
        var observer = function (event) {
          if (event.name === path[0]) {
            if (deleteChildObservers != null) {
              deleteChildObservers()
            }
            if (event.type === 'add' || event.type === 'update') {
              resetObserverPath()
            }
            // TODO: what about the delete events?
          }
        }
        self.observe(observer)
        return resetObserverPath().then(function () {
          // this promise contains a function that deletes all the child observers
          // and how to unobserve the observe from this object
          return Promise.resolve(function () { // eslint-disable-line
            if (deleteChildObservers != null) {
              deleteChildObservers()
            }
            self.unobserve(observer)
          })
        })
      }
    }
    * _changed (transaction, op) {
      if (op.struct === 'Delete') {
        var target = yield* transaction.getOperation(op.target)
        op.key = target.parentSub
      }
      this.eventHandler.receivedOp(op)
    }
  }
  Y.extend('Map', new Y.utils.CustomType({
    name: 'Map',
    class: YMap,
    struct: 'Map',
    initType: function * YMapInitializer (os, model) {
      var contents = {}
      var opContents = {}
      var map = model.map
      for (var name in map) {
        var op = yield* this.getOperation(map[name])
        if (op.opContent != null) {
          opContents[name] = op.opContent
        } else {
          contents[name] = op.content[0]
        }
      }
      return new YMap(os, model, contents, opContents)
    }
  }))
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}

},{}],4:[function(require,module,exports){
/* global Y */
'use strict'

function extend (Y) {
  require('./RedBlackTree.js')(Y)
  class Transaction extends Y.Transaction {
    constructor (store) {
      super(store)
      this.store = store
      this.ss = store.ss
      this.os = store.os
      this.ds = store.ds
    }
  }
  var Store = Y.utils.RBTree
  var BufferedStore = Y.utils.createSmallLookupBuffer(Store)

  class Database extends Y.AbstractDatabase {
    constructor (y, opts) {
      super(y, opts)
      this.os = new BufferedStore()
      this.ds = new Store()
      this.ss = new BufferedStore()
    }
    logTable () {
      var self = this
      self.requestTransaction(function * () {
        console.log('User: ', this.store.y.connector.userId, "==============================") // eslint-disable-line
        console.log("State Set (SS):", yield* this.getStateSet()) // eslint-disable-line
        console.log("Operation Store (OS):") // eslint-disable-line
        yield* this.os.logTable() // eslint-disable-line
        console.log("Deletion Store (DS):") //eslint-disable-line
        yield* this.ds.logTable() // eslint-disable-line
        if (this.store.gc1.length > 0 || this.store.gc2.length > 0) {
          console.warn('GC1|2 not empty!', this.store.gc1, this.store.gc2)
        }
        if (JSON.stringify(this.store.listenersById) !== '{}') {
          console.warn('listenersById not empty!')
        }
        if (JSON.stringify(this.store.listenersByIdExecuteNow) !== '[]') {
          console.warn('listenersByIdExecuteNow not empty!')
        }
        if (this.store.transactionInProgress) {
          console.warn('Transaction still in progress!')
        }
      }, true)
    }
    transact (makeGen) {
      var t = new Transaction(this)
      while (makeGen !== null) {
        var gen = makeGen.call(t)
        var res = gen.next()
        while (!res.done) {
          res = gen.next(res.value)
        }
        makeGen = this.getNextRequest()
      }
    }
    * destroy () {
      yield* super.destroy()
      delete this.os
      delete this.ss
      delete this.ds
    }
  }
  Y.extend('memory', Database)
}

module.exports = extend
if (typeof Y !== 'undefined') {
  extend(Y)
}

},{"./RedBlackTree.js":5}],5:[function(require,module,exports){
'use strict'

/*
  This file contains a not so fancy implemantion of a Red Black Tree.
*/
module.exports = function (Y) {
  class N {
    // A created node is always red!
    constructor (val) {
      this.val = val
      this.color = true
      this._left = null
      this._right = null
      this._parent = null
      if (val.id === null) {
        throw new Error('You must define id!')
      }
    }
    isRed () { return this.color }
    isBlack () { return !this.color }
    redden () { this.color = true; return this }
    blacken () { this.color = false; return this }
    get grandparent () {
      return this.parent.parent
    }
    get parent () {
      return this._parent
    }
    get sibling () {
      return (this === this.parent.left)
        ? this.parent.right : this.parent.left
    }
    get left () {
      return this._left
    }
    get right () {
      return this._right
    }
    set left (n) {
      if (n !== null) {
        n._parent = this
      }
      this._left = n
    }
    set right (n) {
      if (n !== null) {
        n._parent = this
      }
      this._right = n
    }
    rotateLeft (tree) {
      var parent = this.parent
      var newParent = this.right
      var newRight = this.right.left
      newParent.left = this
      this.right = newRight
      if (parent === null) {
        tree.root = newParent
        newParent._parent = null
      } else if (parent.left === this) {
        parent.left = newParent
      } else if (parent.right === this) {
        parent.right = newParent
      } else {
        throw new Error('The elements are wrongly connected!')
      }
    }
    next () {
      if (this.right !== null) {
        // search the most left node in the right tree
        var o = this.right
        while (o.left !== null) {
          o = o.left
        }
        return o
      } else {
        var p = this
        while (p.parent !== null && p !== p.parent.left) {
          p = p.parent
        }
        return p.parent
      }
    }
    prev () {
      if (this.left !== null) {
        // search the most right node in the left tree
        var o = this.left
        while (o.right !== null) {
          o = o.right
        }
        return o
      } else {
        var p = this
        while (p.parent !== null && p !== p.parent.right) {
          p = p.parent
        }
        return p.parent
      }
    }
    rotateRight (tree) {
      var parent = this.parent
      var newParent = this.left
      var newLeft = this.left.right
      newParent.right = this
      this.left = newLeft
      if (parent === null) {
        tree.root = newParent
        newParent._parent = null
      } else if (parent.left === this) {
        parent.left = newParent
      } else if (parent.right === this) {
        parent.right = newParent
      } else {
        throw new Error('The elements are wrongly connected!')
      }
    }
    getUncle () {
      // we can assume that grandparent exists when this is called!
      if (this.parent === this.parent.parent.left) {
        return this.parent.parent.right
      } else {
        return this.parent.parent.left
      }
    }
  }

  class RBTree {
    constructor () {
      this.root = null
      this.length = 0
    }
    * findNext (id) {
      return yield* this.findWithLowerBound([id[0], id[1] + 1])
    }
    * findPrev (id) {
      return yield* this.findWithUpperBound([id[0], id[1] - 1])
    }
    findNodeWithLowerBound (from) {
      if (from === void 0) {
        throw new Error('You must define from!')
      }
      var o = this.root
      if (o === null) {
        return null
      } else {
        while (true) {
          if ((from === null || Y.utils.smaller(from, o.val.id)) && o.left !== null) {
            // o is included in the bound
            // try to find an element that is closer to the bound
            o = o.left
          } else if (from !== null && Y.utils.smaller(o.val.id, from)) {
            // o is not within the bound, maybe one of the right elements is..
            if (o.right !== null) {
              o = o.right
            } else {
              // there is no right element. Search for the next bigger element,
              // this should be within the bounds
              return o.next()
            }
          } else {
            return o
          }
        }
      }
    }
    findNodeWithUpperBound (to) {
      if (to === void 0) {
        throw new Error('You must define from!')
      }
      var o = this.root
      if (o === null) {
        return null
      } else {
        while (true) {
          if ((to === null || Y.utils.smaller(o.val.id, to)) && o.right !== null) {
            // o is included in the bound
            // try to find an element that is closer to the bound
            o = o.right
          } else if (to !== null && Y.utils.smaller(to, o.val.id)) {
            // o is not within the bound, maybe one of the left elements is..
            if (o.left !== null) {
              o = o.left
            } else {
              // there is no left element. Search for the prev smaller element,
              // this should be within the bounds
              return o.prev()
            }
          } else {
            return o
          }
        }
      }
    }
    findSmallestNode () {
      var o = this.root
      while (o != null && o.left != null) {
        o = o.left
      }
      return o
    }
    * findWithLowerBound (from) {
      var n = this.findNodeWithLowerBound(from)
      return n == null ? null : n.val
    }
    * findWithUpperBound (to) {
      var n = this.findNodeWithUpperBound(to)
      return n == null ? null : n.val
    }
    * iterate (t, from, to, f) {
      var o
      if (from === null) {
        o = this.findSmallestNode()
      } else {
        o = this.findNodeWithLowerBound(from)
      }
      while (o !== null && (to === null || Y.utils.smaller(o.val.id, to) || Y.utils.compareIds(o.val.id, to))) {
        yield* f.call(t, o.val)
        o = o.next()
      }
      return true
    }
    * logTable (from, to, filter) {
      if (filter == null) {
        filter = function () {
          return true
        }
      }
      if (from == null) { from = null }
      if (to == null) { to = null }
      var os = []
      yield* this.iterate(this, from, to, function * (o) {
        if (filter(o)) {
          var o_ = {}
          for (var key in o) {
            if (typeof o[key] === 'object') {
              o_[key] = JSON.stringify(o[key])
            } else {
              o_[key] = o[key]
            }
          }
          os.push(o_)
        }
      })
      if (console.table != null) {
        console.table(os)
      }
    }
    * find (id) {
      var n
      return (n = this.findNode(id)) ? n.val : null
    }
    findNode (id) {
      if (id == null || id.constructor !== Array) {
        throw new Error('Expect id to be an array!')
      }
      var o = this.root
      if (o === null) {
        return false
      } else {
        while (true) {
          if (o === null) {
            return false
          }
          if (Y.utils.smaller(id, o.val.id)) {
            o = o.left
          } else if (Y.utils.smaller(o.val.id, id)) {
            o = o.right
          } else {
            return o
          }
        }
      }
    }
    * delete (id) {
      if (id == null || id.constructor !== Array) {
        throw new Error('id is expected to be an Array!')
      }
      var d = this.findNode(id)
      if (d == null) {
        // throw new Error('Element does not exist!')
        return
      }
      this.length--
      if (d.left !== null && d.right !== null) {
        // switch d with the greates element in the left subtree.
        // o should have at most one child.
        var o = d.left
        // find
        while (o.right !== null) {
          o = o.right
        }
        // switch
        d.val = o.val
        d = o
      }
      // d has at most one child
      // let n be the node that replaces d
      var isFakeChild
      var child = d.left || d.right
      if (child === null) {
        isFakeChild = true
        child = new N({id: 0})
        child.blacken()
        d.right = child
      } else {
        isFakeChild = false
      }

      if (d.parent === null) {
        if (!isFakeChild) {
          this.root = child
          child.blacken()
          child._parent = null
        } else {
          this.root = null
        }
        return
      } else if (d.parent.left === d) {
        d.parent.left = child
      } else if (d.parent.right === d) {
        d.parent.right = child
      } else {
        throw new Error('Impossible!')
      }
      if (d.isBlack()) {
        if (child.isRed()) {
          child.blacken()
        } else {
          this._fixDelete(child)
        }
      }
      this.root.blacken()
      if (isFakeChild) {
        if (child.parent.left === child) {
          child.parent.left = null
        } else if (child.parent.right === child) {
          child.parent.right = null
        } else {
          throw new Error('Impossible #3')
        }
      }
    }
    _fixDelete (n) {
      function isBlack (node) {
        return node !== null ? node.isBlack() : true
      }
      function isRed (node) {
        return node !== null ? node.isRed() : false
      }
      if (n.parent === null) {
        // this can only be called after the first iteration of fixDelete.
        return
      }
      // d was already replaced by the child
      // d is not the root
      // d and child are black
      var sibling = n.sibling
      if (isRed(sibling)) {
        // make sibling the grandfather
        n.parent.redden()
        sibling.blacken()
        if (n === n.parent.left) {
          n.parent.rotateLeft(this)
        } else if (n === n.parent.right) {
          n.parent.rotateRight(this)
        } else {
          throw new Error('Impossible #2')
        }
        sibling = n.sibling
      }
      // parent, sibling, and children of n are black
      if (n.parent.isBlack() &&
        sibling.isBlack() &&
        isBlack(sibling.left) &&
        isBlack(sibling.right)
      ) {
        sibling.redden()
        this._fixDelete(n.parent)
      } else if (n.parent.isRed() &&
        sibling.isBlack() &&
        isBlack(sibling.left) &&
        isBlack(sibling.right)
      ) {
        sibling.redden()
        n.parent.blacken()
      } else {
        if (n === n.parent.left &&
          sibling.isBlack() &&
          isRed(sibling.left) &&
          isBlack(sibling.right)
        ) {
          sibling.redden()
          sibling.left.blacken()
          sibling.rotateRight(this)
          sibling = n.sibling
        } else if (n === n.parent.right &&
          sibling.isBlack() &&
          isRed(sibling.right) &&
          isBlack(sibling.left)
        ) {
          sibling.redden()
          sibling.right.blacken()
          sibling.rotateLeft(this)
          sibling = n.sibling
        }
        sibling.color = n.parent.color
        n.parent.blacken()
        if (n === n.parent.left) {
          sibling.right.blacken()
          n.parent.rotateLeft(this)
        } else {
          sibling.left.blacken()
          n.parent.rotateRight(this)
        }
      }
    }
    * put (v) {
      if (v == null || v.id == null || v.id.constructor !== Array) {
        throw new Error('v is expected to have an id property which is an Array!')
      }
      var node = new N(v)
      if (this.root !== null) {
        var p = this.root // p abbrev. parent
        while (true) {
          if (Y.utils.smaller(node.val.id, p.val.id)) {
            if (p.left === null) {
              p.left = node
              break
            } else {
              p = p.left
            }
          } else if (Y.utils.smaller(p.val.id, node.val.id)) {
            if (p.right === null) {
              p.right = node
              break
            } else {
              p = p.right
            }
          } else {
            p.val = node.val
            return p
          }
        }
        this._fixInsert(node)
      } else {
        this.root = node
      }
      this.length++
      this.root.blacken()
      return node
    }
    _fixInsert (n) {
      if (n.parent === null) {
        n.blacken()
        return
      } else if (n.parent.isBlack()) {
        return
      }
      var uncle = n.getUncle()
      if (uncle !== null && uncle.isRed()) {
        // Note: parent: red, uncle: red
        n.parent.blacken()
        uncle.blacken()
        n.grandparent.redden()
        this._fixInsert(n.grandparent)
      } else {
        // Note: parent: red, uncle: black or null
        // Now we transform the tree in such a way that
        // either of these holds:
        //   1) grandparent.left.isRed
        //     and grandparent.left.left.isRed
        //   2) grandparent.right.isRed
        //     and grandparent.right.right.isRed
        if (n === n.parent.right && n.parent === n.grandparent.left) {
          n.parent.rotateLeft(this)
          // Since we rotated and want to use the previous
          // cases, we need to set n in such a way that
          // n.parent.isRed again
          n = n.left
        } else if (n === n.parent.left && n.parent === n.grandparent.right) {
          n.parent.rotateRight(this)
          // see above
          n = n.right
        }
        // Case 1) or 2) hold from here on.
        // Now traverse grandparent, make parent a black node
        // on the highest level which holds two red nodes.
        n.parent.blacken()
        n.grandparent.redden()
        if (n === n.parent.left) {
          // Case 1
          n.grandparent.rotateRight(this)
        } else {
          // Case 2
          n.grandparent.rotateLeft(this)
        }
      }
    }
    * flush () {}
  }

  Y.utils.RBTree = RBTree
}

},{}],6:[function(require,module,exports){
/* @flow */
'use strict'

module.exports = function (Y/* :any */) {
  class AbstractConnector {
    /* ::
    y: YConfig;
    role: SyncRole;
    connections: Object;
    isSynced: boolean;
    userEventListeners: Array<Function>;
    whenSyncedListeners: Array<Function>;
    currentSyncTarget: ?UserId;
    syncingClients: Array<UserId>;
    forwardToSyncingClients: boolean;
    debug: boolean;
    broadcastedHB: boolean;
    syncStep2: Promise;
    userId: UserId;
    send: Function;
    broadcast: Function;
    broadcastOpBuffer: Array<Operation>;
    protocolVersion: number;
    */
    /*
      opts contains the following information:
       role : String Role of this client ("master" or "slave")
       userId : String Uniquely defines the user.
       debug: Boolean Whether to print debug messages (optional)
    */
    constructor (y, opts) {
      this.y = y
      if (opts == null) {
        opts = {}
      }
      if (opts.role == null || opts.role === 'master') {
        this.role = 'master'
      } else if (opts.role === 'slave') {
        this.role = 'slave'
      } else {
        throw new Error("Role must be either 'master' or 'slave'!")
      }
      this.y.db.forwardAppliedOperations = opts.forwardAppliedOperations || false
      this.role = opts.role
      this.connections = {}
      this.isSynced = false
      this.userEventListeners = []
      this.whenSyncedListeners = []
      this.currentSyncTarget = null
      this.syncingClients = []
      this.forwardToSyncingClients = opts.forwardToSyncingClients !== false
      this.debug = opts.debug === true
      this.broadcastedHB = false
      this.syncStep2 = Promise.resolve()
      this.broadcastOpBuffer = []
      this.protocolVersion = 11
    }
    reconnect () {
    }
    disconnect () {
      this.connections = {}
      this.isSynced = false
      this.currentSyncTarget = null
      this.broadcastedHB = false
      this.syncingClients = []
      this.whenSyncedListeners = []
      return this.y.db.stopGarbageCollector()
    }
    setUserId (userId) {
      if (this.userId == null) {
        this.userId = userId
        return this.y.db.setUserId(userId)
      } else {
        return null
      }
    }
    onUserEvent (f) {
      this.userEventListeners.push(f)
    }
    userLeft (user) {
      if (this.connections[user] != null) {
        delete this.connections[user]
        if (user === this.currentSyncTarget) {
          this.currentSyncTarget = null
          this.findNextSyncTarget()
        }
        this.syncingClients = this.syncingClients.filter(function (cli) {
          return cli !== user
        })
        for (var f of this.userEventListeners) {
          f({
            action: 'userLeft',
            user: user
          })
        }
      }
    }
    userJoined (user, role) {
      if (role == null) {
        throw new Error('You must specify the role of the joined user!')
      }
      if (this.connections[user] != null) {
        throw new Error('This user already joined!')
      }
      this.connections[user] = {
        isSynced: false,
        role: role
      }
      for (var f of this.userEventListeners) {
        f({
          action: 'userJoined',
          user: user,
          role: role
        })
      }
      if (this.currentSyncTarget == null) {
        this.findNextSyncTarget()
      }
    }
    // Execute a function _when_ we are connected.
    // If not connected, wait until connected
    whenSynced (f) {
      if (this.isSynced) {
        f()
      } else {
        this.whenSyncedListeners.push(f)
      }
    }
    /*

     returns false, if there is no sync target
     true otherwise
    */
    findNextSyncTarget () {
      if (this.currentSyncTarget != null || this.isSynced) {
        return // "The current sync has not finished!"
      }

      var syncUser = null
      for (var uid in this.connections) {
        if (!this.connections[uid].isSynced) {
          syncUser = uid
          break
        }
      }
      var conn = this
      if (syncUser != null) {
        this.currentSyncTarget = syncUser
        this.y.db.requestTransaction(function *() {
          var stateSet = yield* this.getStateSet()
          var deleteSet = yield* this.getDeleteSet()
          conn.send(syncUser, {
            type: 'sync step 1',
            stateSet: stateSet,
            deleteSet: deleteSet,
            protocolVersion: conn.protocolVersion
          })
        })
      } else {
        this.y.db.requestTransaction(function *() {
          // it is crucial that isSynced is set at the time garbageCollectAfterSync is called
          conn.isSynced = true
          yield* this.garbageCollectAfterSync()
          // call whensynced listeners
          for (var f of conn.whenSyncedListeners) {
            f()
          }
          conn.whenSyncedListeners = []
        })
      }
    }
    send (uid, message) {
      if (this.debug) {
        console.log(`send ${this.userId} -> ${uid}: ${message.type}`, message) // eslint-disable-line
      }
    }
    /*
      Buffer operations, and broadcast them when ready.
    */
    broadcastOps (ops) {
      ops = ops.map(function (op) {
        return Y.Struct[op.struct].encode(op)
      })
      var self = this
      function broadcastOperations () {
        if (self.broadcastOpBuffer.length > 0) {
          self.broadcast({
            type: 'update',
            ops: self.broadcastOpBuffer
          })
          self.broadcastOpBuffer = []
        }
      }
      if (this.broadcastOpBuffer.length === 0) {
        this.broadcastOpBuffer = ops
        if (this.y.db.transactionInProgress) {
          this.y.db.whenTransactionsFinished().then(broadcastOperations)
        } else {
          setTimeout(broadcastOperations, 0)
        }
      } else {
        this.broadcastOpBuffer = this.broadcastOpBuffer.concat(ops)
      }
    }
    /*
      You received a raw message, and you know that it is intended for Yjs. Then call this function.
    */
    receiveMessage (sender/* :UserId */, message/* :Message */) {
      if (sender === this.userId) {
        return
      }
      if (this.debug) {
        console.log(`receive ${sender} -> ${this.userId}: ${message.type}`, JSON.parse(JSON.stringify(message))) // eslint-disable-line
      }
      if (message.protocolVersion != null && message.protocolVersion !== this.protocolVersion) {
        console.error(
          `You tried to sync with a yjs instance that has a different protocol version
          (You: ${this.protocolVersion}, Client: ${message.protocolVersion}).
          The sync was stopped. You need to upgrade your dependencies (especially Yjs & the Connector)!
          `)
        this.send(sender, {
          type: 'sync stop',
          protocolVersion: this.protocolVersion
        })
        return
      }
      if (message.type === 'sync step 1') {
        let conn = this
        let m = message
        this.y.db.requestTransaction(function *() {
          var currentStateSet = yield* this.getStateSet()
          yield* this.applyDeleteSet(m.deleteSet)

          var ds = yield* this.getDeleteSet()
          var ops = yield* this.getOperations(m.stateSet)
          conn.send(sender, {
            type: 'sync step 2',
            os: ops,
            stateSet: currentStateSet,
            deleteSet: ds,
            protocolVersion: this.protocolVersion
          })
          if (this.forwardToSyncingClients) {
            conn.syncingClients.push(sender)
            setTimeout(function () {
              conn.syncingClients = conn.syncingClients.filter(function (cli) {
                return cli !== sender
              })
              conn.send(sender, {
                type: 'sync done'
              })
            }, 5000) // TODO: conn.syncingClientDuration)
          } else {
            conn.send(sender, {
              type: 'sync done'
            })
          }
          conn._setSyncedWith(sender)
        })
      } else if (message.type === 'sync step 2') {
        let conn = this
        var broadcastHB = !this.broadcastedHB
        this.broadcastedHB = true
        var db = this.y.db
        var defer = {}
        defer.promise = new Promise(function (resolve) {
          defer.resolve = resolve
        })
        this.syncStep2 = defer.promise
        let m /* :MessageSyncStep2 */ = message
        db.requestTransaction(function * () {
          yield* this.applyDeleteSet(m.deleteSet)
          this.store.apply(m.os)
          db.requestTransaction(function * () {
            var ops = yield* this.getOperations(m.stateSet)
            if (ops.length > 0) {
              if (!broadcastHB) { // TODO: consider to broadcast here..
                conn.send(sender, {
                  type: 'update',
                  ops: ops
                })
              } else {
                // broadcast only once!
                conn.broadcastOps(ops)
              }
            }
            defer.resolve()
          })
        })
      } else if (message.type === 'sync done') {
        var self = this
        this.syncStep2.then(function () {
          self._setSyncedWith(sender)
        })
      } else if (message.type === 'update') {
        if (this.forwardToSyncingClients) {
          for (var client of this.syncingClients) {
            this.send(client, message)
          }
        }
        if (this.y.db.forwardAppliedOperations) {
          var delops = message.ops.filter(function (o) {
            return o.struct === 'Delete'
          })
          if (delops.length > 0) {
            this.broadcastOps(delops)
          }
        }
        this.y.db.apply(message.ops)
      }
    }
    _setSyncedWith (user) {
      var conn = this.connections[user]
      if (conn != null) {
        conn.isSynced = true
      }
      if (user === this.currentSyncTarget) {
        this.currentSyncTarget = null
        this.findNextSyncTarget()
      }
    }
    /*
      Currently, the HB encodes operations as JSON. For the moment I want to keep it
      that way. Maybe we support encoding in the HB as XML in the future, but for now I don't want
      too much overhead. Y is very likely to get changed a lot in the future

      Because we don't want to encode JSON as string (with character escaping, wich makes it pretty much unreadable)
      we encode the JSON as XML.

      When the HB support encoding as XML, the format should look pretty much like this.

      does not support primitive values as array elements
      expects an ltx (less than xml) object
    */
    parseMessageFromXml (m/* :any */) {
      function parseArray (node) {
        for (var n of node.children) {
          if (n.getAttribute('isArray') === 'true') {
            return parseArray(n)
          } else {
            return parseObject(n)
          }
        }
      }
      function parseObject (node/* :any */) {
        var json = {}
        for (var attrName in node.attrs) {
          var value = node.attrs[attrName]
          var int = parseInt(value, 10)
          if (isNaN(int) || ('' + int) !== value) {
            json[attrName] = value
          } else {
            json[attrName] = int
          }
        }
        for (var n/* :any */ in node.children) {
          var name = n.name
          if (n.getAttribute('isArray') === 'true') {
            json[name] = parseArray(n)
          } else {
            json[name] = parseObject(n)
          }
        }
        return json
      }
      parseObject(m)
    }
    /*
      encode message in xml
      we use string because Strophe only accepts an "xml-string"..
      So {a:4,b:{c:5}} will look like
      <y a="4">
        <b c="5"></b>
      </y>
      m - ltx element
      json - Object
    */
    encodeMessageToXml (msg, obj) {
      // attributes is optional
      function encodeObject (m, json) {
        for (var name in json) {
          var value = json[name]
          if (name == null) {
            // nop
          } else if (value.constructor === Object) {
            encodeObject(m.c(name), value)
          } else if (value.constructor === Array) {
            encodeArray(m.c(name), value)
          } else {
            m.setAttribute(name, value)
          }
        }
      }
      function encodeArray (m, array) {
        m.setAttribute('isArray', 'true')
        for (var e of array) {
          if (e.constructor === Object) {
            encodeObject(m.c('array-element'), e)
          } else {
            encodeArray(m.c('array-element'), e)
          }
        }
      }
      if (obj.constructor === Object) {
        encodeObject(msg.c('y', { xmlns: 'http://y.ninja/connector-stanza' }), obj)
      } else if (obj.constructor === Array) {
        encodeArray(msg.c('y', { xmlns: 'http://y.ninja/connector-stanza' }), obj)
      } else {
        throw new Error("I can't encode this json!")
      }
    }
  }
  Y.AbstractConnector = AbstractConnector
}

},{}],7:[function(require,module,exports){
/* global getRandom, async */
'use strict'

module.exports = function (Y) {
  var globalRoom = {
    users: {},
    buffers: {}, // TODO: reimplement this idea. This does not cover all cases!! Here, you have a queue which is unrealistic (i.e. think about multiple incoming connections)
    removeUser: function (user) {
      for (var i in this.users) {
        this.users[i].userLeft(user)
      }
      delete this.users[user]
      delete this.buffers[user]
    },
    addUser: function (connector) {
      this.users[connector.userId] = connector
      this.buffers[connector.userId] = {}
      for (var uname in this.users) {
        if (uname !== connector.userId) {
          var u = this.users[uname]
          u.userJoined(connector.userId, 'master')
          connector.userJoined(u.userId, 'master')
        }
      }
    },
    whenTransactionsFinished: function () {
      var ps = []
      for (var name in this.users) {
        ps.push(this.users[name].y.db.whenTransactionsFinished())
      }
      return Promise.all(ps)
    },
    flushOne: function flushOne () {
      var bufs = []
      for (var receiver in globalRoom.buffers) {
        let buff = globalRoom.buffers[receiver]
        var push = false
        for (let sender in buff) {
          if (buff[sender].length > 0) {
            push = true
            break
          }
        }
        if (push) {
          bufs.push(receiver)
        }
      }
      if (bufs.length > 0) {
        var userId = getRandom(bufs)
        let buff = globalRoom.buffers[userId]
        let sender = getRandom(Object.keys(buff))
        var m = buff[sender].shift()
        if (buff[sender].length === 0) {
          delete buff[sender]
        }
        var user = globalRoom.users[userId]
        user.receiveMessage(m[0], m[1])
        return user.y.db.whenTransactionsFinished()
      } else {
        return false
      }
    },
    flushAll: function () {
      return new Promise(function (resolve) {
        // flushes may result in more created operations,
        // flush until there is nothing more to flush
        function nextFlush () {
          var c = globalRoom.flushOne()
          if (c) {
            while (c) {
              c = globalRoom.flushOne()
            }
            globalRoom.whenTransactionsFinished().then(nextFlush)
          } else {
            setTimeout(function () {
              var c = globalRoom.flushOne()
              if (c) {
                c.then(function () {
                  globalRoom.whenTransactionsFinished().then(nextFlush)
                })
              } else {
                resolve()
              }
            }, 0)
          }
        }
        globalRoom.whenTransactionsFinished().then(nextFlush)
      })
    }
  }
  Y.utils.globalRoom = globalRoom

  var userIdCounter = 0

  class Test extends Y.AbstractConnector {
    constructor (y, options) {
      if (options === undefined) {
        throw new Error('Options must not be undefined!')
      }
      options.role = 'master'
      options.forwardToSyncingClients = false
      super(y, options)
      this.setUserId((userIdCounter++) + '').then(() => {
        globalRoom.addUser(this)
      })
      this.globalRoom = globalRoom
      this.syncingClientDuration = 0
    }
    receiveMessage (sender, m) {
      super.receiveMessage(sender, JSON.parse(JSON.stringify(m)))
    }
    send (userId, message) {
      var buffer = globalRoom.buffers[userId]
      if (buffer != null) {
        if (buffer[this.userId] == null) {
          buffer[this.userId] = []
        }
        buffer[this.userId].push(JSON.parse(JSON.stringify([this.userId, message])))
      }
    }
    broadcast (message) {
      for (var key in globalRoom.buffers) {
        var buff = globalRoom.buffers[key]
        if (buff[this.userId] == null) {
          buff[this.userId] = []
        }
        buff[this.userId].push(JSON.parse(JSON.stringify([this.userId, message])))
      }
    }
    isDisconnected () {
      return globalRoom.users[this.userId] == null
    }
    reconnect () {
      if (this.isDisconnected()) {
        globalRoom.addUser(this)
        super.reconnect()
      }
      return Y.utils.globalRoom.flushAll()
    }
    disconnect () {
      if (!this.isDisconnected()) {
        globalRoom.removeUser(this.userId)
        super.disconnect()
      }
      return this.y.db.whenTransactionsFinished()
    }
    flush () {
      var self = this
      return async(function * () {
        var buff = globalRoom.buffers[self.userId]
        while (Object.keys(buff).length > 0) {
          var sender = getRandom(Object.keys(buff))
          var m = buff[sender].shift()
          if (buff[sender].length === 0) {
            delete buff[sender]
          }
          this.receiveMessage(m[0], m[1])
        }
        yield self.whenTransactionsFinished()
      })
    }
  }

  Y.Test = Test
}

},{}],8:[function(require,module,exports){
/* @flow */
'use strict'

module.exports = function (Y /* :any */) {
  /*
    Partial definition of an OperationStore.
    TODO: name it Database, operation store only holds operations.

    A database definition must alse define the following methods:
    * logTable() (optional)
      - show relevant information information in a table
    * requestTransaction(makeGen)
      - request a transaction
    * destroy()
      - destroy the database
  */
  class AbstractDatabase {
    /* ::
    y: YConfig;
    forwardAppliedOperations: boolean;
    listenersById: Object;
    listenersByIdExecuteNow: Array<Object>;
    listenersByIdRequestPending: boolean;
    initializedTypes: Object;
    whenUserIdSetListener: ?Function;
    waitingTransactions: Array<Transaction>;
    transactionInProgress: boolean;
    executeOrder: Array<Object>;
    gc1: Array<Struct>;
    gc2: Array<Struct>;
    gcTimeout: number;
    gcInterval: any;
    garbageCollect: Function;
    executeOrder: Array<any>; // for debugging only
    userId: UserId;
    opClock: number;
    transactionsFinished: ?{promise: Promise, resolve: any};
    transact: (x: ?Generator) => any;
    */
    constructor (y, opts) {
      this.y = y
      var os = this
      this.userId = null
      var resolve
      this.userIdPromise = new Promise(function (r) {
        resolve = r
      })
      this.userIdPromise.resolve = resolve
      // whether to broadcast all applied operations (insert & delete hook)
      this.forwardAppliedOperations = false
      // E.g. this.listenersById[id] : Array<Listener>
      this.listenersById = {}
      // Execute the next time a transaction is requested
      this.listenersByIdExecuteNow = []
      // A transaction is requested
      this.listenersByIdRequestPending = false
      /* To make things more clear, the following naming conventions:
         * ls : we put this.listenersById on ls
         * l : Array<Listener>
         * id : Id (can't use as property name)
         * sid : String (converted from id via JSON.stringify
                         so we can use it as a property name)

        Always remember to first overwrite
        a property before you iterate over it!
      */
      // TODO: Use ES7 Weak Maps. This way types that are no longer user,
      // wont be kept in memory.
      this.initializedTypes = {}
      this.waitingTransactions = []
      this.transactionInProgress = false
      this.transactionIsFlushed = false
      if (typeof YConcurrency_TestingMode !== 'undefined') {
        this.executeOrder = []
      }
      this.gc1 = [] // first stage
      this.gc2 = [] // second stage -> after that, remove the op
      this.gcTimeout = !opts.gcTimeout ? 50000 : opts.gcTimeouts
      function garbageCollect () {
        return os.whenTransactionsFinished().then(function () {
          if (os.gc1.length > 0 || os.gc2.length > 0) {
            if (!os.y.isConnected()) {
              console.warn('gc should be empty when disconnected!')
            }
            return new Promise((resolve) => {
              os.requestTransaction(function * () {
                if (os.y.connector != null && os.y.connector.isSynced) {
                  for (var i = 0; i < os.gc2.length; i++) {
                    var oid = os.gc2[i]
                    yield* this.garbageCollectOperation(oid)
                  }
                  os.gc2 = os.gc1
                  os.gc1 = []
                }
                // TODO: Use setInterval here instead (when garbageCollect is called several times there will be several timeouts..)
                if (os.gcTimeout > 0) {
                  os.gcInterval = setTimeout(garbageCollect, os.gcTimeout)
                }
                resolve()
              })
            })
          } else {
            // TODO: see above
            if (os.gcTimeout > 0) {
              os.gcInterval = setTimeout(garbageCollect, os.gcTimeout)
            }
            return Promise.resolve()
          }
        })
      }
      this.garbageCollect = garbageCollect
      if (this.gcTimeout > 0) {
        garbageCollect()
      }
    }
    queueGarbageCollector (id) {
      if (this.y.isConnected()) {
        this.gc1.push(id)
      }
    }
    emptyGarbageCollector () {
      return new Promise(resolve => {
        var check = () => {
          if (this.gc1.length > 0 || this.gc2.length > 0) {
            this.garbageCollect().then(check)
          } else {
            resolve()
          }
        }
        setTimeout(check, 0)
      })
    }
    addToDebug () {
      if (typeof YConcurrency_TestingMode !== 'undefined') {
        var command /* :string */ = Array.prototype.map.call(arguments, function (s) {
          if (typeof s === 'string') {
            return s
          } else {
            return JSON.stringify(s)
          }
        }).join('').replace(/"/g, "'").replace(/,/g, ', ').replace(/:/g, ': ')
        this.executeOrder.push(command)
      }
    }
    getDebugData () {
      console.log(this.executeOrder.join('\n'))
    }
    stopGarbageCollector () {
      var self = this
      return new Promise(function (resolve) {
        self.requestTransaction(function * () {
          var ungc /* :Array<Struct> */ = self.gc1.concat(self.gc2)
          self.gc1 = []
          self.gc2 = []
          for (var i = 0; i < ungc.length; i++) {
            var op = yield* this.getOperation(ungc[i])
            if (op != null) {
              delete op.gc
              yield* this.setOperation(op)
            }
          }
          resolve()
        })
      })
    }
    /*
      Try to add to GC.

      TODO: rename this function

      Rulez:
      * Only gc if this user is online
      * The most left element in a list must not be gc'd.
        => There is at least one element in the list

      returns true iff op was added to GC
    */
    * addToGarbageCollector (op, left) {
      if (
        op.gc == null &&
        op.deleted === true
      ) {
        var gc = false
        if (left != null && left.deleted === true) {
          gc = true
        } else if (op.content != null && op.content.length > 1) {
          op = yield* this.getInsertionCleanStart([op.id[0], op.id[1] + 1])
          gc = true
        }
        if (gc) {
          op.gc = true
          yield* this.setOperation(op)
          this.store.queueGarbageCollector(op.id)
          return true
        }
      }
      return false
    }
    removeFromGarbageCollector (op) {
      function filter (o) {
        return !Y.utils.compareIds(o, op.id)
      }
      this.gc1 = this.gc1.filter(filter)
      this.gc2 = this.gc2.filter(filter)
      delete op.gc
    }
    * destroy () {
      clearInterval(this.gcInterval)
      this.gcInterval = null
      for (var key in this.initializedTypes) {
        var type = this.initializedTypes[key]
        if (type._destroy != null) {
          type._destroy()
        } else {
          console.error('The type you included does not provide destroy functionality, it will remain in memory (updating your packages will help).')
        }
      }
    }
    setUserId (userId) {
      if (!this.userIdPromise.inProgress) {
        this.userIdPromise.inProgress = true
        var self = this
        self.requestTransaction(function * () {
          self.userId = userId
          var state = yield* this.getState(userId)
          self.opClock = state.clock
          self.userIdPromise.resolve(userId)
        })
      }
      return this.userIdPromise
    }
    whenUserIdSet (f) {
      this.userIdPromise.then(f)
    }
    getNextOpId (numberOfIds) {
      if (numberOfIds == null) {
        throw new Error('getNextOpId expects the number of created ids to create!')
      } else if (this.userId == null) {
        throw new Error('OperationStore not yet initialized!')
      } else {
        var id = [this.userId, this.opClock]
        this.opClock += numberOfIds
        return id
      }
    }
    /*
      Apply a list of operations.

      * get a transaction
      * check whether all Struct.*.requiredOps are in the OS
      * check if it is an expected op (otherwise wait for it)
      * check if was deleted, apply a delete operation after op was applied
    */
    apply (ops) {
      for (var i = 0; i < ops.length; i++) {
        var o = ops[i]
        if (o.id == null || o.id[0] !== this.y.connector.userId) {
          var required = Y.Struct[o.struct].requiredOps(o)
          if (o.requires != null) {
            required = required.concat(o.requires)
          }
          this.whenOperationsExist(required, o)
        }
      }
    }
    /*
      op is executed as soon as every operation requested is available.
      Note that Transaction can (and should) buffer requests.
    */
    whenOperationsExist (ids, op) {
      if (ids.length > 0) {
        let listener = {
          op: op,
          missing: ids.length
        }

        for (let i = 0; i < ids.length; i++) {
          let id = ids[i]
          let sid = JSON.stringify(id)
          let l = this.listenersById[sid]
          if (l == null) {
            l = []
            this.listenersById[sid] = l
          }
          l.push(listener)
        }
      } else {
        this.listenersByIdExecuteNow.push({
          op: op
        })
      }

      if (this.listenersByIdRequestPending) {
        return
      }

      this.listenersByIdRequestPending = true
      var store = this

      this.requestTransaction(function * () {
        var exeNow = store.listenersByIdExecuteNow
        store.listenersByIdExecuteNow = []

        var ls = store.listenersById
        store.listenersById = {}

        store.listenersByIdRequestPending = false

        for (let key = 0; key < exeNow.length; key++) {
          let o = exeNow[key].op
          yield* store.tryExecute.call(this, o)
        }

        for (var sid in ls) {
          var l = ls[sid]
          var id = JSON.parse(sid)
          var op
          if (typeof id[1] === 'string') {
            op = yield* this.getOperation(id)
          } else {
            op = yield* this.getInsertion(id)
          }
          if (op == null) {
            store.listenersById[sid] = l
          } else {
            for (let i = 0; i < l.length; i++) {
              let listener = l[i]
              let o = listener.op
              if (--listener.missing === 0) {
                yield* store.tryExecute.call(this, o)
              }
            }
          }
        }
      })
    }
    /*
      Actually execute an operation, when all expected operations are available.
    */
    /* :: // TODO: this belongs somehow to transaction
    store: Object;
    getOperation: any;
    isGarbageCollected: any;
    addOperation: any;
    whenOperationsExist: any;
    */
    * tryExecute (op) {
      this.store.addToDebug('yield* this.store.tryExecute.call(this, ', JSON.stringify(op), ')')
      if (op.struct === 'Delete') {
        yield* Y.Struct.Delete.execute.call(this, op)
        // this is now called in Transaction.deleteOperation!
        // yield* this.store.operationAdded(this, op)
      } else {
        // check if this op was defined
        var defined = yield* this.getInsertion(op.id)
        while (defined != null && defined.content != null) {
          // check if this op has a longer content in the case it is defined
          if (defined.id[1] + defined.content.length < op.id[1] + op.content.length) {
            var overlapSize = defined.content.length - (op.id[1] - defined.id[1])
            op.content.splice(0, overlapSize)
            op.id = [op.id[0], op.id[1] + overlapSize]
            op.left = Y.utils.getLastId(defined)
            op.origin = op.left
            defined = yield* this.getOperation(op.id) // getOperation suffices here
          } else {
            break
          }
        }
        if (defined == null) {
          var isGarbageCollected = yield* this.isGarbageCollected(op.id)
          if (!isGarbageCollected) {
            yield* Y.Struct[op.struct].execute.call(this, op)
            yield* this.addOperation(op)
            yield* this.store.operationAdded(this, op)

            // if insertion, try to combine with left
            yield* this.tryCombineWithLeft(op)
          }
        }
      }
    }
    /*
     * Called by a transaction when an operation is added.
     * This function is especially important for y-indexeddb, where several instances may share a single database.
     * Every time an operation is created by one instance, it is send to all other instances and operationAdded is called
     *
     * If it's not a Delete operation:
     *   * Checks if another operation is executable (listenersById)
     *   * Update state, if possible
     *
     * Always:
     *   * Call type
     */
    * operationAdded (transaction, op) {
      if (op.struct === 'Delete') {
        var target = yield* transaction.getInsertion(op.target)
        var type = this.initializedTypes[JSON.stringify(target.parent)]
        if (type != null) {
          yield* type._changed(transaction, op)
        }
      } else {
        // increase SS
        yield* transaction.updateState(op.id[0])
        var opLen = op.content != null ? op.content.length : 1
        for (let i = 0; i < opLen; i++) {
          // notify whenOperation listeners (by id)
          var sid = JSON.stringify([op.id[0], op.id[1] + i])
          var l = this.listenersById[sid]
          delete this.listenersById[sid]
          if (l != null) {
            for (var key in l) {
              var listener = l[key]
              if (--listener.missing === 0) {
                this.whenOperationsExist([], listener.op)
              }
            }
          }
        }
        var t = this.initializedTypes[JSON.stringify(op.parent)]

        // if parent is deleted, mark as gc'd and return
        if (op.parent != null) {
          var parentIsDeleted = yield* transaction.isDeleted(op.parent)
          if (parentIsDeleted) {
            yield* transaction.deleteList(op.id)
            return
          }
        }

        // notify parent, if it was instanciated as a custom type
        if (t != null) {
          let o = Y.utils.copyOperation(op)
          yield* t._changed(transaction, o)
        }
        if (!op.deleted) {
          // Delete if DS says this is actually deleted
          var len = op.content != null ? op.content.length : 1
          var startId = op.id // You must not use op.id in the following loop, because op will change when deleted
          for (let i = 0; i < len; i++) {
            var id = [startId[0], startId[1] + i]
            var opIsDeleted = yield* transaction.isDeleted(id)
            if (opIsDeleted) {
              var delop = {
                struct: 'Delete',
                target: id
              }
              yield* this.tryExecute.call(transaction, delop)
            }
          }
        }
      }
    }
    whenTransactionsFinished () {
      if (this.transactionInProgress) {
        if (this.transactionsFinished == null) {
          var resolve
          var promise = new Promise(function (r) {
            resolve = r
          })
          this.transactionsFinished = {
            resolve: resolve,
            promise: promise
          }
          return promise
        } else {
          return this.transactionsFinished.promise
        }
      } else {
        return Promise.resolve()
      }
    }
    // Check if there is another transaction request.
    // * the last transaction is always a flush :)
    getNextRequest () {
      if (this.waitingTransactions.length === 0) {
        if (this.transactionIsFlushed) {
          this.transactionInProgress = false
          this.transactionIsFlushed = false
          if (this.transactionsFinished != null) {
            this.transactionsFinished.resolve()
            this.transactionsFinished = null
          }
          return null
        } else {
          this.transactionIsFlushed = true
          return function * () {
            yield* this.flush()
          }
        }
      } else {
        this.transactionIsFlushed = false
        return this.waitingTransactions.shift()
      }
    }
    requestTransaction (makeGen/* :any */, callImmediately) {
      this.waitingTransactions.push(makeGen)
      if (!this.transactionInProgress) {
        this.transactionInProgress = true
        setTimeout(() => {
          this.transact(this.getNextRequest())
        }, 0)
      }
    }
  }
  Y.AbstractDatabase = AbstractDatabase
}

},{}],9:[function(require,module,exports){
/* @flow */
'use strict'

/*
 An operation also defines the structure of a type. This is why operation and
 structure are used interchangeably here.

 It must be of the type Object. I hope to achieve some performance
 improvements when working on databases that support the json format.

 An operation must have the following properties:

 * encode
     - Encode the structure in a readable format (preferably string- todo)
 * decode (todo)
     - decode structure to json
 * execute
     - Execute the semantics of an operation.
 * requiredOps
     - Operations that are required to execute this operation.
*/
module.exports = function (Y/* :any */) {
  var Struct = {
    /* This is the only operation that is actually not a structure, because
    it is not stored in the OS. This is why it _does not_ have an id

    op = {
      target: Id
    }
    */
    Delete: {
      encode: function (op) {
        return op
      },
      requiredOps: function (op) {
        return [] // [op.target]
      },
      execute: function * (op) {
        return yield* this.deleteOperation(op.target, op.length || 1)
      }
    },
    Insert: {
      /* {
          content: [any],
          opContent: Id,
          id: Id,
          left: Id,
          origin: Id,
          right: Id,
          parent: Id,
          parentSub: string (optional), // child of Map type
        }
      */
      encode: function (op/* :Insertion */) /* :Insertion */ {
        // TODO: you could not send the "left" property, then you also have to
        // "op.left = null" in $execute or $decode
        var e/* :any */ = {
          id: op.id,
          left: op.left,
          right: op.right,
          origin: op.origin,
          parent: op.parent,
          struct: op.struct
        }
        if (op.parentSub != null) {
          e.parentSub = op.parentSub
        }
        if (op.hasOwnProperty('opContent')) {
          e.opContent = op.opContent
        } else {
          e.content = op.content.slice()
        }

        return e
      },
      requiredOps: function (op) {
        var ids = []
        if (op.left != null) {
          ids.push(op.left)
        }
        if (op.right != null) {
          ids.push(op.right)
        }
        if (op.origin != null && !Y.utils.compareIds(op.left, op.origin)) {
          ids.push(op.origin)
        }
        // if (op.right == null && op.left == null) {
        ids.push(op.parent)

        if (op.opContent != null) {
          ids.push(op.opContent)
        }
        return ids
      },
      getDistanceToOrigin: function * (op) {
        if (op.left == null) {
          return 0
        } else {
          var d = 0
          var o = yield* this.getInsertion(op.left)
          while (!Y.utils.matchesId(o, op.origin)) {
            d++
            if (o.left == null) {
              break
            } else {
              o = yield* this.getInsertion(o.left)
            }
          }
          return d
        }
      },
      /*
      # $this has to find a unique position between origin and the next known character
      # case 1: $origin equals $o.origin: the $creator parameter decides if left or right
      #         let $OL= [o1,o2,o3,o4], whereby $this is to be inserted between o1 and o4
      #         o2,o3 and o4 origin is 1 (the position of o2)
      #         there is the case that $this.creator < o2.creator, but o3.creator < $this.creator
      #         then o2 knows o3. Since on another client $OL could be [o1,o3,o4] the problem is complex
      #         therefore $this would be always to the right of o3
      # case 2: $origin < $o.origin
      #         if current $this insert_position > $o origin: $this ins
      #         else $insert_position will not change
      #         (maybe we encounter case 1 later, then this will be to the right of $o)
      # case 3: $origin > $o.origin
      #         $this insert_position is to the left of $o (forever!)
      */
      execute: function * (op) {
        var i // loop counter

        // during this function some ops may get split into two pieces (e.g. with getInsertionCleanEnd)
        // We try to merge them later, if possible
        var tryToRemergeLater = []

        if (op.origin != null) { // TODO: !== instead of !=
          // we save in origin that op originates in it
          // we need that later when we eventually garbage collect origin (see transaction)
          var origin = yield* this.getInsertionCleanEnd(op.origin)
          if (origin.originOf == null) {
            origin.originOf = []
          }
          origin.originOf.push(op.id)
          yield* this.setOperation(origin)
          if (origin.right != null) {
            tryToRemergeLater.push(origin.right)
          }
        }
        var distanceToOrigin = i = yield* Struct.Insert.getDistanceToOrigin.call(this, op) // most cases: 0 (starts from 0)

        // now we begin to insert op in the list of insertions..
        var o
        var parent
        var start

        // find o. o is the first conflicting operation
        if (op.left != null) {
          o = yield* this.getInsertionCleanEnd(op.left)
          if (!Y.utils.compareIds(op.left, op.origin) && o.right != null) {
            // only if not added previously
            tryToRemergeLater.push(o.right)
          }
          o = (o.right == null) ? null : yield* this.getOperation(o.right)
        } else { // left == null
          parent = yield* this.getOperation(op.parent)
          let startId = op.parentSub ? parent.map[op.parentSub] : parent.start
          start = startId == null ? null : yield* this.getOperation(startId)
          o = start
        }

        // make sure to split op.right if necessary (also add to tryCombineWithLeft)
        if (op.right != null) {
          tryToRemergeLater.push(op.right)
          yield* this.getInsertionCleanStart(op.right)
        }

        // handle conflicts
        while (true) {
          if (o != null && !Y.utils.compareIds(o.id, op.right)) {
            var oOriginDistance = yield* Struct.Insert.getDistanceToOrigin.call(this, o)
            if (oOriginDistance === i) {
              // case 1
              if (o.id[0] < op.id[0]) {
                op.left = Y.utils.getLastId(o)
                distanceToOrigin = i + 1 // just ignore o.content.length, doesn't make a difference
              }
            } else if (oOriginDistance < i) {
              // case 2
              if (i - distanceToOrigin <= oOriginDistance) {
                op.left = Y.utils.getLastId(o)
                distanceToOrigin = i + 1 // just ignore o.content.length, doesn't make a difference
              }
            } else {
              break
            }
            i++
            if (o.right != null) {
              o = yield* this.getInsertion(o.right)
            } else {
              o = null
            }
          } else {
            break
          }
        }

        // reconnect..
        var left = null
        var right = null
        if (parent == null) {
          parent = yield* this.getOperation(op.parent)
        }

        // reconnect left and set right of op
        if (op.left != null) {
          left = yield* this.getInsertion(op.left)
          // link left
          op.right = left.right
          left.right = op.id

          yield* this.setOperation(left)
        } else {
          // set op.right from parent, if necessary
          op.right = op.parentSub ? parent.map[op.parentSub] || null : parent.start
        }
        // reconnect right
        if (op.right != null) {
          // TODO: wanna connect right too?
          right = yield* this.getOperation(op.right)
          right.left = Y.utils.getLastId(op)

          // if right exists, and it is supposed to be gc'd. Remove it from the gc
          if (right.gc != null) {
            if (right.content != null && right.content.length > 1) {
              right = yield* this.getInsertionCleanEnd(right.id)
            }
            this.store.removeFromGarbageCollector(right)
          }
          yield* this.setOperation(right)
        }

        // update parents .map/start/end properties
        if (op.parentSub != null) {
          if (left == null) {
            parent.map[op.parentSub] = op.id
            yield* this.setOperation(parent)
          }
          // is a child of a map struct.
          // Then also make sure that only the most left element is not deleted
          // We do not call the type in this case (this is what the third parameter is for)
          if (op.right != null) {
            yield* this.deleteOperation(op.right, 1, true)
          }
          if (op.left != null) {
            yield* this.deleteOperation(op.id, 1, true)
          }
        } else {
          if (right == null || left == null) {
            if (right == null) {
              parent.end = Y.utils.getLastId(op)
            }
            if (left == null) {
              parent.start = op.id
            }
            yield* this.setOperation(parent)
          }
        }

        // try to merge original op.left and op.origin
        for (let i = 0; i < tryToRemergeLater.length; i++) {
          var m = yield* this.getOperation(tryToRemergeLater[i])
          yield* this.tryCombineWithLeft(m)
        }
      }
    },
    List: {
      /*
      {
        start: null,
        end: null,
        struct: "List",
        type: "",
        id: this.os.getNextOpId(1)
      }
      */
      create: function (id) {
        return {
          start: null,
          end: null,
          struct: 'List',
          id: id
        }
      },
      encode: function (op) {
        var e = {
          struct: 'List',
          id: op.id,
          type: op.type
        }
        if (op.requires != null) {
          e.requires = op.requires
        }
        if (op.info != null) {
          e.info = op.info
        }
        return e
      },
      requiredOps: function () {
        /*
        var ids = []
        if (op.start != null) {
          ids.push(op.start)
        }
        if (op.end != null){
          ids.push(op.end)
        }
        return ids
        */
        return []
      },
      execute: function * (op) {
        op.start = null
        op.end = null
      },
      ref: function * (op, pos) {
        if (op.start == null) {
          return null
        }
        var res = null
        var o = yield* this.getOperation(op.start)

        while (true) {
          if (!o.deleted) {
            res = o
            pos--
          }
          if (pos >= 0 && o.right != null) {
            o = yield* this.getOperation(o.right)
          } else {
            break
          }
        }
        return res
      },
      map: function * (o, f) {
        o = o.start
        var res = []
        while (o != null) { // TODO: change to != (at least some convention)
          var operation = yield* this.getOperation(o)
          if (!operation.deleted) {
            res.push(f(operation))
          }
          o = operation.right
        }
        return res
      }
    },
    Map: {
      /*
        {
          map: {},
          struct: "Map",
          type: "",
          id: this.os.getNextOpId(1)
        }
      */
      create: function (id) {
        return {
          id: id,
          map: {},
          struct: 'Map'
        }
      },
      encode: function (op) {
        var e = {
          struct: 'Map',
          type: op.type,
          id: op.id,
          map: {} // overwrite map!!
        }
        if (op.requires != null) {
          e.requires = op.requires
        }
        if (op.info != null) {
          e.info = op.info
        }
        return e
      },
      requiredOps: function () {
        return []
      },
      execute: function * () {},
      /*
        Get a property by name
      */
      get: function * (op, name) {
        var oid = op.map[name]
        if (oid != null) {
          var res = yield* this.getOperation(oid)
          if (res == null || res.deleted) {
            return void 0
          } else if (res.opContent == null) {
            return res.content[0]
          } else {
            return yield* this.getType(res.opContent)
          }
        }
      }
    }
  }
  Y.Struct = Struct
}

},{}],10:[function(require,module,exports){
/* @flow */
'use strict'

/*
  Partial definition of a transaction

  A transaction provides all the the async functionality on a database.

  By convention, a transaction has the following properties:
  * ss for StateSet
  * os for OperationStore
  * ds for DeleteStore

  A transaction must also define the following methods:
  * checkDeleteStoreForState(state)
    - When increasing the state of a user, an operation with an higher id
      may already be garbage collected, and therefore it will never be received.
      update the state to reflect this knowledge. This won't call a method to save the state!
  * getDeleteSet(id)
    - Get the delete set in a readable format:
      {
        "userX": [
          [5,1], // starting from position 5, one operations is deleted
          [9,4]  // starting from position 9, four operations are deleted
        ],
        "userY": ...
      }
  * getOpsFromDeleteSet(ds) -- TODO: just call this.deleteOperation(id) here
    - get a set of deletions that need to be applied in order to get to
      achieve the state of the supplied ds
  * setOperation(op)
    - write `op` to the database.
      Note: this is allowed to return an in-memory object.
      E.g. the Memory adapter returns the object that it has in-memory.
      Changing values on this object will be stored directly in the database
      without calling this function. Therefore,
      setOperation may have no functionality in some adapters. This also has
      implications on the way we use operations that were served from the database.
      We try not to call copyObject, if not necessary.
  * addOperation(op)
    - add an operation to the database.
      This may only be called once for every op.id
      Must return a function that returns the next operation in the database (ordered by id)
  * getOperation(id)
  * removeOperation(id)
    - remove an operation from the database. This is called when an operation
      is garbage collected.
  * setState(state)
    - `state` is of the form
      {
        user: "1",
        clock: 4
      } <- meaning that we have four operations from user "1"
           (with these id's respectively: 0, 1, 2, and 3)
  * getState(user)
  * getStateVector()
    - Get the state of the OS in the form
    [{
      user: "userX",
      clock: 11
    },
     ..
    ]
  * getStateSet()
    - Get the state of the OS in the form
    {
      "userX": 11,
      "userY": 22
    }
   * getOperations(startSS)
     - Get the all the operations that are necessary in order to achive the
       stateSet of this user, starting from a stateSet supplied by another user
   * makeOperationReady(ss, op)
     - this is called only by `getOperations(startSS)`. It makes an operation
       applyable on a given SS.
*/
module.exports = function (Y/* :any */) {
  class TransactionInterface {
    /* ::
    store: Y.AbstractDatabase;
    ds: Store;
    os: Store;
    ss: Store;
    */
    /*
      Get a type based on the id of its model.
      If it does not exist yes, create it.
      TODO: delete type from store.initializedTypes[id] when corresponding id was deleted!
    */
    * getType (id, args) {
      var sid = JSON.stringify(id)
      var t = this.store.initializedTypes[sid]
      if (t == null) {
        var op/* :MapStruct | ListStruct */ = yield* this.getOperation(id)
        if (op != null) {
          t = yield* Y[op.type].typeDefinition.initType.call(this, this.store, op, args)
          this.store.initializedTypes[sid] = t
        }
      }
      return t
    }
    * createType (typedefinition, id) {
      var structname = typedefinition[0].struct
      id = id || this.store.getNextOpId(1)
      var op
      if (id[0] === '_') {
        op = yield* this.getOperation(id)
      } else {
        op = Y.Struct[structname].create(id)
        op.type = typedefinition[0].name
      }
      if (typedefinition[0].appendAdditionalInfo != null) {
        yield* typedefinition[0].appendAdditionalInfo.call(this, op, typedefinition[1])
      }
      if (op[0] === '_') {
        yield* this.setOperation(op)
      } else {
        yield* this.applyCreatedOperations([op])
      }
      return yield* this.getType(id, typedefinition[1])
    }
    /* createType (typedefinition, id) {
      var structname = typedefinition[0].struct
      id = id || this.store.getNextOpId(1)
      var op = Y.Struct[structname].create(id)
      op.type = typedefinition[0].name
      if (typedefinition[0].appendAdditionalInfo != null) {
        yield* typedefinition[0].appendAdditionalInfo.call(this, op, typedefinition[1])
      }
      // yield* this.applyCreatedOperations([op])
      yield* Y.Struct[op.struct].execute.call(this, op)
      yield* this.addOperation(op)
      yield* this.store.operationAdded(this, op)
      return yield* this.getType(id, typedefinition[1])
    }*/
    /*
      Apply operations that this user created (no remote ones!)
        * does not check for Struct.*.requiredOps()
        * also broadcasts it through the connector
    */
    * applyCreatedOperations (ops) {
      var send = []
      for (var i = 0; i < ops.length; i++) {
        var op = ops[i]
        yield* this.store.tryExecute.call(this, op)
        if (op.id == null || typeof op.id[1] !== 'string') {
          send.push(Y.Struct[op.struct].encode(op))
        }
      }
      if (!this.store.y.connector.isDisconnected() && send.length > 0) { // TODO: && !this.store.forwardAppliedOperations (but then i don't send delete ops)
        // is connected, and this is not going to be send in addOperation
        this.store.y.connector.broadcastOps(send)
      }
    }

    * deleteList (start) {
      while (start != null) {
        start = yield* this.getOperation(start)
        if (!start.gc) {
          start.gc = true
          start.deleted = true
          yield* this.setOperation(start)
          var delLength = start.content != null ? start.content.length : 1
          yield* this.markDeleted(start.id, delLength)
          if (start.opContent != null) {
            yield* this.deleteOperation(start.opContent)
          }
          this.store.queueGarbageCollector(start.id)
        }
        start = start.right
      }
    }

    /*
      Mark an operation as deleted, and add it to the GC, if possible.
    */
    * deleteOperation (targetId, length, preventCallType) /* :Generator<any, any, any> */ {
      if (length == null) {
        length = 1
      }
      yield* this.markDeleted(targetId, length)
      while (length > 0) {
        var callType = false
        var target = yield* this.os.findWithUpperBound([targetId[0], targetId[1] + length - 1])
        var targetLength = target != null && target.content != null ? target.content.length : 1
        if (target == null || target.id[0] !== targetId[0] || target.id[1] + targetLength <= targetId[1]) {
          // does not exist or is not in the range of the deletion
          target = null
          length = 0
        } else {
          // does exist, check if it is too long
          if (!target.deleted) {
            if (target.id[1] < targetId[1]) {
              // starts to the left of the deletion range
              target = yield* this.getInsertionCleanStart(targetId)
              targetLength = target.content.length // must have content property!
            }
            if (target.id[1] + targetLength > targetId[1] + length) {
              // ends to the right of the deletion range
              target = yield* this.getInsertionCleanEnd([targetId[0], targetId[1] + length - 1])
              targetLength = target.content.length
            }
          }
          length = target.id[1] - targetId[1]
        }

        if (target != null) {
          if (!target.deleted) {
            callType = true
            // set deleted & notify type
            target.deleted = true
            // delete containing lists
            if (target.start != null) {
              // TODO: don't do it like this .. -.-
              yield* this.deleteList(target.start)
              // yield* this.deleteList(target.id) -- do not gc itself because this may still get referenced
            }
            if (target.map != null) {
              for (var name in target.map) {
                yield* this.deleteList(target.map[name])
              }
              // TODO: here to..  (see above)
              // yield* this.deleteList(target.id) -- see above
            }
            if (target.opContent != null) {
              yield* this.deleteOperation(target.opContent)
              // target.opContent = null
            }
            if (target.requires != null) {
              for (var i = 0; i < target.requires.length; i++) {
                yield* this.deleteOperation(target.requires[i])
              }
            }
          }
          var left
          if (target.left != null) {
            left = yield* this.getInsertion(target.left)
          } else {
            left = null
          }

          // set here because it was deleted and/or gc'd
          yield* this.setOperation(target)

          /*
            Check if it is possible to add right to the gc.
            Because this delete can't be responsible for left being gc'd,
            we don't have to add left to the gc..
          */
          var right
          if (target.right != null) {
            right = yield* this.getOperation(target.right)
          } else {
            right = null
          }
          if (callType && !preventCallType) {
            yield* this.store.operationAdded(this, {
              struct: 'Delete',
              target: target.id,
              length: targetLength
            })
          }
          // need to gc in the end!
          yield* this.store.addToGarbageCollector.call(this, target, left)
          if (right != null) {
            yield* this.store.addToGarbageCollector.call(this, right, target)
          }
        }
      }
    }
    /*
      Mark an operation as deleted&gc'd
    */
    * markGarbageCollected (id, len) {
      // this.mem.push(["gc", id]);
      this.store.addToDebug('yield* this.markGarbageCollected(', id, ', ', len, ')')
      var n = yield* this.markDeleted(id, len)
      if (n.id[1] < id[1] && !n.gc) {
        // un-extend left
        var newlen = n.len - (id[1] - n.id[1])
        n.len -= newlen
        yield* this.ds.put(n)
        n = {id: id, len: newlen, gc: false}
        yield* this.ds.put(n)
      }
      // get prev&next before adding a new operation
      var prev = yield* this.ds.findPrev(id)
      var next = yield* this.ds.findNext(id)

      if (id[1] + len < n.id[1] + n.len && !n.gc) {
        // un-extend right
        yield* this.ds.put({id: [id[0], id[1] + len], len: n.len - len, gc: false})
        n.len = len
      }
      // set gc'd
      n.gc = true
      // can extend left?
      if (
        prev != null &&
        prev.gc &&
        Y.utils.compareIds([prev.id[0], prev.id[1] + prev.len], n.id)
      ) {
        prev.len += n.len
        yield* this.ds.delete(n.id)
        n = prev
        // ds.put n here?
      }
      // can extend right?
      if (
        next != null &&
        next.gc &&
        Y.utils.compareIds([n.id[0], n.id[1] + n.len], next.id)
      ) {
        n.len += next.len
        yield* this.ds.delete(next.id)
      }
      yield* this.ds.put(n)
      yield* this.updateState(n.id[0])
    }
    /*
      Mark an operation as deleted.

      returns the delete node
    */
    * markDeleted (id, length) {
      if (length == null) {
        length = 1
      }
      // this.mem.push(["del", id]);
      var n = yield* this.ds.findWithUpperBound(id)
      if (n != null && n.id[0] === id[0]) {
        if (n.id[1] <= id[1] && id[1] <= n.id[1] + n.len) {
          // id is in n's range
          var diff = id[1] + length - (n.id[1] + n.len) // overlapping right
          if (diff > 0) {
            // id+length overlaps n
            if (!n.gc) {
              n.len += diff
            } else {
              diff = n.id[1] + n.len - id[1] // overlapping left (id till n.end)
              if (diff < length) {
                // a partial deletion
                n = {id: [id[0], id[1] + diff], len: length - diff, gc: false}
                yield* this.ds.put(n)
              } else {
                // already gc'd
                throw new Error('Cannot happen! (it dit though.. :()')
                // return n
              }
            }
          } else {
            // no overlapping, already deleted
            return n
          }
        } else {
          // cannot extend left (there is no left!)
          n = {id: id, len: length, gc: false}
          yield* this.ds.put(n) // TODO: you double-put !!
        }
      } else {
        // cannot extend left
        n = {id: id, len: length, gc: false}
        yield* this.ds.put(n)
      }
      // can extend right?
      var next = yield* this.ds.findNext(n.id)
      if (
        next != null &&
        n.id[0] === next.id[0] &&
        n.id[1] + n.len >= next.id[1]
      ) {
        diff = n.id[1] + n.len - next.id[1] // from next.start to n.end
        while (diff >= 0) {
          // n overlaps with next
          if (next.gc) {
            // gc is stronger, so reduce length of n
            n.len -= diff
            if (diff >= next.len) {
              // delete the missing range after next
              diff = diff - next.len // missing range after next
              if (diff > 0) {
                yield* this.ds.put(n) // unneccessary? TODO!
                yield* this.markDeleted([next.id[0], next.id[1] + next.len], diff)
              }
            }
            break
          } else {
            // we can extend n with next
            if (diff > next.len) {
              // n is even longer than next
              // get next.next, and try to extend it
              var _next = yield* this.ds.findNext(next.id)
              yield* this.ds.delete(next.id)
              if (_next == null || n.id[0] !== _next.id[0]) {
                break
              } else {
                next = _next
                diff = n.id[1] + n.len - next.id[1] // from next.start to n.end
                // continue!
              }
            } else {
              // n just partially overlaps with next. extend n, delete next, and break this loop
              n.len += next.len - diff
              yield* this.ds.delete(next.id)
              break
            }
          }
        }
      }
      yield* this.ds.put(n)
      return n
    }
    /*
      Call this method when the client is connected&synced with the
      other clients (e.g. master). This will query the database for
      operations that can be gc'd and add them to the garbage collector.
    */
    * garbageCollectAfterSync () {
      if (this.store.gc1.length > 0 || this.store.gc2.length > 0) {
        console.warn('gc should be empty after sync')
      }
      yield* this.os.iterate(this, null, null, function * (op) {
        if (op.gc) {
          delete op.gc
          yield* this.setOperation(op)
        }
        if (op.parent != null) {
          var parentDeleted = yield* this.isDeleted(op.parent)
          if (parentDeleted) {
            op.gc = true
            if (!op.deleted) {
              yield* this.markDeleted(op.id, op.content != null ? op.content.length : 1)
              op.deleted = true
              if (op.opContent != null) {
                yield* this.deleteOperation(op.opContent)
              }
              if (op.requires != null) {
                for (var i = 0; i < op.requires.length; i++) {
                  yield* this.deleteOperation(op.requires[i])
                }
              }
            }
            yield* this.setOperation(op)
            this.store.gc1.push(op.id) // this is ok becaues its shortly before sync (otherwise use queueGarbageCollector!)
            return
          }
        }
        if (op.deleted) {
          var left = null
          if (op.left != null) {
            left = yield* this.getInsertion(op.left)
          }
          yield* this.store.addToGarbageCollector.call(this, op, left)
        }
      })
    }
    /*
      Really remove an op and all its effects.
      The complicated case here is the Insert operation:
      * reset left
      * reset right
      * reset parent.start
      * reset parent.end
      * reset origins of all right ops
    */
    * garbageCollectOperation (id) {
      this.store.addToDebug('yield* this.garbageCollectOperation(', id, ')')
      var o = yield* this.getOperation(id)
      yield* this.markGarbageCollected(id, (o != null && o.content != null) ? o.content.length : 1) // always mark gc'd
      // if op exists, then clean that mess up..
      if (o != null) {
        var deps = []
        if (o.opContent != null) {
          deps.push(o.opContent)
        }
        if (o.requires != null) {
          deps = deps.concat(o.requires)
        }
        for (var i = 0; i < deps.length; i++) {
          var dep = yield* this.getOperation(deps[i])
          if (dep != null) {
            if (!dep.deleted) {
              yield* this.deleteOperation(dep.id)
              dep = yield* this.getOperation(dep.id)
            }
            dep.gc = true
            yield* this.setOperation(dep)
            this.store.queueGarbageCollector(dep.id)
          } else {
            yield* this.markGarbageCollected(deps[i], 1)
          }
        }

        // remove gc'd op from the left op, if it exists
        if (o.left != null) {
          var left = yield* this.getInsertion(o.left)
          left.right = o.right
          yield* this.setOperation(left)
        }
        // remove gc'd op from the right op, if it exists
        // also reset origins of right ops
        if (o.right != null) {
          var right = yield* this.getOperation(o.right)
          right.left = o.left

          if (o.originOf != null && o.originOf.length > 0) {
            // find new origin of right ops
            // origin is the first left deleted operation
            var neworigin = o.left
            var neworigin_ = null
            while (neworigin != null) {
              neworigin_ = yield* this.getInsertion(neworigin)
              if (neworigin_.deleted) {
                break
              }
              neworigin = neworigin_.left
            }

            // reset origin of all right ops (except first right - duh!),

            /* ** The following code does not rely on the the originOf property **
                  I recently added originOf to all Insert Operations (see Struct.Insert.execute),
                  which saves which operations originate in a Insert operation.
                  Garbage collecting without originOf is more memory efficient, but is nearly impossible for large texts, or lists!
                  But I keep this code for now
            ```
            // reset origin of right
            right.origin = neworigin
            // search until you find origin pointer to the left of o
            if (right.right != null) {
              var i = yield* this.getOperation(right.right)
              var ids = [o.id, o.right]
              while (ids.some(function (id) {
                return Y.utils.compareIds(id, i.origin)
              })) {
                if (Y.utils.compareIds(i.origin, o.id)) {
                  // reset origin of i
                  i.origin = neworigin
                  yield* this.setOperation(i)
                }
                // get next i
                if (i.right == null) {
                  break
                } else {
                  ids.push(i.id)
                  i = yield* this.getOperation(i.right)
                }
              }
            }
            ```
            */
            // ** Now the new implementation starts **
            // reset neworigin of all originOf[*]
            for (var _i in o.originOf) {
              var originsIn = yield* this.getOperation(o.originOf[_i])
              if (originsIn != null) {
                originsIn.origin = neworigin
                yield* this.setOperation(originsIn)
              }
            }
            if (neworigin != null) {
              if (neworigin_.originOf == null) {
                neworigin_.originOf = o.originOf
              } else {
                neworigin_.originOf = o.originOf.concat(neworigin_.originOf)
              }
              yield* this.setOperation(neworigin_)
            }
            // we don't need to set right here, because
            // right should be in o.originOf => it is set it the previous for loop
          } else {
            // we didn't need to reset the origin of right
            // so we have to set right here
            yield* this.setOperation(right)
          }
        }
        // o may originate in another operation.
        // Since o is deleted, we have to reset o.origin's `originOf` property
        if (o.origin != null) {
          var origin = yield* this.getInsertion(o.origin)
          origin.originOf = origin.originOf.filter(function (_id) {
            return !Y.utils.compareIds(id, _id)
          })
          yield* this.setOperation(origin)
        }
        var parent
        if (o.parent != null) {
          parent = yield* this.getOperation(o.parent)
        }
        // remove gc'd op from parent, if it exists
        if (parent != null) {
          var setParent = false // whether to save parent to the os
          if (o.parentSub != null) {
            if (Y.utils.compareIds(parent.map[o.parentSub], o.id)) {
              setParent = true
              if (o.right != null) {
                parent.map[o.parentSub] = o.right
              } else {
                delete parent.map[o.parentSub]
              }
            }
          } else {
            if (Y.utils.compareIds(parent.start, o.id)) {
              // gc'd op is the start
              setParent = true
              parent.start = o.right
            }
            if (Y.utils.matchesId(o, parent.end)) {
              // gc'd op is the end
              setParent = true
              parent.end = o.left
            }
          }
          if (setParent) {
            yield* this.setOperation(parent)
          }
        }
        // finally remove it from the os
        yield* this.removeOperation(o.id)
      }
    }
    * checkDeleteStoreForState (state) {
      var n = yield* this.ds.findWithUpperBound([state.user, state.clock])
      if (n != null && n.id[0] === state.user && n.gc) {
        state.clock = Math.max(state.clock, n.id[1] + n.len)
      }
    }
    * updateState (user) {
      var state = yield* this.getState(user)
      yield* this.checkDeleteStoreForState(state)
      var o = yield* this.getInsertion([user, state.clock])
      var oLength = (o != null && o.content != null) ? o.content.length : 1
      while (o != null && user === o.id[0] && o.id[1] <= state.clock && o.id[1] + oLength > state.clock) {
        // either its a new operation (1. case), or it is an operation that was deleted, but is not yet in the OS
        state.clock += oLength
        yield* this.checkDeleteStoreForState(state)
        o = yield* this.os.findNext(o.id)
        oLength = (o != null && o.content != null) ? o.content.length : 1
      }
      yield* this.setState(state)
    }
    /*
      apply a delete set in order to get
      the state of the supplied ds
    */
    * applyDeleteSet (ds) {
      var deletions = []

      for (var user in ds) {
        var dv = ds[user]
        var pos = 0
        var d = dv[pos]
        yield* this.ds.iterate(this, [user, 0], [user, Number.MAX_VALUE], function * (n) {
          // cases:
          // 1. d deletes something to the right of n
          //  => go to next n (break)
          // 2. d deletes something to the left of n
          //  => create deletions
          //  => reset d accordingly
          //  *)=> if d doesn't delete anything anymore, go to next d (continue)
          // 3. not 2) and d deletes something that also n deletes
          //  => reset d so that it doesn't contain n's deletion
          //  *)=> if d does not delete anything anymore, go to next d (continue)
          while (d != null) {
            var diff = 0 // describe the diff of length in 1) and 2)
            if (n.id[1] + n.len <= d[0]) {
              // 1)
              break
            } else if (d[0] < n.id[1]) {
              // 2)
              // delete maximum the len of d
              // else delete as much as possible
              diff = Math.min(n.id[1] - d[0], d[1])
              deletions.push([user, d[0], diff, d[2]])
            } else {
              // 3)
              diff = n.id[1] + n.len - d[0] // never null (see 1)
              if (d[2] && !n.gc) {
                // d marks as gc'd but n does not
                // then delete either way
                deletions.push([user, d[0], Math.min(diff, d[1]), d[2]])
              }
            }
            if (d[1] <= diff) {
              // d doesn't delete anything anymore
              d = dv[++pos]
            } else {
              d[0] = d[0] + diff // reset pos
              d[1] = d[1] - diff // reset length
            }
          }
        })
        // for the rest.. just apply it
        for (; pos < dv.length; pos++) {
          d = dv[pos]
          deletions.push([user, d[0], d[1], d[2]])
        }
      }
      for (var i = 0; i < deletions.length; i++) {
        var del = deletions[i]
        // always try to delete..
        yield* this.deleteOperation([del[0], del[1]], del[2])
        if (del[3]) {
          // gc..
          yield* this.markGarbageCollected([del[0], del[1]], del[2]) // always mark gc'd
          // remove operation..
          var counter = del[1] + del[2]
          while (counter >= del[1]) {
            var o = yield* this.os.findWithUpperBound([del[0], counter - 1])
            if (o == null) {
              break
            }
            var oLen = o.content != null ? o.content.length : 1
            if (o.id[0] !== del[0] || o.id[1] + oLen <= del[1]) {
              // not in range
              break
            }
            if (o.id[1] + oLen > del[1] + del[2]) {
              // overlaps right
              o = yield* this.getInsertionCleanEnd([del[0], del[1] + del[2] - 1])
            }
            if (o.id[1] < del[1]) {
              // overlaps left
              o = yield* this.getInsertionCleanStart([del[0], del[1]])
            }
            counter = o.id[1]
            yield* this.garbageCollectOperation(o.id)
          }
        }
        if (this.store.forwardAppliedOperations) {
          var ops = []
          ops.push({struct: 'Delete', target: [d[0], d[1]], length: del[2]})
          this.store.y.connector.broadcastOps(ops)
        }
      }
    }
    * isGarbageCollected (id) {
      var n = yield* this.ds.findWithUpperBound(id)
      return n != null && n.id[0] === id[0] && id[1] < n.id[1] + n.len && n.gc
    }
    /*
      A DeleteSet (ds) describes all the deleted ops in the OS
    */
    * getDeleteSet () {
      var ds = {}
      yield* this.ds.iterate(this, null, null, function * (n) {
        var user = n.id[0]
        var counter = n.id[1]
        var len = n.len
        var gc = n.gc
        var dv = ds[user]
        if (dv === void 0) {
          dv = []
          ds[user] = dv
        }
        dv.push([counter, len, gc])
      })
      return ds
    }
    * isDeleted (id) {
      var n = yield* this.ds.findWithUpperBound(id)
      return n != null && n.id[0] === id[0] && id[1] < n.id[1] + n.len
    }
    * setOperation (op) {
      yield* this.os.put(op)
      return op
    }
    * addOperation (op) {
      yield* this.os.put(op)
      if (!this.store.y.connector.isDisconnected() && this.store.forwardAppliedOperations && typeof op.id[1] !== 'string') {
        // is connected, and this is not going to be send in addOperation
        this.store.y.connector.broadcastOps([op])
      }
    }
    // if insertion, try to combine with left insertion (if both have content property)
    * tryCombineWithLeft (op) {
      if (
        op != null &&
        op.left != null &&
        op.content != null &&
        op.left[0] === op.id[0] &&
        Y.utils.compareIds(op.left, op.origin)
      ) {
        var left = yield* this.getInsertion(op.left)
        if (left.content != null &&
            left.id[1] + left.content.length === op.id[1] &&
            left.originOf.length === 1 &&
            !left.gc && !left.deleted &&
            !op.gc && !op.deleted
        ) {
          // combine!
          if (op.originOf != null) {
            left.originOf = op.originOf
          } else {
            delete left.originOf
          }
          left.content = left.content.concat(op.content)
          left.right = op.right
          yield* this.os.delete(op.id)
          yield* this.setOperation(left)
        }
      }
    }
    * getInsertion (id) {
      var ins = yield* this.os.findWithUpperBound(id)
      if (ins == null) {
        return null
      } else {
        var len = ins.content != null ? ins.content.length : 1 // in case of opContent
        if (id[0] === ins.id[0] && id[1] < ins.id[1] + len) {
          return ins
        } else {
          return null
        }
      }
    }
    * getInsertionCleanStartEnd (id) {
      yield* this.getInsertionCleanStart(id)
      return yield* this.getInsertionCleanEnd(id)
    }
    // Return an insertion such that id is the first element of content
    // This function manipulates an operation, if necessary
    * getInsertionCleanStart (id) {
      var ins = yield* this.getInsertion(id)
      if (ins != null) {
        if (ins.id[1] === id[1]) {
          return ins
        } else {
          var left = Y.utils.copyObject(ins)
          ins.content = left.content.splice(id[1] - ins.id[1])
          ins.id = id
          var leftLid = Y.utils.getLastId(left)
          ins.origin = leftLid
          left.originOf = [ins.id]
          left.right = ins.id
          ins.left = leftLid
          // debugger // check
          yield* this.setOperation(left)
          yield* this.setOperation(ins)
          if (left.gc) {
            this.store.queueGarbageCollector(ins.id)
          }
          return ins
        }
      } else {
        return null
      }
    }
    // Return an insertion such that id is the last element of content
    // This function manipulates an operation, if necessary
    * getInsertionCleanEnd (id) {
      var ins = yield* this.getInsertion(id)
      if (ins != null) {
        if (ins.content == null || (ins.id[1] + ins.content.length - 1 === id[1])) {
          return ins
        } else {
          var right = Y.utils.copyObject(ins)
          right.content = ins.content.splice(id[1] - ins.id[1] + 1) // cut off remainder
          right.id = [id[0], id[1] + 1]
          var insLid = Y.utils.getLastId(ins)
          right.origin = insLid
          ins.originOf = [right.id]
          ins.right = right.id
          right.left = insLid
          // debugger // check
          yield* this.setOperation(right)
          yield* this.setOperation(ins)
          if (ins.gc) {
            this.store.queueGarbageCollector(right.id)
          }
          return ins
        }
      } else {
        return null
      }
    }
    * getOperation (id/* :any */)/* :Transaction<any> */ {
      var o = yield* this.os.find(id)
      if (id[0] !== '_' || o != null) {
        return o
      } else { // type is string
        // generate this operation?
        var comp = id[1].split('_')
        if (comp.length > 1) {
          var struct = comp[0]
          var op = Y.Struct[struct].create(id)
          op.type = comp[1]
          yield* this.setOperation(op)
          return op
        } else {
          // won't be called. but just in case..
          console.error('Unexpected case. How can this happen?')
          debugger // eslint-disable-line
          return null
        }
      }
    }
    * removeOperation (id) {
      yield* this.os.delete(id)
    }
    * setState (state) {
      var val = {
        id: [state.user],
        clock: state.clock
      }
      yield* this.ss.put(val)
    }
    * getState (user) {
      var n = yield* this.ss.find([user])
      var clock = n == null ? null : n.clock
      if (clock == null) {
        clock = 0
      }
      return {
        user: user,
        clock: clock
      }
    }
    * getStateVector () {
      var stateVector = []
      yield* this.ss.iterate(this, null, null, function * (n) {
        stateVector.push({
          user: n.id[0],
          clock: n.clock
        })
      })
      return stateVector
    }
    * getStateSet () {
      var ss = {}
      yield* this.ss.iterate(this, null, null, function * (n) {
        ss[n.id[0]] = n.clock
      })
      return ss
    }
    /*
      Here, we make all missing operations executable for the receiving user.

      Notes:
        startSS: denotes to the SV that the remote user sent
        currSS:  denotes to the state vector that the user should have if he
                 applies all already sent operations (increases is each step)

      We face several problems:
      * Execute op as is won't work because ops depend on each other
       -> find a way so that they do not anymore
      * When changing left, must not go more to the left than the origin
      * When changing right, you have to consider that other ops may have op
        as their origin, this means that you must not set one of these ops
        as the new right (interdependencies of ops)
      * can't just go to the right until you find the first known operation,
        With currSS
          -> interdependency of ops is a problem
        With startSS
          -> leads to inconsistencies when two users join at the same time.
             Then the position depends on the order of execution -> error!

        Solution:
        -> re-create originial situation
          -> set op.left = op.origin (which never changes)
          -> set op.right
               to the first operation that is known (according to startSS)
               or to the first operation that has an origin that is not to the
               right of op.
          -> Enforces unique execution order -> happy user

        Improvements: TODO
          * Could set left to origin, or the first known operation
            (startSS or currSS.. ?)
            -> Could be necessary when I turn GC again.
            -> Is a bad(ish) idea because it requires more computation

      What we do:
      * Iterate over all missing operations.
      * When there is an operation, where the right op is known, send this op all missing ops to the left to the user
      * I explained above what we have to do with each operation. Here is how we do it efficiently:
        1. Go to the left until you find either op.origin, or a known operation (let o denote current operation in the iteration)
        2. Found a known operation -> set op.left = o, and send it to the user. stop
        3. Found o = op.origin -> set op.left = op.origin, and send it to the user. start again from 1. (set op = o)
        4. Found some o -> set o.right = op, o.left = o.origin, send it to the user, continue
    */
    * getOperations (startSS) {
      // TODO: use bounds here!
      if (startSS == null) {
        startSS = {}
      }
      var send = []

      var endSV = yield* this.getStateVector()
      for (var endState of endSV) {
        var user = endState.user
        if (user === '_') {
          continue
        }
        var startPos = startSS[user] || 0
        if (startPos > 0) {
          // There is a change that [user, startPos] is in a composed Insertion (with a smaller counter)
          // find out if that is the case
          var firstMissing = yield* this.getInsertion([user, startPos])
          if (firstMissing != null) {
            // update startPos
            startPos = firstMissing.id[1]
          }
        }
        yield* this.os.iterate(this, [user, startPos], [user, Number.MAX_VALUE], function * (op) {
          op = Y.Struct[op.struct].encode(op)
          if (op.struct !== 'Insert') {
            send.push(op)
          } else if (op.right == null || op.right[1] < (startSS[op.right[0]] || 0)) {
            // case 1. op.right is known
            var o = op
            // Remember: ?
            // -> set op.right
            //    1. to the first operation that is known (according to startSS)
            //    2. or to the first operation that has an origin that is not to the
            //      right of op.
            // For this we maintain a list of ops which origins are not found yet.
            var missing_origins = [op]
            var newright = op.right
            while (true) {
              if (o.left == null) {
                op.left = null
                send.push(op)
                if (!Y.utils.compareIds(o.id, op.id)) {
                  o = Y.Struct[op.struct].encode(o)
                  o.right = missing_origins[missing_origins.length - 1].id
                  send.push(o)
                }
                break
              }
              o = yield* this.getInsertion(o.left)
              // we set another o, check if we can reduce $missing_origins
              while (missing_origins.length > 0 && Y.utils.matchesId(o, missing_origins[missing_origins.length - 1].origin)) {
                missing_origins.pop()
              }
              if (o.id[1] < (startSS[o.id[0]] || 0)) {
                // case 2. o is known
                op.left = Y.utils.getLastId(o)
                send.push(op)
                break
              } else if (Y.utils.matchesId(o, op.origin)) {
                // case 3. o is op.origin
                op.left = op.origin
                send.push(op)
                op = Y.Struct[op.struct].encode(o)
                op.right = newright
                if (missing_origins.length > 0) {
                  console.log('This should not happen .. :( please report this')
                }
                missing_origins = [op]
              } else {
                // case 4. send o, continue to find op.origin
                var s = Y.Struct[op.struct].encode(o)
                s.right = missing_origins[missing_origins.length - 1].id
                s.left = s.origin
                send.push(s)
                missing_origins.push(o)
              }
            }
          }
        })
      }
      return send.reverse()
    }
    /* this is what we used before.. use this as a reference..
    * makeOperationReady (startSS, op) {
      op = Y.Struct[op.struct].encode(op)
      op = Y.utils.copyObject(op) -- use copyoperation instead now!
      var o = op
      var ids = [op.id]
      // search for the new op.right
      // it is either the first known op (according to startSS)
      // or the o that has no origin to the right of op
      // (this is why we use the ids array)
      while (o.right != null) {
        var right = yield* this.getOperation(o.right)
        if (o.right[1] < (startSS[o.right[0]] || 0) || !ids.some(function (id) {
          return Y.utils.compareIds(id, right.origin)
        })) {
          break
        }
        ids.push(o.right)
        o = right
      }
      op.right = o.right
      op.left = op.origin
      return op
    }
    */
    * flush () {
      yield* this.os.flush()
      yield* this.ss.flush()
      yield* this.ds.flush()
    }
  }
  Y.Transaction = TransactionInterface
}

},{}],11:[function(require,module,exports){
/* @flow */
'use strict'

/*
  EventHandler is an helper class for constructing custom types.

  Why: When constructing custom types, you sometimes want your types to work
  synchronous: E.g.
  ``` Synchronous
    mytype.setSomething("yay")
    mytype.getSomething() === "yay"
  ```
  versus
  ``` Asynchronous
    mytype.setSomething("yay")
    mytype.getSomething() === undefined
    mytype.waitForSomething().then(function(){
      mytype.getSomething() === "yay"
    })
  ```

  The structures usually work asynchronously (you have to wait for the
  database request to finish). EventHandler helps you to make your type
  synchronous.
*/
module.exports = function (Y /* : any*/) {
  Y.utils = {}

  class EventListenerHandler {
    constructor () {
      this.eventListeners = []
    }
    destroy () {
      this.eventListeners = null
    }
     /*
      Basic event listener boilerplate...
    */
    addEventListener (f) {
      this.eventListeners.push(f)
    }
    removeEventListener (f) {
      this.eventListeners = this.eventListeners.filter(function (g) {
        return f !== g
      })
    }
    removeAllEventListeners () {
      this.eventListeners = []
    }
    callEventListeners (event) {
      for (var i = 0; i < this.eventListeners.length; i++) {
        try {
          this.eventListeners[i](event)
        } catch (e) {
          console.error('User events must not throw Errors!')
        }
      }
    }
  }
  Y.utils.EventListenerHandler = EventListenerHandler

  class EventHandler extends EventListenerHandler {
    /* ::
    waiting: Array<Insertion | Deletion>;
    awaiting: number;
    onevent: Function;
    eventListeners: Array<Function>;
    */
    /*
      onevent: is called when the structure changes.

      Note: "awaiting opertations" is used to denote operations that were
      prematurely called. Events for received operations can not be executed until
      all prematurely called operations were executed ("waiting operations")
    */
    constructor (onevent /* : Function */) {
      super()
      this.waiting = []
      this.awaiting = 0
      this.onevent = onevent
    }
    destroy () {
      super.destroy()
      this.waiting = null
      this.awaiting = null
      this.onevent = null
    }
    /*
      Call this when a new operation arrives. It will be executed right away if
      there are no waiting operations, that you prematurely executed
    */
    receivedOp (op) {
      if (this.awaiting <= 0) {
        this.onevent(op)
      } else {
        this.waiting.push(op)
      }
    }
    /*
      You created some operations, and you want the `onevent` function to be
      called right away. Received operations will not be executed untill all
      prematurely called operations are executed
    */
    awaitAndPrematurelyCall (ops) {
      this.awaiting++
      ops.map(Y.utils.copyOperation).forEach(this.onevent)
    }
    * awaitOps (transaction, f, args) {
      function notSoSmartSort (array) {
        // this function sorts insertions in a executable order
        var result = []
        while (array.length > 0) {
          for (var i = 0; i < array.length; i++) {
            var independent = true
            for (var j = 0; j < array.length; j++) {
              if (Y.utils.matchesId(array[j], array[i].left)) {
                // array[i] depends on array[j]
                independent = false
                break
              }
            }
            if (independent) {
              result.push(array.splice(i, 1)[0])
              i--
            }
          }
        }
        return result
      }
      var before = this.waiting.length
      // somehow create new operations
      yield* f.apply(transaction, args)
      // remove all appended ops / awaited ops
      this.waiting.splice(before)
      if (this.awaiting > 0) this.awaiting--
      // if there are no awaited ops anymore, we can update all waiting ops, and send execute them (if there are still no awaited ops)
      if (this.awaiting === 0 && this.waiting.length > 0) {
        // update all waiting ops
        for (let i = 0; i < this.waiting.length; i++) {
          var o = this.waiting[i]
          if (o.struct === 'Insert') {
            var _o = yield* transaction.getInsertion(o.id)
            if (!Y.utils.compareIds(_o.id, o.id)) {
              // o got extended
              o.left = [o.id[0], o.id[1] - 1]
            } else if (_o.left == null) {
              o.left = null
            } else {
              // find next undeleted op
              var left = yield* transaction.getInsertion(_o.left)
              while (left.deleted != null) {
                if (left.left != null) {
                  left = yield* transaction.getInsertion(left.left)
                } else {
                  left = null
                  break
                }
              }
              o.left = left != null ? Y.utils.getLastId(left) : null
            }
          }
        }
        // the previous stuff was async, so we have to check again!
        // We also pull changes from the bindings, if there exists such a method, this could increase awaiting too
        if (this._pullChanges != null) {
          this._pullChanges()
        }
        if (this.awaiting === 0) {
          // sort by type, execute inserts first
          var ins = []
          var dels = []
          this.waiting.forEach(function (o) {
            if (o.struct === 'Delete') {
              dels.push(o)
            } else {
              ins.push(o)
            }
          })
          // put in executable order
          ins = notSoSmartSort(ins)
          ins.forEach(this.onevent)
          dels.forEach(this.onevent)
          this.waiting = []
        }
      }
    }
    // TODO: Remove awaitedInserts and awaitedDeletes in favor of awaitedOps, as they are deprecated and do not always work
    // Do this in one of the coming releases that are breaking anyway
    /*
      Call this when you successfully awaited the execution of n Insert operations
    */
    awaitedInserts (n) {
      var ops = this.waiting.splice(this.waiting.length - n)
      for (var oid = 0; oid < ops.length; oid++) {
        var op = ops[oid]
        if (op.struct === 'Insert') {
          for (var i = this.waiting.length - 1; i >= 0; i--) {
            let w = this.waiting[i]
            // TODO: do I handle split operations correctly here? Super unlikely, but yeah..
            // Also: can this case happen? Can op be inserted in the middle of a larger op that is in $waiting?
            if (w.struct === 'Insert') {
              if (Y.utils.matchesId(w, op.left)) {
                // include the effect of op in w
                w.right = op.id
                // exclude the effect of w in op
                op.left = w.left
              } else if (Y.utils.compareIds(w.id, op.right)) {
                // similar..
                w.left = Y.utils.getLastId(op)
                op.right = w.right
              }
            }
          }
        } else {
          throw new Error('Expected Insert Operation!')
        }
      }
      this._tryCallEvents(n)
    }
    /*
      Call this when you successfully awaited the execution of n Delete operations
    */
    awaitedDeletes (n, newLeft) {
      var ops = this.waiting.splice(this.waiting.length - n)
      for (var j = 0; j < ops.length; j++) {
        var del = ops[j]
        if (del.struct === 'Delete') {
          if (newLeft != null) {
            for (var i = 0; i < this.waiting.length; i++) {
              let w = this.waiting[i]
              // We will just care about w.left
              if (w.struct === 'Insert' && Y.utils.compareIds(del.target, w.left)) {
                w.left = newLeft
              }
            }
          }
        } else {
          throw new Error('Expected Delete Operation!')
        }
      }
      this._tryCallEvents(n)
    }
    /* (private)
      Try to execute the events for the waiting operations
    */
    _tryCallEvents () {
      function notSoSmartSort (array) {
        var result = []
        while (array.length > 0) {
          for (var i = 0; i < array.length; i++) {
            var independent = true
            for (var j = 0; j < array.length; j++) {
              if (Y.utils.matchesId(array[j], array[i].left)) {
                // array[i] depends on array[j]
                independent = false
                break
              }
            }
            if (independent) {
              result.push(array.splice(i, 1)[0])
              i--
            }
          }
        }
        return result
      }
      if (this.awaiting > 0) this.awaiting--
      if (this.awaiting === 0 && this.waiting.length > 0) {
        var ins = []
        var dels = []
        this.waiting.forEach(function (o) {
          if (o.struct === 'Delete') {
            dels.push(o)
          } else {
            ins.push(o)
          }
        })
        ins = notSoSmartSort(ins)
        ins.forEach(this.onevent)
        dels.forEach(this.onevent)
        this.waiting = []
      }
    }
  }
  Y.utils.EventHandler = EventHandler

  /*
    A wrapper for the definition of a custom type.
    Every custom type must have three properties:

    * struct
      - Structname of this type
    * initType
      - Given a model, creates a custom type
    * class
      - the constructor of the custom type (e.g. in order to inherit from a type)
  */
  class CustomType { // eslint-disable-line
    /* ::
    struct: any;
    initType: any;
    class: Function;
    name: String;
    */
    constructor (def) {
      if (def.struct == null ||
        def.initType == null ||
        def.class == null ||
        def.name == null
      ) {
        throw new Error('Custom type was not initialized correctly!')
      }
      this.struct = def.struct
      this.initType = def.initType
      this.class = def.class
      this.name = def.name
      if (def.appendAdditionalInfo != null) {
        this.appendAdditionalInfo = def.appendAdditionalInfo
      }
      this.parseArguments = (def.parseArguments || function () {
        return [this]
      }).bind(this)
      this.parseArguments.typeDefinition = this
    }
  }
  Y.utils.CustomType = CustomType

  Y.utils.isTypeDefinition = function isTypeDefinition (v) {
    if (v != null) {
      if (v instanceof Y.utils.CustomType) return [v]
      else if (v.constructor === Array && v[0] instanceof Y.utils.CustomType) return v
      else if (v instanceof Function && v.typeDefinition instanceof Y.utils.CustomType) return [v.typeDefinition]
    }
    return false
  }

  /*
    Make a flat copy of an object
    (just copy properties)
  */
  function copyObject (o) {
    var c = {}
    for (var key in o) {
      c[key] = o[key]
    }
    return c
  }
  Y.utils.copyObject = copyObject

  /*
    Copy an operation, so that it can be manipulated.
    Note: You must not change subproperties (except o.content)!
  */
  function copyOperation (o) {
    o = copyObject(o)
    if (o.content != null) {
      o.content = o.content.map(function (c) { return c })
    }
    return o
  }

  Y.utils.copyOperation = copyOperation

  /*
    Defines a smaller relation on Id's
  */
  function smaller (a, b) {
    return a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || typeof a[1] < typeof b[1]))
  }
  Y.utils.smaller = smaller

  function inDeletionRange (del, ins) {
    return del.target[0] === ins[0] && del.target[1] <= ins[1] && ins[1] < del.target[1] + (del.length || 1)
  }
  Y.utils.inDeletionRange = inDeletionRange

  function compareIds (id1, id2) {
    if (id1 == null || id2 == null) {
      return id1 === id2
    } else {
      return id1[0] === id2[0] && id1[1] === id2[1]
    }
  }
  Y.utils.compareIds = compareIds

  function matchesId (op, id) {
    if (id == null || op == null) {
      return id === op
    } else {
      if (id[0] === op.id[0]) {
        if (op.content == null) {
          return id[1] === op.id[1]
        } else {
          return id[1] >= op.id[1] && id[1] < op.id[1] + op.content.length
        }
      }
    }
  }
  Y.utils.matchesId = matchesId

  function getLastId (op) {
    if (op.content == null || op.content.length === 1) {
      return op.id
    } else {
      return [op.id[0], op.id[1] + op.content.length - 1]
    }
  }
  Y.utils.getLastId = getLastId

  function createEmptyOpsArray (n) {
    var a = new Array(n)
    for (var i = 0; i < a.length; i++) {
      a[i] = {
        id: [null, null]
      }
    }
    return a
  }

  function createSmallLookupBuffer (Store) {
    /*
      This buffer implements a very small buffer that temporarily stores operations
      after they are read / before they are written.
      The buffer basically implements FIFO. Often requested lookups will be re-queued every time they are looked up / written.

      It can speed up lookups on Operation Stores and State Stores. But it does not require notable use of memory or processing power.

      Good for os and ss, bot not for ds (because it often uses methods that require a flush)

      I tried to optimize this for performance, therefore no highlevel operations.
    */
    class SmallLookupBuffer extends Store {
      constructor (arg1, arg2) {
        // super(...arguments) -- do this when this is supported by stable nodejs
        super(arg1, arg2)
        this.writeBuffer = createEmptyOpsArray(5)
        this.readBuffer = createEmptyOpsArray(10)
      }
      * find (id, noSuperCall) {
        var i, r
        for (i = this.readBuffer.length - 1; i >= 0; i--) {
          r = this.readBuffer[i]
          // we don't have to use compareids, because id is always defined!
          if (r.id[1] === id[1] && r.id[0] === id[0]) {
            // found r
            // move r to the end of readBuffer
            for (; i < this.readBuffer.length - 1; i++) {
              this.readBuffer[i] = this.readBuffer[i + 1]
            }
            this.readBuffer[this.readBuffer.length - 1] = r
            return r
          }
        }
        var o
        for (i = this.writeBuffer.length - 1; i >= 0; i--) {
          r = this.writeBuffer[i]
          if (r.id[1] === id[1] && r.id[0] === id[0]) {
            o = r
            break
          }
        }
        if (i < 0 && noSuperCall === undefined) {
          // did not reach break in last loop
          // read id and put it to the end of readBuffer
          o = yield* super.find(id)
        }
        if (o != null) {
          for (i = 0; i < this.readBuffer.length - 1; i++) {
            this.readBuffer[i] = this.readBuffer[i + 1]
          }
          this.readBuffer[this.readBuffer.length - 1] = o
        }
        return o
      }
      * put (o) {
        var id = o.id
        var i, r // helper variables
        for (i = this.writeBuffer.length - 1; i >= 0; i--) {
          r = this.writeBuffer[i]
          if (r.id[1] === id[1] && r.id[0] === id[0]) {
            // is already in buffer
            // forget r, and move o to the end of writeBuffer
            for (; i < this.writeBuffer.length - 1; i++) {
              this.writeBuffer[i] = this.writeBuffer[i + 1]
            }
            this.writeBuffer[this.writeBuffer.length - 1] = o
            break
          }
        }
        if (i < 0) {
          // did not reach break in last loop
          // write writeBuffer[0]
          var write = this.writeBuffer[0]
          if (write.id[0] !== null) {
            yield* super.put(write)
          }
          // put o to the end of writeBuffer
          for (i = 0; i < this.writeBuffer.length - 1; i++) {
            this.writeBuffer[i] = this.writeBuffer[i + 1]
          }
          this.writeBuffer[this.writeBuffer.length - 1] = o
        }
        // check readBuffer for every occurence of o.id, overwrite if found
        // whether found or not, we'll append o to the readbuffer
        for (i = 0; i < this.readBuffer.length - 1; i++) {
          r = this.readBuffer[i + 1]
          if (r.id[1] === id[1] && r.id[0] === id[0]) {
            this.readBuffer[i] = o
          } else {
            this.readBuffer[i] = r
          }
        }
        this.readBuffer[this.readBuffer.length - 1] = o
      }
      * delete (id) {
        var i, r
        for (i = 0; i < this.readBuffer.length; i++) {
          r = this.readBuffer[i]
          if (r.id[1] === id[1] && r.id[0] === id[0]) {
            this.readBuffer[i] = {
              id: [null, null]
            }
          }
        }
        yield* this.flush()
        yield* super.delete(id)
      }
      * findWithLowerBound (id) {
        var o = yield* this.find(id, true)
        if (o != null) {
          return o
        } else {
          yield* this.flush()
          return yield* super.findWithLowerBound.apply(this, arguments)
        }
      }
      * findWithUpperBound (id) {
        var o = yield* this.find(id, true)
        if (o != null) {
          return o
        } else {
          yield* this.flush()
          return yield* super.findWithUpperBound.apply(this, arguments)
        }
      }
      * findNext () {
        yield* this.flush()
        return yield* super.findNext.apply(this, arguments)
      }
      * findPrev () {
        yield* this.flush()
        return yield* super.findPrev.apply(this, arguments)
      }
      * iterate () {
        yield* this.flush()
        yield* super.iterate.apply(this, arguments)
      }
      * flush () {
        for (var i = 0; i < this.writeBuffer.length; i++) {
          var write = this.writeBuffer[i]
          if (write.id[0] !== null) {
            yield* super.put(write)
            this.writeBuffer[i] = {
              id: [null, null]
            }
          }
        }
      }
    }
    return SmallLookupBuffer
  }
  Y.utils.createSmallLookupBuffer = createSmallLookupBuffer
}

},{}],12:[function(require,module,exports){
/* @flow */
'use strict'

require('./Connector.js')(Y)
require('./Database.js')(Y)
require('./Transaction.js')(Y)
require('./Struct.js')(Y)
require('./Utils.js')(Y)
require('./Connectors/Test.js')(Y)

var requiringModules = {}

module.exports = Y
Y.requiringModules = requiringModules

Y.extend = function (name, value) {
  if (value instanceof Y.utils.CustomType) {
    Y[name] = value.parseArguments
  } else {
    Y[name] = value
  }
  if (requiringModules[name] != null) {
    requiringModules[name].resolve()
    delete requiringModules[name]
  }
}

Y.requestModules = requestModules
function requestModules (modules) {
  // determine if this module was compiled for es5 or es6 (y.js vs. y.es6)
  // if Insert.execute is a Function, then it isnt a generator..
  // then load the es5(.js) files..
  var extention = typeof regeneratorRuntime !== 'undefined' ? '.js' : '.es6'
  var promises = []
  for (var i = 0; i < modules.length; i++) {
    var module = modules[i].split('(')[0]
    var modulename = 'y-' + module.toLowerCase()
    if (Y[module] == null) {
      if (requiringModules[module] == null) {
        // module does not exist
        if (typeof window !== 'undefined' && window.Y !== 'undefined') {
          var imported = document.createElement('script')
          imported.src = Y.sourceDir + '/' + modulename + '/' + modulename + extention
          document.head.appendChild(imported)

          let requireModule = {}
          requiringModules[module] = requireModule
          requireModule.promise = new Promise(function (resolve) {
            requireModule.resolve = resolve
          })
          promises.push(requireModule.promise)
        } else {
          console.info('YJS: Please do not depend on automatic requiring of modules anymore! Extend modules as follows `require(\'y-modulename\')(Y)`')
          require(modulename)(Y)
        }
      } else {
        promises.push(requiringModules[modules[i]].promise)
      }
    }
  }
  return Promise.all(promises)
}

/* ::
type MemoryOptions = {
  name: 'memory'
}
type IndexedDBOptions = {
  name: 'indexeddb',
  namespace: string
}
type DbOptions = MemoryOptions | IndexedDBOptions

type WebRTCOptions = {
  name: 'webrtc',
  room: string
}
type WebsocketsClientOptions = {
  name: 'websockets-client',
  room: string
}
type ConnectionOptions = WebRTCOptions | WebsocketsClientOptions

type YOptions = {
  connector: ConnectionOptions,
  db: DbOptions,
  types: Array<TypeName>,
  sourceDir: string,
  share: {[key: string]: TypeName}
}
*/

function Y (opts/* :YOptions */) /* :Promise<YConfig> */ {
  opts.types = opts.types != null ? opts.types : []
  var modules = [opts.db.name, opts.connector.name].concat(opts.types)
  for (var name in opts.share) {
    modules.push(opts.share[name])
  }
  Y.sourceDir = opts.sourceDir
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      Y.requestModules(modules).then(function () {
        if (opts == null) reject('An options object is expected! ')
        else if (opts.connector == null) reject('You must specify a connector! (missing connector property)')
        else if (opts.connector.name == null) reject('You must specify connector name! (missing connector.name property)')
        else if (opts.db == null) reject('You must specify a database! (missing db property)')
        else if (opts.connector.name == null) reject('You must specify db name! (missing db.name property)')
        else if (opts.share == null) reject('You must specify a set of shared types!')
        else {
          var yconfig = new YConfig(opts)
          yconfig.db.whenUserIdSet(function () {
            yconfig.init(function () {
              resolve(yconfig)
            })
          })
        }
      }).catch(reject)
    }, 0)
  })
}

class YConfig {
  /* ::
  db: Y.AbstractDatabase;
  connector: Y.AbstractConnector;
  share: {[key: string]: any};
  options: Object;
  */
  constructor (opts, callback) {
    this.options = opts
    this.db = new Y[opts.db.name](this, opts.db)
    this.connector = new Y[opts.connector.name](this, opts.connector)
  }
  init (callback) {
    var opts = this.options
    var share = {}
    this.share = share
    this.db.requestTransaction(function * requestTransaction () {
      // create shared object
      for (var propertyname in opts.share) {
        var typeConstructor = opts.share[propertyname].split('(')
        var typeName = typeConstructor.splice(0, 1)
        var args = []
        if (typeConstructor.length === 1) {
          try {
            args = JSON.parse('[' + typeConstructor[0].split(')')[0] + ']')
          } catch (e) {
            throw new Error('Was not able to parse type definition! (share.' + propertyname + ')')
          }
        }
        var type = Y[typeName]
        var typedef = type.typeDefinition
        var id = ['_', typedef.struct + '_' + typeName + '_' + propertyname + '_' + typeConstructor]
        share[propertyname] = yield* this.createType(type.apply(typedef, args), id)
      }
      this.store.whenTransactionsFinished()
        .then(callback)
    })
  }
  isConnected () {
    return this.connector.isSynced
  }
  disconnect () {
    return this.connector.disconnect()
  }
  reconnect () {
    return this.connector.reconnect()
  }
  destroy () {
    if (this.connector.destroy != null) {
      this.connector.destroy()
    } else {
      this.connector.disconnect()
    }
    var self = this
    this.db.requestTransaction(function * () {
      yield* self.db.destroy()
      self.connector = null
      self.db = null
    })
  }
}

if (typeof window !== 'undefined') {
  window.Y = Y
}

},{"./Connector.js":6,"./Connectors/Test.js":7,"./Database.js":8,"./Struct.js":9,"./Transaction.js":10,"./Utils.js":11}]},{},[1])


//# sourceMappingURL=example_application.js.map
