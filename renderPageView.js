function renderPageView(arrayBuffer) {
  if (!arrayBuffer) {
    return;
  }

  const dataView = new DataView(arrayBuffer);
  const pageSize = dataView.getUint16(16);
  const pageCount = dataView.getUint32(28);
  const edges = [...constructGraph(dataView)];

  window.addEventListener('hashchange', () => {
    const pageNumber = Number(location.hash.substring(1));
    localStorage.setItem('page-number', pageNumber);

    document.getElementById('pageNumberInput').value = pageNumber;
    document.getElementById('pageNumberInput').min = 1;
    document.getElementById('pageNumberInput').max = pageCount;
    document.getElementById('pageCountSpan').textContent = `/ ${pageCount}`;

    document.getElementById('titleDiv').textContent = 'Hover over a cell to see its description…';
    document.getElementById('cellsDiv').innerHTML = '';

    const pageOffset = (pageNumber - 1) * pageSize;
    for (let cell of parsePage(new DataView(arrayBuffer, pageOffset, pageSize))) {
      let value;
      if (cell.utf8) {
        value = cell.utf8 === ' ' || cell.utf8 === '\n' || cell.utf8 === '\t' || cell.utf8 === '' ? '\xa0' /* Non-breakable space */ : cell.utf8;
      } else if (cell.hex) {
        value = cell.hex;
      } else if (cell.dec) {
        value = cell.dec;
      } else {
        value = '\xa0' /* Non-breakable space */;
      }

      const cellSpan = document.createElement('span');
      cellSpan.textContent = value;
      cellSpan.title = `${cell.offset - pageOffset}/${pageSize} (${cell.offset}/${dataView.byteLength}): ${cell.title}`;
      cellSpan.className = cell.className;
      cellSpan.addEventListener('mousemove', handleCellSpanMouseMove);
      document.getElementById('cellsDiv').append(cellSpan);
    }

    document.getElementById('relsUl').innerHTML = '';
    for (let edge of edges.filter(edge => edge.source === pageNumber || edge.target === pageNumber)) {
      const edgeButton = document.createElement('button');
      edgeButton.dataset.pageNumber = edge.source === pageNumber ? edge.target : edge.source;
      edgeButton.addEventListener('click', handleEdgeButtonClick);
      edgeButton.textContent = JSON.stringify(edge);

      const edgeLi = document.createElement('li');
      edgeLi.append(edgeButton);

      document.getElementById('relsUl').append(edgeLi);
    }
  });

  function handleCellSpanMouseMove(event) {
    document.getElementById('titleDiv').textContent = event.currentTarget.title;
  }

  function handleEdgeButtonClick(event) {
    location.hash = event.currentTarget.dataset.pageNumber;
  }

  const pageNumber = Number(localStorage['page-number']) || 1;
  if (location.hash === '#' + pageNumber) {
    // Dispatch a fake `hashchange` event so that the page renders if the hash hasn't changed but we F5'd
    window.dispatchEvent(new Event('hashchange'));
  }

  location.hash = pageNumber;

  document.getElementById('prevButton').addEventListener('click', () => {
    const pageNumber = Number(location.hash);
    if (pageNumber === 1) {
      return;
    }

    location.hash = pageNumber - 1;
  });

  document.getElementById('nextButton').addEventListener('click', () => {
    const pageNumber = Number(location.hash);
    if (pageNumber === pageCount) {
      return;
    }

    location.hash = pageNumber + 1;
  });

  document.getElementById('pageNumberInput').addEventListener('change', event => {
    const pageNumber = event.currentTarget.valueAsNumber;
    if (pageNumber >= 1 && pageNumber <= pageCount) {
      location.hash = pageNumber;
    }
  });
}

function* yieldString(/** @type {string} */ className, /** @type {string} */ string, /** @type {string} */ title, /** @type {DataView} */ dataView) {
  const checkString = decodeURIComponent(escape(String.fromCharCode(...new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength))));
  if (checkString !== string) {
    throw new Error(`The string "${string}" does not match the data view check string "${checkString}".`);
  }

  for (let index = 0; index < string.length; index++) {
    const utf8 = checkString[index];
    const offset = dataView.byteOffset + index;
    yield { offset, utf8, className, title: `${title} '${string}' character ${index + 1}/${string.length}: '${string[index]}'` };
  }
}

