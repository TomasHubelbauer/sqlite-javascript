window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();

  // Demonstrate dynamic page loading by offering only the header and using the
  // `slice` event, it would not be called if the whole `ArrayBuffer` was passed
  const dataView = new DataView(arrayBuffer, 0, 100);
  const sqlite = new Sqlite(dataView);
  sqlite.addEventListener('slice', event => event.resolve(new DataView(arrayBuffer, event.pageOffset, event.pageSize)));

  customElements.define('th-dataviewbox', DataViewBox);

  let pageIndex = 0;

  document.getElementById('prevButton').addEventListener('click', () => {
    if (pageIndex === 0) {
      return;
    }

    pageIndex--;
    render();
  });

  document.getElementById('nextButton').addEventListener('click', () => {
    if (pageIndex === sqlite.pageCount - 1) {
      return;
    }

    pageIndex++;
    render();
  });

  async function render() {
    document.getElementById('pageJsonPre').textContent = JSON.stringify(await sqlite.getPage(pageIndex));

    document.getElementById('pageDataViewBox').remove();
    const pageDataViewBox = document.createElement('th-dataviewbox');
    pageDataViewBox.id = 'pageDataViewBox';
    pageDataViewBox.setAttribute('no-virtualization', 'yes');
    document.body.append(pageDataViewBox);

    document.getElementById('pageSpan').textContent = `${pageIndex + 1} / ${sqlite.pageCount}`;

    const dataView = new DataView(arrayBuffer, pageIndex * sqlite.pageSize, sqlite.pageSize);
    const labels = [...parsePage(dataView, pageIndex)];

    pageDataViewBox.styleSrc = 'https://tomashubelbauer.github.io/html-data-view-box/DataViewBox.css';
    pageDataViewBox.labels = labels;
    pageDataViewBox.addEventListener('hover', event => document.getElementById('labelDiv').textContent = `${event.relativeOffset}/${event.absoluteOffset}: ${event.title}`);
    pageDataViewBox.dataView = dataView;
  }

  render();
});

let colors = ['#cccccc', '#cccc99', '#cc99cc', '#cc9999', '#99cccc', '#99cc99', '#9999cc', '#999999'];
let colorIndex = 0;
function color() {
  colorIndex = colorIndex === colors.length - 1 ? 0 : colorIndex + 1;
  return colors[colorIndex] + ' ';
}

function* yieldString(string, title) {
  const clr = color();
  for (let index = 0; index < string.length; index++) {
    yield clr + title + ` '${string}' character #${index}/${string.length}: '${string[index]}'`;
  }
}

function* yieldBlob(count, title) {
  const clr = color();
  for (let index = 0; index < count; index++) {
    yield clr + title + ` ${index}/${count}`;
  }
}

function* yieldUint16(title) {
  const clr = color();
  yield clr + title + ' byte 1/2 (MSB) b1 * (16^2) + b2';
  yield clr + title + ' byte 2/2 (LSB) b1 * (16^2) + b2';
}

function* yieldUint32(title) {
  const clr = color();
  yield clr + title + ' byte 1/4 (MSB) b1 * (16^4) + b2 * (16^3) + b3 * (16^2) + b4';
  yield clr + title + ' byte 2/4 b1 * (16^4) + b2 * (16^3) + b3 * (16^2) + b4';
  yield clr + title + ' byte 3/4 b1 * (16^4) + b2 * (16^3) + b3 * (16^2) + b4';
  yield clr + title + ' byte 4/4 (LSB) b1 * (16^4) + b2 * (16^3) + b3 * (16^2) + b4';
}

