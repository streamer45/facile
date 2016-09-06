'use strict';

class OpusDecoder {
  constructor(rate, channels, frameSize) {
    if (rate !== 48000) throw 'OpusDec: wrong rate ' + rate;
    this.rate = rate;
    this.channels = channels;
    this.frameSize = frameSize;
    this.ctx = null;
    this.coded_ptr = null;
    this.raw_ptr = null;
    const coded_sz = 4096;
    const raw_sz = 8192 * 2;
    const err_ptr = _malloc(4);
    this.ctx = _opus_decoder_create(rate, channels, err_ptr);
    const err = getValue(err_ptr, 'i32');
    if (err !== 0) throw 'OpusDec: opus_decoder_create failed: ' + err;
    _free(err_ptr);
    this.coded_ptr = _malloc(coded_sz);
    this.coded = HEAPU8.subarray(this.coded_ptr, this.coded_ptr + coded_sz);
    this.raw_ptr = _malloc(raw_sz);
    this.raw = HEAPF32.subarray(this.raw_ptr >> 2,
     (this.raw_ptr + raw_sz) >> 2);
  }

  decode(packet) {
    this.coded.set(new Uint8Array(packet));
    const ret = _opus_decode_float(this.ctx, this.coded_ptr,
     packet.byteLength, this.raw_ptr, this.raw.byteLength, 0);
    if (ret < 0) throw 'OpusDec: opus_decode failed: ' + ret;
    const samples = this.raw.subarray(0, ret * this.channels);
    return samples;
  }

  destroy() {
    if (!this.ctx) return;
    _opus_decoder_destroy(this.ctx);
    _free(this.coded_ptr);
    _free(this.raw_ptr);
    this.ctx = null;
    this.coded_ptr = null;
    this.raw_ptr = null;
  }
}

module.exports = OpusDecoder;
