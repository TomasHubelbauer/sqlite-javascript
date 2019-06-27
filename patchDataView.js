DataView.prototype.getUint24 = function (byteOffset, littleEndian) {
  if (littleEndian === true) {
    throw new Error('Little endian is not supported!');
  } else {
    return ((this.getUint8(byteOffset) & 0xF) << 16) | ((this.getUint8(byteOffset + 1) & 0xFF) << 8) | (this.getUint8(byteOffset + 2) & 0xFF);
  }
};
