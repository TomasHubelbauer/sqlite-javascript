function* constructGraph(/** @type {DataView} */ dataView) {
  const pageSize = dataView.getUint16(16);
  const pageCount = 100; // dataView.getUint32(28);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageOffset = pageIndex * pageSize;
    const pageNumber = pageIndex + 1;
    const pageType = dataView.getUint8(pageOffset || 100 /* Skip header if root page (offset zero) */);
    const cellCount = dataView.getUint16((pageOffset || 100 /* Skip header if root page (offset zero) */) + 3);
    const cellsOffset = dataView.getUint16((pageOffset || 100 /* Skip header if root page (offset zero) */) + 5) || 65536;
    switch (pageType) {
      case 0x2: {
        const rightMostPointer = dataView.getUint32(pageOffset + 8);
        yield { source: pageNumber, target: rightMostPointer, relationship: 'right most pointer' };

        // TODO: Parse out the left child pointers
        // TODO: Parse out the first page of the overflow list if any
        break;
      }
      case 0x5: {
        const rightMostPointer = dataView.getUint32((pageOffset || 100 /* Skip header if root page (offset zero) */) + 8);
        yield { source: pageNumber, target: rightMostPointer, relationship: 'right most pointer' };

        let cellOffset = 0;
        for (let index = 0; index < cellCount; index++) {
          const leftChildPointer = dataView.getUint32(pageOffset + cellsOffset + cellOffset);
          cellOffset += 4;
          yield { source: pageNumber, target: leftChildPointer, relationship: `left child pointer ${index + 1}/${cellCount}` };

          const keyVarint = new VarInt(new DataView(dataView.buffer, pageOffset + cellsOffset + cellOffset, 9));
          cellOffset += keyVarint.byteLength;
        }

        break;
      }
      case 0xa: {
        // TODO: Parse out the first page of the overflow list if any
        break;
      }
      case 0xd: {
        // TODO: Parse out the first page of the overflow list if any
        break;
      }
      default: {
        throw new Error(`Invalid page type ${pageType}!`);
      }
    }
  }
}