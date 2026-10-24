#!/usr/bin/env node
require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { generateMermaidDiagram, generateExcalidrawDiagram } = require('./agent.js');

const server = new Server(
  {
    name: 'diagram-agent-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_mermaid_diagram',
        description: 'Generate a clean, syntactically valid Mermaid diagram (Flowchart, Sequence, Architecture, State, ER, etc.) using AI.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Description of the architecture, workflow, sequence, or system to diagram.',
            },
            diagramType: {
              type: 'string',
              enum: ['flowchart', 'sequence', 'state', 'class', 'er', 'gitGraph'],
              description: 'Type of Mermaid diagram to generate (default: flowchart).',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'generate_excalidraw_diagram',
        description: 'Generate an Excalidraw diagram JSON structure with shapes, connectors, and hand-drawn styling from a prompt.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Description of the diagram layout and elements.',
            },
            palette: {
              type: 'string',
              enum: ['warm', 'blueprint', 'monochrome', 'vibrant'],
              description: 'Color theme palette (default: warm).',
            },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'validate_mermaid_syntax',
        description: 'Basic syntax checker for Mermaid diagram definitions.',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The raw Mermaid diagram string to validate.',
            },
          },
          required: ['code'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'generate_mermaid_diagram') {
      const { prompt, diagramType = 'flowchart' } = args || {};
      const result = await generateMermaidDiagram(prompt, diagramType);
      return {
        content: [
          {
            type: 'text',
            text: result.code,
          },
        ],
      };
    }

    if (name === 'generate_excalidraw_diagram') {
      const { prompt, palette = 'warm' } = args || {};
      const result = await generateExcalidrawDiagram(prompt, palette);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.diagram, null, 2),
          },
        ],
      };
    }

    if (name === 'validate_mermaid_syntax') {
      const { code } = args || {};
      if (!code || typeof code !== 'string') {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Error: code must be a non-empty string' }],
        };
      }
      const validStarters = ['flowchart', 'graph', 'sequenceDiagram', 'stateDiagram', 'classDiagram', 'erDiagram', 'gitGraph', 'gantt', 'pie'];
      const firstLine = code.trim().split('\n')[0].trim();
      const isValid = validStarters.some((s) => firstLine.startsWith(s));
      return {
        content: [
          {
            type: 'text',
            text: isValid
              ? `Valid Mermaid diagram header detected: "${firstLine}". Lines: ${code.split('\n').length}`
              : `Warning: First line "${firstLine}" does not start with standard Mermaid keywords (${validStarters.join(', ')}).`,
          },
        ],
      };
    }

    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool error: ${error.message}` }],
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Diagram Agent MCP Server running on stdio');
}

run().catch((err) => {
  console.error('Fatal error in MCP Server:', err);
  process.exit(1);
});
