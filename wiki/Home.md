<p align="center">
  <img src="https://raw.githubusercontent.com/dulithdivisekara/mcp-sliit-courseweb/main/assets/kesaru-pig-logo-sm.jpg" width="76" alt="SLIIT Courseweb MCP Logo" />
</p>

<p align="center">
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/Language-TypeScript_5-3178C6?style=flat-square" alt="TypeScript 5"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/Protocol-Model_Context_Protocol-4B32C3?style=flat-square" alt="MCP Protocol"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Runtime-Node.js_18+-339933?style=flat-square" alt="Node.js 18+"></a>
  <a href="https://github.com/kesaruhasun/mcp-sliit-courseweb/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License"></a>
</p>

The **SLIIT Courseweb Model Context Protocol (MCP) Server** is a high-performance integration engine that bridges AI coding assistants directly into SLIIT's Moodle-based academic portal (`courseweb.sliit.lk`). It enables autonomous course synchronization, exam marksheet extraction, and deadline tracking for Google Antigravity, Claude Code, Cursor, Windsurf, and OpenAI Codex.

<p align="center">
  <img src="https://raw.githubusercontent.com/dulithdivisekara/mcp-sliit-courseweb/main/assets/courseweb-launch-poster.jpg" width="100%" alt="SLIIT Courseweb MCP Launch Overview" style="border-radius: 8px; margin: 12px 0;" />
</p>

---

## Documentation Navigator

| Guide | Description | Target Audience |
| :--- | :--- | :--- |
| **[[Getting Started|Getting-Started]]** | Complete setup guide covering installation, prerequisites, and authentication workflows. | New users and quick-start |
| **[[Client Configuration|Client-Configuration]]** | Setup instructions for Antigravity, Claude Code CLI, Cursor, Windsurf, and Docker. | Developers configuring AI tools |
| **[[Tool Reference|Tool-Reference]]** | Complete specification for all 11 MCP tools, parameters, schemas, and return formats. | Prompt engineers & LLM agents |
| **[[Moodle Architecture & RPC|Moodle-Architecture-and-RPC]]** | Deep technical breakdown of Moodle 4.x state engines, `format_tiles`, and WAF bypass. | Core contributors & architects |
| **[[Troubleshooting & FAQ|Troubleshooting-and-FAQ]]** | Diagnostic recipes for session expirations, Chromium paths, timeouts, and WAF blocks. | Users resolving edge cases |

---

## Core Capabilities

```mermaid
graph LR
    A[Student / Agent Prompt] --> B[SLIIT Courseweb MCP]
    B --> C[(Moodle JSON-RPC)]
    B --> D[Playwright Stream]
    C --> E[Dynamic Section State]
    C --> F[Enrolled & Starred Modules]
    D --> G[Delta Sync Downloads]
    D --> H[Submission Status & Grades]
```

- **Dynamic Format Parsing**: Native support for modern Moodle layout engines (`format_tiles`, `format_grid`, `format_topics`, and `format_weeks`). Eliminates missing topics by communicating directly with Moodle's reactive state engine.
- **Fast Timeline Filtering**: Identifies ongoing, past, and starred courses in under 500ms using server-side timeline classification.
- **Automated Delta Sync**: Bulk downloads lecture slides, tutorial exercises, and assessment rubrics directly to disk with MD5 deduplication.
- **Recursive Folder Extraction**: Unpacks multi-file `mod_folder` containers into organized local subfolders.
- **WAF Protocol Hardening**: Automatic session token propagation and trailing-slash query fallbacks against Cloudflare and Imperva firewalls.

---

## Supported LLM Environments

- **Google Antigravity**: Configurable via `~/.gemini/config/mcp_config.json`.
- **Claude Code CLI**: Standard STDIO transport with one-command registration (`claude mcp add`).
- **Cursor & Windsurf IDEs**: Configurable via `.cursor/mcp.json`.
- **OpenAI Codex & Custom Agent Frameworks**: Compatible with any standard Model Context Protocol client.

---

## Repository Links

- **Upstream Repository**: [kesaruhasun/mcp-sliit-courseweb](https://github.com/kesaruhasun/mcp-sliit-courseweb)
- **Active Fork**: [dulithdivisekara/mcp-sliit-courseweb](https://github.com/dulithdivisekara/mcp-sliit-courseweb)
- **Latest Release**: [v1.2.0 Release](https://github.com/dulithdivisekara/mcp-sliit-courseweb/releases/tag/v1.2.0)
