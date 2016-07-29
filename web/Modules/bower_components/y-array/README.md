
# Array Type for [Yjs](https://github.com/y-js/yjs)

This plugins provides a shareable Array type. You can insert and delete arbitrary objects (also custom types for Yjs) in Y.Array.

## Use it!
Install this with bower or npm.

##### Bower
```
bower install y-array --save
```

##### NPM
```
npm install y-array --save
```

### Array Object

##### Reference

* .insert(position, contents)
  * Insert an array of content at a position
  * You can also insert types `array.insert(0, Y.Map)`
* .push(content)
  * Insert content at the end of the Array
* .delete(position, length)
  * Delete content. The *length* parameter is optional and defaults to 1
* .toArray()
  * Retrieve primitive content as an Array Object
  * This means that this will not return type definitions (for efficiency reasons) - you have to retrieve them with `.get(position)`
* .get(position)
  * Retrieve content from a position
  * Returns a promise if the content is a custom type (similar to Y.Map)
* .observe(function observer(events){..})
  * The `observer` is called whenever something on this array changes
  * Throws insert, and delete events (`events[*].type`)
  * If value is a type, `events[*].value` is a function that returns a promise for the type
* .unobserve(f)
  * Delete an observer


# A note on intention preservation
If two users insert something at the same position concurrently, the content that was inserted by the user with the higher user-id will be to the right of the other content. In the OT world we often speak of *intention preservation*, which is very loosely defined in most cases. This type has the following notion of intention preservation: When a user inserts content *c* after a set of content *C_left*, and before a set of content *C_right*, then *C_left* will be always to the left of c, and *C_right* will be always to the right of *c*. This property will also hold when content is deleted or when a deletion is undone.

# A note on time complexities
* .insert(position, content)
  * O(position + contents.length)
* .push(content)
  * O(1)
* .delete(position, length)
  * O(position)
* .get(i)
  * O(length)
* Apply a delete operation from another user
  * O(1)
* Apply an insert operation from another user
  * Yjs does not transform against operations that do not conflict with each other.
  * An operation conflicts with another operation if it intends to be inserted at the same position.
  * Overall worst case complexety: O(|conflicts|!)

# Issues
* Create a polymer element

## License
Yjs is licensed under the [MIT License](./LICENSE).

<kevin.jahns@rwth-aachen.de>