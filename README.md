"I'M A Proxy" - Node.js IMAP proxy server
=========================================

This is a simple proxy server to monitor and modify IMAP communications.

Individual plugins can subscribe to certain IMAP commands sent by either
the client or the server and intercept or alter the exchanged data.

The primary use-case is to hide non-mail folders of a Kolab server by
filtering LSUB/LIST/XLIST responses.

**Warning: this is only a proof-of-concept application and neither
fully tested nor reviewed for security issues.**
**DON'T USE IT IN A PRODUCTIVE ENVIRONMENT!**

Installation
------------

* Download and install [node.js][nodejs] with npm.
* Clone this git repository
* Copy the `config.js.dist` into `config.js` and adjust the config
* Run the proxy with `node imaproxy.js [<path-to-config-file>]`


Features
--------

* Asynchronous, non-blocking socket connections
* TLS/SSL support for both client and server connections
* Full IMAP payload logging
* Easily extensible with plugins


Available Plugins
-----------------

* **mailonly.js**

  Modifies LSUB/LIST/XLIST responses to hide non-mail folders from being
  listed to the clients. The folder type is determined by fetching
  /vendor/kolab/folder-type annotations from the IMAP server.



TODOs
-----

* Configurable logging output (maybe a plugin?)
* Spawn and manage multiple processes using the [cluser][cluster] module
* STARTTLS support for client connections
* Unit tests


License
-------

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see [www.gnu.org/licenses/][gpl].


[nodejs]:  http://nodejs.org/
[cluster]: http://nodejs.org/docs/latest/api/cluster.html
[gpl]:     http://www.gnu.org/licenses/
