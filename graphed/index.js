window.addEventListener('load', async () => {
  const response = await fetch('Chinook_Sqlite.sqlite');
  const arrayBuffer = await response.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  const pageSize = dataView.getUint16(16);
  const pageCount = dataView.getUint32(28);

  // Cytoscape is included using a `script` tag in `index.html`
  const cytoscape = window.cytoscape({
    container: document.body,
    style: [
      { selector: 'node', style: { label: 'data(name)' } },
    ]
  });

  const pendingEdges = {};

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageOffset = pageIndex * pageSize || 100 /* Skip header on 1st page (offset zero) */;
    const pageNumber = pageIndex + 1;
    document.title = pageNumber + '/' + pageCount;
    const pageType = dataView.getUint8(pageOffset);
    switch (pageType) {
      case 0x2: {
        cytoscape.add({ group: 'nodes', data: { id: pageNumber, name: 'interior index page ' + pageNumber } });
        const rightMostPointer = dataView.getUint32(pageOffset + 8);
        const edge = { group: 'edges', data: { id: pageNumber + 'rmp', name: 'right most pointer', source: pageNumber, target: rightMostPointer } };
        if (rightMostPointer < pageNumber) {
          cytoscape.add(edge);
        } else if (pendingEdges[rightMostPointer]) {
          throw new Error('Pending edge for target from a different source and not picked up yet');
        } else {
          pendingEdges[rightMostPointer] = edge;
        }

        break;
      }
      case 0x5: {
        cytoscape.add({ group: 'nodes', data: { id: pageNumber, name: 'interior table page ' + pageNumber } });
        const rightMostPointer = dataView.getUint32(pageOffset + 8);
        const edge = { group: 'edges', data: { id: pageNumber + 'rmp', name: 'right most pointer', source: pageNumber, target: rightMostPointer } };
        if (rightMostPointer < pageNumber) {
          cytoscape.add(edge);
        } else if (pendingEdges[rightMostPointer]) {
          throw new Error('Pending edge for target from a different source and not picked up yet');
        } else {
          pendingEdges[rightMostPointer] = edge;
        }

        break;
      }
      case 0xa: {
        cytoscape.add({ group: 'nodes', data: { id: pageNumber, name: 'leaf index page ' + pageNumber } });
        break;
      }
      case 0xd: {
        cytoscape.add({ group: 'nodes', data: { id: pageNumber, name: 'leaf table page ' + pageNumber } });
        break;
      }
      default: {
        throw new Error(`Invalid page type ${pageType}!`);
      }
    }

    if (pendingEdges[pageNumber]) {
      cytoscape.add(pendingEdges[pageNumber]);
      delete pendingEdges[pageNumber];
    }

    cytoscape.layout({ name: 'circle' }).run();

    // Queue the rest of the work up so that the browser has time to render
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  if (Object.keys(pendingEdges).length !== 0) {
    throw new Error('Some pending edges were not picked up');
  }
});
