# SQLite JavaScript

[**DEMO**](https://tomashubelbauer.github.io/sqlite-javascript)

In this project I attempt to build a minimal SQLite file reader capable reading
table names and row data out of a SQLite file.

The SQLite format is documented at: https://www.sqlite.org/fileformat.html

I am using the Chinook test database file which is a newer alternative to
Northwind.

- Refactor varint parsing in `LeafTablePage` to be generic
- Continue with https://www.sqlite.org/fileformat.html#b_tree_pages
- Implement a UI similar to `printDebugPage` but for the whole file where the
  user can scroll through the grid of hex+dec+ascii triplet combinations (this
  could probably be done by sizing the container to be as tall as would be needed
  for all the lines but displaying just the visible lines and calculating their
  offset from the scroll offset of the container - virtualized hex editor view)
  and each byte would be highlighted according to what it belongs to and would
  display additional information on hove
