'use strict';

class audioBuffer {

  constructor(size, bufLen) {
    this.space = size;
    this.data = new Float32Array(this.space);
    this.free = this.space;
    this.used = 0;
    this.rpos = 0;
    this.wpos = 0;
    this.overruns = 0;
    this.underruns = 0;
    this.bufLen = bufLen;
  }

  write(samples) {
    if (this.free < samples.length) {
      ++this.overruns;
      console.log('AudioBuffer: overrun');
      this.read(samples.length - this.free);
    }
    const left = this.space - this.wpos;
    if (left >= samples.length) {
      this.data.set(samples, this.wpos);
      this.wpos += samples.length;
    } else {
      this.data.set(samples.subarray(0, left), this.wpos);
      this.data.set(samples.subarray(left));
      this.wpos = samples.length - left;
    }
    this.free -= samples.length;
    this.used += samples.length;
    return 0;
  }

  read(n) {
    if (this.used < this.bufLen) {
      ++this.underruns;
      console.log('AudioBuffer: underrun ' + this.used);
      return null;
    }
    const data = new Float32Array(n);
    const left = this.space - this.rpos;
    if (left >= n) {
      data.set(this.data.subarray(this.rpos, this.rpos + n));
      this.rpos += n;
    } else {
      data.set(this.data.subarray(this.rpos));
      data.set(this.data.subarray(0, n - left), left);
      this.rpos = n - left;
    }
    this.free += n;
    this.used -= n;
    return data;
  }

}

module.exports = audioBuffer;
