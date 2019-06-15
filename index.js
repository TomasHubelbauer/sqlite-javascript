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

  // TODO: Ensure the rest of the first page after the header are zero bytes

  const pages = [];
  for (let pageNumber = 1; pageNumber < pageCount; pageNumber++) {
    console.log('Page', pageNumber);
    const pageDataView = new DataView(arrayBuffer, pageNumber * pageSize, pageSize);
    const pageType = pageDataView.getUint8(0);
    switch (pageType) {
      case 0x2: printDebugPage(pageDataView); pages.push(new InteriorIndexPage(pageDataView)); break;
      case 0x5: printDebugPage(pageDataView); pages.push(new InteriorTablePage(pageDataView)); break;
      case 0xa: printDebugPage(pageDataView); pages.push(new LeafIndexPage(pageDataView)); break;
      case 0xd: pages.push(new LeafTablePage(pageDataView)); break;
      default: throw new Error('Invalid page type ' + pageType);
    }

    if (pageNumber === 22 /* First leaf index page */) {
      break;
    }
  }

  console.log('Done');
});

function printDebugPage(/** @type{DataView} */ dataView) {
  let line = '           |';

  // Print the header row
  for (let columnIndex = 0; columnIndex < 16; columnIndex++) {
    const columnDec = columnIndex;
    const columnHex = columnIndex.toString(16);
    line += ` ${pad(columnHex, 2)} (${pad(columnDec, 3)})    `;
  }

  console.log(line);
  console.log('-'.repeat(220));

  let text = '';

  // Print the data rows
  for (let rowIndex = 0; rowIndex < dataView.byteLength / 16; rowIndex++) {
    const rowDec = rowIndex * 16;
    const rowHex = rowDec.toString(16);
    line = `${pad(rowHex, 3)} (${pad(rowDec, 4)}) |`;

    for (let columnIndex = 0; columnIndex < 16; columnIndex++) {
      const dec = dataView.getUint8(rowIndex * 16 + columnIndex);
      const hex = dec.toString(16);
      const char = dec >= 32 && dec <= 126 ? String.fromCharCode(dec) : null;
      if (char !== null) {
        text += char;
      }
      line += ` ${pad(hex, 2)} (${pad(dec, 3)}) ${char !== null ? '"' + char + '"' : '   '}`;
    }

    console.log(line);
  }

  // Print the readable text only:
  console.log(text);
}

function pad(value, length) {
  return ' '.repeat(length - value.toString().length) + value.toString();
}
