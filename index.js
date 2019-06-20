window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();

  // Demonstrate dynamic page loading by offering only the header and using the
  // `slice` event, it would not be called if the whole `ArrayBuffer` was passed
  const dataView = new DataView(arrayBuffer, 0, 100);
  const sqlite = new Sqlite(dataView);
  sqlite.addEventListener('slice', event => event.resolve(new DataView(arrayBuffer, event.pageOffset, event.pageSize)));

  customElements.define('th-dataviewbox', DataViewBox);

  let pageIndex = Number(localStorage['page-index'] || '0');

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
    localStorage.setItem('page-index', pageIndex);

    document.getElementById('pageJsonPre').textContent = JSON.stringify(await sqlite.getPage(pageIndex));

    document.getElementById('pageDataViewBox').remove();
    const pageDataViewBox = document.createElement('th-dataviewbox');
    pageDataViewBox.id = 'pageDataViewBox';
    pageDataViewBox.setAttribute('no-virtualization', 'yes');
    document.body.append(pageDataViewBox);

    document.getElementById('pageSpan').textContent = `${pageIndex + 1} / ${sqlite.pageCount}`;

    const dataView = new DataView(arrayBuffer, pageIndex * sqlite.pageSize, sqlite.pageSize);
    const details = [...parsePage(dataView, pageIndex)];

    pageDataViewBox.styleSrc = 'https://tomashubelbauer.github.io/html-data-view-box/DataViewBox.css';
    pageDataViewBox.details = details;
    pageDataViewBox.dataView = dataView;

    pageDataViewBox.addEventListener('hover', event => {
      document.title = event.relativeOffset + '/' + event.absoluteOffset;
      document.getElementById('detailsDiv').textContent = event.relativeOffset + '/' + event.absoluteOffset;
      document.getElementById('detailsDiv').style.background = 'none';

      if (event.details) {
        document.title += ': ' + event.details.title;
        document.getElementById('detailsDiv').textContent += ': ' + event.details.title;
        document.getElementById('detailsDiv').style.background = event.details.color;
      }
    });
  }

  render();
});

function* yieldString(/** @type {string} */ color, /** @type {string} */ string, /** @type {string} */ title, /** @type {DataView} */ dataView) {
  if (dataView.byteLength !== string.length) {
    throw new Error(`The string length ${string.length} does not match the data view length ${dataView.byteLength}`);
  }

  for (let index = 0; index < string.length; index++) {
    if (String.fromCharCode(dataView.getUint8(index)) !== string[index]) {
      throw new Error('The strings do not match');
    }

    yield { color, title: `${title} '${string}' character ${index + 1}/${string.length}: '${string[index]}'` };
  }
}

function* yieldBlob(/** @type {string} */ color, /** @type {number} */ count, /** @type {string} */ title, /** @type {DataView} */ dataView) {
  if (dataView.byteLength !== count) {
    throw new Error(`The blob length ${count} does not match the data view length ${dataView.byteLength}`);
  }

  for (let index = 0; index < count; index++) {
    yield { color, title: `${title} byte ${index + 1}/${count}` };
  }
}

function* yieldU8(/** @type {string} */ color, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 1) {
    throw new Error(`The data view length ${dataView.byteLength} is not 1 bytes of u8`);
  }

  const value = dataView.getUint8(0);
  if (constValue && value !== constValue) {
    throw new Error(`The value ${value} does not match the excepted value ${constValue}`);
  }

  title = `${title} (${constValue !== undefined ? 'always ' : ''}${value} [${value.toString(16)}]${specialValues && specialValues[value] ? ': ' + specialValues[value] : defaultValue || ''})`;
  yield { color, title };
}

function* yieldU16(/** @type {string} */ color, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 2) {
    throw new Error(`The data view length ${dataView.byteLength} is not 2 bytes of u16`);
  }

  const value = dataView.getUint16(0);
  if (constValue && value !== constValue) {
    throw new Error(`The value ${value} does not match the excepted value ${constValue}`);
  }

  title = `${title} (${constValue !== undefined ? 'always ' : ''}${value} [${value.toString(16)}]${specialValues && specialValues[value] ? ': ' + specialValues[value] : defaultValue || ''})`;
  yield { color, title: title + ' BE byte 1/2 (MSB)' };
  yield { color, title: title + ' BE byte 2/2 (LSB)' };
}

