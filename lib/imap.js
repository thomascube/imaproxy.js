/**
 * IMAP protocol utility functions
 *
 * This file is part of the IMAProxy package by Kolab
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
 * Splits IMAP response into string tokens
 *
 * @param string The IMAP's server response
 * @return mixed Tokens array
 */
function tokenizeData(str, num, ret)
{
    var result = [];

    while (!num || result.length < num) {
        // remove spaces from the beginning of the string
        str = String(str).replace(/^ +/, '');

        switch (str[0]) {

        // String literal
        case '{':
            if ((epos = str.indexOf("}\r\n")) < 0) {
                // error
            }
            var bytes = parseInt(str.substr(1, epos - 1));
            if (isNaN(bytes)) {
                // error
            }
            result.push(bytes ? str.substr(epos + 3, bytes) : '');

            // advance the string
            str = str.substr(epos + 3 + bytes);
            break;

        // Quoted string
        case '"':
            var len = str.length;

            for (var pos = 1; pos < len; pos++) {
                if (str[pos] == '"') {
                    break;
                }
                if (str[pos] == "\\") {
                    if (str[pos + 1] == '"' || str[pos + 1] == "\\") {
                        pos++;
                    }
                }
            }
            if (str[pos] != '"') {
                // error
            }
            // TODO: we need to strip slashes for a quoted string
            result.push(str.substr(1, pos - 1));
            str = str.substr(pos + 1);
            break;

        // Parenthesized list
        case '(':
            var r = {};
            result.push(tokenizeData(str.substr(1), 0, r));
            str = r.str;
            break;

        case ')':
            str = str.substr(1);
            ret.str = str;
            return result;

        // String atom, number, astring, NIL, *, %
        default:
            // empty string
            if (str === '' || str === null) {
                return result;
            }

            // excluded chars: SP, CTL, ), DEL
            // we do not exclude [ and ]
            if (str.match(/^([^\x00-\x20\x29\x7F]+)/, str)) {
                result.push(RegExp.$1 == 'NIL' ? null : RegExp.$1);
                str = str.substr(RegExp.$1.length);
            }
            break;
        }
    }

    return num == 1 ? result[0] : result;
}


/**
 * Check the given data for a status response
 */
function parseResponse(data)
{
    var lines = data.toString().trim().split(/\r?\n/),
        last = lines[lines.length-1],
        ret = { seq:0, status:'UNKNOWN', lines: lines };

    if (last.match(/^([a-z0-9*.]+) (OK|NO|BAD|BYE)/i)) {
        ret.seq = RegExp.$1;
        ret.status = RegExp.$2.toUpperCase();
    }

    return ret;
}


/**
 * Splits the given string by a certain delimiter by keeping quoted strings intact
 */
function explodeQuotedString(str, delimiter)
{
    var result = [];

    for (var c, q = false, p = 0, i = 0; i < str.length; i++) {
        c = str.charAt(i);
        if (c == '"' && str.charAt(i-1) != "\\") {
            q = !q;
        }
        else if (!q && c == delimiter) {
            result.push(str.substr(p, i - p).replace(/^"/, '').replace(/"$/, ''));
            p = i + 1;
        }
    }

    result.push(str.substr(p).replace(/^"/, '').replace(/"$/, ''));
    return result;
}


exports.parseResponse = parseResponse;
exports.tokenizeData = tokenizeData;
exports.explodeQuotedString = explodeQuotedString;