function* yieldBlob(/** @type {string} */ className, /** @type {number} */ count, /** @type {string} */ title, /** @type {DataView} */ dataView) {
  if (dataView.byteLength !== count) {
    throw new Error(`The blob length ${count} does not match the data view length ${dataView.byteLength}`);
  }

  for (let index = 0; index < count; index++) {
    const hex = dataView.getUint8(index).toString(16);
    const offset = dataView.byteOffset + index;
    yield { offset, hex, className, title: `${title}` + (count > 1 ? ` byte ${index + 1}/${count}` : '') };
  }
}

function* yieldU8(/** @type {string} */ className, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 1) {
    throw new Error(`The data view length ${dataView.byteLength} is not 1 bytes of u8`);
  }

  const dec = dataView.getUint8(0);
  if (constValue && dec !== constValue) {
    throw new Error(`The value ${dec} does not match the excepted value ${constValue}`);
  }

  const offset = dataView.byteOffset;
  yield { offset, dec, className, title: `${title} (${constValue !== undefined ? 'always ' : ''}${dec} [${dec.toString(16)}]${specialValues && specialValues[dec] ? ': ' + specialValues[dec] : defaultValue || ''})` };
}

function* yieldU16(/** @type {string} */ className, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 2) {
    throw new Error(`The data view length ${dataView.byteLength} is not 2 bytes of u16`);
  }

  const dec = dataView.getUint16(0);
  if (constValue && dec !== constValue) {
    throw new Error(`The value ${dec} does not match the excepted value ${constValue}`);
  }

  title = `${title} (${constValue !== undefined ? 'always ' : ''}${dec} [${dec.toString(16)}]${specialValues && specialValues[dec] ? ': ' + specialValues[dec] : defaultValue || ''})`;
  let offset = dataView.byteOffset;
  yield { offset, className, title: title + ' BE byte 1/2 (MSB)' };
  offset++;
  yield { offset, dec, className, title: title + ' BE byte 2/2 (LSB)' };
}

function* yieldU24(/** @type {string} */ className, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 3) {
    throw new Error(`The data view length ${dataView.byteLength} is not 3 bytes of u24`);
  }

  const dec = dataView.getUint24(0);
  if (constValue && dec !== constValue) {
    throw new Error(`The value ${dec} does not match the excepted value ${constValue}`);
  }

  title = `${title} (${constValue !== undefined ? 'always ' : ''}${dec} [${dec.toString(16)}]${specialValues && specialValues[dec] ? ': ' + specialValues[dec] : defaultValue || ''})`;
  let offset = dataView.byteOffset;
  yield { offset, className, title: title + ' BE byte 1/3 (MSB)' };
  offset++;
  yield { offset, className, title: title + ' BE byte 2/3' };
  offset++;
  yield { offset, dec, className, title: title + ' BE byte 3/3 (LSB)' };
}

function* yieldU32(/** @type {string} */ className, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 4) {
    throw new Error(`The data view length ${dataView.byteLength} is not 4 bytes of u32`);
  }

  const dec = dataView.getUint32(0);
  if (constValue && dec !== constValue) {
    throw new Error(`The value ${dec} does not match the excepted value ${constValue}`);
  }

  title = `${title} (${constValue !== undefined ? 'always ' : ''}${dec} [${dec.toString(16)}]${specialValues && specialValues[dec] ? ': ' + specialValues[dec] : defaultValue || ''})`;
  let offset = dataView.byteOffset;
  yield { offset, className, title: title + ' BE byte 1/4 (MSB)' };
  offset++;
  yield { offset, className, title: title + ' BE byte 2/4' };
  offset++;
  yield { offset, className, title: title + ' BE byte 3/4' };
  offset++;
  yield { offset, dec, className, title: title + ' BE byte 4/4 (LSB)' };
}

