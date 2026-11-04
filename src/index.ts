import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CoursewebClient } from "./courseweb.js";
import { z } from "zod";

const server = new Server(
  {
    name: "courseweb-mcp",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const client = new CoursewebClient();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_modules",
        description: "List enrolled modules on SLIIT Courseweb with optional status/starred filtering",
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              description: "Optional filter: 'all' (default), 'starred' (or 'favourites'), 'inprogress', 'past', or 'future'",
              enum: ["all", "starred", "favourites", "inprogress", "past", "future"],
            },
          },
        },
      },
      {
        name: "get_announcements",
        description: "Get general site announcements from Courseweb",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "check_module_updates",
        description: "Retrieve complete module structure, sections, activities, and materials (supports format_tiles, topics, and weeks)",
        inputSchema: {
          type: "object",
          properties: {
            courseId: {
              type: "string",
              description: "The ID of the course to inspect (e.g. 9220)",
            },
          },
          required: ["courseId"],
        },
      },
      {
        name: "get_deadlines",
        description: "Fetch upcoming assignment deadlines and calendar events from Courseweb",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "scrape_page",
        description: "Scrape the text content of any Courseweb URL to investigate layouts",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to scrape",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "download_file",
        description: "Download a file from Courseweb given its resource URL (handles WAF bypass, MIME extensions, and deduplication)",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The Moodle resource URL to download from",
            },
            outputDir: {
              type: "string",
              description: "Optional: Directory to save the file. Defaults to ./downloads",
            },
            customFilename: {
              type: "string",
              description: "Optional: Custom filename override",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "get_folder_contents",
        description: "Inspect and list all downloadable files inside a Moodle folder resource (mod/folder)",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The Moodle folder URL (e.g. https://courseweb.sliit.lk/mod/folder/view.php?id=492490)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "sync_module",
        description: "Bulk download all materials, slides, tutorials, and folder files from a course module",
        inputSchema: {
          type: "object",
          properties: {
            courseId: {
              type: "string",
              description: "The ID of the course to sync (e.g. 9220)",
            },
            outputDir: {
              type: "string",
              description: "Optional: Directory to save the files. Defaults to ./downloads",
            },
            organizeBySection: {
              type: "boolean",
              description: "Optional: Whether to organize files into subfolders by section name. Defaults to true",
            },
          },
          required: ["courseId"],
        },
      },
      {
        name: "check_assignment_status",
        description: "Check the submission status, grading status, and feedback for a specific assignment",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The Moodle assignment URL (e.g. mod/assign/view.php?id=123)",
            },
          },
          required: ["url"],
        },
      },
      {
        name: "set_session_cookie",
        description: "Manually inject the MoodleSession cookie value from DevTools",
        inputSchema: {
          type: "object",
          properties: {
            value: {
              type: "string",
              description: "The value of the 'MoodleSession' cookie",
            },
          },
          required: ["value"],
        },
      },
      {
        name: "interactive_login",
        description: "Launch a browser window to authenticate with Microsoft SSO / MFA and save session state",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (request.params.name === "interactive_login") {
      const result = await client.interactiveLogin();
      return {
        content: [{ type: "text", text: result }],
      };
    }

    await client.init();
    await client.login();

    switch (request.params.name) {
      case "download_file": {
        const args = z.object({
          url: z.string(),
          outputDir: z.string().optional(),
          customFilename: z.string().optional()
        }).parse(request.params.arguments);
        const path = await client.downloadFile(args.url, args.outputDir, args.customFilename);
        return {
          content: [{ type: "text", text: `Successfully downloaded file to: ${path}` }],
        };
      }
      case "get_folder_contents": {
        const { url } = z.object({ url: z.string() }).parse(request.params.arguments);
        const files = await client.getFolderContents(url);
        return {
          content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
        };
      }
      case "scrape_page": {
        const { url } = z.object({ url: z.string() }).parse(request.params.arguments);
        const data = await client.scrapePage(url);
        return {
          content: [{ type: "text", text: data }],
        };
      }
      case "set_session_cookie": {
        const { value } = z.object({ value: z.string() }).parse(request.params.arguments);
        const result = await client.setSessionCookie(value);
        return {
          content: [{ type: "text", text: result }],
        };
      }
      case "sync_module": {
        const args = z.object({
          courseId: z.string(),
          outputDir: z.string().optional(),
          organizeBySection: z.boolean().optional()
        }).parse(request.params.arguments);
        const results = await client.syncModule(args.courseId, args.outputDir, args.organizeBySection ?? true);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }
      case "check_assignment_status": {
        const { url } = z.object({ url: z.string() }).parse(request.params.arguments);
        const status = await client.checkAssignmentStatus(url);
        return {
          content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
        };
      }
      case "list_modules": {
        const args = z.object({
          filter: z.enum(["all", "starred", "favourites", "inprogress", "past", "future"]).optional()
        }).optional().parse(request.params.arguments);
        const courses = await client.getEnrolledCourses(args?.filter || "all");
        return {
          content: [{ type: "text", text: JSON.stringify(courses, null, 2) }],
        };
      }
      case "get_announcements": {
        const announcements = await client.getSiteAnnouncements();
        return {
          content: [{ type: "text", text: JSON.stringify(announcements, null, 2) }],
        };
      }
      case "check_module_updates": {
        const { courseId } = z.object({ courseId: z.string() }).parse(request.params.arguments);
        const content = await client.getModuleContent(courseId);
        return {
          content: [{ type: "text", text: JSON.stringify(content, null, 2) }],
        };
      }
      case "get_deadlines": {
        const deadlines = await client.getDeadlines();
        return {
          content: [{ type: "text", text: JSON.stringify(deadlines, null, 2) }],
        };
      }
      default:
        throw new Error("Unknown tool");
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  } finally {
    await client.close();
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Courseweb MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
