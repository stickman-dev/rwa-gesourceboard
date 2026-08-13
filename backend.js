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
            widget.runCommand(server, "exec " + cleanToken(messageData.config) + "; ge_endmatch", callback);
            break;

        case "weaponSet":
            var weaponSet = cleanToken(messageData.weaponSet);

            if (!weaponSet) {
                callback(widget, {
                    ok: false,
                    error: "Invalid weapon set"
                });
                break;
            }

            widget.runCommand(server, "ge_weaponset " + weaponSet + "; ge_restartround", callback);
            break;

        case "gameplay":
            var gameplay = cleanToken(messageData.gameplay);

            if (!gameplay) {
                callback(widget, {
                    ok: false,
                    error: "Invalid gameplay mode"
                });
                break;
            }

            widget.runCommand(server, "ge_gameplay " + gameplay, callback);
            break;

        case "kickPlayer":
            widget.runCommand(server, "kickid " + cleanNumber(messageData.userid), callback);
            break;

        case "banPlayer":
            widget.banPlayer(server, messageData.steamid, messageData.minutes, callback);
            break;

        case "bans":
            widget.getBans(server, callback);
            break;

        case "unbanPlayer":
            widget.unbanPlayer(server, messageData.steamid, callback);
            break;

        case "gameplayControls":
            widget.getGameplayControls(server, callback);
            break;

        case "setGameplayControl":
            widget.setGameplayControl(server, messageData.control, messageData.value, callback);
            break;

        case "setGameplayTiming":
            widget.setGameplayTiming(server, messageData, callback);
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
 * Ban a player by Steam2 ID.
 * A duration of 0 is permanent; positive values are minutes.
 *
 * @param {RconServer} server
 * @param {string} steamid
 * @param {number|string} minutes
 * @param {function} callback
 */
widget.banPlayer = function (server, steamid, minutes, callback) {
    steamid = cleanSteamId(steamid);
    minutes = parseInt(cleanNumber(minutes), 10);

    if (!steamid) {
        callback(widget, {
            ok: false,
            error: "Invalid SteamID"
        });
        return;
    }

    if (isNaN(minutes) || minutes < 0) {
        callback(widget, {
            ok: false,
            error: "Invalid ban duration"
        });
        return;
    }

    var command = "banid " + minutes + " " + steamid + " kick";

    if (minutes === 0) {
        command += "; writeid";
    }

    widget.runCommand(server, command, callback);
};

/**
 * Return the server's SteamID ban list.
 *
 * @param {RconServer} server
 * @param {function} callback
 */
widget.getBans = function (server, callback) {
    server.cmd("listid", null, false, function (response) {
        response = response || "";

        callback(widget, {
            ok: true,
            raw: response,
            bans: parseBans(response)
        });
    });
};

/**
 * Remove a SteamID ban and persist the updated ban list.
 *
 * @param {RconServer} server
 * @param {string} steamid
 * @param {function} callback
 */
widget.unbanPlayer = function (server, steamid, callback) {
    steamid = cleanSteamId(steamid);

    if (!steamid) {
        callback(widget, {
            ok: false,
            error: "Invalid SteamID"
        });
        return;
    }

    widget.runCommand(server, "removeid " + steamid + "; writeid", callback);
};

/**
 * Get the current values used by the gameplay controls.
 *
 * @param {RconServer} server
 * @param {function} callback
 */
widget.getGameplayControls = function (server, callback) {
    var names = [
        "ge_teamplay",
        "ge_autoteam",
        "ge_autoautoteam",
        "ge_allowradar",
        "ge_radar_showenemyteam",
        "ge_paintball",
        "ge_allowjump",
        "ge_startarmed",
        "mp_timelimit",
        "ge_roundtime",
        "ge_roundcount"
    ];
    var values = {};
    var index = 0;

    var queryNext = function (attempt) {
        attempt = attempt || 1;

        if (index >= names.length) {
            var automatic = values.ge_autoautoteam === 1 || values.ge_autoteam > 0;

            callback(widget, {
                ok: true,
                controls: {
                    teamplay: automatic ? "automatic" : (values.ge_teamplay === 1 ? "on" : "off"),
                    radar: values.ge_allowradar === 1,
                    enemyRadar: values.ge_radar_showenemyteam === 1,
                    paintball: values.ge_paintball === 1,
                    jumping: values.ge_allowjump === 1,
                    startArmed: values.ge_startarmed === 1,
                    matchTime: values.mp_timelimit,
                    roundTime: values.ge_roundtime,
                    roundCount: values.ge_roundcount
                }
            });
            return;
        }

        var name = names[index];

        server.cmd(name, null, false, function (response) {
            var value = parseConVarValue(response, name);

            if (value === null) {
                if (attempt < 2) {
                    setTimeout(function () {
                        queryNext(attempt + 1);
                    }, 200);
                    return;
                }

                callback(widget, {
                    ok: false,
                    error: "Could not read gameplay control: " + name
                });
                return;
            }

            values[name] = value;
            index++;
            queryNext(1);
        });
    };

    queryNext(1);
};

/**
 * Update one allowlisted gameplay control.
 *
 * @param {RconServer} server
 * @param {string} control
 * @param {string|number|boolean} value
 * @param {function} callback
 */
