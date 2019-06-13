window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const dataView = new DataView(arrayBuffer);

  const header = String.fromCharCode(...uint8Array.slice(0, 16));
  if (header !== 'SQLite format 3\0') {
    throw new Error('Invalid header');
  }

  const pageSize = dataView.getUint16(16);
  const writeVersion = dataView.getUint8(18); // 1 legacy, 2 WAL
  const readVersion = dataView.getUint8(19); // 1 legacy, 2 WAL
  const unusedBytes = dataView.getUint8(20);
  const maximumPayloadFraction = dataView.getUint8(21);
  if (maximumPayloadFraction !== 64) {
    throw new Error('Maximum embedded payload fraction must be 64.');
  }

  const minimumPayloadFraction = dataView.getUint8(22);
  if (minimumPayloadFraction !== 32) {
    throw new Error('Minimum embedded payload fraction must be 32.');
  }

  const leafPayloadFraction = dataView.getUint8(23);
  if (leafPayloadFraction !== 32) {
    throw new Error('Leaf payload fraction must be 32.');
  }

  const changeCount = dataView.getUint32(24);
  const pageCount = dataView.getUint32(28);

  const schemaCookie = dataView.getUint32(40);
  const schemaFormat = dataView.getUint32(44);

  const textEncoding = dataView.getUint32(56); // 1 UTF8, 2 UTF16le, 3 UTF16be
  if (textEncoding !== 1 && textEncoding !== 2 && textEncoding !== 3) {
    throw new Error('Invalid text encoding value');
  }

  const userVersion = dataView.getUint32(60);
  const vacuumMode = dataView.getUint32(64);
  const applicationId = dataView.getUint32(68);

  const reservedZero = uint8Array.slice(72, 72 + 20);
  if (reservedZero.find(zero => zero !== 0)) {
    throw new Error('The reseved section must be all zeroes.');
  }

  const sqliteVersion = dataView.getUint32(96); // https://www.sqlite.org/c3ref/c_source_id.html

  const varintBits = new Array(8 * 7 + 8);

  for (let pageNumber = 1; pageNumber < pageCount; pageNumber++) {
    const pageDataView = new DataView(arrayBuffer, pageNumber * pageSize);
    const pageType = pageDataView.getUint8(0);
    const firstFreeBlock = pageDataView.getUint16(1);
    const cellCount = pageDataView.getUint16(3);
    const cellContentArea = pageDataView.getUint16(5);
    const fragmentedFreeBytes = pageDataView.getUint8(7);

    switch (pageType) {
      case 0x02: {
        const rightMostPointer = pageDataView.getUint32(8);
        //console.log('interior index', firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes, rightMostPointer);
        for (let cellPointerIndex = 0; cellPointerIndex < cellCount; cellPointerIndex++) {
          const cellPointer = pageDataView.getUint16(12 + cellPointerIndex * 2);
          break;
        }

        break;
      }
      case 0x05: {
        const rightMostPointer = pageDataView.getUint32(8);
        //console.log('interior table', firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes, rightMostPointer);
        for (let cellPointerIndex = 0; cellPointerIndex < cellCount; cellPointerIndex++) {
          const cellPointer = pageDataView.getUint16(12 + cellPointerIndex * 2);
        }

        break;
      }
      case 0x0a: {
        //console.log('leaf index', firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes);
        for (let cellPointerIndex = 0; cellPointerIndex < cellCount; cellPointerIndex++) {
          const cellPointer = pageDataView.getUint16(8 + cellPointerIndex * 2);
        }

        break;
      }
      // http://forensicsfromthesausagefactory.blogspot.com/2011/05/analysis-of-record-structure-within.html
      case 0x0d: {
        // Print this page for visual inspection
        // for (let rowIndex = 0; rowIndex < pageSize / 16; rowIndex++) {
        //   let line = (rowIndex * 16).toString(16);
        //   for (let columnIndex = 0; columnIndex < 16; columnIndex++) {
        //     line += ' ' + pageDataView.getUint8(rowIndex * 16 + columnIndex).toString(16);
        //   }

        //   console.log(line);
        // }

        console.log(pageNumber, { firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes });

        for (let cellPointerIndex = 0; cellPointerIndex < cellCount; cellPointerIndex++) {
          const cellPointer = pageDataView.getUint16(8 + cellPointerIndex * 2);
          //console.log(`page #${pageNumber} cell pointer #${cellPointerIndex} ${cellPointer} 0x${cellPointer.toString(16)}`);

          // Read the payload header and the payload combined length
          let varintByteIndex = 0;
          let varintBitIndex = 0;
          let varintByte;
          while (varintByteIndex < 9) {
            varintByte = pageDataView.getUint8(cellPointer + varintByteIndex);
            //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) length varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)})`);
            for (let byteBitIndex = varintByteIndex === 8 ? 0 : 1; byteBitIndex < 8; byteBitIndex++) {
              const set = (varintByte & (1 << (7 - byteBitIndex))) !== 0;
              //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) length varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)}) bit #${byteBitIndex} (#${varintBitIndex} in varint) ${set ? 'set' : 'unset'}`);
              varintBits[varintBitIndex] = set;
              varintBitIndex++;
            }

            // Stop looking for more varint bytes since the current byte's MSB is zero
            if (varintByteIndex < 8 && (varintByte & (1 << 7)) === 0) {
              break;
            }

            varintByteIndex++;
          }

          // Note that this is the combined length of the payload header and the payload
          let lengthVarint = 0;
          for (let index = varintBits.indexOf(true) /* First set length bit */; index < varintBitIndex; index++) {
            if (varintBits[index]) {
              lengthVarint += Math.pow(2, varintBitIndex - index - 1);
            }
          }

          const lengthVariantBytes = varintByteIndex + 1;
          //console.log('length varint value', lengthVarint);

          // Read the rowid (the key)
          varintByteIndex = 0;
          varintBitIndex = 0;
          while (varintByteIndex < 9) {
            varintByte = pageDataView.getUint8(cellPointer + varintByteIndex + lengthVariantBytes);
            //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) rowid varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)})`);
            for (let byteBitIndex = varintByteIndex === 8 ? 0 : 1; byteBitIndex < 8; byteBitIndex++) {
              const set = (varintByte & (1 << (7 - byteBitIndex))) !== 0;
              //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) rowid varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)}) bit #${byteBitIndex} (#${varintBitIndex} in varint) ${set ? 'set' : 'unset'}`);
              varintBits[varintBitIndex] = set;
              varintBitIndex++;
            }

            // Stop looking for more varint bytes since the current byte's MSB is zero
            if (varintByteIndex < 8 && (varintByte & (1 << 7)) === 0) {
              break;
            }

            varintByteIndex++;
          }

          let rowIdVarint = 0;
          for (let index = varintBits.indexOf(true) /* First set rowid bit */; index < varintBitIndex; index++) {
            if (varintBits[index]) {
              rowIdVarint += Math.pow(2, varintBitIndex - index - 1);
            }
          }

          const rowIdVariantBytes = varintByteIndex + 1;
          //console.log('rowid variant value', rowIdVarint);

          // Read the payload header length
          varintByteIndex = 0;
          varintBitIndex = 0;
          while (varintByteIndex < 9) {
            varintByte = pageDataView.getUint8(cellPointer + varintByteIndex + lengthVariantBytes + rowIdVariantBytes);
            //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) payload header length varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)})`);
            for (let byteBitIndex = varintByteIndex === 8 ? 0 : 1; byteBitIndex < 8; byteBitIndex++) {
              const set = (varintByte & (1 << (7 - byteBitIndex))) !== 0;
              //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) payload header length varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)}) bit #${byteBitIndex} (#${varintBitIndex} in varint) ${set ? 'set' : 'unset'}`);
              varintBits[varintBitIndex] = set;
              varintBitIndex++;
            }

            // Stop looking for more varint bytes since the current byte's MSB is zero
            if (varintByteIndex < 8 && (varintByte & (1 << 7)) === 0) {
              break;
            }

            varintByteIndex++;
          }

          let payloadHeaderVarint = 0;
          for (let index = varintBits.indexOf(true) /* First set payload header length bit */; index < varintBitIndex; index++) {
            if (varintBits[index]) {
              payloadHeaderVarint += Math.pow(2, varintBitIndex - index - 1);
            }
          }

          const payloadHeaderLengthVariantBytes = varintByteIndex + 1;
          //console.log('payload header variant value', payloadHeaderVarint);

          // This is the number of bytes which are occupied by varints denoting the various serial types (N)
          const serialTypesVariantsByteCount = payloadHeaderVarint - payloadHeaderLengthVariantBytes;
          const serialTypesVarintByteOffset = lengthVariantBytes + rowIdVariantBytes + payloadHeaderLengthVariantBytes;

          // Read the serial type varints one by one
          let serialTypeVarintByteOffset = 0;
          const serialTypes = [];
          while (serialTypeVarintByteOffset < serialTypesVariantsByteCount) {
            varintByteIndex = 0;
            varintBitIndex = 0;
            while (varintByteIndex < 9) {
              varintByte = pageDataView.getUint8(cellPointer + varintByteIndex + serialTypesVarintByteOffset + serialTypeVarintByteOffset);
              //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) serial type varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)})`);
              for (let byteBitIndex = varintByteIndex === 8 ? 0 : 1; byteBitIndex < 8; byteBitIndex++) {
                const set = (varintByte & (1 << (7 - byteBitIndex))) !== 0;
                //console.log(`page #${pageNumber} cell #${cellPointerIndex} at ${cellPointer} (0x${cellPointer.toString(16)}) serial type varint byte #${varintByteIndex} ${varintByte} (0x${varintByte.toString(16)}) bit #${byteBitIndex} (#${varintBitIndex} in varint) ${set ? 'set' : 'unset'}`);
                varintBits[varintBitIndex] = set;
                varintBitIndex++;
              }

              // Stop looking for more varint bytes since the current byte's MSB is zero
              if (varintByteIndex < 8 && (varintByte & (1 << 7)) === 0) {
                break;
              }

              varintByteIndex++;
            }

            let serialTypeVarint = 0;
            for (let index = varintBits.indexOf(true) /* First set payload header length bit */; index < varintBitIndex; index++) {
              if (varintBits[index]) {
                serialTypeVarint += Math.pow(2, varintBitIndex - index - 1);
              }
            }

            serialTypes.push(serialTypeVarint);
            serialTypeVarintByteOffset += varintByteIndex + 1;

            // https://www.sqlite.org/datatype3.html
            if (serialTypeVarint === 0) {
              //console.log('serial type NULL');
            } else if (serialTypeVarint === 1) {
              //console.log('serial type INT 8 bit / 1 byte');
            } else if (serialTypeVarint === 2) {
              //console.log('serial type INT 16 bit / 2 byte');
            } else if (serialTypeVarint === 3) {
              //console.log('serial type INT 24 bit / 3 byte');
            } else if (serialTypeVarint === 4) {
              //console.log('serial type INT 32 bit / 4 byte');
            } else if (serialTypeVarint === 5) {
              //console.log('serial type INT 48 bit / 6 byte');
            } else if (serialTypeVarint === 6) {
              //console.log('serial type INT 64 bit / 8 byte');
            } else if (serialTypeVarint === 7) {
              //console.log('serial type REAL');
            } else if (serialTypeVarint === 8) {
              //console.log('serial type FALSE');
            } else if (serialTypeVarint === 9) {
              //console.log('serial type TRUE');
            } else if (serialTypeVarint === 10) {
              //console.log('serial type INTERNAL');
            } else if (serialTypeVarint === 11) {
              //console.log('serial type INTERNAL');
            } else if (serialTypeVarint >= 12 && serialTypeVarint % 2 === 0) {
              //console.log('serial type BLOB', (serialTypeVarint - 12) / 2);
            } else if (serialTypeVarint >= 13 && serialTypeVarint % 2 === 1) {
              //console.log('serial type TEXT', (serialTypeVarint - 13) / 2);
            } else {
              throw new Error('Unknown data type');
            }
          }

          // Read the payload items
          let itemOffset = cellPointer + lengthVariantBytes + rowIdVariantBytes + payloadHeaderLengthVariantBytes + serialTypesVariantsByteCount;
          for (const serialType of serialTypes) {
            if (serialType === 0) {
              console.log('NULL');
            } else if (serialType === 1) {
              console.log(uint8Array[itemOffset]);
              itemOffset += 1;
            } else if (serialType === 2) {
              // TODO: Use the data view
              console.log(uint8Array[itemOffset], uint8Array[itemOffset + 1]);
              itemOffset += 2;
            } else if (serialType === 3) {
              // TODO: Use the data view
              console.log(uint8Array[itemOffset], uint8Array[itemOffset + 1], uint8Array[itemOffset + 2]);
              itemOffset += 3;
            } else if (serialType === 4) {
              // TODO: Use the data view
              console.log(uint8Array[itemOffset], uint8Array[itemOffset + 1], uint8Array[itemOffset + 2], uint8Array[itemOffset + 3]);
              itemOffset += 4;
            } else if (serialType === 5) {
              throw new Error('Not implemented');
            } else if (serialType === 6) {
              throw new Error('Not implemented');
            } else if (serialType === 7) {
              // TODO: Use the data view
              console.log('REAL');
              itemOffset += 4;
            } else if (serialType === 8) {
              console.log('FALSE');
            } else if (serialType === 9) {
              console.log('TRUE');
            } else if (serialType === 10) {
              throw new Error('Not implemented');
            } else if (serialType === 11) {
              throw new Error('Not implemented');
            } else if (serialType >= 12 && serialType % 2 === 0) {
              throw new Error('Not implemented');
            } else if (serialType >= 13 && serialType % 2 === 1) {
              const length = (serialType - 13) / 2;
              console.log(String.fromCharCode(...uint8Array.slice(itemOffset, itemOffset + length)).substr(0, 5) + '...');
              itemOffset += length;
            } else {
              throw new Error('Unknown data type');
            }
          }
        }

        break;
      }
      default: throw new Error('Invalid page type ' + pageType);
    }

    if (pageNumber === 10 /* First 0x0d */) {
      break;
    }
  }
});
