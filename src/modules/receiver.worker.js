'use strict';

const Util = require('./util');
const Resampler = require('./resampler');
const OpusDecoder = require('./decoder');

let rw = null;

class ReceiverWorker {
  constructor() {
    this.decoder = null;
    this.resampler = null;
    this.rx = null;
    this.sampleRate = 48000;
  }

  error(e) {
    postMessage({type: 'error', err: 'ReceiverWorker: ' + e});
  }

  init(setup) {
    const ioURL = 'https://cdn.socket.io/socket.io-1.4.5.js';
    Util.loadScript(ioURL).then((libURL) => {
      importScripts(libURL);
      this._initIO(setup);
    }).catch((e) => {
      postMessage({type: 'error', err: e.message});
    });
  }

  process(data) {
    let samples = null;
    for (let i = 0; i < data.length; ++i) {
      try {
        samples = this.decoder.decode(data[i]);
      } catch (e) {
        console.log(e);
        continue;
      }
      if (samples.length !== (this.config.frameSize * this.config.channels)) {
        this.error('Wrong number of samples! ' + samples.length);
        break;
      }
      if (this.resampler) {
        this.resampler.initializeBuffers();
        samples = this.resampler.resample(samples, samples.length);
      } else {
        samples = new Float32Array(samples);
      }
      postMessage(samples, [samples.buffer]);
    }
  }

  _initIO(setup) {
    const rx = io(setup.server);
    rx.on('connect', () => {
      this.rx = rx;
      rx.emit('channel', setup.channel);
      postMessage({type: 'connect'});
    });
    rx.on('audio', (data) => {
      this.process(data);
    });
    rx.on('eot', () => {
      postMessage({type: 'eot'});
    });
    rx.on('config', (config) => {
      this.config = config;
      if (setup.sampleRate !== this.sampleRate) {
        console.log('ReceiverWorker: need to resample 48000 --> ' +
         setup.sampleRate);
        this.resampler = new Resampler(this.sampleRate,
         setup.sampleRate, config.channels, Math.ceil(config.frameSize *
           config.channels * setup.sampleRate / this.sampleRate), 0);
      }
      try {
        this.decoder = new OpusDecoder(this.sampleRate,
         config.channels, config.frameSize);
      } catch (e) {
        console.log(e);
        return this.error(e);
      }
      postMessage({type: 'init'});
    });
    rx.on('disconnect', () => {
      postMessage({type: 'disconnect'});
    });
    rx.on('err', (e) => {
      postMessage({type: 'error', err: e});
    });
  }

}

self.onmessage = (ev) => {
  if (ev.data.setup) {
    console.log('ReceiverWorker: initializing..');
    if (rw !== null) {
      rw.error('already initialized');
      return;
    }
    const decURL = 'https://facile.audio/dist/libopus_dec.js';
    Util.loadScript(decURL).then((libURL) => {
      importScripts(libURL);
      rw = new ReceiverWorker();
      rw.init(ev.data.setup);
    }).catch((e) => {
      postMessage({type: 'error', err: e.message});
    });
  } else {
    if (rw === null) {
      postMessage({type: 'error', err: 'ReceiverWorker: not initialized'});
      return;
    }
    rw.error('invalid message');
  }
};
