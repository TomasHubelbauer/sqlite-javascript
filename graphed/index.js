window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  const pageCount = dataView.getUint32(28);

  const nodes = Array(pageCount).fill(null).map((_, index) => ({ data: { id: index + 1, name: index + 1 } }))
  const edges = [...constructGraph(dataView)].map(edge => ({ data: edge }));

  // Cytoscape is included using a `script` tag in `index.html`
  const cytoscape = window.cytoscape({
    container: document.getElementById('graphDiv'),
    style: [
      { selector: 'node', style: { label: 'data(name)' } },
      { selector: 'edge', style: { label: 'data(relationship)' } },
    ],
    layout: { name: document.getElementById('layoutSelect').value },
    elements: { nodes, edges }
  });

  document.getElementById('layoutSelect').addEventListener('change', event => {
    cytoscape.layout({ name: event.currentTarget.value }).run();
  });
});
