DataView.prototype.getUint24 = function (byteOffset, littleEndian) {
  if (littleEndian === true) {
    return this.buffer[byteOffset + 2] + this.buffer[byteOffset + 1] * 256 + this.buffer[byteOffset] * 65536;
  } else {
    return this.buffer[byteOffset] + this.buffer[byteOffset + 1] * 256 + this.buffer[byteOffset + 2] * 65536;
  }
};
