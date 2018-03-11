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

* **zlogger.js**

  Writes full IMAP payload to `console.log()` if enabled by the
  `imap_log` config option.


TODOs
-----

* ~~Configurable logging output (maybe a plugin?)~~
* ~~Spawn and manage multiple processes using the [cluser][cluster] module~~
* STARTTLS support for client connections
* COMPRESS=DEFLATE support for client connections
* Test with different IMAP clients
  * Thunderbird ✓
  * Apple Mail ✓
  * iOS Mail ✓
  * Microsoft Outlook
  * Sparrow Mac
  * Sparrow iOS
  * Android Mail
  * Android K9
* Stress testing


Troubleshooting
---------------

For every client connection, the imaproxy needs to keep two socket connections
open. You may therefore hit the limit of max. file descriptors per process.
Increase `ulimit -n` accordingly.

Further file descriptors are used when the proxy opens a new connection to
the server and has to resolve the host name. This can be avoided and speeded
up by configuring the IMAP server with its IP address instead of the host name.


Install as a Daemon
-------------------

There are many ways how to daemonize node.js applications. Here's one approach using [pm2](https://github.com/Unitech/pm2):

Install `pm2` globally:

```
$ npm install pm2 -g
```

Start a pm2 process using the configuration file:

```
$ pm2 start imaproxy.js -- /opt/imaproxy/config.js --name imaproxy
```

Use `pm2 --help` to see possible actions to monitor running node.js processes.

In order to automatically run the imap proxy on startup, let `pm2` register a startup script for your platform:

```
$ pm2 startup
$ pm2 save
```


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
