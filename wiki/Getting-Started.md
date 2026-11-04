# Getting Started

This guide walks you through setting up the SLIIT Courseweb MCP Server and establishing your first connection with an AI agent.

---

## System Requirements

- **Runtime**: Node.js 18.0.0 or higher
- **Package Manager**: npm 9.0.0 or higher
- **Browser Engine**: Google Chrome or Chromium installed on the host operating system
- **Platform**: Linux (Ubuntu/Debian, Fedora, Arch), macOS, or Windows (WSL2 recommended)

---

## Installation Steps

### 1. Clone the Codebase

```bash
git clone https://github.com/kesaruhasun/mcp-sliit-courseweb.git
cd mcp-sliit-courseweb
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Compile TypeScript

```bash
npm run build
```

This compiles the TypeScript files from `src/` into runnable JavaScript in the `build/` directory.

---

## Authentication Setup

SLIIT Courseweb relies on Microsoft Entra ID (formerly Azure AD) for Single Sign-On (SSO) with Multi-Factor Authentication (MFA). The server supports two authentication modes:

### Method A: Interactive SSO Login (Recommended for Local Workstations)

If you are running the MCP server locally with a desktop environment:

1. Launch your AI assistant (e.g., Claude Code, Cursor, or Antigravity).
2. Execute the `interactive_login` tool.
3. A Chrome window opens automatically:
   - Enter your SLIIT student credentials (`itXXXXXX@my.sliit.lk`).
   - Complete MFA on your authenticator app.
   - The browser will automatically handle the "Stay signed in?" (KMSI) confirmation.
4. Once the Moodle dashboard (`/my/`) loads, the session cookies are automatically serialized and saved to `storage_state.json`.
5. The browser window closes automatically. All subsequent operations run headlessly in the background.

### Method B: Manual Cookie Injection (Headless VMs / Cloud Workspaces)

If your environment cannot launch a GUI browser:

1. Open your desktop browser and log in to [courseweb.sliit.lk](https://courseweb.sliit.lk).
2. Press `F12` to open Developer Tools and select the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox).
3. Expand **Cookies** in the left sidebar and click on `https://courseweb.sliit.lk`.
4. Locate the cookie named `MoodleSession`.
5. Copy its alphanumeric value (e.g., `t8egaudc5h2b0t4v01ridbnvlc`).
6. Run the `set_session_cookie` tool with the copied value:
   ```json
   {
     "value": "t8egaudc5h2b0t4v01ridbnvlc"
   }
   ```
7. The server updates `storage_state.json`, immediately authenticating all subsequent requests.

---

## Verifying Server Operation

To confirm that the server is operational and communicating over STDIO:

```bash
node build/index.js <<< '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

A successful response outputs `Courseweb MCP Server running on stdio` followed by a JSON array detailing all 11 registered tools.
