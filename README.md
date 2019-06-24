# SQLite JavaScript

[**DEMO**](https://tomashubelbauer.github.io/sqlite-javascript)

> A JavaScript SQLite database file reader

## To-Do

I am using [DB browser for SQLite](https://github.com/sqlitebrowser/sqlitebrowser)
to compare databases as read by this library and by the program.

- Debug this with the Prague `mbtiles` database:
  - Fix reading the likely overflowing TEXT `json` column in the `metadata` table
  - Handle `length` being less than `payload` length (oerflow?) in the `gpkg_spatial_ref_sys` table
  - Very odd number of cells in `gpkg_contents`
  - `images` table has 2692 rows not 4892 it actually has and the first 2692 all
    match so just the rest is missing for some reason (right most pointer?)
  - `map` has 4848 but should have 4892 so probably the same right most pointer issue
  - `gpkg_spatial_ref_sys` is not loading any rows but should have 5
- Add `getIndices` (5 master page columns) and `getViews` (4 master page columns)
  and `getTriggers`
- Fix the case when the record misses some cells (alter table?) and so has less
  cells than the table has columns - they should get default values but what if
  one is missing in the middle?
- Load information about a column being a key to a different table and make the
  value a link based on that instead of the current heuristic
- Coerce the ID column (identifier by a constraint) into the row ID fallback value
- Finalize `constructGraph` for all page types
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

There are also todoes for the [marked](marked/README.md#to-do) and
[graphed](graphed/README.md#to-do) subprojects.
