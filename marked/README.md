# SQLite Marked

In this sub-project I am working on an application which reads a SQLite database
and renders a binary view of the given page's contents with each cell marked with
details such as what value it represents.

Note that the Chinook database has been copied over here instead of being fetched
from one directory up because CORS kick in even on Firefox when using path traversal
components in `fetch` URL on `file` protocol.

I like to be able to run the file directory so in order to avoid having to run a
server, I just copied over the file.

## To-Do

- Display a side bar or something with the cell's links clickable to those pages
- Adjust the `DataViewBox` cell sizes to accomodate numbers of 3 digits (hex, dec, ASCII)
- Add a title which describes purpose and a background which highlights logical
  group membership to each `DataViewBox` byte cell for visual debugging and
  inspection of the database pages
- Change `details` to not be per-byte but instead slices which are then visually grouped
- Change the layout to be column based not row based so that the line number column can
  be automatically sized and columns can also have header cells
- Consider making `DataViewBox` a table maybe also
