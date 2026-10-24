# AI Diagram Generator Agent 🎨🤖

A production-ready **AI Diagram Generator & Instant Workspace** supporting both **Mermaid.js** (architectures, flowcharts, sequences, state diagrams, ER schemas) and **Excalidraw** (hand-drawn style canvas, direct live collaboration, and `.excalidraw.json` exports).

Powered by the **Mimo AI Engine** (`mimo-v2.6-flash`) with credentials managed through **Azure Key Vault**.

---

## ✨ Features

- **Multi-Engine Rendering**:
  - **Mermaid Vector Engine**: Live SVG rendering, real-time code editor, pan/zoom, SVG export, and one-click code copy.
  - **Excalidraw Hand-drawn Canvas**: Interactive preview, one-click copy for Excalidraw (`Ctrl+V`), `.excalidraw.json` file downloads, and free live collaboration guide.
- **Natural Language Synthesis**: Describe architectures or workflows in plain English, and the AI agent automatically synthesizes valid Mermaid code and Excalidraw models.
- **Password Protection**: Secured with HTTP Basic Authentication:
  - **Username**: `rifaterdemsahin`
  - **Password**: `Welcome.Oct.SH.9!`
- **Model Context Protocol (MCP)**: Native MCP Server with tools for Claude Desktop, Cursor, and Antigravity CLI.
- **CLI Agent**: Fast terminal generation tool (`diagram-agent`).
- **Global Deployment**: Configured for instant deployment on [Fly.io](https://fly.io) at `https://diagram-agent.fly.dev`.

---

## 🚀 Quick Start

### 1. Local Run

```bash
# Install dependencies
npm install

# Start local server on http://localhost:3000
npm start
```

Visit `http://localhost:3000` and sign in with the credentials:
- **User**: `rifaterdemsahin`
- **Pass**: `Welcome.Oct.SH.9!`

### 2. CLI Usage

Generate diagrams directly from your terminal:

```bash
# Generate Mermaid flowchart
node bin/diagram-agent.js "Kubernetes ingress to microservice cluster with redis cache"

# Generate Sequence Diagram
node bin/diagram-agent.js --format mermaid --type sequence "OAuth2 Authorization Code flow"

# Generate Excalidraw JSON to a file
node bin/diagram-agent.js --format excalidraw --output board.excalidraw.json "Bot fleet state map"
```

---

## 🔌 Model Context Protocol (MCP) Server

This project includes an MCP server conforming to `@modelcontextprotocol/sdk`.

### Available Tools:
1. `generate_mermaid_diagram`: Generates valid Mermaid diagram code from natural language.
2. `generate_excalidraw_diagram`: Generates an Excalidraw diagram JSON object.
3. `validate_mermaid_syntax`: Validates diagram syntax.

### Configuration (`.mcp-config.json`):

```json
{
  "mcpServers": {
    "diagram-agent": {
      "command": "node",
      "args": ["src/mcp-server.js"],
      "env": {
        "MIMO_BASE_URL": "https://token-plan-ams.xiaomimimo.com/v1",
        "MIMO_MODEL": "mimo-v2.6-flash"
      }
    }
  }
}
```

Run via stdio:
```bash
npm run mcp
```

---

## ☁️ Deployment on Fly.io

The application is deployed to **Fly.io** using the app name `diagram-agent`.

```bash
# Deploy with secrets configured
flyctl deploy
```

Live URL: `https://diagram-agent.fly.dev`
