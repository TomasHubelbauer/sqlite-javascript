window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();

  // Demonstrate dynamic page loading by offering only the header and using the
  // `slice` event, it would not be called if the whole `ArrayBuffer` was passed
  const dataView = new DataView(arrayBuffer, 0, 100);
  const sqlite = new Sqlite(dataView);
  sqlite.addEventListener('slice', event => event.resolve(new DataView(arrayBuffer, event.pageOffset, event.pageSize)));

  customElements.define('th-dataviewbox', DataViewBox);

  let pageIndex = 0;

  document.getElementById('prevButton').addEventListener('click', () => {
    if (pageIndex === 0) {
      return;
    }

    pageIndex--;
    render();
  });

  document.getElementById('nextButton').addEventListener('click', () => {
    if (pageIndex === sqlite.pageCount - 1) {
      return;
    }

    pageIndex++;
    render();
  });

  async function render() {
    document.getElementById('pageJsonPre').textContent = JSON.stringify(await sqlite.getPage(pageIndex));

    document.getElementById('pageDataViewBox').remove();
    const pageDataViewBox = document.createElement('th-dataviewbox');
    pageDataViewBox.id = 'pageDataViewBox';
    document.body.append(pageDataViewBox);

    document.getElementById('pageSpan').textContent = `${pageIndex + 1} / ${sqlite.pageCount}`;

    const dataView = new DataView(arrayBuffer, pageIndex * sqlite.pageSize, sqlite.pageSize);
    pageDataViewBox.styleSrc = 'https://tomashubelbauer.github.io/html-data-view-box/DataViewBox.css';
    pageDataViewBox.dataView = dataView;
  }

  render();
});
