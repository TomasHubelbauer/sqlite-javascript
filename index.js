import Sqlite from './Sqlite.js';
import constructGraph from './constructGraph.js';
import renderPageView from './renderPageView.js';

window.addEventListener('load', async () => {
  let fileName;
  let arrayBuffer;
  let dataView;
  let sqlite;
  let selectedTable;
  const pageSize = 25;
  let selectedPage = 0;

  const loadLocalButton = document.getElementById('loadLocalButton');
  loadLocalButton.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.addEventListener('change', async () => {
      if (fileInput.files.length === 0) {
        return;
      }

      const file = fileInput.files[0];
      fileName = file.name;

      const fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.addEventListener('load', () => {
        arrayBuffer = fileReader.result;
        dataView = new DataView(arrayBuffer);
        sqlite = new Sqlite(dataView);
        selectedTable = sqlite.getTables().next().value;
        refreshView();
      });

      fileReader.addEventListener('error', () => {
        alert('Failed to read the file');
      });
    });

    fileInput.click();
  });

  const loadRemoteButton = document.getElementById('loadRemoteButton');
  loadRemoteButton.addEventListener('click', async () => {
    const url = prompt('URL:', 'Chinook_Sqlite.sqlite');
    if (!url) {
      return;
    }

    fileName = url;
    const response = await fetch(url);
    arrayBuffer = await response.arrayBuffer();
    dataView = new DataView(arrayBuffer);
    sqlite = new Sqlite(dataView);
    selectedTable = sqlite.getTables().next().value;
    refreshView();
  });

  const databaseViewInput = document.getElementById('databaseViewInput');
  databaseViewInput.addEventListener('change', handleViewInputChange);

  const pageViewInput = document.getElementById('pageViewInput');
  pageViewInput.addEventListener('change', handleViewInputChange);

  const graphViewInput = document.getElementById('graphViewInput');
  graphViewInput.addEventListener('change', handleViewInputChange);

  function handleViewInputChange(event) {
    const isDatabaseView = event.currentTarget.id === 'databaseViewInput';
    document.getElementById('databaseViewDiv').classList.toggle('selectedView', isDatabaseView);
    if (isDatabaseView) {
      renderDatabaseView();
    }

    const isPageView = event.currentTarget.id === 'pageViewInput';
    document.getElementById('pageViewDiv').classList.toggle('selectedView', isPageView);
    if (isPageView) {
      renderPageView(arrayBuffer);
    }

    const isGraphView = event.currentTarget.id === 'graphViewInput';
    document.getElementById('graphViewDiv').classList.toggle('selectedView', isGraphView);
    if (isGraphView) {
      renderGraphView();
    }
  }

  function refreshView() {
    document.querySelector('input[type=radio]:checked').dispatchEvent(new Event('change'));
  }

  // Dispatch a change event for the tab the browser remembered was selected last
  refreshView();


  function renderDatabaseView() {
    if (!sqlite) {
      return;
    }

    const tablesDiv = document.getElementById('tablesDiv');
    tablesDiv.innerHTML = '';

    const databaseSpan = document.createElement('span');
    databaseSpan.textContent = fileName;
    tablesDiv.append(databaseSpan);

    for (const table of sqlite.getTables()) {
      const tableButton = document.createElement('button');
      tableButton.textContent = table;
      tableButton.dataset.tableName = table;
      tableButton.className = selectedTable === table ? 'selected item' : 'item';
      tableButton.addEventListener('click', handleSelectTableButtonClick)
      tablesDiv.append(tableButton);
    }

    const itemsDiv = document.getElementById('itemsDiv');
    itemsDiv.innerHTML = '';

    const rows = [...sqlite.getRows(selectedTable)];
    const pages = Math.ceil(rows.length / pageSize);

    const pagerDiv = document.createElement('div');

    if (rows.length > 0) {
      const prevButton = document.createElement('button');
      prevButton.textContent = '<';
      prevButton.disabled = selectedPage === 0;
      prevButton.addEventListener('click', handlePrevButtonClick);
      pagerDiv.append(prevButton);

      const nextButton = document.createElement('button');
      nextButton.textContent = '>';
      nextButton.disabled = selectedPage === pages - 1;
      nextButton.addEventListener('click', handleNextButtonClick);
      pagerDiv.append(nextButton);
    }

    if (rows.length === 0) {
      pagerDiv.append(' The table is empty.');
    } else {
      pagerDiv.append(` Page #${selectedPage + 1} out of ${pages} pages (of ${pageSize} items each). ${rows.length} items total.`);
    }

    itemsDiv.append(pagerDiv);

    const table = document.createElement('table');

    const thead = document.createElement('thead');
    table.append(thead);

    let tr = document.createElement('tr');
    thead.append(tr);

    let th = document.createElement('th');
    th.textContent = 'Row ID';
    tr.append(th);

    const columns = [...sqlite.getColumns(selectedTable)];
    for (const column of columns) {
      th = document.createElement('th');
      th.textContent = column.name;
      th.title = column.type;
      tr.append(th);
    }

    th = document.createElement('th');
    th.textContent = 'Page #';
    tr.append(th);

    const tbody = document.createElement('tbody');
    table.append(tbody);

    const page = rows.slice(selectedPage * pageSize, selectedPage * pageSize + pageSize);
    for (const row of page) {
      tr = document.createElement('tr');
      tbody.append(tr);

      // Note that 0 is the RowID preudo-cell
      tr.id = row[0];

      for (let index = 0; index < row.length; index++) {
        const cell = row[index];

        const column = index > 0 && columns[index - 1];
        if (cell && column && column.name.endsWith('Id')) {
          const td = document.createElement('td');

          const referenceButton = document.createElement('button');
          referenceButton.textContent = cell;
          referenceButton.dataset.tableName = column.name.substring(0, column.name.length - 2);
          referenceButton.dataset.rowId = cell;
          referenceButton.addEventListener('click', handleNavigateToReferenceButtonClick);
          td.append(referenceButton);

          tr.append(td);
        } else {
          const td = document.createElement('td');
          if (cell instanceof ArrayBuffer) {
            const downloadA = document.createElement('a');
            downloadA.download = `${selectedTable}-${row[0]}.bin`;
            downloadA.href = URL.createObjectURL(new Blob([new Uint8Array(cell)]));
            downloadA.textContent = `BLOB of ${cell.byteLength} bytes (maybe overflow)`;
            td.append(downloadA);
          } else {
            td.textContent = cell;
          }

          tr.append(td);
        }
      }
    }

    itemsDiv.append(table);
  }

  function handleSelectTableButtonClick(event) {
    selectedTable = event.currentTarget.dataset.tableName;
    selectedPage = 0;
    refreshView();
  }

  function handleNavigateToReferenceButtonClick(event) {
    selectedTable = event.currentTarget.dataset.tableName;
    selectedPage = 0;
    refreshView();
  }

  function handlePrevButtonClick() {
    if (selectedPage === 0) {
      return;
    }

    selectedPage--;
    refreshView();
  }

  function handleNextButtonClick() {
    const rows = [...sqlite.getRows(selectedTable)];
    const pages = Math.ceil(rows.length / pageSize);
    if (selectedPage === pages - 1) {
      return;
    }

    selectedPage++;
    refreshView();
  }

  function renderGraphView() {
    if (!dataView) {
      return;
    }

    const pageCount = dataView.getUint32(28);
    const pageLimit = 100; // Number(prompt('The database has ' + pageCount + ' pages. A large number of pages can result in a slow down. Enter the amount you want to graph:', pageCount)) || 0;
    const nodes = Array(pageLimit).fill(null).map((_, index) => ({ data: { id: index + 1, name: index + 1 } }));
    const edges = [...constructGraph(dataView, pageLimit)].filter(edge => edge.source <= pageLimit && edge.target <= pageLimit).map(edge => ({ data: edge }));

    document.getElementById('graphViewDiv').innerHTML = '';

    // Cytoscape is included using a`script` tag in `index.html`
    window.cytoscape({
      container: document.getElementById('graphViewDiv'),
      style: [
        { selector: 'node', style: { label: 'data(name)' } },
        { selector: 'edge', style: { label: 'data(relationship)' } },
      ],
      layout: { name: 'cose' },
      elements: { nodes, edges }
    });
  }
});
