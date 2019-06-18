window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  const sqlite = new Sqlite(dataView);
  //console.log(sqlite);

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

  function render() {
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
