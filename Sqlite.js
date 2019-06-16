class Sqlite {
  constructor(/** @type{DataView} */ dataView) {
    this.header = String.fromCharCode(...new Uint8Array(dataView.buffer).slice(0, 16));
    if (this.header !== 'SQLite format 3\0') {
      throw new Error('Invalid header');
    }

    this.pageSize = dataView.getUint16(16);
    this.writeVersion = dataView.getUint8(18); // 1 legacy, 2 WAL
    this.readVersion = dataView.getUint8(19); // 1 legacy, 2 WAL
    this.unusedBytes = dataView.getUint8(20);
    this.maximumPayloadFraction = dataView.getUint8(21);
    if (this.maximumPayloadFraction !== 64) {
      throw new Error('Maximum embedded payload fraction must be 64.');
    }

    this.minimumPayloadFraction = dataView.getUint8(22);
    if (this.minimumPayloadFraction !== 32) {
      throw new Error('Minimum embedded payload fraction must be 32.');
    }

    this.leafPayloadFraction = dataView.getUint8(23);
    if (this.leafPayloadFraction !== 32) {
      throw new Error('Leaf payload fraction must be 32.');
    }

    this.changeCount = dataView.getUint32(24);
    this.pageCount = dataView.getUint32(28);

    this.schemaCookie = dataView.getUint32(40);
    this.schemaFormat = dataView.getUint32(44);

    this.textEncoding = dataView.getUint32(56); // 1 UTF8, 2 UTF16le, 3 UTF16be
    if (this.textEncoding !== 1 && this.textEncoding !== 2 && this.textEncoding !== 3) {
      throw new Error('Invalid text encoding value');
    }

    this.userVersion = dataView.getUint32(60);
    this.vacuumMode = dataView.getUint32(64);
    this.applicationId = dataView.getUint32(68);

    this.reservedZero = new Uint8Array(dataView.buffer).slice(72, 72 + 20);
    if (this.reservedZero.find(zero => zero !== 0)) {
      throw new Error('The reseved section must be all zeroes.');
    }

    this.sqliteVersion = dataView.getUint32(96); // https://www.sqlite.org/c3ref/c_source_id.html

    // TODO: Ensure the rest of the first page after the header are zero bytes

    this.pages = [];
    for (let pageNumber = 1; pageNumber < (80 || this.pageCount); pageNumber++) {
      const pageDataView = new DataView(dataView.buffer, pageNumber * this.pageSize, this.pageSize);
      const pageType = pageDataView.getUint8(0);
      switch (pageType) {
        case 0x2: this.pages.push(new InteriorIndexPage(pageDataView)); break;
        case 0x5: this.pages.push(new InteriorTablePage(pageDataView)); break;
        case 0xa: this.pages.push(new LeafIndexPage(pageDataView)); break;
        case 0xd: this.pages.push(new LeafTablePage(pageDataView)); break;
        default: throw new Error('Invalid page type ' + pageType);
      }
    }

    // Load the schema from the first page
    const page1 = this.pages[1];
    console.log(page1.pageType.toString(16), page1.rightMostPointer);
    // const page2 = this.pages[page1.rightMostPointer + 1];
    // console.log(page2);

    console.log(page1.cells);


    // debugDataView(pageDataView); 
  }
}
