// Static buffer for varint bits (maximum of 9 bytes where the first 8 contribute 7 bits and the last the full 8)
// TODO: Remove the underscore when all `varintBits` symbols elsewhere have been removed in favor of this parser class
const varintBits = new Array(8 * 7 + 8);

class VarInt {
  constructor(/** @type{DataView} */ dataView) {
    if (dataView.byteLength > 9) {
      console.trace();
      throw new Error('The var int data view length is too long, var int can be at most 9 bytes. Do not pass in longer data views as it could obscure an error.');
    }

    let byte;
    let byteIndex = 0;
    let bitIndex = 0;
    while (byteIndex < 9) {
      byte = dataView.getUint8(byteIndex);
      //console.log(`varint byte #${byteIndex} ${byte} (0x${byte.toString(16)})`);
      for (let byteBitIndex = byteIndex === 8 ? 0 : 1; byteBitIndex < 8; byteBitIndex++) {
        const set = (byte & (1 << (7 - byteBitIndex))) !== 0;
        //console.log(`byte #${byteIndex} ${byte} (0x${byte.toString(16)}) bit #${bitIndex} (#${bitIndex} in varint) ${set ? 'set' : 'unset'}`);
        varintBits[bitIndex] = set;
        bitIndex++;
      }

      // Stop looking for more varint bytes since the current byte's MSB is zero
      if (byteIndex < 8 && (byte & (1 << 7)) === 0) {
        break;
      }

      byteIndex++;
    }

    this.value = 0;
    for (let index = varintBits.indexOf(true) /* First set rowid bit */; index < bitIndex; index++) {
      if (varintBits[index]) {
        this.value += Math.pow(2, bitIndex - index - 1);
      }
    }

    this.byteLength = byteIndex + 1;
  }
}
