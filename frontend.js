"use strict";

Widget.register("rwa-gesourceboard", function (widget) {
    var simple = widget.template(".ges-simple");

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
        simple.find(".ges-output").text(text || "");
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
        var wrap = simple.find(".ges-quick-maps");
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
        var wrap = simple.find(".ges-quick-configs");
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

    widget.onInit = function () {
        widget.content.append(simple);

        renderQuickMaps();
        renderQuickConfigs();

        widget.content.on("click", ".ges-command-send", function () {
            var input = simple.find(".ges-command-input");
            var command = input.val();

            if (!command) return;

            runBackend("command", { command: command });
            input.val("");
        });

        widget.content.on("keyup", ".ges-command-input", function (ev) {
            if (ev.keyCode === 13) {
                simple.find(".ges-command-send").click();
            }

            if (ev.keyCode === 27) {
                this.value = "";
            }
        });

        widget.content.on("click", ".ges-map-change", function () {
            var input = simple.find(".ges-map-input");
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
                simple.find(".ges-map-change").click();
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

        widget.content.on("click", ".ges-config-exec", function () {
            var input = simple.find(".ges-config-input");
            var cfg = input.val();

            if (!cfg) return;

            runBackend("execConfig", { config: cfg }, "Loaded config " + cfg);
        });

        widget.content.on("keyup", ".ges-config-input", function (ev) {
            if (ev.keyCode === 13) {
                simple.find(".ges-config-exec").click();
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
    };
});
