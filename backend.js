"use strict";

var Widget = require(__dirname + "/../../../src/widget");

var widget = new Widget();

/**
 * On frontend message
 * @param {RconServer} server
 * @param {WebSocketUser} user
 * @param {string} action
 * @param {*} messageData
 * @param {function} callback
 */
widget.onFrontendMessage = function (server, user, action, messageData, callback) {
    messageData = messageData || {};

    switch (action) {
        case "status":
            widget.getStatus(server, callback);
            break;

        case "command":
            widget.runCommand(server, messageData.command, callback);
            break;

        case "changelevel":
            widget.runCommand(server, "changelevel " + cleanToken(messageData.map), callback);
            break;

        case "execConfig":
            widget.runCommand(server, "exec " + cleanToken(messageData.config), callback);
            break;

        case "kickPlayer":
            widget.runCommand(server, "kickid " + cleanNumber(messageData.userid), callback);
            break;

        case "banPlayer":
            widget.runCommand(server, "banid 0 " + cleanNumber(messageData.userid) + " kick; writeid", callback);
            break;

        default:
            callback(widget, {
                ok: false,
                error: "Unknown action: " + action
            });
            break;
    }
};

/**
 * Run one or more RCON commands.
 * Multiple commands can be separated with semicolons.
 *
 * @param {RconServer} server
 * @param {string} command
 * @param {function} callback
 */
widget.runCommand = function (server, command, callback) {
    command = (command || "").trim();

    if (!command) {
        callback(widget, {
            ok: false,
            error: "Empty command"
        });
        return;
    }

    var commands = command
        .split(";")
        .map(function (cmd) {
            return cmd.trim();
        })
        .filter(function (cmd) {
            return cmd.length > 0;
        });

    var responses = [];
    var index = 0;

    var runNext = function () {
        if (index >= commands.length) {
            callback(widget, {
                ok: true,
                command: command,
                commands: commands,
                response: responses.join("\n\n")
            });
            return;
        }

        var currentCommand = commands[index];

        server.cmd(currentCommand, null, false, function (response) {
            responses.push("> " + currentCommand + "\n" + (response || ""));
            index++;
            runNext();
        });
    };

    runNext();
};

/**
 * Get and parse Source server status.
 *
 * @param {RconServer} server
 * @param {function} callback
 */
widget.getStatus = function (server, callback) {
    server.cmd("status", null, false, function (response) {
        response = response || "";

        callback(widget, {
            ok: true,
            raw: response,
            server: parseStatus(response),
            players: parsePlayers(response)
        });
    });
};

/**
 * Parse Source engine `status` output into useful fields.
 *
 * @param {string} statusData
 * @return {object}
 */
function parseStatus(statusData) {
    var server = {
        hostname: "",
        version: "",
        map: "",
        players: ""
    };

    var lines = String(statusData || "").split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var match = line.match(/^\s*([^:]+)\s*:\s*(.*?)\s*$/);

        if (!match) continue;

        var key = match[1]
            .replace(/[\x00-\x1F\x7F]/g, "")
            .trim()
            .toLowerCase();
        var value = match[2].trim();

        if (key === "hostname") server.hostname = value;
        if (key === "version") server.version = value;
        if (key === "map") server.map = value.split(" at:")[0].trim();
        if (key === "players") server.players = value;
    }

    return server;
}

/**
 * Parse player rows from Source engine `status` output.
 *
 * @param {string} statusData
 * @return {object[]}
 */
function parsePlayers(statusData) {
    var players = [];
    var lines = String(statusData || "").split(/\r?\n/);
    var inPlayerTable = false;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.match(/^#\s+userid\s+name\s+uniqueid\s+connected\s+ping\s+loss\s+state/i)) {
            inPlayerTable = true;
            continue;
        }

        if (!inPlayerTable) continue;
        if (!line.trim()) continue;
        if (!line.match(/^#\s+\d+/)) continue;

        var player = parsePlayerLine(line);

        if (player) {
            players.push(player);
        }
    }

    return players;
}

/**
 * Parse one Source engine `status` player row.
 *
 * Example:
 * #  2 "Stickman" STEAM_0:0:5064618 06:09 38 0 active 172.18.0.6:37291
 *
 * @param {string} line
 * @return {object|null}
 */
function parsePlayerLine(line) {
    var match = line.match(/^#\s+(\d+)\s+"([^"]+)"\s+(\S+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);

    if (!match) return null;

    return {
        userid: parseInt(match[1], 10),
        name: match[2],
        steamid: match[3],
        connected: match[4],
        ping: parseInt(match[5], 10),
        loss: parseInt(match[6], 10),
        state: match[7],
        address: match[8] || ""
    };
}

/**
 * Clean map/config tokens.
 * Allows common Source cfg/map filename characters only.
 */
function cleanToken(value) {
    return String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9_\-.]/g, "");
}

/**
 * Clean numeric values such as Source userid values.
 */
function cleanNumber(value) {
    return String(value || "")
        .trim()
        .replace(/[^0-9]/g, "");
}

module.exports = widget;
