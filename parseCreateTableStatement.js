function parseCreateTableStatement(sql, checkName) {
  let state = 'CREATE: C';
  let buffer = '';
  let parenthesesPairings = 0;
  let columnNames = [];
  let columnTypes = [];

  let line = 0;
  let column = -1;
  for (let index = 0; index < sql.length; index++) {
    const character = sql[index];
    let bail = false;

    column++;
    if (character === '\n') {
      line++;
      column = -1;
    }

    switch (state) {
      case 'CREATE: C':
        if (character !== 'C') {
          reportParserError(index, character, state, `Expected C in CREATE`);
          break;
        }

        state = 'CREATE: R';
        break;
      case 'CREATE: R':
        if (character !== 'R') {
          throw new Error(`Expected R in CREATE at ${line}/${column} but got ${character}.`);
        }

        state = 'CREATE: E1';
        break;
      case 'CREATE: E1':
        if (character !== 'E') {
          throw new Error(`Expected E1 in CREATE at ${line}/${column} but got ${character}.`);
        }

        state = 'CREATE: A';
        break;
      case 'CREATE: A':
        if (character !== 'A') {
          throw new Error(`Expected A in CREATE at ${line}/${column} but got ${character}.`);
        }

        state = 'CREATE: T';
        break;
      case 'CREATE: T':
        if (character !== 'T') {
          throw new Error(`Expected T in CREATE at ${line}/${column} but got ${character}.`);
        }

        state = 'CREATE: E2';
        break;
      case 'CREATE: E2':
        if (character !== 'E') {
          throw new Error(`Expected E2 in CREATE at ${line}/${column} but got ${character}.`);
        }

        state = 'TABLE: T';
        break;
      case 'TABLE: T':
        if (character === ' ' || character === '\n') break;
        if (character !== 'T') throw new Error('Expected T in TABLE at ' + index); state = 'TABLE: A';
        break;
      case 'TABLE: A': if (character !== 'A') throw new Error('Expected A in TABLE at ' + index); state = 'TABLE: B'; break;
      case 'TABLE: B': if (character !== 'B') throw new Error('Expected B in TABLE at ' + index); state = 'TABLE: L'; break;
      case 'TABLE: L': if (character !== 'L') throw new Error('Expected L in TABLE at ' + index); state = 'TABLE: E'; break;
      case 'TABLE: E': if (character !== 'E') throw new Error('Expected E in TABLE at ' + index); state = 'table-name'; break;
      case 'table-name':
        if (character === ' ' || character === '\n') break;
        if (character === '[') { state = 'quoted-table-name'; break; }
        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z')) throw new Error(`Expected a letter at ` + index);
        buffer += character;
        state = 'unquoted-table-name';
        break;
      case 'unquoted-table-name':
        if (character === ' ' || character === '\n') {
          state = 'opening-parenthesis';
          if (buffer !== checkName) {
            throw new Error(`Mismatch in names ${buffer} and ${checkName}`);
          }

          buffer = '';
          break;
        }

        if (character === '(') { state = 'column-name'; break; }
        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z') && character !== '_') {
          throw new Error(`Expected a letter at ` + index);
        }

        buffer += character;
        break;
      case 'quoted-table-name':
        if (character === ']') {
          state = 'opening-parenthesis';
          if (buffer !== checkName) {
            throw new Error(`Mismatch in names ${buffer} and ${checkName}`);
          }

          buffer = '';
          break;
        }

        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z')) throw new Error(`Expected a letter at ` + index);
        buffer += character;
        break;
      case 'opening-parenthesis':
        if (character === ' ' || character === '\n') break;
        if (character === '(') { state = 'column-name'; break; }
        throw new Error('Expected opening parenthesis at ' + index);
      case 'column-name':
        if (character === 'C' && sql.substring(index, index + 'CONSTRAINT'.length) === 'CONSTRAINT') {
          bail = true;
          break;
        }

        if (character === ' ' || character === '\n') break;
        if (character === '[') { state = 'quoted-column-name'; break; }
        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z')) {
          throw new Error(`Expected a letter at ` + index);
        }

        buffer += character;
        state = 'unquoted-column-name';
        break;
      case 'quoted-column-name':
        if (character === ']') {
          state = 'data-type';
          columnNames.push(buffer);
          buffer = '';
          break;
        }

        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z')) throw new Error(`Expected a letter at ` + index);
        buffer += character;
        break;
      case 'unquoted-column-name':
        if (character === ' ') {
          state = 'data-type';
          columnNames.push(buffer);
          buffer = '';
          break;
        }

        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z') && character !== '_') {
          throw new Error(`Expected a letter at ${line}/${column} but got ${character}`);
        }

        buffer += character;
        break;
      case 'data-type':
        if (character === ' ' || character === '\n') break;
        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z')) {
          throw new Error(`Expected a letter at ${line}/${column} but got ${character}.`);
        }

        state = 'data-type-name';
        buffer += character;
        break;
      case 'data-type-name':
        if (character === '(') { state = 'data-type-range'; columnTypes.push(buffer); buffer = ''; break; }
        if (character === ' ') { state = 'data-type-comma'; columnTypes.push(buffer); buffer = ''; break; }
        if (character === ',') { state = 'column-name'; columnTypes.push(buffer); buffer = ''; break; }
        if (character === ')') { bail = true; columnTypes.push(buffer); buffer = ''; break; }
        if ((character < 'A' || character > 'Z') && (character < 'a' || character > 'z')) {
          throw new Error(`Expected a letter at ${line}/${column} but got ${character}`);
        }

        buffer += character;
        break;
      case 'data-type-comma':
        if (character === ',' && parenthesesPairings === 0) {
          state = 'column-name';
          break;
        }

        if (character === '(') {
          parenthesesPairings++;
          break;
        }

        if (character === ')') {
          parenthesesPairings++;
          break;
        }

        break;
      case 'data-type-range':
        if (character === ')') {
          state = 'data-type-comma';
          break;
        }
        if (character === ',') {
          break;
        }

        if (character < '0' || character > '9') {
          throw new Error(`Expected a number at ${line}/${column} but got ${character}.`);
        }

        break;

      default: throw new Error('Invalid state ' + state);
    }

    if (bail) {
      break;
    }
  }

  if (columnNames.length !== columnTypes.length) {
    throw new Error(`Have ${columnNames.length} column names but ${columnTypes.length} data types!`);
  }

  return columnNames.map((name, index) => ({ name, type: columnTypes[index] }));
}
