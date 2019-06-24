# SQLite Graphed

In this sub-project I am working on an application which reads a SQLite database
and renders a tree of relationships from the individual B-tree pages of the SQLite
database.

Note that the Chinook database has been copied over here instead of being fetched
from one directory up because CORS kick in even on Firefox when using path traversal
components in `fetch` URL on `file` protocol.

I like to be able to run the file directory so in order to avoid having to run a
server, I just copied over the file.

## To-Do

- Load overflow page indices from the overflowing cells in 0xd, 0xa, 0x2
- Load left child pointers in cells in 0x5, 0x2
- Make cells clickable and take the user to the marked view of the cell's contents
