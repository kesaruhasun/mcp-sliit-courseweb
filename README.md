# SLIIT Courseweb MCP Server 🚀

A high-performance **Model Context Protocol (MCP)** server designed to bridge the SLIIT Courseweb (Moodle) platform with AI agents like Claude Desktop. This server allows your AI assistant to browse your modules, track deadlines, and download course materials automatically.

## ✨ Features

- **Module Management**: List all enrolled modules and their unique Moodle IDs.
- **Deadline Tracking**: Scrape upcoming deadlines and events from your academic calendar.
- **Bulk Sync**: Download all lecture slides, lab sheets, and resources from a module with one command.
- **Smart Updates**: Uses MD5 hashing to only download new or updated files (no duplicates).
- **Assignment Status**: Check if your work is submitted and view grading feedback.
- **Headless Mode**: Runs silently in the background, with an interactive login tool for handling MFA.
- **Scraper Tool**: Deep-scan any Courseweb page to help the AI understand specific module layouts.

## 🛠️ Setup

### 1. Installation
```bash
npm install
npm run build
```

### 2. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```env
SLIIT_USERNAME=your_it_number
SLIIT_PASSWORD=your_password
HEADLESS=true
```

### 3. Interactive Login
Run the interactive login tool once to handle Microsoft SSO/MFA and save your session:
```bash
node -e "import { CoursewebClient } from './build/courseweb.js'; const c = new CoursewebClient(); c.interactiveLogin().then(msg => { console.log(msg); process.exit(0); });"
```

## 🔌 Claude Desktop Integration

Add this to your `claude_desktop_config.json`:

```json
"mcpServers": {
  "sliit_courseweb": {
    "command": "node",
    "args": ["/ABSOLUTE/PATH/TO/YOUR/PROJECT/build/index.js"],
    "env": {
      "SLIIT_USERNAME": "your_it_number",
      "SLIIT_PASSWORD": "your_password",
      "HEADLESS": "true"
    }
  }
}
```

## ⚠️ Disclaimer

This tool is for **personal educational use only**. It is not affiliated with SLIIT. Use it responsibly and ensure your usage complies with your institution's IT policies and terms of service. Automated scraping should be done at reasonable intervals to avoid unnecessary load on campus servers.

## 📄 License

MIT
