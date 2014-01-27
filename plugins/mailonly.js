/**
 * Mail-folders-only IMAProxy module
 *
 * Intercepts LSUB and LIST responses and removes non-mail folders
 * from the listing after checking the /vendor/kolab/folder-type annotations.
 *
 * @author Thomas Bruederli <thomas@roundcube.net>
 *
 * Copyright (C) 2014, Thomas Bruederli, Bern, Switzerland
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

var imap = require('../lib/imap.js');

/**
 * Mail-folders-only IMAProxy plugin
 */
function Mailonly(proxy)
{
    var TYPE_ANNOTATION = "/vendor/kolab/folder-type";
    var listening = false;
    var capabilities = {};
    var proc = [];

    // public methods
    this.init = init;

    /**
     * Plugin init method
     */
    function init()
    {
        proxy.clientEmitter.on('LSUB', clientList);
        proxy.clientEmitter.on('LIST', clientList);
        proxy.clientEmitter.on('XLIST', clientList);
        proxy.serverEmitter.once('CAPABILITY', capabilityResponse);
    }

    /**
     * Parse IMAP server capabilities
     */
    function capabilityResponse(event, data)
    {
        var response = imap.parseResponse(data),
            caps = imap.explodeQuotedString(response.lines[0], " ");

        if (response.status == 'OK') {
            for (var c, i=2; i < caps.length; i++) {
                c = caps[i].split('=');
                capabilities[c[0]] = c[1] || true;
            }
        }
    }

    /**
     * Handler for client LSUB or LIST commands
     */
    function clientList(event, data)
    {
        // nothing to do here
        if (!capabilities['ANNOTATEMORE']) {
            proxy.clientEmitter.removeListener('LSUB', clientList);
            proxy.clientEmitter.removeListener('LIST', clientList);
            proxy.clientEmitter.removeListener('XLIST', clientList);
            return;
        }

        // register LSUB/LIST request for this connection
        if (!proc[event.state.ID])
            proc[event.state.ID] = { buffer:[], listings:{}, pending:0 };

        var lines = data.toString().trim().split(/\r?\n/);
        for (var i=0; i < lines.length; i++) {
            var req = imap.tokenizeData(lines[i], 2),
                listing = { seq: req[0], command: req[1], buffer: [], metadata: {}, annotations: 0 };

            proc[event.state.ID].listings['A' + listing.seq] = listing;
            proc[event.state.ID].pending++;
        }

        // listen to server responses
        if (!listening) {
            proxy.serverEmitter.on('OK', serverResponse);
            proxy.serverEmitter.on('LSUB', serverResponse);
            proxy.serverEmitter.on('LIST', serverResponse);
            proxy.serverEmitter.on('XLIST', serverResponse);
            proxy.serverEmitter.on('ANNOTATION', serverResponse);
            listening = true;
        }
    }

    /**
     * Handler for server responses
     */
    function serverResponse(event, data)
    {
        var req, lines, response, id = event.state.ID;
        if (req = proc[id]) {
            event.write = false;  // don't forward to client

            response = imap.parseResponse(data);
            lines = response.lines;

            // parse annotation response
            if (event.command == 'ANNOTATION' || req.listings[response.seq]) {
                var mbox, metadata;
                for (var i=0; i < lines.length; i++) {
                    var ann = imap.tokenizeData(lines[i], 5),
                        values = ann[4] || [];

                    // store folder type information
                    if (ann[1] == 'ANNOTATION' && ann[3] == TYPE_ANNOTATION && values.length) {
                        mbox = ann[2];
                        metadata = (values[1] || values[3] || '').replace(/\..+$/, '');
                    }
                    // add annotation on OK; also accept "NO Mailbox does not exist" responses
                    else if (ann[1] == 'OK' || ann[1] == 'NO') {
                        processAnnotation(id, ann[0], mbox, metadata, event);
                        mbox = null; metadata = null;
                    }
                }
            }
            else {
                // read server response line by line
                for (var rec, i=0; i < lines.length; i++) {
                    req.buffer.push(lines[i]);

                    // process buffered data after a tagged line
                    rec = String(lines[i]).split(/ +/);
                    if (rec[0] != '*') {
                        // pipe through unrelated results
                        event.write = !processListing(id, rec[0], req.buffer, event);
                        req.buffer = [];
                    }
                }
            }
        }
    }

    /**
     * Process the colelcted server response on a listing command
     */
    function processListing(id, seq, buffer, event)
    {
        var req = proc[id], listing = req.listings['A' + seq];

        if (!listing || buffer.length < 2)
            return false;

        // remove response line
        buffer.pop();

        // get metadata for every mailbox name
        for (var i=0; i < buffer.length; i++) {
            listing.buffer.push(buffer[i]);

            var rec = imap.tokenizeData(buffer[i]),
                mbox = rec.pop();

            // don't query annotations for nonexistent folders
            if (rec[2].indexOf('\\NonExistent') >= 0) {
                listing.metadata[mbox] = '';
                listing.annotations++;
            }
            else {
                event.server.write('A' + seq + ' GETANNOTATION "' + mbox + '" "' +
                    TYPE_ANNOTATION + '" ("value.priv" "value.shared")\r\n');
            }
        }

        return true;
    }

    /**
     * Process the given folder annotation response
     */
    function processAnnotation(id, seq, mbox, metadata, event)
    {
        var req, listing;
        if ((req = proc[id]) && (listing = req.listings[seq])) {
            // store folder metadata
            listing.metadata[mbox] = metadata;
            listing.annotations++;

            // TODO: keep mailbox annotations in memory for subsequent requests (e.g. XLIST + LSUB)

            // we collected all annotations, finally send the (filtered) LSUB response to the client
            if (listing.annotations >= listing.buffer.length) {
                proxy.config.debug_log && console.log("Mailonly filter:", listing.buffer, listing.metadata);

                var list = [];
                for (var i=0; i < listing.buffer.length; i++) {
                    var rec = imap.tokenizeData(listing.buffer[i]),
                        mbox = rec.pop(),
                        type = listing.metadata[mbox];

                    if (!type || type == 'mail' || type == 'NIL') {
                        list.push(listing.buffer[i]);
                    }
                }

                // send filtered list as response to the client
                event.result = list.join("\r\n")  + "\r\n" +
                    listing.seq + " OK Completed (filtered by IMAProxy)\r\n";

                delete req.listings[seq];  // destroy listing job
                req.pending--;

                // all done
                if (req.pending == 0)
                    delete proc[id];

                // TODO: remove serverEmitter listeners if no further jobs pending
            }
        }
        // not a response to our internal queries
        else {
            event.write = true;
        }
    }

}

module.exports = Mailonly;

