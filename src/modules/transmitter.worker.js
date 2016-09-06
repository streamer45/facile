'use strict';

const Util = require('./util');
const Resampler = require('./resampler');
const OpusEncoder = require('./encoder');

let tw = null;

class TransmitterWorker {
  constructor() {
    this.encoder = null;
    this.resampler = null;
    this.tx = null;
  }

  init(setup) {
    if (isNaN(setup.sampleRate)) {
      throw 'Transmitter Worker: invalid rate ' + setup.sampleRate;
    }
    if (setup.channels !== 2) {
      throw 'Transmitter Worker: invalid channel count ' + setup.channels;
    }
    if (isNaN(setup.nsamples)) {
      throw 'Transmitter Worker: invalid samples count ' + setup.nsamples;
    }
    if (isNaN(setup.frameSize)) {
      throw 'Transmitter Worker: invalid frame size ' + setup.frameSize;
    }
    if (typeof setup.server !== 'string') {
      throw 'Transmitter Worker: invalid server ' + setup.server;
    }
    if (setup.sampleRate !== 48000) {
      console.log('Transmitter Worker: need to resample ' +
       setup.sampleRate + ' ---> 48000');
      this.resampler = new Resampler(setup.sampleRate, 48000, setup.channels,
        Math.ceil(setup.nsamples * setup.channels *
         48000 / setup.sampleRate), 0);
    }
    try {
      this.encoder = new OpusEncoder(48000, setup.channels, setup.frameSize);
    } catch (e) {
      this.error(e);
    }
    const ioURL = 'https://cdn.socket.io/socket.io-1.4.5.js';
    Util.loadScript(ioURL).then((libURL) => {
      importScripts(libURL);
      this._initIO(setup);
    }).catch((e) => {
      postMessage({type: 'error', err: e.message});
    });
  }

  process(samples) {
    let packets = null;
    if (this.resampler) {
      samples = this.resampler.resample(samples, samples.length);
    }
    try {
      packets = this.encoder.encode(samples);
    } catch (e) {
      tw.error(e);
      return;
    }
    if (this.tx) {
      this.tx.compress(false).emit('audio', packets);
    }
  }

  error(e) {
    postMessage({type: 'error', err: 'Transmitter Worker: ' + e});
  }

  _initIO(setup) {
    const tx = io(setup.server);
    tx.on('connect', () => {
      this.tx = tx;
      postMessage({type: 'connect'});
      tx.emit('config', {
        sampleRate: setup.sampleRate,
        frameSize: setup.frameSize,
        channels: setup.channels
      });
    });
    tx.on('channel', (channel) => {
      postMessage({channel: channel});
    });
    tx.on('disconnect', (msg) => {
      postMessage({type: 'disconnect', msg: msg});
    });
    tx.on('err', (e) => {
      postMessage({type: 'error', err: e});
    });
  }

}

self.onmessage = (ev) => {
  if (ev.data instanceof Float32Array) {
    if (tw !== null) {
      tw.process(ev.data);
    } else {
      postMessage({type: 'error',
       err: 'Transmitter Worker: not initialized'});
    }
  } else if (ev.data.setup) {
    console.log('Transmitter Worker: initializing..');
    if (tw !== null) {
      tw.error('Transmitter Worker: already initialized');
      return;
    }
    const encURL = 'https://facile.audio/dist/libopus_enc.js';
    Util.loadScript(encURL).then((libURL) => {
      importScripts(libURL);
      tw = new TransmitterWorker();
      tw.init(ev.data.setup);
    }).catch((e) => {
      postMessage({type: 'error', err: e.message});
    });
  } else if (ev.data.ctl) {
    if (tw !== null) {
      try {
        tw.encoder.ctl(ev.data.ctl.req, ev.data.ctl.val);
      } catch (err) {
        tw.error(err);
      }
    } else {
      postMessage({type: 'error',
       err: 'Transmitter Worker: not initialized'});
    }
  } else {
    if (tw === null) {
      postMessage({type: 'error',
       err: 'Transmitter Worker: not initialized'});
      return;
    }
    tw.error('Transmitter Worker: invalid message');
  }
};
