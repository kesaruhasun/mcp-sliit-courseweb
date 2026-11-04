# SLIIT Courseweb MCP Server Wiki

Welcome to the official documentation and technical wiki for the **SLIIT Courseweb Model Context Protocol (MCP) Server**.

This server provides an open-source bridge connecting modern LLM coding agents (Google Antigravity, Claude Code, Cursor, Windsurf, OpenAI Codex) to the SLIIT Courseweb learning portal (`courseweb.sliit.lk`).

---

## Documentation Index

- **[[Getting Started|Getting-Started]]**: Quick-start guide covering installation, system requirements, and authentication methods.
- **[[Client Configuration|Client-Configuration]]**: Integration guides for Google Antigravity, Claude Code, Cursor, Windsurf, and OpenAI Codex.
- **[[Tool Reference|Tool-Reference]]**: Exhaustive reference for all 11 MCP tools, detailing inputs, response schemas, and usage examples.
- **[[Moodle Architecture & RPC|Moodle-Architecture-and-RPC]]**: Deep dive into Moodle 4.x reactive state engines, `format_tiles` dynamic rendering, and JSON-RPC endpoints.
- **[[Troubleshooting & FAQ|Troubleshooting-and-FAQ]]**: Diagnostic solutions for session expirations, WAF blocks, and headless runtime environments.

---

## Key Capabilities

1. **Sub-Second Module Discovery**: Queries Moodle's native JSON-RPC web services (`core_course_get_enrolled_courses_by_timeline_classification`) to list enrolled and starred courses in < 500ms.
2. **Dynamic Course Support**: Transparently parses modern dynamic course formats (`format_tiles`, `format_grid`, `format_topics`, and `format_weeks`), ensuring all sections and materials from Topic 1 through Topic N are resolved.
3. **Automated Delta Sync**: Bulk downloads lecture slides, tutorial sheets, and assessment rubrics directly to disk, avoiding re-downloads via MD5 hash comparison.
4. **Folder Extraction**: Recursively inspects and unpacks multi-file Moodle containers (`mod_folder`).
5. **WAF Hardening**: Incorporates automatic retry mechanisms and header spoofing to bypass Imperva/Cloudflare rate-limits and forcedownload barriers.

---

## Community & Contributing

- **Main Repository**: [kesaruhasun/mcp-sliit-courseweb](https://github.com/kesaruhasun/mcp-sliit-courseweb)
- **Fork & Mirror**: [dulithdivisekara/mcp-sliit-courseweb](https://github.com/dulithdivisekara/mcp-sliit-courseweb)
- **License**: MIT License
