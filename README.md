# SQLite JavaScript

[**DEMO**](https://tomashubelbauer.github.io/sqlite-javascript)

In this project I attempt to build a minimal SQLite file reader capable reading
table names and row data out of a SQLite file.

The SQLite format is documented at: https://www.sqlite.org/fileformat.html

I am using the Chinook test database file which is a newer alternative to
Northwind.

- Implement recursively traversing pages until reaching the leaf
- Coerce the ID column (identifier by a constraint) into the row ID fallback value

- Finalize `constructGraph` for all page types
- Figure out the problem on pages 37, 43, 948 with cell pointer being zero - overflow?
- figure out the problem on pages 39, 42, 948 with cell pointer being > page count - overflow?
- Finalize page types 2 and 10 and run all pages through `parsePage` for errors
- Finalize the `TODO`s in `parsePage` in the serial type prints
- Add a UI for entering a DB file URL or choosing a local file and load the DB
  file per page od demand using the event if the server supports range requests
  otherwise load it whole or warn if it is inaccessible due to CORS
- Add a `pages` getter which returns an array proxy which does `getPage` on indexer access
- https://jvns.ca/blog/2014/09/27/how-does-sqlite-work-part-1-pages/
- https://jvns.ca/blog/2014/10/02/how-does-sqlite-work-part-2-btrees/
- Add a title which describes purpose and a background which highlights logical
  group membership to each `DataViewBox` byte cell for visual debugging and
  inspection of the database pages
- Adjust the `DataViewBox` cell sizes to accomodate numbers of 3 digits
- Introduce a new class `Record` which is fed a `DataView` and reads the serial
  types and the payload into an API