// This is different from the Sqlite class because it doesn't parse into structures, it just annotates bytes
function* parsePage(/** @type {DataView} */ pageDataView, /** @type {Number} */ pageIndex) {
  // Parse the SQLite header
  if (pageIndex === 0) {
    yield* yieldString('SQLite format 3\0', 'SQLite header');
    yield* yieldUint16('Page size');
    yield color() + `Write version`;
    yield color() + `Read version`;
    yield color() + `Unused bytes`;
    yield color() + `Maximum embedded payload fraction (always 64)`;
    yield color() + `Minimum embedded payload fraction (always 32)`;
    yield color() + `Leaf payload fraction (always 32)`;
    yield* yieldUint32('File change counter');
    yield* yieldUint32('Database size');
    yield* yieldUint32('Page number of the first freelist trunk page');
    yield* yieldUint32('Total number of freelist pages');
    yield* yieldUint32('The schema cookie');
    yield* yieldUint32('The schema format number');
    yield* yieldUint32('Default page cache size');
    yield* yieldUint32('The page number of the largest root b-tree page when in auto-vacuum or incremental-vacuum modes, or zero otherwise');
    yield* yieldUint32('The database text encoding. A value of 1 means UTF-8. A value of 2 means UTF-16le. A value of 3 means UTF-16be.');
    yield* yieldUint32('The user version as read and set by the user_version pragma.');
    yield* yieldUint32('True (non-zero) for incremental-vacuum mode. False (zero) otherwise.');
    yield* yieldUint32('The "Application ID" set by PRAGMA application_id.');
    yield* yieldBlob(20, 'Reserved for expansion. Must be zero.');
    yield* yieldUint32('The version-valid-for number.');
    yield* yieldUint32('SQLITE_VERSION_NUMBER');
  }

  const pageOffset = pageIndex === 0 ? 100 : 0;

  // Parse the page contents
  yield color() + `Page type`;
  yield* yieldUint16('Start of the first freeblock on the page, or zero if there are no freeblocks');
  yield* yieldUint16('Number of cells on the page');
  yield* yieldUint16('Start of the cell content area. A zero value for this integer is interpreted as 65536.');
  yield color() + `Number of fragmented free bytes within the cell content area`;

  const pageType = pageDataView.getUint8(pageOffset);
  if (pageType === 0x2 || pageType === 0x5) {
    yield* yieldUint32('The right-most pointer. This value appears in the header of interior b-tree pages only and is omitted from all other pages');
  }

  // Find out why the unallocated area (`zeroCount`) is off by 24 for interior pages and 20 for leaf pages in my calculations
  switch (pageType) {
    // TODO: Parse the SQL schema stored in the unallocated area - how to tell when it starts and what the format is?
    case 0x5: {
      const cellCount = pageDataView.getUint16(pageOffset + 3);
      const cellOffsets = [];
      for (let index = 0; index < cellCount; index++) {
        yield* yieldUint16(`Cell #${index}/${cellCount}`);
        cellOffsets.push(pageDataView.getUint16(pageOffset + 12 /* page header */ + index * 2));
      }

      cellOffsets.reverse();

      const cellContentArea = pageDataView.getUint16(pageOffset + 5);
      const zeroCount = cellContentArea - pageOffset + 12 - cellCount * 2 - 24 /* TODO: Find out why this? Cell contents length? */;
      yield* yieldBlob(zeroCount, 'Unallocated area');

      for (let index = 0; index < cellCount; index++) {
        yield* yieldUint32('Page number left child pointer');

        let varintLength = 0;
        let set = false;
        do {
          let byte = pageDataView.getUint8(cellOffsets[index] + 4 + varintLength);
          set = (byte & (1 << (7 - 0))) !== 0;
          varintLength++;
        } while (set);

        yield* yieldBlob(varintLength, 'Varint');

        if (index < cellCount - 1 && cellOffsets[index] + 4 + varintLength !== cellOffsets[index + 1]) {
          throw new Error('Varint leaked into the next cell');
        }
      }

      break;
    }

    case 0xd: {
      const cellCount = pageDataView.getUint16(pageOffset + 3);
      const cellOffsets = [];
      for (let index = 0; index < cellCount; index++) {
        yield* yieldUint16(`Cell #${index}/${cellCount}`);
        cellOffsets.push(pageDataView.getUint16(pageOffset + 8 /* page header */ + index * 2));
      }

      const cellContentArea = pageDataView.getUint16(pageOffset + 5);
      const zeroCount = cellContentArea - pageOffset + 12 - cellCount * 2 - 20 /* TODO: Find out why this? Cell contents length? */;
      yield* yieldBlob(zeroCount, 'Unallocated area');

      for (let index = 0; index < cellCount; index++) {
        const payloadLengthVarint = new VarInt(new DataView(pageDataView.buffer, pageDataView.byteOffset + cellOffsets[index], 9));
        yield* yieldBlob(payloadLengthVarint.byteLength, `Payload length varint (${payloadLengthVarint.value})`);
        const rowidVarint = new VarInt(new DataView(pageDataView.buffer, pageDataView.byteOffset + cellOffsets[index] + payloadLengthVarint.byteLength, 9));
        yield* yieldBlob(rowidVarint.byteLength, `rowid varint (${rowidVarint.value})`);
        const serialTypesVarint = new VarInt(new DataView(pageDataView.buffer, pageDataView.byteOffset + cellOffsets[index] + payloadLengthVarint.byteLength + rowidVarint.byteLength, 9));
        yield* yieldBlob(serialTypesVarint.byteLength, `serial types length varint (${serialTypesVarint.value})`);

        const serialTypeVarints = [];
        while (serialTypeVarints.reduce((a, c) => a + c.byteLength, 0) < serialTypesVarint.value - serialTypesVarint.byteLength) {
          const serialTypeVarint = new VarInt(new DataView(pageDataView.buffer, pageDataView.byteOffset + cellOffsets[index] + payloadLengthVarint.byteLength + rowidVarint.byteLength + serialTypesVarint.byteLength + serialTypeVarints.reduce((a, c) => a + c.byteLength, 0), 9));
          serialTypeVarints.push(serialTypeVarint);

          // https://www.sqlite.org/datatype3.html
          if (serialTypeVarint.value === 0) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type NULL varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 1) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type u8 varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 2) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type u16 varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 3) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type u24 varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 4) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type u32 varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 5) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type u48 varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 6) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type u64 varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 7) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type REAL varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 8) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type FALSE varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 9) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type TRUE varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 10) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type INTERNAL varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value === 11) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type INTERNAL varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value >= 12 && serialTypeVarint.value % 2 === 0) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type BLOB (${(serialTypeVarint.value - 12) / 2}) varint (${serialTypeVarint.value})`);
          } else if (serialTypeVarint.value >= 13 && serialTypeVarint.value % 2 === 1) {
            yield* yieldBlob(serialTypeVarint.byteLength, `serial type TEXT (${(serialTypeVarint.value - 13) / 2}) varint (${serialTypeVarint.value})`);
          } else {
            throw new Error('Unknown data type - cannot happen');
          }
        }

        for (const serialTypeVarint of serialTypeVarints) {
          if (serialTypeVarint.value === 0) {
            // NULL
          } else if (serialTypeVarint.value === 1) {
            yield color() + `u8 payload item`;
          } else if (serialTypeVarint.value === 2) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 3) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 4) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 5) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 6) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 7) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 8) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 9) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 10) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value === 11) {
            throw new Error('TODO');
          } else if (serialTypeVarint.value >= 12 && serialTypeVarint.value % 2 === 0) {
            const length = (serialTypeVarint.value - 12) / 2;
            yield* yieldBlob(length, `BLOB (${length}) payload item`);
          } else if (serialTypeVarint.value >= 13 && serialTypeVarint.value % 2 === 1) {
            const length = (serialTypeVarint.value - 13) / 2;
            yield* yieldBlob(length, `TEXT (${length}) payload item`);
          } else {
            throw new Error('Unknown data type - cannot happen');
          }
        }

        // TODO: Do the overflow list page number u32
        // TODO: Add a check to ensure that the offset right here matches the next cell pointer if this is not the last cell
      }

      break;
    }
  }
}
