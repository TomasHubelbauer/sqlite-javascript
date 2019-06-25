# SQLite Marked

In this sub-project I am working on an application which reads a SQLite database
and renders a binary view of the given page's contents with each cell marked with
details such as what value it represents.

Note that the Chinook database has been copied over here instead of being fetched
from one directory up because CORS kick in even on Firefox when using path traversal
components in `fetch` URL on `file` protocol.

I like to be able to run the file directory so in order to avoid having to run a
server, I just copied over the file.
