class InteriorTablePage {
  constructor(/** @type{DataView} */ dataView) {
    // Ignore the header if this interior table page is the root database page
    const offset = dataView.byteOffset === 0 ? 100 : 0;

    this.pageType = dataView.getUint8(offset);
    if (this.pageType !== 0x5) {
      throw new Error('Not an interior table page!');
    }

    this.firstFreeBlock = dataView.getUint16(offset + 1);
    this.cellCount = dataView.getUint16(offset + 3);
    this.cellContentArea = dataView.getUint16(offset + 5);
    this.fragmentedFreeBytes = dataView.getUint8(offset + 7);
    this.rightMostPointer = dataView.getUint32(offset + 8);

    const cellOffsets = [];
    for (let index = 0; index < this.cellCount; index++) {
      cellOffsets.push(dataView.getUint16(offset + 12 + index * 2));
    }

    cellOffsets.sort((a, b) => a - b);

    this.cells = [];

    let cellOffset = 0;
    for (let index = 0; index < this.cellCount; index++) {
      const leftChildPointer = dataView.getUint32(this.cellContentArea + cellOffset);
      const key = new VarInt(new DataView(dataView.buffer, dataView.byteOffset + this.cellContentArea + cellOffset + 4, 9));
      this.cells.push({ leftChildPointer, key: key.value });

      cellOffset += 4 + key.byteLength;

      if (index < this.cellCount - 1 && (this.cellContentArea + cellOffset) !== cellOffsets[index + 1]) {
        throw new Error('Varint leaked into the next cell');
      }
    }

    if (this.cells.length !== this.cellCount) {
      throw new Error();
    }
  }
}
