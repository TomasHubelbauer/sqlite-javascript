function debugDataView(/** @type{DataView} */ dataView) {
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
