# GE:Sourceboard

GE:Sourceboard is a custom widget for RCON Web Admin that adds some quality-of-life controls for administering GoldenEye: Source dedicated servers.

I originally wrote it because I wanted something simpler than typing the same RCON commands over and over to change maps and game modes.

The widget works with the excellent RCON Web Admin project:

- https://github.com/rcon-web-admin/rcon-web-admin

A Docker image is also available:

- https://github.com/itzg/docker-rcon-web-admin

And you can find the excellent GoldenEye: Source here:

- https://www.geshl2.com/

## Features

Current features include:

- Server status
- Live player list
- Player actions menu (kick, ban, copy SteamID, open Steam profile)
- Gameplay controls (teamplay, radar, paintball, jumping, starting weapon and match timing)
- Bot controls (population threshold, difficulty, reserved human slots and removal)
- Configurable quick weapon sets
- Configurable gameplay-mode controls
- Execute raw RCON commands
- Quick map switching
- Quick server preset loading
- RCON command output

### Gameplay control overrides

Gameplay Controls change the server's current settings, but some gameplay scenarios enforce their own rules and may override them. For example, Man With the Golden Gun uses radar to mark the Golden Gun carrier even when the general Radar setting is off. A map or gameplay change may also reload configuration files and reset a setting.

## Installation

In RCON Web Admin, add the repository in **Menu → Widgets**:

```text
https://github.com/stickman-dev/rwa-gesourceboard
```

The widget will then be available to add to your dashboard.

### Manual installation

I had some issues with RCON Web Admin's built-in widget installer with my particular install. If you're also having issues, just clone or copy this repository into RCON Web Admin's `widgets` folder and restart RCON Web Admin.

If running RCON Web Admin in Docker, mount a host directory as the container's `widgets` folder and copy or clone the repo there.

### Persistent bans

To reload permanent bans after the game server restarts, add the following line to `gesource/cfg/server.cfg`:

```text
exec banned_user.cfg
```

The `banned_user.cfg` file is created or updated when GE:Sourceboard saves a permanent ban. Make sure the `gesource/cfg` directory is stored in persistent container storage.

## License

MIT
