<p align="center"><a href="https://facile.audio" target="_blank"><img width="80"src="https://avatars3.githubusercontent.com/u/21259581?v=3&s=80"></a></p>

<h1 align="center">Facile.Audio Library</h1>

## Introduction

Facile.Audio is an easy to use library for live audio streaming from a web browser.

## How easy?

### Embed

```html
<script src="https://facile.audio/dist/facile-audio.js"></script>
```

### Transmit
```js
var tx = new facile.Tx();
tx.start().then(function(channel) {
  console.log('transmitter started');
}).catch(function(e) {
  console.log(e);
});
```

### Receive
```js
var rx = new facile.Rx(channel);
rx.start().then(function() {
  console.log('receiver started');
}).catch(function(e) {
  console.log(e);
});
```

## API

See the [API Reference](https://github.com/FacileAudio/facile/blob/master/API.md).

## FAQ

Visit the [FAQ Section](https://facile.audio/#!/faq).

## Demo

You can find a live demo right on the project [homepage](https://facile.audio).

## Supporting Facile.Audio

There are several benefits in supporting the project. Take a look at the [Support section](https://facile.audio/#!/support).

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright © 2016 Claudio Costa
