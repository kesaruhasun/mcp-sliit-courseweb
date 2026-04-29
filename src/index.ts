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
    version: "1.0.0",
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
        description: "List all enrolled modules on SLIIT Courseweb",
        inputSchema: {
          type: "object",
          properties: {},
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
        description: "Check for new materials or announcements in a specific module",
        inputSchema: {
          type: "object",
          properties: {
            courseId: {
              type: "string",
              description: "The ID of the course to check",
            },
          },
          required: ["courseId"],
        },
      },
      {
        name: "get_deadlines",
        description: "Fetch all upcoming assignment deadlines and events from Courseweb",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "scrape_page",
        description: "Scrape the text content of any Courseweb URL to investigate the layout",
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
        description: "Download a file from Courseweb (e.g. PDFs, lab sheets) given its resource URL",
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
            }
          },
          required: ["url"],
        },
      },
      {
        name: "sync_module",
        description: "Bulk download all files (PDFs, lab sheets, etc.) from a specific course module",
        inputSchema: {
          type: "object",
          properties: {
            courseId: {
              type: "string",
              description: "The ID of the course to sync (e.g. 8805)",
            },
            outputDir: {
              type: "string",
              description: "Optional: Directory to save the files. Defaults to ./downloads",
            }
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
        name: "interactive_login",
        description: "Open a browser window to manually log in to SLIIT Courseweb (useful for MFA)",
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
        const args = z.object({ url: z.string(), outputDir: z.string().optional() }).parse(request.params.arguments);
        const path = await client.downloadFile(args.url, args.outputDir);
        return {
          content: [{ type: "text", text: `Successfully downloaded file to: ${path}` }],
        };
      }
      case "scrape_page": {
        const { url } = z.object({ url: z.string() }).parse(request.params.arguments);
        const data = await client.scrapePage(url);
        return {
          content: [{ type: "text", text: data }],
        };
      }
      case "sync_module": {
        const args = z.object({ courseId: z.string(), outputDir: z.string().optional() }).parse(request.params.arguments);
        const results = await client.syncModule(args.courseId, args.outputDir);
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
        const courses = await client.getEnrolledCourses();
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
