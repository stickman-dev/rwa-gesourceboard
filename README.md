# GE:Sourceboard

GE:Sourceboard is a custom widget for RCON Web Admin that adds some quality-of-life controls for administering GoldenEye: Source dedicated servers.

I originally wrote it because I wanted something simpler than typing the same RCON commands over and over to change maps and game modes.

The widget works with the excellent RCON Web Admin project:

- https://github.com/rcon-web-admin/rcon-web-admin

A Docker image is also available:

- https://github.com/itzg/docker-rcon-web-admin

## Features

Current features include:

- Server status
- Live player list
- Player actions menu (kick, ban, copy SteamID, open Steam profile)
- Execute raw RCON commands
- Quick map switching
- Quick server preset loading
- RCON command output

## Planned Features

A few things I'd like to add over time:

- Gameplay controls (radar, teamplay, etc.)
- Better server status information
- Friendlier server preset names
- General UI improvements

## Installation

In RCON Web Admin, add the repository in **Menu → Widgets**:

```text
https://github.com/stickman-dev/rwa-gesourceboard
```

The widget will then be available to add to your dashboard.

### Persistent bans

To reload permanent bans after the game server restarts, add the following line to `gesource/cfg/server.cfg`:

```text
exec banned_user.cfg
```

The `banned_user.cfg` file is created or updated when GE:Sourceboard saves a permanent ban. Make sure the `gesource/cfg` directory is stored in persistent container storage.

## License

MIT
