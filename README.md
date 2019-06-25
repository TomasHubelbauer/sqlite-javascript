# SQLite JavaScript

[**DEMO**](https://tomashubelbauer.github.io/sqlite-javascript)

> A JavaScript SQLite database file reader

## To-Do

I am using [DB browser for SQLite](https://github.com/sqlitebrowser/sqlitebrowser)
to compare databases as read by this library and by the program.

- Debug this with the Prague `mbtiles` database:
  - Page 21 and many others have page type `0`
  - Fix reading the likely overflowing TEXT `json` column in the `metadata` table
  - Handle `length` being less than `payload` length (oerflow?) in the `gpkg_spatial_ref_sys` table
  - Missing columns in `gpkg_contents` due to SQL parser faults
  - `gpkg_spatial_ref_sys` is not loading any rows but should have 5
- Add `getIndices` (5 master page columns) and `getViews` (4 master page columns)
  and `getTriggers`
- Fix the case when the record misses some cells (alter table?) and so has less
  cells than the table has columns - they should get default values but what if
  one is missing in the middle?
- Load information about a column being a key to a different table and make the
  value a link based on that instead of the current heuristic
- Coerce the ID column (identifier by a constraint) into the row ID fallback value
- Finalize `constructGraph` for all page types (overflow page indices, 0x5 & 0x2 child pointers)
- Make clicking on page in database view or node in graph view navigate to it in page view
- Figure out the problem on pages 37, 43, 948 with cell pointer being zero - overflow?
- figure out the problem on pages 39, 42, 948 with cell pointer being > page count - overflow?
- Finalize page types 2 and 10 and run all pages through `parsePage` for errors
- Finalize the `TODO`s in `parsePage` in the serial type prints
- Consider returning the flow of requesting pages using an `EventTarget` event
  if the `DataView` doesn't contain the page range so that when opening by a URL
  we could read just the first (few) page(s) (depending on how big the file is
  as per the Content-Length header) and range-request the rest if range supported
- Introduce a new class `Record` which is fed a `DataView` and reads the serial
  types and the payload into an API
- Replace `FileReader.readAsArrayBuffer` with `Blob.arrayBuffer` when supported
- Load overflow page indices from the overflowing cells in 0xd, 0xa, 0x2 in `construct
- Load left child pointers in cells in 0x5, 0x2
