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

  for (let pageNumber = 1; pageNumber < pageCount; pageNumber++) {
    const pageDataView = new DataView(arrayBuffer, pageNumber * pageSize);
    const pageType = pageDataView.getUint8(0);
    const firstFreeBlock = dataView.getUint16(1);
    const cellCount = dataView.getUint16(3);
    const cellContentArea = dataView.getUint16(5);
    const fragmentedFreeBytes = pageDataView.getUint8(7);
    const cellPointersOffset = pageType === 0x02 || pageType === 0x05 ? 12 : 8;
    for (let cellPointerIndex = 0; cellPointerIndex < cellCount; cellPointerIndex++) {
      const cellPointer = pageDataView.getUint16(cellPointersOffset + cellPointerIndex * 2);
      //console.log(cellPointer);

      // TODO: Continue https://www.sqlite.org/fileformat.html#b_tree_pages
    }

    switch (pageType) {
      case 0x02: {
        const rightMostPointer = pageDataView.getUint32(8);
        console.log('page #', pageNumber, 'is interior index b-tree page', firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes, rightMostPointer);
        break;
      }
      case 0x05: {
        const rightMostPointer = pageDataView.getUint32(8);
        console.log('page #', pageNumber, 'is interior table b-tree page', firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes, rightMostPointer);
        break;
      }
      case 0x0a: {
        console.log('page #', pageNumber, 'is leaf index b-tree page', firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes);
        break;
      }
      case 0x0d: {
        console.log('page #', pageNumber, 'is leaf table b-tree page', firstFreeBlock, cellCount, cellContentArea, fragmentedFreeBytes);
        break;
      }
      default: throw new Error('Invalid page type ' + pageType);
    }

    break;
  }
});
