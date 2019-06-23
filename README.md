# SQLite JavaScript

[**DEMO**](https://tomashubelbauer.github.io/sqlite-javascript)

> A JavaScript SQLite database file reader

- Fix the case when the record misses some cells (alter table?) and so has less
  cells than the table has columns - they should get default values but what if
  one is missing in the middle?
- Load information about a column being a key to a different table and make the
  value a link based on that instead of the current heuristic
- Implement recursively traversing pages until reaching the leaf
- Coerce the ID column (identifier by a constraint) into the row ID fallback value
- Ensure all rows are read after implementing recursive read
- Finalize `constructGraph` for all page types
- Figure out the problem on pages 37, 43, 948 with cell pointer being zero - overflow?
- figure out the problem on pages 39, 42, 948 with cell pointer being > page count - overflow?
- Finalize page types 2 and 10 and run all pages through `parsePage` for errors
- Finalize the `TODO`s in `parsePage` in the serial type prints
- Consider returning the flow of requesting pages using an `EventTarget` event
  if the `DataView` doesn't contain the page range so that when opening by a URL
  we could read just the first (few) page(s) (depending on how big the file is
  as per the Content-Length header) and range-request the rest if range supported
- Add a `pages` getter which returns an array proxy which does `getPage` on indexer access
- Add a title which describes purpose and a background which highlights logical
  group membership to each `DataViewBox` byte cell for visual debugging and
  inspection of the database pages
- Adjust the `DataViewBox` cell sizes to accomodate numbers of 3 digits
- Introduce a new class `Record` which is fed a `DataView` and reads the serial
  types and the payload into an API
- Replace `FileReader.readAsArrayBuffer` with `Blob.arrayBuffer` when supported
