Complete API specification for all 11 tools exposed by the SLIIT Courseweb Model Context Protocol (MCP) Server, including parameter schemas, sample invocations, return structures, and visual proofs.

---

## Tool Overview Matrix

| Tool | Category | Input Requirements | Primary Moodle Endpoint |
| :--- | :--- | :--- | :--- |
| **[`list_modules`](#1-list_modules)** | Discovery | `filter` (optional) | `core_course_get_enrolled_courses_by_timeline_classification` |
| **[`check_module_updates`](#2-check_module_updates)** | Content Discovery | `courseId` (required) | `core_courseformat_get_state` + `core_get_fragment` |
| **[`sync_module`](#3-sync_module)** | Batch Pipeline | `courseId`, `outputDir`, `organizeBySection` | Direct Authenticated Binary Stream + WAF Bypass |
| **[`get_folder_contents`](#4-get_folder_contents)** | Extraction | `url` (required) | `/mod/folder/view.php` |
| **[`download_file`](#5-download_file)** | Single Download | `url`, `outputDir`, `customFilename` | `/mod/resource/view.php` / `/pluginfile.php` |
| **[`get_deadlines`](#6-get_deadlines)** | Calendar & Tasks | None | `/calendar/view.php?view=upcoming` |
| **[`get_announcements`](#7-get_announcements)** | Notifications | None | `/mod/forum/view.php` |
| **[`check_assignment_status`](#8-check_assignment_status)** | Submissions | `url` (required) | `/mod/assign/view.php` |
| **[`scrape_page`](#9-scrape_page)** | Generic Scraper | `url` (required) | Authenticated Headless Page Navigation |
| **[`set_session_cookie`](#10-set_session_cookie)** | Authentication | `value` (required) | Local Storage State Serializer |
| **[`interactive_login`](#11-interactive_login)** | Authentication | None | Microsoft 365 SSO Gateway (`login.microsoftonline.com`) |

---

## 1. `list_modules`

Discovers and enumerates enrolled courses for the authenticated student account. Supports timeline filtering and discovers starred courses without scraping the front dashboard DOM.

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `filter` | `string` | No | `"all"` | Filter criteria: `"all"`, `"starred"` (or `"favourites"`), `"inprogress"`, `"past"`, or `"future"`. |

### Invocation Example

```json
{
  "name": "list_modules",
  "arguments": {
    "filter": "starred"
  }
}
```

### Response Example

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
  },
  {
    "id": "9218",
    "name": "BM1043 - Information Systems Concepts [2026/JUL]",
    "shortname": "BM1043_2026_7_1",
    "url": "https://courseweb.sliit.lk/course/view.php?id=9218",
    "isStarred": true,
    "category": "2026 July",
    "startDate": 1784511480,
    "endDate": 1793583480
  }
]
```

---

## 2. `check_module_updates`

Retrieves the complete hierarchical section breakdown and activity tree for a specified course module. Automatically resolves dynamic sections in modern Moodle formats (`format_tiles`, `format_grid`, `format_topics`, and `format_weeks`).

<p align="center">
  <img src="https://raw.githubusercontent.com/dulithdivisekara/mcp-sliit-courseweb/main/assets/demo-updates.jpg" width="100%" alt="Discovered Module Updates and Dynamic Sections" style="border-radius: 8px; margin: 12px 0;" />
</p>

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `courseId` | `string` | Yes | None | Numeric identifier of the course (e.g. `"9220"`). |

### Invocation Example

```json
{
  "name": "check_module_updates",
  "arguments": {
    "courseId": "9220"
  }
}
```

### Response Example

```json
[
  {
    "id": "98840",
    "number": 6,
    "title": "Topic 7 : Employee Training and Development",
    "activities": [
      {
        "id": "496142",
        "name": "Lecture Slides - Employee Training and Development",
        "url": "https://courseweb.sliit.lk/mod/resource/view.php?id=496142",
        "type": "file",
        "videoUrl": "https://unistream.sliit.lk/dashboard/s/videos/view/3d644f3d-82d1-4cb7-a5ce-5cf98b1b2259"
      },
      {
        "id": "500232",
        "name": "Tutorial Sheet - Training Needs Assessment",
        "url": "https://courseweb.sliit.lk/mod/resource/view.php?id=500232",
        "type": "file",
        "meetingUrl": "https://teams.microsoft.com/meet/423055788976633?p=1VbC4Z"
      }
    ]
  }
]
```

---

## 3. `sync_module`

Performs an autonomous, recursive synchronization of all files across every section in a course module. Detects dynamic tiles, unpacks multi-file folders, verifies file integrity via MD5 hashing, and skips files that already exist on disk.

<p align="center">
  <img src="https://raw.githubusercontent.com/dulithdivisekara/mcp-sliit-courseweb/main/assets/proof-marks-103pages.jpg" width="100%" alt="Sync Module Marks Extraction and Document Archival" style="border-radius: 8px; margin: 12px 0;" />
</p>

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `courseId` | `string` | Yes | None | Numeric ID of the course module to synchronize. |
| `outputDir` | `string` | No | `"./downloads"` | Destination folder path on the local filesystem. |
| `organizeBySection` | `boolean` | No | `true` | When `true`, groups files into section directories (e.g. `Topic 1/`, `Topic 2/`). When `false`, places all files in the root folder. |

### Invocation Example

```json
{
  "name": "sync_module",
  "arguments": {
    "courseId": "9220",
    "outputDir": "/home/dulith/Projects/Arundi-courseweb/downloaded_materials/BM1045_Human_Resources_Management",
    "organizeBySection": true
  }
}
```

### Response Example

```json
{
  "courseId": "9220",
  "totalSections": 11,
  "downloadedCount": 38,
  "skippedCount": 8,
  "failedCount": 0,
  "destination": "/home/dulith/Projects/Arundi-courseweb/downloaded_materials/BM1045_Human_Resources_Management"
}
```

---

## 4. `get_folder_contents`

Recursively inspects a Moodle folder activity (`mod/folder`) and extracts the direct download links and names of all contained files and nested subdirectories.

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | Yes | None | Full URL of the folder activity (e.g. `https://courseweb.sliit.lk/mod/folder/view.php?id=492490`). |

### Invocation Example

```json
{
  "name": "get_folder_contents",
  "arguments": {
    "url": "https://courseweb.sliit.lk/mod/folder/view.php?id=492490"
  }
}
```

### Response Example

```json
[
  {
    "name": "Employee Grievance Policy.pdf",
    "url": "https://courseweb.sliit.lk/pluginfile.php/492490/mod_folder/content/0/Employee%20Grievance%20Policy.pdf?forcedownload=1"
  },
  {
    "name": "Disciplinary Procedures Guide.docx",
    "url": "https://courseweb.sliit.lk/pluginfile.php/492490/mod_folder/content/0/Disciplinary%20Procedures%20Guide.docx?forcedownload=1"
  }
]
```

---

## 5. `download_file`

Downloads a single file from Courseweb to local storage. Handles HTTP 302 redirects, extracts UTF-8 encoded filenames from `Content-Disposition`, infers file extensions from `Content-Type` headers, and automatically bypasses WAF 403 blocks.

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | Yes | None | Moodle resource URL (`mod/resource` or `pluginfile.php`). |
| `outputDir` | `string` | No | `"./downloads"` | Destination folder on the local filesystem. |
| `customFilename` | `string` | No | Empty | Optional custom name for the downloaded file. |

### Invocation Example

```json
{
  "name": "download_file",
  "arguments": {
    "url": "https://courseweb.sliit.lk/mod/resource/view.php?id=496142",
    "outputDir": "/home/dulith/Downloads",
    "customFilename": "HRM_Topic_7_Training.pptx"
  }
}
```

### Response Example

```json
{
  "success": true,
  "filename": "HRM_Topic_7_Training.pptx",
  "filePath": "/home/dulith/Downloads/HRM_Topic_7_Training.pptx",
  "bytes": 2854912,
  "status": "downloaded"
}
```

---

## 6. `get_deadlines`

Scrapes upcoming assignments, project milestones, quizzes, and cutoff deadlines directly from the authenticated student calendar feed.

<p align="center">
  <img src="https://raw.githubusercontent.com/dulithdivisekara/mcp-sliit-courseweb/main/assets/proof-deadline-alert.jpg" width="100%" alt="Upcoming Academic Deadlines and Cutoff Times" style="border-radius: 8px; margin: 12px 0;" />
</p>

### Parameters

*None.*

### Invocation Example

```json
{
  "name": "get_deadlines",
  "arguments": {}
}
```

### Response Example

```json
[
  {
    "name": "Final Research Report Submission",
    "course": "BM1045 - Human Resources Management",
    "dueDate": "Friday, 14 November 2026, 11:59 PM",
    "url": "https://courseweb.sliit.lk/mod/assign/view.php?id=512984",
    "remainingTime": "9 days 4 hours remaining"
  },
  {
    "name": "Information Systems Online Quiz 02",
    "course": "BM1043 - Information Systems Concepts",
    "dueDate": "Sunday, 16 November 2026, 6:00 PM",
    "url": "https://courseweb.sliit.lk/mod/quiz/view.php?id=513201",
    "remainingTime": "11 days remaining"
  }
]
```

---

## 7. `get_announcements`

Retrieves general site-wide news and academic announcements published on the main student bulletin board.

### Parameters

*None.*

### Invocation Example

```json
{
  "name": "get_announcements",
  "arguments": {}
}
```

### Response Example

```json
[
  {
    "title": "Semester Examination Timetable - 2026 July Intake",
    "author": "SLIIT Examination Division",
    "date": "02 Nov 2026, 14:30",
    "url": "https://courseweb.sliit.lk/mod/forum/discuss.php?d=48921",
    "preview": "The final timetable for the upcoming semester examinations has been published..."
  }
]
```

---

## 8. `check_assignment_status`

Inspects an assignment submission page (`mod/assign`) to determine whether work has been submitted, whether it has been graded, the remaining submission window, and any lecturer feedback or marksheet attachments.

<p align="center">
  <img src="https://raw.githubusercontent.com/dulithdivisekara/mcp-sliit-courseweb/main/assets/demo-marksheet.jpg" width="100%" alt="Assignment Status and Lecturer Marksheet Feedback" style="border-radius: 8px; margin: 12px 0;" />
</p>

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | Yes | None | Full URL to the assignment activity. |

### Invocation Example

```json
{
  "name": "check_assignment_status",
  "arguments": {
    "url": "https://courseweb.sliit.lk/mod/assign/view.php?id=498721"
  }
}
```

### Response Example

```json
{
  "submissionStatus": "Submitted for grading",
  "gradingStatus": "Graded",
  "timeRemaining": "Assignment was submitted 2 days early",
  "lastModified": "28 October 2026, 10:14 AM",
  "submissionFiles": [
    {
      "name": "IT21045920_HRM_Report.pdf",
      "url": "https://courseweb.sliit.lk/mod/assign/viewfile.php?id=498721&sid=10294"
    }
  ],
  "grade": "88.00 / 100.00",
  "gradedBy": "Dr. A. Perera",
  "feedbackComments": "Comprehensive literature review and strong analysis of employee motivation theories."
}
```

---

## 9. `scrape_page`

Extracts clean, readable Markdown text from any authenticated Courseweb page. Strips navigation bars, footers, and scripts, making it ideal for feeding raw course notices or syllabus pages into LLM reasoning contexts.

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `url` | `string` | Yes | None | Target Courseweb URL to scrape. |

### Invocation Example

```json
{
  "name": "scrape_page",
  "arguments": {
    "url": "https://courseweb.sliit.lk/course/info.php?id=9220"
  }
}
```

### Response Example

```json
{
  "title": "BM1045 Human Resources Management - Course Overview",
  "url": "https://courseweb.sliit.lk/course/info.php?id=9220",
  "content": "Course Description:\nThis module introduces students to the core concepts of HRM...\n\nCourse Coordinators:\n- Ms. S. Jayasinghe\n\nPrerequisites: None"
}
```

---

## 10. `set_session_cookie`

Injects an active `MoodleSession` token into the local authentication storage (`storage_state.json`). Used for headless servers, Docker containers, or remote workstations where interactive browser sign-in cannot be displayed.

### Parameters

| Name | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | Yes | None | Active `MoodleSession` cookie value extracted from Developer Tools. |

### Invocation Example

```json
{
  "name": "set_session_cookie",
  "arguments": {
    "value": "t8egaudc5h2b0t4v01ridbnvlc"
  }
}
```

### Response Example

```json
{
  "success": true,
  "message": "Session cookie updated and saved to storage_state.json",
  "expires": "Session"
}
```

---

## 11. `interactive_login`

Launches a visible Google Chrome window directing the student to the SLIIT Microsoft Entra ID authentication page. Once Single Sign-On and Multi-Factor Authentication (MFA) are completed, the server captures the session cookies, writes `storage_state.json`, and closes the browser window.

### Parameters

*None.*

### Invocation Example

```json
{
  "name": "interactive_login",
  "arguments": {}
}
```

### Response Example

```json
{
  "success": true,
  "message": "Authentication successful. Active session saved to storage_state.json.",
  "user": "it21000000@my.sliit.lk"
}
```