function* yieldU32(/** @type {string} */ color, /** @type {string} */ title, /** @type {DataView} */ dataView, /** @type {number?} */ constValue, specialValues, defaultValue) {
  if (dataView.byteLength !== 4) {
    throw new Error(`The data view length ${dataView.byteLength} is not 4 bytes of u32`);
  }

  const value = dataView.getUint32(0);
  if (constValue && value !== constValue) {
    throw new Error(`The value ${value} does not match the excepted value ${constValue}`);
  }

  title = `${title} (${constValue !== undefined ? 'always ' : ''}${value} [${value.toString(16)}]${specialValues && specialValues[value] ? ': ' + specialValues[value] : defaultValue || ''})`;
  yield { color, title: title + ' BE byte 1/4 (MSB)' };
  yield { color, title: title + ' BE byte 2/4' };
  yield { color, title: title + ' BE byte 3/4' };
  yield { color, title: title + ' BE byte 4/4 (LSB)' };
}

// This is different from the Sqlite class because it doesn't parse into structures, it just annotates bytes
// The colors are from https://www.schemecolor.com/rainbow-pastels-color-scheme.php
// https://www.sqlite.org/fileformat2.html
function* parsePage(/** @type {DataView} */ pageDataView, /** @type {Number} */ pageIndex) {
  let buffer = pageDataView.buffer;
  let offset = pageDataView.byteOffset;
  if (pageIndex === 0) {
    yield* yieldString('#C7CEEA', 'SQLite format 3\0', 'SQLite header', new DataView(buffer, offset, 16));
    yield* yieldU16('#B5EAD7', 'Page size', new DataView(buffer, offset += 16, 2), undefined, { 1: 65536 });
    yield* yieldU8('#E2F0CB', 'Write version', new DataView(buffer, offset += 2, 1), undefined, { 1: 'legacy', 2: 'WAL' }, 'Invalid?');
    yield* yieldU8('#FFDAC1', 'Read version', new DataView(buffer, offset += 1, 1), undefined, { 1: 'legacy', 2: 'WAL' }, 'Invalid?');
    yield* yieldU8('#FFB7B2', 'Unused bytes - reserved for extensions', new DataView(buffer, offset += 1, 1));
    yield* yieldU8('#FF9AA2', 'Maximum embedded payload fraction', new DataView(buffer, offset += 1, 1), 64);
    yield* yieldU8('#C7CEEA', 'Minimum embedded payload fraction', new DataView(buffer, offset += 1, 1), 32);
    yield* yieldU8('#B5EAD7', 'Leaf payload fraction', new DataView(buffer, offset += 1, 1), 32);
    yield* yieldU32('#E2F0CB', 'File change counter', new DataView(buffer, offset += 1, 4));
    yield* yieldU32('#FFDAC1', 'Database size', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('#FFB7B2', 'Page number of the first freelist trunk page', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Freelist empty' });
    yield* yieldU32('#FF9AA2', 'Total number of freelist pages', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Freelist empty' });
    yield* yieldU32('#C7CEEA', 'Schema cookie', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('#B5EAD7', 'Schema format number', new DataView(buffer, offset += 4, 4), undefined, { 1: 1, 2: 2, 3: 3, 4: 4 }, 'Invalid');
    yield* yieldU32('#E2F0CB', 'Default page cache size', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('#FFDAC1', 'Page number of the largest root B-tree', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Not in auto-vacuum or incremental mode' });
    yield* yieldU32('#FFB7B2', 'Database text encoding', new DataView(buffer, offset += 4, 4), undefined, { 1: 'UTF-8', 2: 'UTF-16le', 3: 'UTF-16be' }, 'Invalid value');
    yield* yieldU32('#FF9AA2', 'User version as read and set by the user_version pragma', new DataView(buffer, offset += 4, 4));
    yield* yieldU32('#C7CEEA', 'Incremental-vacuum mode flag', new DataView(buffer, offset += 4, 4), undefined, { 0: 'Is not in incremental-vacuum mode' }, 'Is in incremental-vacuum mode');
    yield* yieldU32('#B5EAD7', 'Application ID set by PRAGMA application_id', new DataView(buffer, offset += 4, 4));
    yield* yieldBlob('#E2F0CB', 20, 'Reserved for expansion - must be zero', new DataView(buffer, offset += 4, 20));
    yield* yieldU32('#FFDAC1', 'The version-valid-for number', new DataView(buffer, offset += 20, 4));
    yield* yieldU32('#FFB7B2', 'SQLITE_VERSION_NUMBER', new DataView(buffer, offset += 4, 4));
    offset += 4;
  }

  yield* yieldU8('#FF9AA2', 'Page type', new DataView(buffer, offset, 1));
  const pageType = pageDataView.getUint8(offset - pageDataView.byteOffset);
  yield* yieldU16('#C7CEEA', 'Freeblocks start', new DataView(buffer, offset += 1, 2), undefined, { 0: 'No freeblocks' });
  yield* yieldU16('#B5EAD7', 'Number of cells on the page', new DataView(buffer, offset += 2, 2));
  const cellCount = pageDataView.getUint16(offset - pageDataView.byteOffset);
  yield* yieldU16('#E2F0CB', 'Cell content area start', new DataView(buffer, offset += 2, 2), undefined, { 0: 'Start is at 65536' });
  const cellContentArea = pageDataView.getUint16(offset - pageDataView.byteOffset);
  yield* yieldU8('#FFDAC1', 'Number of fragmented free bytes within the cell content area', new DataView(buffer, offset += 2, 1));
  offset += 1;

  // 0x2 = interior index
  // 0x5 = interior table
  // 0ax = leaf index
  // 0xd = leaf table
  switch (pageType) {
    case 0x2: {
      yield* yieldU32('#FFB7B2', 'Right-most pointer', new DataView(buffer, offset, 4));
      // TODO: Parse the rest of the page
      break;
    }
    // TODO: Parse the SQL schema stored in the unallocated area - how to tell when it starts and what the format is?
    case 0x5: {
      yield* yieldU32('#FFB7B2', 'Right-most pointer', new DataView(buffer, offset, 4));

      const cellOffsets = [];
      for (let index = 0; index < cellCount; index++) {
        yield* yieldU16(index % 2 === 0 ? '#FF9AA2' : '#C7CEEA', `Cell pointer #${index + 1}/${cellCount}`, new DataView(buffer, offset += index === 0 ? 4 : 2, 2));
        cellOffsets.push(pageDataView.getUint16(offset - pageDataView.byteOffset));
      }

      offset += 2;

      cellOffsets.reverse();

      // TODO: Find out how to really find the main table schema offset
      if (pageIndex === 0) {
        let realZeroCount = 0;
        while (pageDataView.getUint8((offset - pageDataView.byteOffset) + realZeroCount) === 0) {
          realZeroCount++;
        }

        yield* yieldBlob('#B5EAD7', realZeroCount, 'Unallocated area', new DataView(buffer, offset, realZeroCount));
        offset += realZeroCount;

        yield* yieldBlob('#777777', 1, 'TODO', new DataView(buffer, offset, 1));
        offset += 1;

        // TODO: Find where to read the real number of cells
        // Note that the second cell is overflowing, it says it is 285 bytes long but the cell cuts off after 245 bytes where the pointers begin
        for (let index = 0; index < 2; index++) {
          // This is the length and the rowid?
          yield* yieldBlob('#777777', 3, 'TODO', new DataView(buffer, offset, 3));
          offset += 3;

          const serialTypesLengthVarint = new VarInt(new DataView(buffer, offset, 9));
          yield* yieldBlob('#FFB7B2', serialTypesLengthVarint.byteLength, `Serial types varint (${serialTypesLengthVarint.value})`, new DataView(buffer, offset, serialTypesLengthVarint.byteLength));
          offset += serialTypesLengthVarint.byteLength;

          const serialTypeVarints = [];
          const serialTypesEndOffset = offset + serialTypesLengthVarint.value - serialTypesLengthVarint.byteLength;

          /* Note that the rest of this block is ripped from the 0xd table parse and might be a good candidate for reuse */

          let color = '#FF9AA2';
          while (offset < serialTypesEndOffset) {
            const serialTypeVarint = new VarInt(new DataView(buffer, offset, 9));
            serialTypeVarints.push(serialTypeVarint);
            offset += serialTypeVarint.byteLength;

            // https://www.sqlite.org/datatype3.html
            let type = '';
            if (serialTypeVarint.value === 1) {
              type = 'page number';
            } else if (serialTypeVarint.value >= 13 && serialTypeVarint.value % 2 === 1) {
              type = `TEXT (${(serialTypeVarint.value - 13) / 2})`;
            } else {
              throw new Error('Unexpected data type in the schema table');
            }

            yield* yieldBlob(color, serialTypeVarint.byteLength, `serial type ${type} varint (${serialTypeVarint.value})`, new DataView(buffer, offset, serialTypeVarint.byteLength));
            color = color === '#FF9AA2' ? '#C7CEEA' : '#FF9AA2';
          }

          if (offset !== serialTypesEndOffset) {
            throw new Error('Serial type varints leaked');
          }

          color = '#B5EAD7';
          for (const serialTypeVarint of serialTypeVarints) {
            if (serialTypeVarint.value === 1) {
              yield* yieldU8(color, `page number`, new DataView(buffer, offset, 1));
              offset += 1;
            } else if (serialTypeVarint.value >= 13 && serialTypeVarint.value % 2 === 1) {
              const length = (serialTypeVarint.value - 13) / 2;
              const value = String.fromCharCode(...new Uint8Array(buffer.slice(offset, offset + length)));

              // TODO: Handle the overflowing cell
              if (index === 1 && length === 285) {
                yield* yieldString(color, value.substring(0, 245), `TEXT (${length}) payload item`, new DataView(buffer, offset, 245));
                offset += 245;
                break;
              }

              yield* yieldString(color, value, `TEXT (${length}) payload item`, new DataView(buffer, offset, length));
              offset += length;
            } else {
              throw new Error('Unexpected data type in the schema table');
            }

            color = color === '#B5EAD7' ? '#E2F0CB' : '#B5EAD7';
          }
        }
      } else if (pageIndex === 1) {
        yield* yieldBlob('white', 64, 'TODO', new DataView(buffer, offset, 64));
        offset += 64;

        for (let index = 0; index < 32; index++) {
          yield* yieldBlob('white', 2, 'Uknown', new DataView(buffer, offset, 2));
          const unknowns = new Uint8Array(buffer, offset, 2);
          offset += 2;

          yield* yieldU8('#E2F0CB', 'Some ID (varint?)', new DataView(buffer, offset, 1));
          const id = new DataView(buffer, offset, 1).getUint8();
          offset += 1;

          yield* yieldU8('#FF9AA2', 'Number 4 - some kind of a type thingy?', new DataView(buffer, offset, 1), 4);
          offset += 1;

          yield* yieldU8('#FFB7B2', 'Zero', new DataView(buffer, offset, 1), 0);
          offset += 1;

          yield* yieldU8('#FFDAC1', 'Length', new DataView(buffer, offset, 1));
          const length = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#E2F0CB', 'One / 9', new DataView(buffer, offset, 1));
          offset += 1;

          const text = String.fromCharCode(...new Uint8Array(buffer, offset, length));
          yield* yieldString('#C7CEEA', text, 'Payload', new DataView(buffer, offset, length));
          console.log(unknowns, id, text);
          offset += length;
        }

        const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
        console.log(zeroCount);
        yield* yieldBlob('#777777', zeroCount, 'TODO', new DataView(buffer, offset, zeroCount));
        offset += zeroCount;
      } else if (pageIndex === 2) {
        yield* yieldBlob('white', 112, 'TODO', new DataView(buffer, offset, 112));
        offset += 112;

        // Note that the 45th entry is Alanis Morisette and it's overflown
        for (let index = 0; index < 44; index++) {
          yield* yieldBlob('white', 1, 'Uknown', new DataView(buffer, offset, 1));
          const unknowns = new Uint8Array(buffer, offset, 1);
          offset += 1;

          yield* yieldU8('#E2F0CB', 'Some ID (varint?)', new DataView(buffer, offset, 1));
          const id = new DataView(buffer, offset, 1).getUint8();
          offset += 1;

          yield* yieldU8('#FF9AA2', 'Number 3 - some kind of a type thingy?', new DataView(buffer, offset, 1), 3);
          offset += 1;

          yield* yieldU8('#FFB7B2', 'Zero', new DataView(buffer, offset, 1), 0);
          offset += 1;

          yield* yieldU8('#FFDAC1', 'Length', new DataView(buffer, offset, 1));
          const length = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          const text = String.fromCharCode(...new Uint8Array(buffer, offset, length));
          yield* yieldString('#C7CEEA', text, 'Payload', new DataView(buffer, offset, length));
          console.log(unknowns, id, text);
          offset += length;
        }

        const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
        yield* yieldBlob('#B5EAD7', zeroCount, 'Unallocated area', new DataView(buffer, offset, zeroCount));
        offset += zeroCount;
      } else if (pageIndex === 3) {
        yield* yieldBlob('white', 5, 'TODO', new DataView(buffer, offset, 5));
        offset += 5;

        for (index = 0; index < 3; index++) {
          yield* yieldBlob('white', 4, 'Uknown', new DataView(buffer, offset, 4));
          const unknowns = new Uint8Array(buffer, offset, 4);
          offset += 4;

          yield* yieldU8('#FFB7B2', 'Zero', new DataView(buffer, offset, 1), 0);
          offset += 1;

          yield* yieldU8('#FFDAC1', 'First name length', new DataView(buffer, offset, 1));
          const firstNameLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#E2F0CB', 'Last name length', new DataView(buffer, offset, 1));
          const lastNameLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#FFB7B2', 'Zero', new DataView(buffer, offset, 1), 0);
          offset += 1;

          yield* yieldU8('#FFDAC1', 'Street length', new DataView(buffer, offset, 1));
          const streetLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#E2F0CB', 'City length', new DataView(buffer, offset, 1));
          const cityLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#FFB7B2', 'Zero', new DataView(buffer, offset, 1), 0);
          offset += 1;

          yield* yieldU8('#E2F0CB', 'Country length', new DataView(buffer, offset, 1));
          const countryLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#FFDAC1', 'Zip length', new DataView(buffer, offset, 1));
          const zipLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#E2F0CB', 'Phone length', new DataView(buffer, offset, 1));
          const phoneLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldU8('#FFB7B2', 'Zero', new DataView(buffer, offset, 1), 0);
          offset += 1;

          yield* yieldU8('#E2F0CB', 'Email length', new DataView(buffer, offset, 1));
          const emailLength = (((new DataView(buffer, offset, 1).getUint8())) - 13) / 2;
          offset += 1;

          yield* yieldBlob('white', 1, 'Uknown 4', new DataView(buffer, offset, 1));
          const unknowns2 = new Uint8Array(buffer, offset, 1);
          offset += 1;

          const firstName = String.fromCharCode(...new Uint8Array(buffer, offset, firstNameLength));
          yield* yieldString('#FFB7B2', firstName, 'First name', new DataView(buffer, offset, firstNameLength));
          offset += firstNameLength;

          const lastName = String.fromCharCode(...new Uint8Array(buffer, offset, lastNameLength));
          yield* yieldString('#B5EAD7', lastName, 'Last name', new DataView(buffer, offset, lastNameLength));
          offset += lastNameLength;

          const street = String.fromCharCode(...new Uint8Array(buffer, offset, streetLength));
          yield* yieldString('#FFB7B2', street, 'Street', new DataView(buffer, offset, streetLength));
          offset += streetLength;

          const city = String.fromCharCode(...new Uint8Array(buffer, offset, cityLength));
          yield* yieldString('#B5EAD7', city, 'City', new DataView(buffer, offset, cityLength));
          offset += cityLength;

          const country = String.fromCharCode(...new Uint8Array(buffer, offset, countryLength));
          yield* yieldString('#FFB7B2', country, 'Country', new DataView(buffer, offset, countryLength));
          offset += countryLength;

          const zip = String.fromCharCode(...new Uint8Array(buffer, offset, zipLength));
          yield* yieldString('#FFB7B2', zip, 'Zip', new DataView(buffer, offset, zipLength));
          offset += zipLength;

          const phone = String.fromCharCode(...new Uint8Array(buffer, offset, phoneLength));
          yield* yieldString('#FFB7B2', phone, 'Phone', new DataView(buffer, offset, phoneLength));
          offset += phoneLength;

          const email = String.fromCharCode(...new Uint8Array(buffer, offset, emailLength));
          yield* yieldString('#FFB7B2', email, 'Email', new DataView(buffer, offset, emailLength));
          offset += emailLength;

          console.log({ firstName, lastName, street, city, country, zip, phone, email });
        }

        const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
        yield* yieldBlob('#B5EAD7', zeroCount, 'Unallocated area', new DataView(buffer, offset, zeroCount));
        offset += zeroCount;
      } else {
        const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
        yield* yieldBlob('#B5EAD7', zeroCount, 'Unallocated area', new DataView(buffer, offset, zeroCount));
        offset += zeroCount;
      }

      for (let index = 0; index < cellCount; index++) {
        yield* yieldU32('#E2F0CB', `Page number left child pointer ${index + 1}/${cellCount}`, new DataView(buffer, offset, 4));

        const keyVarint = new VarInt(new DataView(buffer, offset += 4, 9));
        yield* yieldBlob('#FFDAC1', keyVarint.byteLength, `Key varint (${keyVarint.value})`, new DataView(buffer, offset, keyVarint.byteLength));

        offset += keyVarint.byteLength;
        if (index < cellCount - 1 && offset - pageDataView.byteOffset !== cellOffsets[index + 1]) {
          throw new Error('Varint leaked into the next cell');
        }
      }

      break;
    }
    case 0xa: {
      // TODO: Parse the page
      break;
    }
    // TODO: Do the overflow list page number u32
    case 0xd: {
      const cellOffsets = [];
      for (let index = 0; index < cellCount; index++) {
        yield* yieldU16(index % 2 === 0 ? '#FF9AA2' : '#C7CEEA', `Cell pointer ${index + 1}/${cellCount}`, new DataView(buffer, offset += index === 0 ? 0 : 2, 2));
        cellOffsets.push(pageDataView.getUint16(offset - pageDataView.byteOffset));
      }

      // TODO: Find out why this is only on certain pages and what's the real condition under which this happens
      if (cellOffsets[0] > cellOffsets[cellOffsets.length - 1]) {
        cellOffsets.reverse();
      }

      offset += 2;

      const zeroCount = cellContentArea - (offset - pageDataView.byteOffset);
      yield* yieldBlob('#B5EAD7', zeroCount, 'Unallocated area', new DataView(buffer, offset, zeroCount));
      offset += zeroCount;

      for (let index = 0; index < cellCount; index++) {
        const payloadLengthVarint = new VarInt(new DataView(buffer, offset, 9));
        yield* yieldBlob('#E2F0CB', payloadLengthVarint.byteLength, `Payload length varint (${payloadLengthVarint.value})`, new DataView(buffer, offset, payloadLengthVarint.byteLength));

        const rowidVarint = new VarInt(new DataView(buffer, offset += payloadLengthVarint.byteLength, 9));
        yield* yieldBlob('#FFDAC1', rowidVarint.byteLength, `Row ID varint (${rowidVarint.value})`, new DataView(buffer, offset, rowidVarint.byteLength));

        const serialTypesLengthVarint = new VarInt(new DataView(buffer, offset += rowidVarint.byteLength, 9));
        yield* yieldBlob('#FFB7B2', serialTypesLengthVarint.byteLength, `Serial types varint (${serialTypesLengthVarint.value})`, new DataView(buffer, offset, serialTypesLengthVarint.byteLength));
        offset += serialTypesLengthVarint.byteLength;

        const serialTypeVarints = [];
        const serialTypesEndOffset = offset + serialTypesLengthVarint.value - serialTypesLengthVarint.byteLength;

        let color = '#FF9AA2';
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

          yield* yieldBlob(color, serialTypeVarint.byteLength, `serial type ${type} varint (${serialTypeVarint.value})`, new DataView(buffer, offset, serialTypeVarint.byteLength));
          color = color === '#FF9AA2' ? '#C7CEEA' : '#FF9AA2';
        }

        if (offset !== serialTypesEndOffset) {
          throw new Error('Serial type varints leaked');
        }

        color = '#B5EAD7';
        for (const serialTypeVarint of serialTypeVarints) {
          if (serialTypeVarint.value === 0) {
            // NULL
          } else if (serialTypeVarint.value === 1) {
            yield* yieldU8(color, `u8 payload item`, new DataView(buffer, offset, 1));
            offset += 1;
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
            yield* yieldBlob(color, length, `TEXT (${length}) payload item`, new DataView(buffer, offset, length));
            offset += length;
          } else if (serialTypeVarint.value >= 13 && serialTypeVarint.value % 2 === 1) {
            const length = (serialTypeVarint.value - 13) / 2;
            const value = String.fromCharCode(...new Uint8Array(buffer.slice(offset, offset + length)));
            yield* yieldString(color, value, `TEXT (${length}) payload item`, new DataView(buffer, offset, length));
            offset += length;
          } else {
            throw new Error('Unknown data type - cannot happen');
          }

          color = color === '#B5EAD7' ? '#E2F0CB' : '#B5EAD7';
        }

        if (index < cellCount - 1 && offset - pageDataView.byteOffset !== cellOffsets[index + 1]) {
          throw new Error(`Varint leaked into the next cell! Offset is ${offset} and the next cell offset is ${cellOffsets[index + 1]}`);
        }
      }

      break;
    }
  }
}
