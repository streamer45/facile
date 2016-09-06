<!-- version -->
# 0.1.0 API Reference
<!-- versionstop -->

<!-- toc -->

- [facile](#facile)
  - [Class:facile.Tx](#classfaciletx)
    - [new facile.Tx([options])](#new-faciletxoptions)
    - [Tx.start()](#txstart)
    - [Tx.stop()](#txstop)
    - [Tx.destroy()](#txdestroy)
    - [Events](#events)
  - [Class:facile.Rx](#classfacilerx)
    - [new facile.Rx(channel, [options])](#new-facilerxchannel-options)
    - [Rx.start()](#rxstart)
    - [Rx.stop()](#rxstop)
    - [Rx.destroy()](#rxdestroy)
    - [Events](#events-1)

<!-- tocstop -->

# facile

The `facile` object is the main application container. It is exposed as a global object.

It's the only global handle provided and it's used for the creation of both transmitter and receiver objects.

## Class:facile.Tx

This class is used to create a transmitter.

`facile.Tx` extends the <a href="https://nodejs.org/api/events.html#events_class_eventemitter" target="_blank" rel="noopener noreferrer">EventEmitter</a> class.

### new facile.Tx([options])

Creates a transmitter object.

`options` \<Object\> - An optional configuration object.
  - `server` \<String\> - The URL of the server to transmit to.
  - `quality` \<String\> - Audio encoding quality
      - 'worst' - 32Kbps bitrate
      - 'low' - 64Kbps bitrate
      - 'medium' - 96Kbps bitrate
      - 'high' - 128Kbps bitrate
      - 'best' - 256Kbps bitrate

```js
var tx = new facile.Tx({
  server: 'http://localhost:8045',
  quality: 'high'
});
```

### Tx.start()

Starts the transmitter.

Returns a <a href="https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise" target="_blank" rel="noopener noreferrer">Promise</a> which if fulfilled provides:

- `channel` \<String\> - the channel unique identifier

```js
var tx = new Tx();

tx.start().then(function(channel) {
  // channel is your channel id
}).catch(function(e) {
  // handle error
});
```

### Tx.stop()

Stops the transmitter.

### Tx.destroy()

Stops the transmitter if running and removes all events listeners.

### Events

- **error** - fired in case of an error occured
- **connect** - fired upon a successful connection to the server
- **disconnect** - fired upon a disconnection from the server

```js
tx.on('connect', function() {
  console.log('connected!');
});

tx.on('error', function(e) {
  console.log('an error occured');
});
```

## Class:facile.Rx

This class is used to create a receiver.

`facile.Rx` extends the <a href="https://nodejs.org/api/events.html#events_class_eventemitter" target="_blank" rel="noopener noreferrer">EventEmitter</a> class.

### new facile.Rx(channel, [options])

Creates a receiver object.

`channel` \<String\> - the identifier of the channel to receive from.

`options` \<Object\> - An optional configuration object.
  - `server` \<String\> - The URL of the server to transmit to. It can include a port number.

```js
var rx = new facile.Rx('a4b621a570fd2c06');
```

### Rx.start()

Starts the receiver.

Returns a <a href="https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise" target="_blank" rel="noopener noreferrer">Promise</a>.

```js
var rx = new Rx();

rx.start().then(function() {
  // receiver started
}).catch(function(e) {
  // handle error
});
```

### Rx.stop()

Stops the receiver.

### Rx.destroy()

Stops the receiver if running and removes all events listeners.

### Events

- **error** - fired in case of an error occured
- **connect** - fired upon a successful connection to the server
- **disconnect** - fired upon a disconnection from the server
- **eot** - fired when the transmission ends

```js
rx.on('eot', function() {
  console.log('transmission ended!');
});
```
