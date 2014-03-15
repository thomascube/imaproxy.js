/**
 * IMA payload and debug logging module
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

/**
 * IMAP payload logging plugin
 */
function IMAPLog(proxy)
{
    var GREEN_CCODE = '\x1b[0;32m';
    var RED_CCODE   = '\x1b[0;31m';
    var WHITE_CCODE = '\x1b[0;37m';
    var DEBUG_LOG   = false;
    var DATA_LOG    = false;

    // public methods
    this.init = init;

    /**
     * Plugin init method
     */
    function init()
    {
        if (DEBUG_LOG || DATA_LOG) {
            proxy.clientEmitter.on('__POSTDATA__', clientLog);
            proxy.serverEmitter.on('__POSTDATA__', serverLog);
        }
    }

    function clientLog(event, data)
    {
        var prefix = "[" + event.state.ID + "] ";
        if (DEBUG_LOG) {
            console.log(RED_CCODE + prefix + " C: " + event.seq + " <" + event.command + ">");
        }
        if (DATA_LOG) {
            if (event.result) {
                console.log(RED_CCODE + prefix + " C: ", event.result);
            }
            else if (event.write) {
                console.log(RED_CCODE + prefix + " C: ", data.toString());
            }
        }
    }

    function serverLog(event, data)
    {
        var prefix = "[" + event.state.ID + "] ";
        if (DEBUG_LOG) {
            console.log(GREEN_CCODE + prefix + " S: " + event.seq + " <" + event.command + ">");

            if (event.command == 'CAPABILITY') {
                var str = data.toString();
                if (str.match(/COMPRESS=DEFLATE/)) {
                    console.log(WHITE_CCODE + prefix + " * Proxy substitution: ", str);
                }
            }
            if (!event.result && !event.write) {
                console.log(WHITE_CCODE + prefix + "X: ", data.toString());
            }
        }
        if (DATA_LOG) {
            if (event.result) {
                console.log(GREEN_CCODE + prefix + " S: ", event.result);
            }
            else if (event.write) {
                console.log(GREEN_CCODE + prefix + " S: ", data.toString());
            }
        }
    }

    DEBUG_LOG = proxy.config.debug_log || false;
    DATA_LOG  = proxy.config.imap_log  || false;
}

module.exports = IMAPLog;
