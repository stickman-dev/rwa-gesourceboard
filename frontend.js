"use strict";

Widget.register("rwa-gesourceboard", function (widget) {
    var board = widget.template(".ges-board");

    var splitOption = function (value) {
        if (!value) return [];

        return value
            .split(",")
            .map(function (item) {
                return item.trim();
            })
            .filter(function (item) {
                return item.length > 0;
            });
    };

    var writeOutput = function (text) {
        board.find(".ges-output").text(text || "");
    };

    var steamIdToSteam64 = function (steamid) {
        var match = String(steamid || "").match(/^STEAM_[0-5]:([01]):(\d+)$/);

        if (!match) return null;

        try {
            var y = BigInt(match[1]);
            var z = BigInt(match[2]);
            var base = BigInt("76561197960265728");

            return (z * BigInt(2) + y + base).toString();
        } catch (e) {
            return null;
        }
    };

    var copyToClipboard = function (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
            return;
        }

        var temp = $("<textarea readonly>")
            .css({ position: "fixed", top: "-1000px" })
            .val(text);

        $("body").append(temp);
        temp[0].select();
        document.execCommand("copy");
        temp.remove();
    };

    var renderPlayerActions = function (player) {
        var group = $("<div class='btn-group ges-player-actions'>");

        var toggle = $("<span class='btn btn-default btn-xs dropdown-toggle' data-toggle='dropdown'>")
            .append("Actions ")
            .append($("<span class='caret'>"));

        var menu = $("<ul class='dropdown-menu dropdown-menu-right'>");

        menu.append(
            $("<li>").append(
                $("<a href='#' class='ges-player-kick'>")
                    .attr("data-userid", player.userid)
                    .attr("data-name", player.name)
                    .text("Kick")
            )
        );

        menu.append(
            $("<li>").append(
                $("<a href='#' class='ges-player-ban'>")
                    .attr("data-steamid", player.steamid)
                    .attr("data-minutes", "30")
                    .attr("data-name", player.name)
                    .text("Ban for 30 minutes")
            )
        );

        menu.append(
            $("<li>").append(
                $("<a href='#' class='ges-player-ban'>")
                    .attr("data-steamid", player.steamid)
                    .attr("data-minutes", "0")
                    .attr("data-name", player.name)
                    .text("Ban permanently")
            )
        );

        menu.append($("<li role='separator' class='divider'>"));

        menu.append(
            $("<li>").append(
                $("<a href='#' class='ges-player-copy-steamid'>")
                    .attr("data-steamid", player.steamid)
                    .text("Copy SteamID")
            )
        );

        menu.append(
            $("<li>").append(
                $("<a href='#' class='ges-player-steam-profile'>")
                    .attr("data-steamid", player.steamid)
                    .text("Open Steam Profile")
            )
        );

        group.append(toggle);
        group.append(menu);

        return group;
    };

    var renderPlayers = function (players) {
        var tbody = board.find(".ges-player-table tbody");
        tbody.html("");

        if (!players || !players.length) {
            tbody.append(
                $("<tr>").append(
                    $("<td colspan='6' class='text-muted'>").text("No players connected.")
                )
            );
            return;
        }

        players.forEach(function (player) {
            var row = $("<tr>");

            row.append($("<td>").text(player.userid));
            row.append($("<td>").text(player.name));
            row.append($("<td>").text(player.connected));
            row.append($("<td>").text(player.ping));
            row.append($("<td>").text(player.state));
            row.append(
                $("<td>").append(renderPlayerActions(player))
            );

            tbody.append(row);
        });
    };

    var refreshStatus = function () {
        widget.backend("status", {}, function (response) {
            if (!response) {
                writeOutput("No response from status request");
                return;
            }

            if (response.error) {
                writeOutput(response.error);
                note(response.error, "danger");
                return;
            }

            var server = response.server || {};

            board.find(".ges-status-hostname").text(server.hostname || "Unknown");
            board.find(".ges-status-map").text(server.map || "Unknown");
            board.find(".ges-status-players").text(server.players || "Unknown");
            board.find(".ges-status-version").text(server.version || "Unknown");

            renderPlayers(response.players || []);
            writeOutput(response.raw || "");
        });
    };

    var renderBans = function (bans) {
        var tbody = board.find(".ges-ban-table tbody");
        tbody.html("");

        if (!bans || !bans.length) {
            tbody.append(
                $("<tr>").append(
                    $("<td colspan='3' class='text-muted'>").text("No banned players.")
                )
            );
            return;
        }

        bans.forEach(function (ban) {
            var row = $("<tr>");
            var duration = ban.duration || "Unknown";
            var profile = $("<a href='#' class='btn btn-default btn-xs ges-player-steam-profile'>")
                .attr("data-steamid", ban.steamid)
                .text("Open Steam Profile");
            var unban = $("<span class='btn btn-default btn-xs ges-player-unban'>")
                .attr("data-steamid", ban.steamid)
                .text("Unban");

            if (ban.permanent) {
                duration = "Permanent";
            } else if (typeof ban.minutes === "number" && isFinite(ban.minutes)) {
                duration = Math.round(ban.minutes) + " min";
            }

            row.append($("<td>").text(ban.steamid));
            row.append($("<td>").text(duration));
            row.append(
                $("<td>")
                    .append(profile)
                    .append(" ")
                    .append(unban)
            );
            tbody.append(row);
        });
    };

    var refreshBans = function () {
        widget.backend("bans", {}, function (response) {
            if (!response) {
                writeOutput("No response from ban list request");
                return;
            }

            if (response.error) {
                writeOutput(response.error);
                note(response.error, "danger");
                return;
            }

            renderBans(response.bans || []);
        });
    };

    var updateRoundTimeState = function () {
        var roundCount = parseInt(board.find(".ges-gameplay-number-value[data-control='roundCount']").val(), 10);
        var calculated = !isNaN(roundCount) && roundCount > 0;

        board.find(".ges-gameplay-number-value[data-control='roundTime']")
            .prop("disabled", calculated)
            .attr("title", calculated ? "Calculated by GE:S from match time and round count" : "");
    };

    var setGameplayControlsLoading = function (loading) {
        board.find(".ges-gameplay-refresh, .ges-gameplay-apply, .ges-gameplay-toggle, .ges-gameplay-timing-apply")
            .toggleClass("disabled", loading)
            .prop("disabled", loading);
        board.find(".ges-teamplay-mode, .ges-gameplay-number-value").prop("disabled", loading);

        if (!loading) {
            updateRoundTimeState();
        }
    };

    var renderGameplayControls = function (controls) {
        controls = controls || {};

        board.find(".ges-teamplay-mode").val(controls.teamplay || "off");

        board.find(".ges-gameplay-number-value").each(function () {
            var input = $(this);
            var value = controls[input.attr("data-control")];

            input.val(typeof value === "number" ? value : "");
        });

        updateRoundTimeState();

        board.find(".ges-gameplay-toggle").each(function () {
            var button = $(this);
            var control = button.attr("data-control");
            var enabled = controls[control] === true;

            button
                .attr("data-value", enabled ? "1" : "0")
                .toggleClass("btn-success", enabled)
                .toggleClass("btn-default", !enabled)
                .text(enabled ? "On" : "Off");
        });

        var radarEnabled = controls.radar === true;
        var enemyRadar = board.find(".ges-gameplay-toggle[data-control='enemyRadar']");

        enemyRadar
            .toggleClass("disabled", !radarEnabled)
            .prop("disabled", !radarEnabled)
            .attr("title", radarEnabled ? "" : "Enable Radar first");
    };

    var refreshGameplayControls = function () {
        setGameplayControlsLoading(true);

        widget.backend("gameplayControls", {}, function (response) {
            setGameplayControlsLoading(false);

            if (!response) {
                writeOutput("No response from gameplay controls request");
                return;
            }

            if (response.error) {
                writeOutput(response.error);
                note(response.error, "danger");
                return;
            }

            renderGameplayControls(response.controls);
        });
    };

    var updateGameplayControl = function (control, value, successMessage) {
        setGameplayControlsLoading(true);

        widget.backend("setGameplayControl", {
            control: control,
            value: value
        }, function (response) {
            if (!response || response.error) {
                setGameplayControlsLoading(false);
                var error = response && response.error ? response.error : "No response";

                writeOutput(error);
                note(error, "danger");
                return;
            }

            if (successMessage) {
                note(successMessage, "success");
            }

            setTimeout(function () {
                refreshGameplayControls();
            }, 300);
        });
    };

    var applyGameplayTiming = function () {
        var timing = {
            matchTime: board.find(".ges-gameplay-number-value[data-control='matchTime']").val().trim(),
            roundTime: board.find(".ges-gameplay-number-value[data-control='roundTime']").val().trim(),
            roundCount: board.find(".ges-gameplay-number-value[data-control='roundCount']").val().trim()
        };
        var valid = /^\d+$/.test(timing.matchTime) && /^\d+$/.test(timing.roundCount);

        if (valid && parseInt(timing.roundCount, 10) === 0) {
            valid = /^\d+$/.test(timing.roundTime);
        }

        if (!valid) {
            note("Timing values must be whole numbers of 0 or greater", "danger");
            return;
        }

        setGameplayControlsLoading(true);

        widget.backend("setGameplayTiming", timing, function (response) {
            if (!response || response.error) {
                setGameplayControlsLoading(false);
                var error = response && response.error ? response.error : "No response";

                writeOutput(error);
                note(error, "danger");
                return;
            }

            note("Timing applied", "success");

            setTimeout(function () {
                refreshGameplayControls();
            }, 300);
        });
    };

    var runBackend = function (action, data, successMessage) {
        widget.backend(action, data || {}, function (response) {
            if (!response) {
                writeOutput("No response");
                return;
            }

            if (response.error) {
                writeOutput(response.error);
                note(response.error, "danger");
                return;
            }

            var output = "";

            if (response.command) {
                output += "> " + response.command + "\n\n";
            }

            if (response.response) {
                output += response.response;
            }

            writeOutput(output);

            if (successMessage) {
                note(successMessage, "success");
            }
        });
    };

    var renderQuickMaps = function () {
        var wrap = board.find(".ges-quick-maps");
        wrap.html("");

        splitOption(widget.options.get("quickMaps")).forEach(function (map) {
            wrap.append(
                $("<span class='btn btn-default btn-sm ges-quick-map'>")
                    .attr("data-map", map)
                    .text(map)
            );
            wrap.append(" ");
        });
    };

    var renderQuickConfigs = function () {
        var wrap = board.find(".ges-quick-configs");
        wrap.html("");

        splitOption(widget.options.get("quickConfigs")).forEach(function (cfg) {
            wrap.append(
                $("<span class='btn btn-default btn-sm ges-quick-config'>")
                    .attr("data-config", cfg)
                    .text(cfg)
            );
            wrap.append(" ");
        });
    };

    var renderQuickWeaponSets = function () {
        var wrap = board.find(".ges-quick-weaponsets");
        wrap.html("");

        splitOption(widget.options.get("quickWeaponSets")).forEach(function (weaponSet) {
            wrap.append(
                $("<span class='btn btn-default btn-sm ges-quick-weaponset'>")
                    .attr("data-weaponset", weaponSet)
                    .text(weaponSet)
            );
            wrap.append(" ");
        });
    };

    var renderQuickGameplays = function () {
        var wrap = board.find(".ges-quick-gameplays");
        wrap.html("");

        splitOption(widget.options.get("quickGameplays")).forEach(function (gameplay) {
            wrap.append(
                $("<span class='btn btn-default btn-sm ges-quick-gameplay'>")
                    .attr("data-gameplay", gameplay)
                    .text(gameplay)
            );
            wrap.append(" ");
        });
    };

    widget.onInit = function () {
        widget.content.append(board);

        renderQuickMaps();
        renderQuickConfigs();
        renderQuickWeaponSets();
        renderQuickGameplays();

        refreshStatus();
        refreshBans();
        refreshGameplayControls();

        widget.content.on("click", ".ges-status-refresh", function () {
            refreshStatus();
        });

        widget.content.on("click", ".ges-gameplay-refresh", function () {
            if ($(this).hasClass("disabled")) return;

            refreshGameplayControls();
        });

        widget.content.on("click", ".ges-gameplay-apply", function () {
            if ($(this).hasClass("disabled")) return;

            var mode = board.find(".ges-teamplay-mode").val();
            var label = mode === "automatic" ? "Automatic" : (mode === "on" ? "On" : "Off");

            updateGameplayControl("teamplay", mode, "Teamplay set to " + label);
        });

        widget.content.on("click", ".ges-gameplay-toggle", function () {
            var button = $(this);

            if (button.hasClass("disabled")) return;

            var control = button.attr("data-control");
            var value = button.attr("data-value") === "1" ? 0 : 1;
            var label = button.attr("data-label");

            updateGameplayControl(control, value, label + " turned " + (value ? "on" : "off"));
        });

        widget.content.on("click", ".ges-gameplay-timing-apply", function () {
            if ($(this).hasClass("disabled")) return;

            applyGameplayTiming();
        });

        widget.content.on("input change", ".ges-gameplay-number-value[data-control='roundCount']", function () {
            updateRoundTimeState();
        });

        widget.content.on("click", ".ges-player-kick", function (ev) {
            ev.preventDefault();

            var button = $(this);
            var userid = button.attr("data-userid");
            var name = button.attr("data-name");

            if (!userid) return;

            Modal.confirm("Kick " + name + " from the server?", function (success) {
                if (success) {
                    runBackend("kickPlayer", { userid: userid }, "Kicked " + name);
                    setTimeout(function () {
                        refreshStatus();
                    }, 1000);
                }
            });
        });

        widget.content.on("click", ".ges-player-ban", function (ev) {
            ev.preventDefault();

            var button = $(this);
            var steamid = button.attr("data-steamid");
            var minutes = parseInt(button.attr("data-minutes"), 10);
            var name = button.attr("data-name");

            if (!steamid || isNaN(minutes)) return;

            var question = minutes === 0
                ? "Permanently ban " + name + " from the server?"
                : "Ban " + name + " for " + minutes + " minutes?";

            Modal.confirm(question, function (success) {
                if (success) {
                    runBackend("banPlayer", {
                        steamid: steamid,
                        minutes: minutes
                    }, "Banned " + name);
                    setTimeout(function () {
                        refreshStatus();
                        refreshBans();
                    }, 1000);
                }
            });
        });

        widget.content.on("click", ".ges-bans-refresh", function () {
            refreshBans();
        });

        widget.content.on("click", ".ges-player-unban", function () {
            var steamid = $(this).attr("data-steamid");

            if (!steamid) return;

            Modal.confirm("Unban " + steamid + "?", function (success) {
                if (success) {
                    runBackend("unbanPlayer", { steamid: steamid }, "Unbanned " + steamid);
                    setTimeout(function () {
                        refreshBans();
                    }, 500);
                }
            });
        });

        widget.content.on("click", ".ges-player-copy-steamid", function (ev) {
            ev.preventDefault();

            var steamid = $(this).attr("data-steamid");

            if (!steamid) return;

            copyToClipboard(steamid);
            note("Copied " + steamid, "success");
        });

        widget.content.on("click", ".ges-player-steam-profile", function (ev) {
            ev.preventDefault();

            var steamid = $(this).attr("data-steamid");
            var steam64 = steamIdToSteam64(steamid);

            if (!steam64) {
                note("Could not resolve SteamID for this player", "danger");
                return;
            }

            window.open("https://steamcommunity.com/profiles/" + steam64, "_blank");
        });

        widget.content.on("click", ".ges-command-send", function () {
            var input = board.find(".ges-command-input");
            var command = input.val();

            if (!command) return;

            runBackend("command", { command: command });
            input.val("");
        });

        widget.content.on("keyup", ".ges-command-input", function (ev) {
            if (ev.keyCode === 13) {
                board.find(".ges-command-send").click();
            }

            if (ev.keyCode === 27) {
                this.value = "";
            }
        });

        widget.content.on("click", ".ges-map-change", function () {
            var input = board.find(".ges-map-input");
            var map = input.val();

            if (!map) return;

            Modal.confirm("Change map to " + map + "?", function (success) {
                if (success) {
                    runBackend("changelevel", { map: map }, "Changing map to " + map);
                }
            });
        });

        widget.content.on("keyup", ".ges-map-input", function (ev) {
            if (ev.keyCode === 13) {
                board.find(".ges-map-change").click();
            }

            if (ev.keyCode === 27) {
                this.value = "";
            }
        });

        widget.content.on("click", ".ges-quick-map", function () {
            var map = $(this).attr("data-map");

            Modal.confirm("Change map to " + map + "?", function (success) {
                if (success) {
                    runBackend("changelevel", { map: map }, "Changing map to " + map);
                }
            });
        });

        var changeWeaponSet = function (weaponSet) {
            if (!weaponSet) return;

            Modal.confirm("Change weapon set to " + weaponSet + " and restart the current round?", function (success) {
                if (success) {
                    runBackend("weaponSet", { weaponSet: weaponSet }, "Changed weapon set to " + weaponSet);
                }
            });
        };

        widget.content.on("click", ".ges-weaponset-change", function () {
            var input = board.find(".ges-weaponset-input");
            var weaponSet = input.val();

            changeWeaponSet(weaponSet);
        });

        widget.content.on("keyup", ".ges-weaponset-input", function (ev) {
            if (ev.keyCode === 13) {
                board.find(".ges-weaponset-change").click();
            }

            if (ev.keyCode === 27) {
                this.value = "";
            }
        });

        widget.content.on("click", ".ges-quick-weaponset", function () {
            changeWeaponSet($(this).attr("data-weaponset"));
        });

        var changeGameplay = function (gameplay) {
            if (!gameplay) return;

            Modal.confirm("Change gameplay mode to " + gameplay + "? This will restart the current round.", function (success) {
                if (success) {
                    runBackend("gameplay", { gameplay: gameplay }, "Changed gameplay mode to " + gameplay);
                    setTimeout(function () {
                        refreshGameplayControls();
                    }, 1000);
                }
            });
        };

        widget.content.on("click", ".ges-gameplay-mode-change", function () {
            changeGameplay(board.find(".ges-gameplay-mode-input").val());
        });

        widget.content.on("keyup", ".ges-gameplay-mode-input", function (ev) {
            if (ev.keyCode === 13) {
                board.find(".ges-gameplay-mode-change").click();
            }

            if (ev.keyCode === 27) {
                this.value = "";
            }
        });

        widget.content.on("click", ".ges-quick-gameplay", function () {
            changeGameplay($(this).attr("data-gameplay"));
        });

        widget.content.on("click", ".ges-config-exec", function () {
            var input = board.find(".ges-config-input");
            var cfg = input.val();

            if (!cfg) return;

            runBackend("execConfig", { config: cfg }, "Loaded config " + cfg);
        });

        widget.content.on("keyup", ".ges-config-input", function (ev) {
            if (ev.keyCode === 13) {
                board.find(".ges-config-exec").click();
            }

            if (ev.keyCode === 27) {
                this.value = "";
            }
        });

        widget.content.on("click", ".ges-quick-config", function () {
            var cfg = $(this).attr("data-config");

            runBackend("execConfig", { config: cfg }, "Loaded config " + cfg);
        });

        collapsable(widget.content);
        dismissable(widget.content);
    };

    widget.onOptionUpdate = function () {
        renderQuickMaps();
        renderQuickConfigs();
        renderQuickWeaponSets();
        renderQuickGameplays();
    };
});
