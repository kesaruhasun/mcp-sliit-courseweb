Complete integration guide and configuration specifications for connecting the SLIIT Courseweb MCP Server to AI coding assistants, agent runtimes, and developer environments.

---

## Supported Clients Matrix

| Client Platform | Protocol Transport | Configuration File Location | Integration Status |
| :--- | :--- | :--- | :--- |
| **Google Antigravity** | STDIO (Node.js) | `~/.gemini/config/mcp_config.json` | Verified Native |
| **Claude Code CLI** | STDIO (Node.js) | `~/.claude/settings.json` or CLI command | Verified Native |
| **Claude Desktop** | STDIO (Node.js) | `claude_desktop_config.json` (macOS / Windows) | Verified Native |
| **Cursor IDE** | STDIO (Node.js) | `.cursor/mcp.json` or `~/.cursor/mcp.json` | Verified Native |
| **Windsurf IDE** | STDIO (Node.js) | `~/.codeium/windsurf/mcp_config.json` | Verified Native |
| **VS Code (Roo Code / Cline)** | STDIO (Node.js) | Global Extension Settings | Verified Native |
| **Docker / Container** | STDIO / IPC | `Dockerfile` | Verified Containerized |

> [!IMPORTANT]
> Always provide an **absolute path** to the compiled executable (`.../mcp-sliit-courseweb/build/index.js`). Relative paths will fail because client processes execute from arbitrary working directories.

---

## 1. Google Antigravity

Google Antigravity supports native Model Context Protocol (MCP) servers via its central configuration file.

### Configuration File Path

- **Linux / macOS**: `~/.gemini/config/mcp_config.json`
- **Windows**: `%USERPROFILE%\.gemini\config\mcp_config.json`

### Configuration Snippet

Add the `sliit-courseweb` entry under the `mcpServers` object:

```json
{
  "mcpServers": {
    "sliit-courseweb": {
      "command": "node",
      "args": [
        "/home/dulith/Projects/mcp-sliit-courseweb/build/index.js"
      ],
      "env": {
        "HEADLESS": "true"
      },
      "disabled": false
    }
  }
}
```

### Applying Changes

1. Save the file.
2. In the Antigravity conversation, run `/mcp` or reload the window (`Ctrl+R` / `Cmd+R`).
3. Verify that the 11 courseweb tools appear in the available tools panel.

---

## 2. Claude Code CLI

Anthropic's Claude Code command-line tool connects directly to MCP servers over standard input/output.

### One-Command Setup

Run the following command in your terminal:

```bash
claude mcp add sliit-courseweb node "/absolute/path/to/mcp-sliit-courseweb/build/index.js" -e HEADLESS=true
```

### Manual Configuration

Alternatively, open `~/.claude/settings.json` (or `~/.config/claude/config.json`) and add:

```json
{
  "mcpServers": {
    "sliit-courseweb": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-sliit-courseweb/build/index.js"
      ],
      "env": {
        "HEADLESS": "true"
      }
    }
  }
}
```

### Verification

List all registered tools to ensure active registration:

```bash
claude mcp list
```

---

## 3. Claude Desktop App

The official Anthropic Claude Desktop app supports local MCP servers.

### Configuration File Paths

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Configuration Snippet

```json
{
  "mcpServers": {
    "sliit-courseweb": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-sliit-courseweb/build/index.js"
      ],
      "env": {
        "HEADLESS": "true",
        "CHROME_PATH": "/usr/bin/google-chrome"
      }
    }
  }
}
```

> [!NOTE]
> On macOS, if `node` is installed via Homebrew or NVM, specify the absolute path to Node (e.g. `/usr/local/bin/node` or `/opt/homebrew/bin/node`).

---

## 4. Cursor IDE

Cursor integrates MCP servers into its Composer and agent architecture.

### Configuration Setup

1. Open Cursor Settings: `Cmd+,` (macOS) or `Ctrl+,` (Linux/Windows).
2. Navigate to **Features** > **MCP Servers**.
3. Click **Add New MCP Server**.
4. Set the parameters:
   - **Name**: `sliit-courseweb`
   - **Type**: `command`
   - **Command**: `node /absolute/path/to/mcp-sliit-courseweb/build/index.js`

Alternatively, create or edit `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "sliit-courseweb": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-sliit-courseweb/build/index.js"
      ],
      "env": {
        "HEADLESS": "true"
      }
    }
  }
}
```

---

## 5. Windsurf IDE

Codeium's Windsurf editor connects to MCP servers to augment Cascade workflows.

### Configuration File Path

- **Linux / macOS**: `~/.codeium/windsurf/mcp_config.json`
- **Windows**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

### Configuration Snippet

```json
{
  "mcpServers": {
    "sliit-courseweb": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-sliit-courseweb/build/index.js"
      ],
      "env": {
        "HEADLESS": "true"
      }
    }
  }
}
```

---

## 6. VS Code (Roo Code / Cline / Continue)

For extensions running inside Visual Studio Code:

1. Open Extension Settings for Roo Code or Cline.
2. Select **MCP Servers** configuration tab.
3. Add the server entry:

```json
{
  "sliit-courseweb": {
    "command": "node",
    "args": [
      "/absolute/path/to/mcp-sliit-courseweb/build/index.js"
    ],
    "env": {
      "HEADLESS": "true"
    },
    "disabled": false,
    "autoApprove": [
      "list_modules",
      "get_deadlines",
      "get_announcements",
      "check_module_updates"
    ]
  }
}
```

---

## 7. Standalone Docker Deployment

When deploying inside an isolated container, run Chromium headlessly with the necessary sandbox arguments:

### Dockerfile

```dockerfile
FROM node:20-bookworm-slim

# Install Google Chrome dependencies and Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV HEADLESS=true

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY build/ ./build/

USER node
ENTRYPOINT ["node", "build/index.js"]
```

---

## Environment Variables Reference

Configure server behavior via environment variables in your client configuration or an uncommitted `.env` file at the project root:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `HEADLESS` | Boolean | `true` | When `true`, Chromium runs in background without GUI. Set to `false` only during manual debugging or interactive logins. |
| `CHROME_PATH` | String | Auto-detected | Absolute path to the Chrome or Chromium binary. If omitted, checks standard Linux, macOS, and Windows system paths. |
| `SLIIT_USERNAME` | String | Empty | Student Microsoft account email (e.g. `it21000000@my.sliit.lk`). Used for initial automated credential prefill. |
| `SLIIT_PASSWORD` | String | Empty | University account password. Never shared or sent to third-party endpoints. |
| `COURSEWEB_SESSION_PATH` | String | `./storage_state.json` | Custom filesystem path for storing the authenticated Playwright browser storage state. |
| `COURSEWEB_TIMEOUT_MS` | Number | `30000` | Default timeout in milliseconds for network requests and downloads. |

---

## Verifying Server Health

Test that the server communicates properly before connecting your AI client:

```bash
node build/index.js <<< '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

A healthy response prints `Courseweb MCP Server running on stdio` to `stderr` followed by a JSON payload on `stdout` enumerating all 11 tool definitions.
