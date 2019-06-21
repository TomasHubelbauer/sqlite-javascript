window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();

  // Demonstrate dynamic page loading by offering only the header and using the
  // `slice` event, it would not be called if the whole `ArrayBuffer` was passed
  const dataView = new DataView(arrayBuffer, 0, 100);
  const sqlite = new Sqlite(dataView);
  sqlite.addEventListener('slice', event => event.resolve(new DataView(arrayBuffer, event.pageOffset, event.pageSize)));

  customElements.define('th-dataviewbox', DataViewBox);

  let pageIndex = Number(localStorage['page-index'] || '0');

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
    localStorage.setItem('page-index', pageIndex);

    document.getElementById('pageJsonPre').textContent = JSON.stringify(await sqlite.getPage(pageIndex));

    document.getElementById('pageDataViewBox').remove();
    const pageDataViewBox = document.createElement('th-dataviewbox');
    pageDataViewBox.id = 'pageDataViewBox';
    pageDataViewBox.setAttribute('no-virtualization', 'yes');
    document.body.append(pageDataViewBox);

    document.getElementById('pageSpan').textContent = `${pageIndex + 1} / ${sqlite.pageCount}`;

    const dataView = new DataView(arrayBuffer, pageIndex * sqlite.pageSize, sqlite.pageSize);
    const details = [...parsePage(dataView, pageIndex)];

    pageDataViewBox.styleSrc = 'https://tomashubelbauer.github.io/html-data-view-box/DataViewBox.css';
    pageDataViewBox.details = details;
    pageDataViewBox.dataView = dataView;

    pageDataViewBox.addEventListener('hover', event => {
      document.title = event.relativeOffset + '/' + event.absoluteOffset;
      document.getElementById('detailsDiv').textContent = event.relativeOffset + '/' + event.absoluteOffset;
      document.getElementById('detailsDiv').style.background = 'none';

      if (event.details) {
        document.title += ': ' + event.details.title;
        document.getElementById('detailsDiv').textContent += ': ' + event.details.title;
        document.getElementById('detailsDiv').style.background = event.details.color;
      }
    });
  }

  render();
});
