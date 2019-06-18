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
- Find out what's up with the crash in one of the leaf tables where the cell pointer
  is over a thousand
- Add a title which describes purpose and a background which highlights logical
  group membership to each `DataViewBox` byte cell for visual debugging and
  inspection of the database pages
- Adjust the `DataViewBox` cell sizes to accomodate numbers of 3 digits
