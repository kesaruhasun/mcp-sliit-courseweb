# Troubleshooting and FAQ

Common issues encountered when configuring or using the SLIIT Courseweb MCP Server and their solutions.

---

## 1. "Session expired and auto-login failed"

### Cause
Moodle sessions typically expire every 14 to 30 days, or when an administrative password reset occurs.

### Solution
- **Local desktop environment**: Run the `interactive_login` tool. Complete MFA in the opened browser window.
- **Headless environment**: In your regular browser, copy the value of `MoodleSession` from Developer Tools (`F12` > Application > Cookies) and run `set_session_cookie` with the new value.

---

## 2. "Executable doesn't exist at ~/.cache/ms-playwright/..."

### Cause
Playwright was installed without its bundled browser binaries, or the system path to Chrome is missing.

### Solution
The MCP server looks for Google Chrome at `/usr/bin/google-chrome` or `/usr/bin/google-chrome-stable`. If neither exists:

1. Install Google Chrome on your system:
   ```bash
   # Ubuntu / Debian
   sudo apt-get update && sudo apt-get install -y google-chrome-stable
   ```
2. Or download Playwright's bundled browser binaries:
   ```bash
   npx playwright install chromium
   ```
3. Or specify a custom Chrome path in your `.env` file:
   ```env
   CHROME_PATH=/path/to/your/chrome
   ```

---

## 3. "Timeout 30000ms exceeded while waiting for event download"

### Cause
Occurs when Chrome tries to open a PDF in its internal viewer rather than triggering a file download, or when Imperva WAF briefly throttles rapid requests.

### Solution
The client in v1.2.0 automatically appends `forcedownload=1` and applies a fast direct stream retry. If you encounter this on an older version, update to `v1.2.0` or higher:

```bash
git pull origin main
npm run build
```

---

## 4. Why are some modules not visible in `list_modules`?

### Cause
SLIIT Courseweb categorizes courses by semester timeline (e.g. In Progress, Past, Future). By default, `list_modules` returns all enrolled courses.

### Solution
To view only active or starred modules:
- Call `list_modules` with `filter="starred"` to view your favourite modules.
- Call `list_modules` with `filter="inprogress"` to view currently ongoing semester modules.

---

## 5. Security & Privacy

### Where are my credentials stored?
- The server never stores your raw SLIIT password unless you explicitly place it in an uncommitted local `.env` file.
- Session tokens are saved to `storage_state.json`, which is explicitly excluded from git tracking in `.gitignore`.