function* yieldReal64(/** @type {string} */ className, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 8) {
    throw new Error(`The data view length ${dataView.byteLength} is not 8 bytes of REAL64`);
  }

  const dec = dataView.getFloat64(0);
  if (constValue && dec !== constValue) {
    throw new Error(`The value ${dec} does not match the excepted value ${constValue}`);
  }

  title = `${title} (${constValue !== undefined ? 'always ' : ''}${dec} [${dec.toString(16)}]${specialValues && specialValues[dec] ? ': ' + specialValues[dec] : defaultValue || ''})`;
  let offset = dataView.byteOffset;
  yield { offset, className, title: title + ' BE byte 1/8 (MSB)' };
  offset++;
  yield { offset, className, title: title + ' BE byte 2/8' };
  offset++;
  yield { offset, className, title: title + ' BE byte 3/8' };
  offset++;
  yield { offset, className, title: title + ' BE byte 4/8' };
  offset++;
  yield { offset, className, title: title + ' BE byte 5/8' };
  offset++;
  yield { offset, className, title: title + ' BE byte 6/8' };
  offset++;
  yield { offset, className, title: title + ' BE byte 7/8' };
  offset++;
  yield { offset, dec, className, title: title + ' BE byte 8/8 (LSB)' };
}

// This is different from the Sqlite class because it doesn't parse into structures, it just annotates bytes
// https://www.sqlite.org/fileformat2.html
function* parsePage(/** @type {DataView} */ pageDataView) {
  let buffer = pageDataView.buffer;
  let offset = pageDataView.byteOffset;

  // Parse the SQLite header on the first page
  if (offset === 0) {
    yield* yieldString('C7CEEA', 'SQLite format 3\0', 'SQLite header', new DataView(buffer, offset, 16));
    yield* yieldU16('B5EAD7', 'Page size', new DataView(buffer, offset += 16, 2), undefined, { 1: 65536 });
    yield* yieldU8('E2F0CB', 'Write version', new DataView(buffer, offset += 2, 1), undefined, { 1: 'legacy', 2: 'WAL' }, 'Invalid?');
    yield* yieldU8('FFDAC1', 'Read version', new DataView(buffer, offset += 1, 1), undefined, { 1: 'legacy', 2: 'WAL' }, 'Invalid?');
    yield* yieldU8('FFB7B2', 'Unused bytes - reserved for extensions', new DataView(buffer, offset += 1, 1));
    yield* yieldU8('FF9AA2', 'Maximum embedded payload fraction', new DataView(buffer, offset += 1, 1), 64);
    yield* yieldU8('C7CEEA', 'Minimum embedded payload fraction', new DataView(buffer, offset += 1, 1), 32);
    yield* yieldU8('B5EAD7', 'Leaf payload fraction', new DataView(buffer, offset += 1, 1), 32);
    yield* yieldU32('E2F0CB', 'File change counter', new DataView(buffer, offset += 1, 4));
    yield* yieldU32('FFDAC1', 'Database size', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('FFB7B2', 'Page number of the first freelist trunk page', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Freelist empty' });
    yield* yieldU32('FF9AA2', 'Total number of freelist pages', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Freelist empty' });
    yield* yieldU32('C7CEEA', 'Schema cookie', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('B5EAD7', 'Schema format number', new DataView(buffer, offset += 4, 4), undefined, { 1: 1, 2: 2, 3: 3, 4: 4 }, 'Invalid');
    yield* yieldU32('E2F0CB', 'Default page cache size', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('FFDAC1', 'Page number of the largest root B-tree', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Not in auto-vacuum or incremental mode' });
    yield* yieldU32('FFB7B2', 'Database text encoding', new DataView(buffer, offset += 4, 4), undefined, { 1: 'UTF-8', 2: 'UTF-16le', 3: 'UTF-16be' }, 'Invalid value');
    yield* yieldU32('FF9AA2', 'User version as read and set by the user_version pragma', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('C7CEEA', 'Incremental-vacuum mode flag', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Is not in incremental-vacuum mode' }, 'Is in incremental-vacuum mode');
    yield* yieldU32('B5EAD7', 'Application ID set by PRAGMA application_id', new DataView(buffer, offset += 4, 4));
    yield* yieldBlob('E2F0CB', 20, 'Reserved for expansion - must be zero', new DataView(buffer, offset += 4, 20));
    yield* yieldU32('FFDAC1', 'The version-valid-for number', new DataView(buffer, offset += 20, 4));
    yield* yieldU32('FFB7B2', 'SQLITE_VERSION_NUMBER', new DataView(buffer, offset += 4, 4));
    offset += 4;
  }

  yield* yieldU8('FF9AA2', 'Page type', new DataView(buffer, offset, 1), undefined, { 0x2: 'interior index', 0x5: 'interior table', 0xa: 'leaf index', 0xd: 'leaf table' });
  const pageType = pageDataView.getUint8(offset - pageDataView.byteOffset);
  yield* yieldU16('C7CEEA', 'Freeblocks start', new DataView(buffer, offset += 1, 2), undefined, { 0: 'No freeblocks' });
  yield* yieldU16('B5EAD7', 'Number of cells on the page', new DataView(buffer, offset += 2, 2));
  const cellCount = pageDataView.getUint16(offset - pageDataView.byteOffset);
  yield* yieldU16('E2F0CB', 'Cell content area start', new DataView(buffer, offset += 2, 2), undefined, { 0: 'Start is at 65536' });
  const cellContentArea = pageDataView.getUint16(offset - pageDataView.byteOffset);
  yield* yieldU8('FFDAC1', 'Number of fragmented free bytes within the cell content area', new DataView(buffer, offset += 2, 1));
  offset += 1;

  switch (pageType) {
    case 0x2: {
      const rightMostPointer = new DataView(buffer, offset, 4).getUint32();
      yield* yieldU32('FFB7B2', 'Right-most pointer', new DataView(buffer, offset, 4));

      const cellOffsets = [];
      for (let index = 0; index < cellCount; index++) {
        yield* yieldU16(index % 2 === 0 ? 'FF9AA2' : 'C7CEEA', `Cell pointer #${index + 1}/${cellCount}`, new DataView(buffer, offset += index === 0 ? 4 : 2, 2));
        cellOffsets.push(pageDataView.getUint16(offset - pageDataView.byteOffset));
      }

      offset += 2;

      cellOffsets.sort((a, b) => a - b);

      const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
      yield* yieldBlob('', zeroCount, 'Unallocated area', new DataView(buffer, offset, zeroCount));
      offset += zeroCount;

      for (let index = 0; index < cellCount; index++) {
        yield* yieldU32('E2F0CB', `Page number left child pointer ${index + 1}/${cellCount}`, new DataView(buffer, offset, 4));

        const keyVarint = new VarInt(new DataView(buffer, offset += 4, 9));
        yield* yieldBlob('FFDAC1', keyVarint.byteLength, `Key varint (${keyVarint.value})`, new DataView(buffer, offset, keyVarint.byteLength));

        offset += keyVarint.byteLength;

        // TODO: Parse the payload
        yield* yieldBlob('B5EAD7', keyVarint.value, 'Payload', new DataView(buffer, offset, keyVarint.value));
        offset += keyVarint.value;

        if (index < cellCount - 1 && offset - pageDataView.byteOffset !== cellOffsets[index + 1]) {
          // TODO: Figure out the problem on pages 37, 43, 948
          //throw new Error('Varint leaked into the next cell');
        }
      }

      break;
    }
    case 0x5: {
      const rightMostPointer = new DataView(buffer, offset, 4).getUint32();
      yield* yieldU32('FFB7B2', 'Right-most pointer', new DataView(buffer, offset, 4));

      const cellOffsets = [];
      for (let index = 0; index < cellCount; index++) {
        yield* yieldU16(index % 2 === 0 ? 'FF9AA2' : 'C7CEEA', `Cell pointer #${index + 1}/${cellCount}`, new DataView(buffer, offset += index === 0 ? 4 : 2, 2));
        cellOffsets.push(pageDataView.getUint16(offset - pageDataView.byteOffset));
      }

      offset += 2;

      cellOffsets.sort((a, b) => a - b);

      const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
      yield* yieldBlob('', zeroCount, 'Unallocated area', new DataView(buffer, offset, zeroCount));
      offset += zeroCount;

      for (let index = 0; index < cellCount; index++) {
        yield* yieldU32('E2F0CB', `Page number left child pointer ${index + 1}/${cellCount}`, new DataView(buffer, offset, 4));

        const keyVarint = new VarInt(new DataView(buffer, offset += 4, 9));
        yield* yieldBlob('FFDAC1', keyVarint.byteLength, `Key varint (${keyVarint.value})`, new DataView(buffer, offset, keyVarint.byteLength));

        offset += keyVarint.byteLength;
        if (index < cellCount - 1 && offset - pageDataView.byteOffset !== cellOffsets[index + 1]) {
          throw new Error('Varint leaked into the next cell');
        }
      }

      break;
    }
    // TODO: Parse the page
    case 0xa: {
      break;
    }
    case 0xd: {
      const cellOffsets = [];
      for (let index = 0; index < cellCount; index++) {
        yield* yieldU16(index % 2 === 0 ? 'FF9AA2' : 'C7CEEA', `Cell pointer #${index + 1}/${cellCount}`, new DataView(buffer, offset += index === 0 ? 0 : 2, 2));
        cellOffsets.push(pageDataView.getUint16(offset - pageDataView.byteOffset));
      }

      cellOffsets.sort((a, b) => a - b);

      offset += 2;

      const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
      yield* yieldBlob('', zeroCount, 'Unallocated area', new DataView(buffer, offset, zeroCount));
      offset += zeroCount;

      for (let index = 0; index < cellCount; index++) {
        const payloadLengthVarint = new VarInt(new DataView(buffer, offset, 9));
        yield* yieldBlob('E2F0CB', payloadLengthVarint.byteLength, `Payload length varint (${payloadLengthVarint.value})`, new DataView(buffer, offset, payloadLengthVarint.byteLength));

        const rowidVarint = new VarInt(new DataView(buffer, offset += payloadLengthVarint.byteLength, 9));
        yield* yieldBlob('FFDAC1', rowidVarint.byteLength, `Row ID varint (${rowidVarint.value})`, new DataView(buffer, offset, rowidVarint.byteLength));

        const serialTypesLengthVarint = new VarInt(new DataView(buffer, offset += rowidVarint.byteLength, 9));
        yield* yieldBlob('FFB7B2', serialTypesLengthVarint.byteLength, `Serial types length varint (${serialTypesLengthVarint.value})`, new DataView(buffer, offset, serialTypesLengthVarint.byteLength));
        offset += serialTypesLengthVarint.byteLength;

        const serialTypeVarints = [];
        const serialTypesEndOffset = offset + serialTypesLengthVarint.value - serialTypesLengthVarint.byteLength;

        let className = 'FF9AA2';
        while (offset < serialTypesEndOffset) {
          const serialTypeVarint = new VarInt(new DataView(buffer, offset, 9));
          serialTypeVarints.push(serialTypeVarint);
          offset += serialTypeVarint.byteLength;

          // https://www.sqlite.org/datatype3.html
          let type = '';
          if (serialTypeVarint.value === 0) {
            type = 'NULL';
          } else if (serialTypeVarint.value === 1) {
            type = 'u8';
          } else if (serialTypeVarint.value === 2) {
            type = 'u16';
          } else if (serialTypeVarint.value === 3) {
            type = 'u24';
          } else if (serialTypeVarint.value === 4) {
            type = 'u32';
          } else if (serialTypeVarint.value === 5) {
            type = 'u48';
          } else if (serialTypeVarint.value === 6) {
            type = 'u64';
          } else if (serialTypeVarint.value === 7) {
            type = 'REAL';
          } else if (serialTypeVarint.value === 8) {
            type = 'FALSE';
          } else if (serialTypeVarint.value === 9) {
            type = 'TRUE';
          } else if (serialTypeVarint.value === 10) {
            type = 'INTERNAL';
          } else if (serialTypeVarint.value === 11) {
            type = 'INTERNAL';
          } else if (serialTypeVarint.value >= 12 && serialTypeVarint.value % 2 === 0) {
            type = `BLOB (${(serialTypeVarint.value - 12) / 2})`;
          } else if (serialTypeVarint.value >= 13 && serialTypeVarint.value % 2 === 1) {
            type = `TEXT (${(serialTypeVarint.value - 13) / 2})`;
          } else {
            throw new Error('Unknown data type - cannot happen');
          }

          yield* yieldBlob(className, serialTypeVarint.byteLength, `serial type ${type} varint (${serialTypeVarint.value})`, new DataView(buffer, offset, serialTypeVarint.byteLength));
          className = className === 'FF9AA2' ? 'C7CEEA' : 'FF9AA2';
        }

        if (offset !== serialTypesEndOffset) {
          throw new Error('Serial type varints leaked');
        }

        className = 'B5EAD7';
        for (const serialTypeVarint of serialTypeVarints) {
          const payloadRoom = index === cellCount - 1 ? 'TODO: End of page / start of reserved space for extensions if any' : cellOffsets[index + 1] - (offset - pageDataView.byteOffset);

          if (serialTypeVarint.value === 0) {
            // NULL
          } else if (serialTypeVarint.value === 1) {
            yield* yieldU8(className, `u8 payload item`, new DataView(buffer, offset, 1));
            offset += 1;
          } else if (serialTypeVarint.value === 2) {
            yield* yieldU16(className, `u16 payload item`, new DataView(buffer, offset, 2));
            offset += 2;
          } else if (serialTypeVarint.value === 3) {
            yield* yieldU24(className, `u24 payload item`, new DataView(buffer, offset, 3));
            offset += 3;
          } else if (serialTypeVarint.value === 4) {
            yield* yieldU32(className, `u32 payload item`, new DataView(buffer, offset, 4));
            offset += 4;
          } else if (serialTypeVarint.value === 5) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 6) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 7) {
            yield* yieldReal64(className, `REAL payload item`, new DataView(buffer, offset, 8));
            offset += 8;
          } else if (serialTypeVarint.value === 8) {
            // TRUE
          } else if (serialTypeVarint.value === 9) {
            // FALSE
          } else if (serialTypeVarint.value === 10) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 11) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value >= 12 && serialTypeVarint.value % 2 === 0) {
            const length = (serialTypeVarint.value - 12) / 2;
            const isOverflowing = length > payloadRoom;
            if (isOverflowing) {
              const fitLength = payloadRoom - 4 /* Overflow page pointer */;
              yield* yieldBlob(className, fitLength, `TEXT (${fitLength}/${length}) overflowing payload item fitting part`, new DataView(buffer, offset, fitLength));
            } else {
              yield* yieldBlob(className, length, `TEXT (${length}) payload item`, new DataView(buffer, offset, length));
              offset += length;
            }
          } else if (serialTypeVarint.value >= 13 && serialTypeVarint.value % 2 === 1) {
            const length = (serialTypeVarint.value - 13) / 2;
            const isOverflowing = length > payloadRoom;
            if (isOverflowing) {
              const fitLength = payloadRoom - 4 /* Overflow page pointer */;
              const value = decodeURIComponent(escape(String.fromCharCode(...new Uint8Array(buffer.slice(offset, offset + fitLength)))));
              yield* yieldString(className, value, `TEXT (${fitLength}/${length}) overflowing payload item fitting part`, new DataView(buffer, offset, fitLength));
              offset += fitLength;

            } else {
              const value = decodeURIComponent(escape(String.fromCharCode(...new Uint8Array(buffer.slice(offset, offset + length)))));
              yield* yieldString(className, value, `TEXT (${length}) payload item`, new DataView(buffer, offset, length));
              offset += length;
            }
          } else {
            throw new Error('Unknown data type - cannot happen');
          }

          className = className === 'B5EAD7' ? 'E2F0CB' : 'B5EAD7';
        }

        if (index < cellCount - 1) {
          const differenceToNext = cellOffsets[index + 1] - (offset - pageDataView.byteOffset);
          if (differenceToNext === 4) {
            yield* yieldU32('', `Overflow page number`, new DataView(buffer, offset, differenceToNext));
            offset += differenceToNext;
          } else if (differenceToNext >= 0) {
            yield* yieldBlob('', differenceToNext, `Random space between cells?!`, new DataView(buffer, offset, differenceToNext));
            offset += differenceToNext;
          } else {
            throw new Error(`Varint leaked into the next cell! Offset is ${offset - pageDataView.byteOffset} and the next cell offset is ${cellOffsets[index + 1]}, the difference is ${differenceToNext}`);
          }
        }
      }

      break;
    }
  }

  if (offset !== pageDataView.byteOffset + pageDataView.byteLength) {
    throw new Error(`The offset after marking is ${offset} but the end of the page is at ${pageDataView.byteOffset + pageDataView.byteLength}, ${pageDataView.byteLength} bytes after page start ${pageDataView.byteOffset}.`);
  }
}
