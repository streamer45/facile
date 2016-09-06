'use strict';

const EventEmitter = require('events');

function q2b(q) {
  if (typeof q !== 'string') return 96000;
  switch (q) {
    case 'worst': return 32000;
    case 'low': return 64000;
    case 'medium': return 96000;
    case 'high': return 128000;
    case 'best': return 192000;
    default: return 96000;
  }
}

class Transmitter extends EventEmitter {

  constructor(options) {
    super();
    this.audioCtx = null;
    this.mediaStream = null;
    this.srcNode = null;
    this.procNode = null;
    this.muteNode = null;
    this.worker = null;
    this.initialized = false;
    this.started = false;
    this.events = ['error', 'connect', 'disconnect'];
    this.quality = 'medium';
    this.server = 'https://tx.facile.audio/tx';
    //this.server = 'http://localhost:8045/tx';
    this.nsamples = 2048;
    this.frameSize = 480 * 4; // 40ms
    if (options && typeof options === 'object') {
      this.server = options.server || this.server;
      this.quality = options.quality || this.quality;
    }
  }

  _capture() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
    }
    navigator.getUserMedia = (navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia);
    if (!navigator.getUserMedia) {
      return Promise.reject(new Error('unsupported'));
    }
    return new Promise((res, rej) => {
      navigator.getUserMedia({
        audio: true,
        video: false
      }, (stream) => {
        res(stream);
      }, (e) => {
        rej(e);
      });
    });
  }

  _initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return Promise.reject(new Error('unsupported'));
    }
    this.audioCtx = new AudioContext();
    return this._capture().then((stream) => {
      this.mediaStream = stream;
      this.srcNode = this.audioCtx.createMediaStreamSource(stream);
      if (this.srcNode.channelCount !== 2) {
        throw 'Source: input is not stereo!';
      }
    });
  }

  _audioProcess(e) {
    const left = e.inputBuffer.getChannelData(0);
    const right = e.inputBuffer.getChannelData(1);
    const samples = new Float32Array(this.srcNode.channelCount
     * this.nsamples);
    let i = 0;
    let j = 0;
    for (i = 0; i < this.nsamples; ++i) {
      samples[j++] = left[i];
      samples[j++] = right[i];
    }
    if (this.worker) {
      this.worker.postMessage(samples, [samples.buffer]);
    }
  }

  start() {
    if (this.started !== false) {
      return Promise.reject(new Error('receiver is running'));
    }
    return this._initAudio().then(() => {
      this.initialized = true;
      this.procNode = this.audioCtx.createScriptProcessor(this.nsamples,
       this.srcNode.channelCount, 2);
      this.srcNode.connect(this.procNode);
      this.procNode.onaudioprocess = (e) => {
        this._audioProcess(e);
      };
      this.muteNode = this.audioCtx.createGain();
      this.muteNode.gain.value = 0.0;
      this.procNode.connect(this.muteNode);
      this.muteNode.connect(this.audioCtx.destination);
      return this._startWorker();
    });
  }

  _startWorker() {
    return new Promise((res, rej) => {
      const Worker = require('worker?inline!./transmitter.worker.js');
      const worker = new Worker();
      worker.onmessage = (e) => {
        if (e.data.channel) {
          console.log('Trasmitter Worker initialized');
          worker.postMessage({
            ctl: {
              req: 'OPUS_SET_BITRATE',
              val: q2b(this.quality)
            }
          });
          this.worker = worker;
          this.started = true;
          res(e.data.channel);
        } else if (e.data.type === 'connect') {
          this.emit('connect');
        } else if (e.data.type === 'disconnect') {
          this.emit('disconnect', e.data.msg);
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
          frameSize: this.frameSize,
          channels: this.srcNode.channelCount,
          server: this.server
        }
      });
    });
  }

  stop() {
    if (this.initialized !== true) return;
    this.srcNode.disconnect(this.procNode);
    this.procNode.disconnect(this.muteNode);
    this.muteNode.disconnect(this.audioCtx.destination);
    this.mediaStream.getTracks()[0].stop();
    this.initialized = false;
    if (this.started !== true) return;
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

module.exports = Transmitter;