widget.setGameplayControl = function (server, control, value, callback) {
    var command = "";
    var booleanControls = {
        radar: "ge_allowradar",
        enemyRadar: "ge_radar_showenemyteam",
        paintball: "ge_paintball",
        jumping: "ge_allowjump",
        startArmed: "ge_startarmed"
    };
    if (control === "teamplay") {
        if (value === "automatic") {
            command = "ge_autoautoteam 1";
        } else if (value === "on" || value === "off") {
            command = "ge_autoautoteam 0; ge_autoteam 0; ge_teamplay " + (value === "on" ? "1" : "0");
        }
    } else if (booleanControls[control]) {
        if (value === true || value === 1 || value === "1") {
            command = booleanControls[control] + " 1";
        } else if (value === false || value === 0 || value === "0") {
            command = booleanControls[control] + " 0";
        }
    }

    if (!command) {
        callback(widget, {
            ok: false,
            error: "Invalid gameplay control"
        });
        return;
    }

    widget.runCommand(server, command, callback);
};

/**
 * Apply all match timing values together.
 * Toggling ge_roundcount through 0 ensures GE:S recalculates round time when
 * round counting is enabled.
 *
 * @param {RconServer} server
 * @param {object} values
 * @param {function} callback
 */
widget.setGameplayTiming = function (server, values, callback) {
    var matchTime = cleanUnsignedInteger(values.matchTime);
    var roundCount = cleanUnsignedInteger(values.roundCount);
    var roundTime = roundCount === 0 ? cleanUnsignedInteger(values.roundTime) : null;

    if (matchTime === null || roundCount === null || (roundCount === 0 && roundTime === null)) {
        callback(widget, {
            ok: false,
            error: "Timing values must be whole numbers of 0 or greater"
        });
        return;
    }

    var commands = [
        "mp_timelimit " + matchTime,
        "ge_roundcount 0"
    ];

    if (roundCount > 0) {
        commands.push("ge_roundcount " + roundCount);
    } else {
        commands.push("ge_roundtime " + roundTime);
    }

    var setCurrentRoundTime = function (seconds) {
        widget.runCommand(server, "ge_setcurrentroundtime " + seconds, callback);
    };

    widget.runCommand(server, commands.join("; "), function (currentWidget, response) {
        if (!response || response.error) {
            callback(currentWidget, response);
            return;
        }

        if (roundCount === 0) {
            setCurrentRoundTime(roundTime);
            return;
        }

        var readCalculatedRoundTime = function (attempt) {
            server.cmd("ge_roundtime", null, false, function (roundTimeResponse) {
                var calculatedRoundTime = parseConVarValue(roundTimeResponse, "ge_roundtime");

                if (calculatedRoundTime === null && attempt < 3) {
                    setTimeout(function () {
                        readCalculatedRoundTime(attempt + 1);
                    }, 200);
                    return;
                }

                if (calculatedRoundTime === null) {
                    callback(widget, {
                        ok: false,
                        error: "Timing was applied, but the calculated round time could not be read"
                    });
                    return;
                }

                setCurrentRoundTime(calculatedRoundTime);
            });
        };

        setTimeout(function () {
            readCalculatedRoundTime(1);
        }, 200);
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
 * Parse Source engine `listid` output.
 * The exact spacing varies between Source games, so each row is identified by
 * its Steam2 ID and the remaining text is treated as the duration.
 *
 * @param {string} bansData
 * @return {object[]}
 */
function parseBans(bansData) {
    var bans = [];
    var lines = String(bansData || "")
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        var idMatch = line.match(/STEAM_[0-5]:[01]:\d+/i);

        if (!idMatch) continue;

        var steamid = idMatch[0].toUpperCase();
        var duration = line.slice(idMatch.index + idMatch[0].length)
            .replace(/^\s*[:=-]?\s*/, "")
            .trim();
        var numberMatch = duration.match(/\d+(?:\.\d+)?/);
        var minutes = numberMatch ? parseFloat(numberMatch[0]) : null;
        var permanent = /permanent/i.test(duration) || minutes === 0;

        bans.push({
            steamid: steamid,
            permanent: permanent,
            minutes: permanent ? 0 : minutes,
            duration: permanent ? "Permanent" : (duration || "Unknown")
        });
    }

    return bans;
}

/**
 * Parse the numeric value from a Source ConVar response.
 * Example: \"ge_allowjump\" = \"0\" ( def. \"1\" )
 *
 * @param {string} response
 * @param {string} name
 * @return {number|null}
 */
function parseConVarValue(response, name) {
    var pattern = new RegExp("\\\"" + name + "\\\"\\s*=\\s*\\\"([^\\\"]+)\\\"", "i");
    var match = String(response || "")
        .replace(/[\x00-\x1F\x7F]/g, "")
        .match(pattern);

    if (!match) return null;

    var value = parseFloat(match[1]);

    return isNaN(value) ? null : value;
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
    return String(value === null || typeof value === "undefined" ? "" : value)
        .trim()
        .replace(/[^0-9]/g, "");
}

/**
 * Validate a non-negative whole number used by gameplay timing controls.
 */
function cleanUnsignedInteger(value) {
    var numberValue = String(value === null || typeof value === "undefined" ? "" : value).trim();

    if (!/^\d{1,9}$/.test(numberValue)) return null;

    return parseInt(numberValue, 10);
}

/**
 * Validate and normalize a Source Steam2 ID.
 */
function cleanSteamId(value) {
    var steamid = String(value || "").trim().toUpperCase();

    if (!steamid.match(/^STEAM_[0-5]:[01]:\d+$/)) {
        return "";
    }

    return steamid;
}

module.exports = widget;
