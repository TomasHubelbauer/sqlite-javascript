import VarInt from './VarInt.js';

export default function* constructGraph(/** @type {DataView} */ dataView, /** @type {Number} */ pageLimit) {
  const pageSize = dataView.getUint16(16);
  const pageCount = dataView.getUint32(28);
  for (let pageIndex = 0; pageIndex < Math.min(pageCount, pageLimit); pageIndex++) {
    const pageOffset = pageIndex * pageSize;
    const pageNumber = pageIndex + 1;
    const pageType = dataView.getUint8(pageOffset || 100 /* Skip header if root page (offset zero) */);
    const cellCount = dataView.getUint16((pageOffset || 100 /* Skip header if root page (offset zero) */) + 3);
    const cellsOffset = dataView.getUint16((pageOffset || 100 /* Skip header if root page (offset zero) */) + 5) || 65536;
    switch (pageType) {
      // TODO: Parse out the first page of the overflow list if any
      case 0x2: {
        const rightMostPointer = dataView.getUint32(pageOffset + 8);
        yield { source: pageNumber, target: rightMostPointer, relationship: 'right most pointer' };

        let cellOffset = 0;
        for (let index = 0; index < cellCount; index++) {
          const leftChildPointer = dataView.getUint32(pageOffset + cellsOffset + cellOffset);
          cellOffset += 4;

          if (leftChildPointer === 0) {
            // TODO: Figure out the problem on pages 37, 43, 948
          } else if (leftChildPointer > pageCount) {
            // TODO: Figure out the problem on pages 39, 42, 948
          } else {
            yield { source: pageNumber, target: leftChildPointer, relationship: `left child pointer ${index + 1}/${cellCount}` };
          }

          const keyVarint = new VarInt(new DataView(dataView.buffer, pageOffset + cellsOffset + cellOffset, 9));
          cellOffset += keyVarint.byteLength + keyVarint.value;
        }

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
      // TODO: Parse out the first page of the overflow list if any
      case 0xa: {
        break;
      }
      // TODO: Parse out the first page of the overflow list if any
      case 0xd: {
        break;
      }
      default: {
        //throw new Error(`Invalid page type ${pageType}!`);
      }
    }
  }
}
