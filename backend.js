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
        case "command":
            widget.runCommand(server, messageData.command, callback);
            break;

        case "changelevel":
            widget.runCommand(server, "changelevel " + cleanToken(messageData.map), callback);
            break;

        case "execConfig":
            widget.runCommand(server, "exec " + cleanToken(messageData.config), callback);
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
 * Clean map/config tokens.
 * Allows common Source cfg/map filename characters only.
 */
function cleanToken(value) {
    return String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9_\-.]/g, "");
}

module.exports = widget;
