GE:Sourceboard Project Notes

Purpose

GE:Sourceboard is a lightweight RCON Web Admin widget for GoldenEye: Source server administration.

The goal is to provide friendly admin controls while keeping the underlying RCON commands available when needed.

Design Principles

Friendly UI, RCON underneath

The interface should describe admin tasks, not raw commands.

Use labels like:

* Change Map
* Kick Player
* Load Preset
* RCON Console

The widget can still execute commands such as changelevel, kickid, and exec internally.

Backend-first parsing

The backend should parse Source/GE:S command output and return structured data to the frontend.

The frontend should avoid parsing raw status output directly.

Confirm destructive actions

Actions such as kicking players, banning players, changing maps, restarting matches, or loading presets should ask for confirmation first.

Keep the widget simple

This is a personal project shared publicly. Prefer clear, small features over large abstractions.

Naming Conventions

* Widget ID / folder: rwa-gesourceboard
* Public name: GE:Sourceboard
* CSS classes: ges-*
* Main container: ges-board
* Backend helpers: widget.getStatus(), parseStatus(), parsePlayers()
* Frontend helpers: refreshStatus(), renderPlayers(), renderQuickMaps()
* Backend actions: status, command, changelevel, execConfig, kickPlayer, banPlayer

Current Features

* Raw RCON command execution
* Quick map changes
* Quick server preset/config loading
* Server status display
* Live player list
* Player action menu (kick, ban, copy SteamID, open Steam profile)
* RCON command output panel

Planned Features

* Friendly preset labels
* Gameplay controls
* Radar toggles
* Round and match time controls
* Current gameplay/status display
* Better dashboard layout