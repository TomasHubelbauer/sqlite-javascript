# SQLite JavaScript

[**DEMO**](https://tomashubelbauer.github.io/sqlite-javascript)

In this project I attempt to build a minimal SQLite file reader capable reading
table names and row data out of a SQLite file.

The SQLite format is documented at: https://www.sqlite.org/fileformat.html

I am using the Chinook test database file which is a newer alternative to
Northwind.

- Continue with https://www.sqlite.org/fileformat.html#b_tree_pages leaf index and interior pages
  - https://jvns.ca/blog/2014/09/27/how-does-sqlite-work-part-1-pages/
  - https://jvns.ca/blog/2014/10/02/how-does-sqlite-work-part-2-btrees/
  - https://sqlite.org/src/file/src/btree.c & https://www.sqlite.org/fileformat2.html
  - https://www.sqlite.org/fileformat2.html
- Read table names and column names from the master table (page 1).
  It looks as though SQLite doesn't actually store schema information in the binary
  contents of the page but instead stores a SQL string used to create each table.
  We need to parse this string to learn what tables are available in the database.
- Implement a UI similar to `printDebugPage` but for the whole file where the
  user can scroll through the grid of hex+dec+ascii triplet combinations (this
  could probably be done by sizing the container to be as tall as would be needed
  for all the lines but displaying just the visible lines and calculating their
  offset from the scroll offset of the container - virtualized hex editor view)
  and each byte would be highlighted according to what it belongs to and would
  display additional information on hove
- Find out what's up with the crash in one of the leaf tables where the cell pointer
  is over a thousand
