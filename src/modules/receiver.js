'use strict';

const EventEmitter = require('events');
const AudioBuffer = require('./abuffer');

class Receiver extends EventEmitter {

  constructor(channel, options) {
    super();
    this.audioCtx = null;
    this.procNode = null;
    this.worker = null;
    this.nsamples = 2048;
    this.buffer = null;
    this.started = false;
    this.events = ['error', 'connect', 'disconnect', 'eot'];
    this.bufferMax = 48000 * 4; // 4s
    this.bufferMin = this.nsamples * 4; // ~170ms
    this.server = 'https://rx.facile.audio/rx';
    //this.server = 'http://localhost:8045/rx';
    if (typeof channel !== 'string') {
      throw new Error('valid channel id is required');
    } else {
      this.channel = channel;
    }
    if (options && typeof options === 'object') {
      this.server = options.server || this.server;
    }
    this._init();
  }

  _init(setup) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('unsupported');
    this.audioCtx = new AudioContext();
    this.buffer = new AudioBuffer(this.bufferMax, this.bufferMin);
  }

  start() {
    if (this.started !== false) {
      return Promise.reject(new Error('receiver is already running'));
    }
    this.procNode = this.audioCtx.createScriptProcessor(this.nsamples, 2, 2);
    this.procNode.onaudioprocess = (e) => {
      this._audioProcess(e);
    };
    this.procNode.connect(this.audioCtx.destination);
    return this._startWorker();
  }

  _audioProcess(e) {
    if (this.worker === null) return;
    const left = e.outputBuffer.getChannelData(0);
    const right = e.outputBuffer.getChannelData(1);
    const samples = this.buffer.read(this.nsamples * 2);
    let i = 0;
    let k = 0;
    if (samples) {
      for (i = 0; i < this.nsamples * 2; i += 2) {
        left[k] = samples[i];
        right[k] = samples[i + 1];
        ++k;
      }
    } else {
      for (i = 0; i < this.nsamples; ++i) {
        left[i] = 0;
        right[i] = 0;
      }
    }
  }

  _startWorker() {
    return new Promise((res, rej) => {
      const Worker = require('worker?inline!./receiver.worker.js');
      const worker = new Worker();
      worker.onmessage = (e) => {
        if (e.data instanceof Float32Array) {
          return this.buffer.write(e.data);
        }
        if (e.data.type === 'init') {
          console.log('ReceiverWorker initialized');
          this.worker = worker;
          this.started = true;
          res();
        } else if (e.data.type === 'eot') {
          this.emit('eot');
        } else if (e.data.type === 'connect') {
          this.emit('connect');
        } else if (e.data.type === 'disconnect') {
          this.emit('disconnect');
        } else if (e.data.type === 'error') {
          this.emit('error', e.data.err);
        }
      };
      worker.onerror = (e) => {
        this.emit('error', e);
      };
      worker.postMessage({
        setup: {
          sampleRate: this.audioCtx.sampleRate,
          nsamples: this.nsamples,
          channels: 2,
          server: this.server,
          channel: this.channel
        }
      });
    });
  }

  stop() {
    if (this.started !== true) return;
    this.procNode.disconnect(this.audioCtx.destination);
    this.procNode.onaudioprocess = null;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.started = false;
  }

  destroy() {
    this.stop();
    this.events.forEach((ev) => {
      this.removeAllListeners(ev);
    });
  }

}

module.exports = Receiver;
