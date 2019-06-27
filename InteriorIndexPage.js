export default class InteriorIndexPage {
  constructor(/** @type{DataView} */ dataView) {
    this.pageType = dataView.getUint8(0);
    if (this.pageType !== 0x2) {
      throw new Error('Not an interior index page!');
    }

    this.firstFreeBlock = dataView.getUint16(1);
    this.cellCount = dataView.getUint16(3);
    this.cellContentArea = dataView.getUint16(5);
    this.fragmentedFreeBytes = dataView.getUint8(7);
    this.rightMostPointer = dataView.getUint32(8);
    this.cells = [];
    for (let cellPointerIndex = 0; cellPointerIndex < this.cellCount; cellPointerIndex++) {
      const cellPointer = dataView.getUint16(12 + cellPointerIndex * 2);
    }
  }
}
