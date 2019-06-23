class Sqlite {
  constructor(/** @type{DataView} */ dataView) {
    this.dataView = dataView;

    // Note that this is ASCII so `fromCharCode` will work by itself
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

    if (this.textEncoding !== 1) {
      throw new Error('Non-UTF8 databases are not supported yet');
    }

    this.userVersion = dataView.getUint32(60);
    this.vacuumMode = dataView.getUint32(64);
    this.applicationId = dataView.getUint32(68);

    this.reservedZero = new Uint8Array(dataView.buffer).slice(72, 72 + 20);
    if (this.reservedZero.find(zero => zero !== 0)) {
      throw new Error('The reseved section must be all zeroes.');
    }

    this.sqliteVersion = dataView.getUint32(96); // https://www.sqlite.org/c3ref/c_source_id.html
  }

  *getTables() {
    const rootPage = this.getPage(1);
    if (rootPage.pageType !== 0x5) {
      throw new Error('The root page must be an interior table page');
    }

    for (let cell of rootPage.cells) {
      const cellPage = this.getPage(cell.leftChildPointer);
      if (cellPage.pageType !== 0xd) {
        throw new Error('The cell page must be a leaf table page');
      }

      for (const cell of cellPage.cells) {
        if (cell.payload.length !== 5) {
          throw new Error('Master table must have five columns');
        }

        const [type, name] = cell.payload;
        if (type === 'table') {
          yield name;
        }
      }
    }
  }

  *getColumns(tableName) {
    const rootPage = this.getPage(1);
    if (rootPage.pageType !== 0x5) {
      throw new Error('The root page must be an interior table page');
    }

    let tableSql;
    for (let cell of rootPage.cells) {
      const cellPage = this.getPage(cell.leftChildPointer);
      if (cellPage.pageType !== 0xd) {
        throw new Error('The cell page must be a leaf table page');
      }

      for (const cell of cellPage.cells) {
        if (cell.payload.length !== 5) {
          throw new Error('Master table must have five columns');
        }

        const [type, name, _, __, sql] = cell.payload;
        if (type === 'table' && name === tableName) {
          tableSql = sql;
          break;
        }
      }

      // Stop looking at more pages once this cell's one contained the table
      if (tableSql) {
        break;
      }
    }

    if (tableSql === undefined) {
      throw new Error('Table not found');
    }

    if (!tableSql.startsWith('CREATE TABLE [')) {
      throw new Error();
    }

    tableSql = tableSql.substring('CREATE TABLE ['.length);
    let index = tableSql.indexOf(']');
    const checkName = tableSql.substring(0, index);
    if (checkName !== tableName) {
      throw new Error();
    }

    tableSql = tableSql.substring(index + ']\n'.length);
    if (!tableSql.startsWith('(') || !tableSql.endsWith(')')) {
      throw new Error();
    }

    const columnsSqls = tableSql.substring(1, tableSql.length - 2);
    const columnsRegex = /^\s+\[(\w+)\] (\w+(\((\d+)(,\d+)?\))?)/gm;
    let match;
    while ((match = columnsRegex.exec(columnsSqls)) !== null) {
      const [_, columnName, columnType] = match;
      yield { name: columnName, type: columnType };
    }
  }

  *getRows(tableName) {
    const rootPage = this.getPage(1);
    if (rootPage.pageType !== 0x5) {
      throw new Error('The root page must be an interior table page');
    }

    let tableRootPageNumber;
    for (let cell of rootPage.cells) {
      const cellPage = this.getPage(cell.leftChildPointer);
      if (cellPage.pageType !== 0xd) {
        throw new Error('The cell page must be a leaf table page');
      }

      for (const cell of cellPage.cells) {
        if (cell.payload.length !== 5) {
          throw new Error('Master table must have five columns');
        }

        const [type, name, _, rootPageNumber] = cell.payload;
        if (type === 'table' && name === tableName) {
          tableRootPageNumber = rootPageNumber;
          break;
        }
      }

      // Stop looking at more pages once this cell's one contained the table
      if (tableRootPageNumber) {
        break;
      }
    }

    if (tableRootPageNumber === undefined) {
      throw new Error('Table not found');
    }

    const tableRootPage = this.getPage(tableRootPageNumber);
    switch (tableRootPage.pageType) {
      case 0x2: {
        throw new Error('Table root page must not be an interior index page');
      }
      case 0x5: {
        // TODO: Make this recursive
        for (const cell of tableRootPage.cells) {
          const linkedPage = this.getPage(cell.leftChildPointer);
          if (linkedPage.pageType !== 0xd) {
            // TODO: Implement further descent
            break;
          }

          for (const cell2 of linkedPage.cells) {
            yield [cell2.rowId, ...cell2.payload];
          }
        }

        break;
      }
      case 0xa: {
        throw new Error('Table root page must not be a leaf index page');
      }
      case 0xd: {
        for (const cell of tableRootPage.cells) {
          yield [cell.rowId, ...cell.payload];
        }

        break;
      }
      default: throw new Error('Invalid page type');
    }
  }

  getPage(/** @type{Number} */ pageNumber) {
    if (pageNumber < 1) {
      throw new Error('Page number must be greated than or equal to one');
    }

    if (pageNumber > this.pageCount) {
      throw new Error('Page number must less than the page count');
    }

    const pageDataView = new DataView(this.dataView.buffer, (pageNumber - 1) * this.pageSize, this.pageSize);
    const pageType = pageDataView.getUint8(pageNumber === 1 ? 100 /* Skip the root page header */ : 0);
    switch (pageType) {
      case 0x2: return new InteriorIndexPage(pageDataView);
      case 0x5: return new InteriorTablePage(pageDataView);
      case 0xa: return new LeafIndexPage(pageDataView);
      case 0xd: return new LeafTablePage(pageDataView);
      default: throw new Error('Invalid page type ' + pageType);
    }
  }
}
