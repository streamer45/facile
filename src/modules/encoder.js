'use strict';

class OpusEncoder {
  constructor(rate, channels, frameSize) {
    if (rate !== 48000) throw 'OpusEnc: wrong rate ' + rate;
    this.rate = rate;
    this.channels = channels;
    this.frameSize = frameSize;
    const err_ptr = _malloc(4);
    this.ctx = _opus_encoder_create(this.rate, this.channels, 2049, err);
    const err = getValue(err_ptr, 'i32');
    if (err !== 0) throw 'OpusEnc: opus_encoder_create failed: ' + err;
    _free(err_ptr);
    this.raw_ptr = _malloc(this.frameSize * this.channels * 4);
    this.raw_len = this.frameSize * this.channels;
    this.raw = HEAPF32.subarray(this.raw_ptr >> 2,
     (this.raw_ptr >> 2) + this.raw_len);
    const max_coded_sz = 4096;
    this.coded_sz = max_coded_sz;
    this.coded_ptr = _malloc(this.coded_sz);
    this.coded = HEAPU8.subarray(this.coded_ptr,
     this.coded_ptr + this.coded_sz);
    this.raw_off = 0;
  }

  encode(samples) {
    const packets = [];
    let off = 0;
    while (samples.length - off >= this.raw_len - this.raw_off) {
      if (this.raw_off > 0) {
        this.raw.set(samples.subarray(off,
         off + this.raw_len - this.raw_off), this.raw_off);
        off += this.raw_len - this.raw_off;
        this.raw_off = 0;
      } else {
        this.raw.set(samples.subarray(off, off + this.raw_len));
        off += this.raw_len;
      }
      const ret = _opus_encode_float(this.ctx, this.raw_ptr,
       this.frameSize, this.coded_ptr, this.coded_sz);
      if (ret <= 0) throw 'OpusEnc: opus_encode_float failed: ' + ret;
      const packet = new ArrayBuffer(ret);
      new Uint8Array(packet).set(this.coded.subarray(0, ret));
      packets.push(packet);
    }
    if (off < samples.length) {
      this.raw.set(samples.subarray(off));
      this.raw_off = samples.length - off;
    }
    return packets;
  }

  ctl(ctl, value) {
    if (ctl === 'OPUS_SET_BITRATE') {
      if (isNaN(value)) throw 'OpusEnc: NaN value ' + value;
      if (value < 500 || value > 512000) {
        throw 'OpusEnc: invalid value ' + value;
      }
      const ptr = _malloc(4);
      setValue(ptr, value, 'i32');
      const ret = _opus_encoder_ctl(this.ctx, 4002, ptr);
      if (ret < 0) throw 'OpusEnc: opus_encoder_ctl failed: ' + ret;
      _free(ptr);
      return;
    }
    throw 'OpusEnc: invalid control ' + ctl;
  }

  destroy() {
    if (!this.ctx) return;
    _opus_encoder_destroy(this.ctx);
    _free(this.raw_ptr);
    _free(this.coded_ptr);
    this.ctx = null;
    this.coded_ptr = null;
    this.raw_ptr = null;
  }

}

module.exports = OpusEncoder;
