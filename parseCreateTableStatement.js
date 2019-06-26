function parseCreateTableStatement(sql, checkName) {
  let state = 'CREATE';

  // Keep buffers/state values for the key values
  let tableName = '';
  let tableNameQuoted = false;
  let columnName = '';
  let columnNameQuoted = false;
  let columnNames = [];
  let columnTypes = [];
  let columnConstraintName = '';

  let index = 0;
  let newlines = [];
  do {
    if (sql[index] === '\n') {
      newlines.push(index);
    }

    switch (state) {
      case 'CREATE': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          index++;
          break;
        }

        if (sql.substring(index, index + 'CREATE'.length) !== 'CREATE') {
          throw new Error(makeErrorMessage('CREATE', sql, index, newlines));
        }

        index += 'CREATE'.length;
        state = 'TABLE';
        break;
      }
      case 'TABLE': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          index++;
          break;
        }

        if (sql.substring(index, index + 'TABLE'.length) !== 'TABLE') {
          throw new Error(makeErrorMessage('TABLE', sql, index, newlines));
        }

        index += 'TABLE'.length;
        state = 'table-name';
        break;
      }
      case 'table-name': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          if (tableName === '') {
            index++;
            break;
          } else if (tableName !== checkName) {
            throw new Error(makeErrorMessage('table name ' + checkName, sql, index, newlines));
          } else {
            index++;
            state = 'columns-opening-parenthesis';
            break;
          }
        }

        if (sql[index] === '[') {
          if (tableNameQuoted) {
            throw new Error(makeErrorMessage('quoted table name or ]', sql, index, newlines));
          } else {
            tableNameQuoted = true;
            index++;
            break;
          }
        }

        if (sql[index] === ']') {
          if (tableNameQuoted) {
            if (tableName === '') {
              throw new Error(makeErrorMessage('quoted table name', sql, index, newlines));
            } else if (tableName !== checkName) {
              throw new Error(makeErrorMessage('table name ' + checkName, tableName, index, newlines));
            } else {
              index++;
              state = 'columns-opening-parenthesis';
              break;
            }
          } else {
            throw new Error(makeErrorMessage('unquoted table name', sql, index, newlines));
          }
        }

        if ((sql[index] < 'A' || sql[index] > 'Z') && (sql[index] < 'a' || sql[index] > 'z') && sql[index] !== '_') {
          throw new Error(makeErrorMessage('valid table name identifier character', sql, index, newlines));
        }

        tableName += sql[index];
        index++;
        break;
      }
      case 'columns-opening-parenthesis': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          index++;
          break;
        }

        if (sql[index] !== '(') {
          throw new Error(makeErrorMessage('(', sql, index, newlines));
        }

        state = 'column-name';
        index++;
      }
      case 'column-name': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          if (columnName === '') {
            index++;
            break;
          } else {
            index++;
            state = 'column-data-type';
            columnNames.push(columnName);
            columnName = '';
            columnNameQuoted = false;
            break;
          }
        }

        if (sql.substring(index, index + 'CONSTRAINT'.length) === 'CONSTRAINT') {
          index += 'CONSTRAINT'.length;
          state = 'column-constraint-name';
          break;
        }

        if (sql[index] === '[') {
          if (columnName) {
            throw new Error(makeErrorMessage('quoted column name or ]', sql, index, newlines));
          } else {
            columnNameQuoted = true;
            index++;
            break;
          }
        }

        if (sql[index] === ']') {
          if (columnNameQuoted) {
            if (columnName === '') {
              throw new Error(makeErrorMessage('quoted column name', sql, index, newlines));
            } else {
              index++;
              state = 'column-data-type';
              columnNames.push(columnName);
              columnName = '';
              columnNameQuoted = false;
              break;
            }
          } else {
            throw new Error(makeErrorMessage('unquoted column name', sql, index, newlines));
          }
        }

        if ((sql[index] < 'A' || sql[index] > 'Z') && (sql[index] < 'a' || sql[index] > 'z') && sql[index] !== '_') {
          throw new Error(makeErrorMessage('valid column name identifier character', sql, index, newlines));
        }

        columnName += sql[index];
        index++;
        break;
      }
      case 'column-data-type': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          index++;
          break;
        }

        if (sql.substring(index, index + 'TEXT'.length) === 'TEXT') {
          index += 'TEXT'.length;
          columnTypes.push('TEXT');
          state = 'column-constraints';
          break;
        }

        if (sql.substring(index, index + 'DATETIME'.length) === 'DATETIME') {
          index += 'DATETIME'.length;
          columnTypes.push('DATETIME');
          state = 'column-constraints';
          break;
        }

        if (sql.substring(index, index + 'DOUBLE'.length) === 'DOUBLE') {
          index += 'DOUBLE'.length;
          columnTypes.push('DOUBLE');
          state = 'column-constraints';
          break;
        }

        if (sql.substring(index, index + 'DOUBLE'.length) === 'DOUBLE') {
          index += 'DOUBLE'.length;
          columnTypes.push('DOUBLE');
          state = 'column-constraints';
          break;
        }

        if (sql.substring(index, index + 'INTEGER'.length) === 'INTEGER') {
          index += 'INTEGER'.length;
          columnTypes.push('INTEGER');
          state = 'column-constraints';
          break;
        }

        throw new Error(makeErrorMessage('TEXT, DATETIME, DOUBLE, INTEGER', sql, index, newlines));
      }
      case 'column-constraints': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          index++;
          break;
        }

        if (sql.substring(index, index + 'NOT NULL'.length) === 'NOT NULL') {
          index += 'NOT NULL'.length;
          break;
        }

        if (sql.substring(index, index + 'PRIMARY KEY'.length) === 'PRIMARY KEY') {
          index += 'PRIMARY KEY'.length;
          break;
        }

        if (sql.substring(index, index + 'UNIQUE'.length) === 'UNIQUE') {
          index += 'UNIQUE'.length;
          break;
        }

        if (sql.substring(index, index + 'DEFAULT'.length) === 'DEFAULT') {
          index += 'DEFAULT'.length;
          state = 'column-constraint-DEFAULT';
          break;
        }

        if (sql[index] === ',') {
          index++;
          state = 'column-name';
          break;
        }

        if (sql[index] === ')') {
          state = 'columns-closing-parenthesis';
          break;
        }

        throw new Error(makeErrorMessage('NOT NULL, PRIMARY KEY, UNIQUE', sql, index, newlines));
      }
      case 'column-constraint-DEFAULT': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          index++;
          break;
        }

        if (sql.substring(index, index + '\'\''.length) === '\'\'') {
          index += '\'\''.length;
          state = 'column-constraints';
          break;
        }

        if (sql[index] === '(') {
          let parenthesisCount = 0;
          for (index; index < sql.length; index++) {
            if (sql[index] === '(') {
              parenthesisCount++;
            } else if (sql[index] === ')') {
              parenthesisCount--;
              if (parenthesisCount === 0) {
                break;
              }
            } else {
              // Ignore characters within parentheses, arguments…
            }
          }

          if (parenthesisCount !== 0) {
            throw new Error('Failed to match parentheses before running out of text: ' + parenthesisCount);
          }

          index++; // Last parenthesis
          state = 'column-constraints';
          break;
        }

        throw new Error(makeErrorMessage('empty quotes', sql, index, newlines));
      }
      case 'column-constraint-name': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          if (columnConstraintName === '') {
            index++;
            break;
          } else {
            index++;
            columnConstraintName = '';
            state = 'column-constraint-kind';
            break;
          }
        }

        if ((sql[index] < 'A' || sql[index] > 'Z') && (sql[index] < 'a' || sql[index] > 'z') && sql[index] !== '_') {
          throw new Error(makeErrorMessage('valid column constraing name identifier character', sql, index, newlines));
        }

        columnConstraintName += sql[index];
        index++;
        break;
      }
      case 'column-constraint-kind': {
        // Ignore leading whitespace
        if (sql[index] === ' ' || sql[index] === '\n' || sql[index] === '\t') {
          index++;
          break;
        }

        if (sql.substring(index, index + 'FOREIGN KEY'.length) === 'FOREIGN KEY') {
          index += 'FOREIGN KEY'.length;

          const referencesIndex = sql.indexOf('REFERENCES', index);
          if (referencesIndex === -1) {
            throw new Error('FOREIGN KEY is not followed by REFERENCES');
          }

          const foreignKeyColumnName = sql.substring(index, referencesIndex).trim();
          if (foreignKeyColumnName[0] !== '(' || foreignKeyColumnName[foreignKeyColumnName.length - 1] !== ')') {
            throw new Error('The foreign key column name is not in parentheses.');
          }

          if (!/\w+/.test(foreignKeyColumnName)) {
            throw new Error('Foreign key column name is not a valid identifier.');
          }

          index = referencesIndex + 'REFERENCES'.length;

          const openingParenthesisIndex = sql.indexOf('(', index);
          if (openingParenthesisIndex === -1) {
            throw new Error('FOREIGN KEY REFERENCES is not followed by an opening parenthesis');
          }

          const referencesTableName = sql.substring(index, openingParenthesisIndex).trim();
          if (!/\w+/.test(referencesTableName)) {
            throw new Error('Foreign key referenced table name is not a valid identifier.');
          }

          index = openingParenthesisIndex + '('.length;

          const closingParenthesisIndex = sql.indexOf(')', index);
          if (closingParenthesisIndex === -1) {
            throw new Error('FOREIGN KEY REFERENCES ( is not followed by a closing parenthesis');
          }

          const referencesColumnName = sql.substring(index, closingParenthesisIndex);
          if (!/\w+/.test(referencesColumnName)) {
            throw new Error('Foreign key referenced column name is not a valid identifier.');
          }

          index = closingParenthesisIndex + ')'.length;

          state = 'column-constraints';
          break;
        }

        throw new Error(makeErrorMessage('FOREIGN KEY', sql, index, newlines));
      }
      case 'columns-closing-parenthesis': {
        if (sql[index] !== ')') {
          throw new Error(makeErrorMessage(')', sql, index, newlines));
        }

        index++;
        if (index !== sql.length) {
          throw new Error('The CREATE TABLE statement did not end after columns parenthesis!');
        }

        break;
      }
      default: {
        throw new Error('Invalid state ' + state);
      }
    }
  } while (index < sql.length);

  if (columnNames.length !== columnTypes.length) {
    throw new Error(`Have ${columnNames.length} column names but ${columnTypes.length} data types!`);
  }

  return columnNames.map((name, index) => ({ name, type: columnTypes[index] }));
}

function makeErrorMessage(expected, sql, index, newlines) {
  return `Expected "${expected}" but got "${sql.substring(index, index + expected.length)}" at position ${index} (line ${newlines.length}, character ${newlines.length > 0 ? (newlines[newlines.length - 1] - index) : index})`;
}
