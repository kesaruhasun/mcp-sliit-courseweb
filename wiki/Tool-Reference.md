# Tool Reference

Comprehensive documentation for all 11 tools exposed by the SLIIT Courseweb MCP Server.

---

## 1. `list_modules`

Lists all enrolled modules for the authenticated student account.

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `filter` | string | No | Optional classification filter: `all` (default), `starred` (or `favourites`), `inprogress`, `past`, or `future`. |

### Return Schema

Returns an array of course objects:

```json
[
  {
    "id": "9220",
    "name": "BM1045 - Human Resources Management [2026/JUL]",
    "shortname": "BM1045_2026_7_1",
    "url": "https://courseweb.sliit.lk/course/view.php?id=9220",
    "isStarred": true,
    "category": "2026 July",
    "startDate": 1784511480,
    "endDate": 1793583480
  }
]
```

---

## 2. `check_module_updates`

Retrieves the complete hierarchical section breakdown and activity tree for a specific course module. Automatically resolves dynamic sections in courses formatted with `format_tiles` and `format_grid`.

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `courseId` | string | Yes | The numeric Courseweb ID of the module (e.g. `9220`). |

### Return Schema

```json
[
  {
    "id": "98840",
    "number": 6,
    "title": "Topic 7 : Employee Training and Development",
    "activities": [
      {
        "id": "496142",
        "name": "Lecture Slides",
        "url": "https://courseweb.sliit.lk/mod/resource/view.php?id=496142",
        "type": "file",
        "videoUrl": "https://unistream.sliit.lk/dashboard/s/videos/view/3d644f3d-..."
      },
      {
        "id": "500232",
        "name": "Tutorial - T & D",
        "url": "https://courseweb.sliit.lk/mod/resource/view.php?id=500232",
        "type": "file",
        "meetingUrl": "https://teams.microsoft.com/meet/423055788976633?p=..."
      }
    ]
  }
]
```

---

## 3. `sync_module`

Performs an autonomous bulk download of all lecture slides, tutorial sheets, and folder files from an entire module.

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `courseId` | string | Yes | Course module ID to sync (e.g. `9220`). |
| `outputDir` | string | No | Destination folder on disk. Defaults to `./downloads`. |
| `organizeBySection` | boolean | No | When `true`, creates subfolders for each section (e.g. `Topic 1/`, `Topic 2/`). When `false`, downloads directly into the root target folder. Defaults to `true`. |

---

## 4. `get_folder_contents`

Inspects a Moodle folder resource (`mod/folder`) and returns an array of all contained files.

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | string | Yes | The URL of the folder activity (e.g. `https://courseweb.sliit.lk/mod/folder/view.php?id=492490`). |

---

## 5. `download_file`

Downloads a single file from Courseweb given its Moodle resource URL.

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | string | Yes | The Moodle resource URL (e.g. `mod/resource/view.php?id=...`). |
| `outputDir` | string | No | Target directory. Defaults to `./downloads`. |
| `customFilename` | string | No | Optional filename override. |

---

## 6. `get_deadlines`

Fetches upcoming assignment submission deadlines, quiz cutoffs, and calendar events.

### Inputs

None.

---

## 7. `get_announcements`

Retrieves general announcements posted to the site-wide student news forum.

### Inputs

None.

---

## 8. `check_assignment_status`

Checks submission status, grading status, remaining time, and lecturer feedback for a specific assignment URL.

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | string | Yes | The assignment URL (e.g. `mod/assign/view.php?id=...`). |

---

## 9. `scrape_page`

Extracts cleaned visible text content from any authenticated Courseweb URL. Useful for debugging non-standard layouts.

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | string | Yes | Target Courseweb URL. |

---

## 10. `set_session_cookie`

Injects a `MoodleSession` cookie into the local session cache (`storage_state.json`).

### Inputs

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `value` | string | Yes | Cookie value from browser Developer Tools. |

---

## 11. `interactive_login`

Launches a visible Chromium window to perform Microsoft Entra ID authentication and Multi-Factor Authentication (MFA).

### Inputs

None.
