class Sqlite extends EventTarget {
  constructor(/** @type{DataView} */ dataView) {
    super();
    this.dataView = dataView;

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

    // TODO: Load the schema to find table and column names and types
  }

  async getPage(/** @type{Number} */ pageIndex) {
    if (pageIndex < 0) {
      throw new Error('Page index must be greated than or equal to zero');
    }

    if (pageIndex > this.pageCount - 1) {
      throw new Error('Page index must less than the page count - 1');
    }

    // Do not fetch the header bytes if this is the first page
    const headerCarve = pageIndex === 0 ? 100 : 0;
    const pageOffset = pageIndex * this.pageSize + headerCarve;
    const pageSize = this.pageSize - headerCarve;

    let pageDataView;
    if (this.dataView.byteLength >= pageOffset + this.pageSize) {
      // Slice the existing `DataView` because it contains the range of this page
      pageDataView = new DataView(this.dataView.buffer, pageOffset, pageSize);
    } else {
      // Ask the user to provide the required range on top of the initial `DataView`
      pageDataView = await new Promise((resolve, reject) => {
        // TODO: See about using custom event with the fields
        const event = new Event('slice');
        event.pageOffset = pageOffset;
        event.pageSize = pageSize;
        event.resolve = resolve;
        event.reject = reject;
        this.dispatchEvent(event);
      });
    }

    const pageType = pageDataView.getUint8(0);
    switch (pageType) {
      case 0x2: return new InteriorIndexPage(pageDataView);
      case 0x5: return new InteriorTablePage(pageDataView);
      case 0xa: return new LeafIndexPage(pageDataView);
      case 0xd: return new LeafTablePage(pageDataView);
      default: throw new Error('Invalid page type ' + pageType);
    }
  }
}
