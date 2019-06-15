class LeafIndexPage {
  constructor(/** @type{DataView} */ dataView) {
    this.pageType = dataView.getUint8(0);
    if (this.pageType !== 0xa) {
      throw new Error('Not a leaf index page!');
    }

    this.firstFreeBlock = dataView.getUint16(1);
    this.cellCount = dataView.getUint16(3);
    this.cellContentArea = dataView.getUint16(5);
    this.fragmentedFreeBytes = dataView.getUint8(7);
    this.cells = [];
    for (let cellPointerIndex = 0; cellPointerIndex < this.cellCount; cellPointerIndex++) {
      const cellPointer = dataView.getUint16(8 + cellPointerIndex * 2);
    }
  }
}
