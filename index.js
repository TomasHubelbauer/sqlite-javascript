window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  const sqlite = new Sqlite(dataView);

  for (let databaseTable of sqlite.tables) {
    const table = document.createElement('table');

    const caption = document.createElement('caption');
    caption.textContent = databaseTable.name;
    table.append(caption);

    const thead = document.createElement('thead');
    table.append(thead);

    let tr = document.createElement('tr');
    thead.append(tr);
    for (const column of databaseTable.columns) {
      const th = document.createElement('th');
      th.textContent = column.name;
      th.title = column.type;
      tr.append(th);
    }

    const tbody = document.createElement('tbody');
    table.append(tbody);

    document.body.append(table);
  }
});
