# Client Configuration

Configure the SLIIT Courseweb MCP Server across various AI agents, IDEs, and CLI tools.

---

## 1. Google Antigravity

Add the server entry to your active MCP configuration file (`~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "sliit-courseweb": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-sliit-courseweb/build/index.js"
      ],
      "disabled": false
    }
  }
}
```

Restart your Antigravity session or reload the MCP registry. The tools will become available in your chat context.

---

## 2. Claude Code CLI

Use the built-in `claude mcp add` registry command:

```bash
claude mcp add sliit-courseweb node "/absolute/path/to/mcp-sliit-courseweb/build/index.js" -e HEADLESS=true
```

To verify the integration:

```bash
claude mcp list
```

---

## 3. Cursor & Windsurf

In your project workspace or global editor settings, create or modify `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "sliit-courseweb": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-sliit-courseweb/build/index.js"
      ]
    }
  }
}
```

---

## 4. Environment Variables Reference

You can optionally define these variables in a local `.env` file or within your agent's configuration:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `HEADLESS` | Runs Chromium without GUI (`true` or `false`) | `true` |
| `CHROME_PATH` | Explicit path to Chrome or Chromium executable | Auto-detected (`/usr/bin/google-chrome`) |
| `SLIIT_USERNAME` | Automated login student email (e.g. `it21000000@my.sliit.lk`) | None |
| `SLIIT_PASSWORD` | Automated login password | None |

> [!NOTE]
> Even with `SLIIT_USERNAME` and `SLIIT_PASSWORD` configured, university accounts requiring Microsoft MFA will still require interactive verification or cookie injection once every 14-30 days.
