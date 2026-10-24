/**
 * AI Diagram Agent Engine
 * Supports generating both Mermaid and Excalidraw diagrams via Mimo LLM
 */

const MIMO_BASE_URL = process.env.MIMO_BASE_URL || 'https://token-plan-ams.xiaomimimo.com/v1';
const MIMO_API_KEY = process.env.MIMO_API_KEY || '';
const MIMO_MODEL = process.env.MIMO_MODEL || 'mimo-v2.6-flash';

async function callMimoLLM(messages, temperature = 0.3) {
  if (!MIMO_API_KEY) {
    throw new Error('MIMO_API_KEY is not set');
  }

  const endpoint = `${MIMO_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MIMO_API_KEY}`
    },
    body: JSON.stringify({
      model: MIMO_MODEL,
      messages,
      temperature,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mimo API responded with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate a Mermaid diagram from a prompt
 */
async function generateMermaidDiagram(prompt, diagramType = 'flowchart') {
  const systemPrompt = `You are an expert software architect and technical diagramming specialist.
Your task is to generate a clean, modern, syntactically flawless Mermaid diagram based on the user's request.

Rules:
1. Output ONLY the raw Mermaid diagram code inside a \`\`\`mermaid code block (or pure Mermaid text).
2. Do not include markdown introductions or explanations outside the code block.
3. Use modern, clean Mermaid syntax:
   - For architecture/flow: flowchart TD or flowchart LR
   - For sequences: sequenceDiagram with autonumber
   - For states: stateDiagram-v2
   - For classes: classDiagram
   - For databases: erDiagram
   - For git workflows: gitGraph
4. Use clear, readable labels, subgraphs for grouping when appropriate, and distinct styling/colors if helpful.
5. Strictly avoid syntax errors: quote labels containing parentheses, spaces or special symbols e.g. ["Node Label (Detail)"] instead of [Node Label (Detail)].`;

  const userMessage = `Create a ${diagramType} diagram for the following description:
"${prompt}"`;

  try {
    const rawOutput = await callMimoLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]);

    // Extract code block
    const match = rawOutput.match(/```(?:mermaid)?([\s\S]*?)```/i);
    const code = (match ? match[1] : rawOutput).trim();
    return {
      success: true,
      code,
      format: 'mermaid',
      model: MIMO_MODEL
    };
  } catch (err) {
    console.error('Error in generateMermaidDiagram:', err.message);
    // Fallback template based on prompt keywords
    return {
      success: false,
      error: err.message,
      code: getFallbackMermaid(prompt),
      format: 'mermaid',
      isFallback: true
    };
  }
}

/**
 * Generate an Excalidraw diagram JSON structure from a prompt
 */
async function generateExcalidrawDiagram(prompt, palette = 'warm') {
  const systemPrompt = `You are an expert diagram designer specialized in Excalidraw.
Generate a valid Excalidraw JSON document containing elements for the user request.
The output MUST be a JSON object with:
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excaligen.local",
  "elements": [
    // array of valid Excalidraw elements (rectangle, text, arrow, ellipse, etc.)
  ],
  "appState": {
    "viewBackgroundColor": "#fcfaf7"
  }
}

Element requirements:
- Each element must have: id (string), type ("rectangle"|"text"|"arrow"|"ellipse"), x (number), y (number), width (number), height (number), strokeColor (string), strokeWidth (number), roughness (number).
- Rectangles should have roundness: { "type": 2 or 3 }, backgroundColor (string), fillStyle ("solid"|"hachure").
- Text elements must have: text (string), fontSize (number), fontFamily (1 for hand-drawn), strokeColor (string).
- Arrows must have points: [[0,0], [dx, dy]].
- Coordinate elements neatly so labels sit on or near their shapes without clipping (canvas width approx 900, height 600).
- Output ONLY valid JSON inside a \`\`\`json code block. No additional commentary.`;

  const userMessage = `Create an Excalidraw diagram for: "${prompt}" using a clean visual palette (${palette}).`;

  try {
    const rawOutput = await callMimoLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ], 0.2);

    const match = rawOutput.match(/```(?:json)?([\s\S]*?)```/i);
    const jsonStr = (match ? match[1] : rawOutput).trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed.elements || !Array.isArray(parsed.elements)) {
      throw new Error('Invalid Excalidraw JSON: elements array missing');
    }

    return {
      success: true,
      diagram: parsed,
      format: 'excalidraw',
      model: MIMO_MODEL
    };
  } catch (err) {
    console.error('Error in generateExcalidrawDiagram:', err.message);
    return {
      success: false,
      error: err.message,
      diagram: getFallbackExcalidraw(prompt, palette),
      format: 'excalidraw',
      isFallback: true
    };
  }
}

/**
 * Unified generation entrypoint
 */
async function generateDiagram({ prompt, format = 'auto', diagramType = 'flowchart', palette = 'warm' }) {
  if (format === 'mermaid') {
    const mermaid = await generateMermaidDiagram(prompt, diagramType);
    return { mermaid };
  } else if (format === 'excalidraw') {
    const excalidraw = await generateExcalidrawDiagram(prompt, palette);
    return { excalidraw };
  } else {
    // Generate both in parallel
    const [mermaid, excalidraw] = await Promise.all([
      generateMermaidDiagram(prompt, diagramType),
      generateExcalidrawDiagram(prompt, palette)
    ]);
    return { mermaid, excalidraw };
  }
}

// Fallback generators in case network/vault keys are unavailable
function getFallbackMermaid(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes('sequence') || p.includes('auth') || p.includes('login')) {
    return `sequenceDiagram
    autonumber
    actor User as User Browser
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant DB as Database

    User->>Gateway: POST /api/login (credentials)
    Gateway->>Auth: Validate Credentials
    Auth->>DB: Query User & Hash
    DB-->>Auth: User Record
    Auth->>Auth: Verify Argon2/Bcrypt Hash
    Auth-->>Gateway: Issue Signed JWT
    Gateway-->>User: 200 OK + Auth Cookie
    User->>Gateway: GET /api/dashboard (Bearer Token)
    Gateway-->>User: 200 OK (Protected Data)`;
  }

  if (p.includes('state') || p.includes('lifecycle')) {
    return `stateDiagram-v2
    [*] --> Idle: Initialize
    Idle --> Processing: Job Dispatched
    Processing --> Validating: Run Checks
    Validating --> Succeeded: All Passed
    Validating --> Failed: Validation Error
    Failed --> Retrying: Auto Retry (< 3)
    Retrying --> Processing
    Failed --> DeadLetter: Retries Exhausted
    Succeeded --> Idle: Reset
    DeadLetter --> [*]`;
  }

  return `flowchart TD
    subgraph Client["Client Layer"]
        UI["Web & Mobile Apps"]
        CLI["Developer CLI / SDK"]
    end

    subgraph Gateway["Edge & Gateway"]
        APIGW["API Gateway (Rate Limiter)"]
        WAF["Web Application Firewall"]
    end

    subgraph Services["Core Microservices"]
        AuthSvc["Auth & Session Service"]
        DiagSvc["Diagram Generation Agent"]
        QueueSvc["Task Queue (Redis / BullMQ)"]
    end

    subgraph Storage["Data & Cache"]
        Postgres[("Primary DB (PostgreSQL)")]
        BlobStore[("Object Storage (S3 / R2)")]
    end

    UI --> WAF
    CLI --> WAF
    WAF --> APIGW
    APIGW --> AuthSvc
    APIGW --> DiagSvc
    DiagSvc --> QueueSvc
    AuthSvc --> Postgres
    DiagSvc --> BlobStore`;
}

function getFallbackExcalidraw(prompt, palette = 'warm') {
  const randomId = () => Math.random().toString(36).substring(2, 10);
  const elements = [
    {
      id: randomId(),
      type: "rectangle",
      x: 350,
      y: 80,
      width: 220,
      height: 70,
      strokeColor: "#1e1e1e",
      backgroundColor: "#e0e7ff",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 1.2,
      roundness: { type: 3 }
    },
    {
      id: randomId(),
      type: "text",
      x: 380,
      y: 105,
      text: "AI DIAGRAM CORE",
      fontSize: 16,
      fontFamily: 1,
      strokeColor: "#1e1e1e"
    },
    {
      id: randomId(),
      type: "rectangle",
      x: 100,
      y: 260,
      width: 200,
      height: 80,
      strokeColor: "#1e1e1e",
      backgroundColor: "#ffffff",
      strokeWidth: 2,
      roundness: { type: 2 }
    },
    {
      id: randomId(),
      type: "text",
      x: 120,
      y: 285,
      text: "Input Prompt / Code\\n(Mermaid & Natural Lang)",
      fontSize: 13,
      fontFamily: 1,
      strokeColor: "#1e1e1e"
    },
    {
      id: randomId(),
      type: "rectangle",
      x: 620,
      y: 260,
      width: 200,
      height: 80,
      strokeColor: "#1e1e1e",
      backgroundColor: "#ffffff",
      strokeWidth: 2,
      roundness: { type: 2 }
    },
    {
      id: randomId(),
      type: "text",
      x: 640,
      y: 285,
      text: "Visual Canvas Render\\n(Excalidraw & SVG Export)",
      fontSize: 13,
      fontFamily: 1,
      strokeColor: "#1e1e1e"
    },
    {
      id: randomId(),
      type: "arrow",
      x: 460,
      y: 150,
      points: [[0, 0], [-260, 110]],
      strokeColor: "#1e1e1e",
      strokeWidth: 2
    },
    {
      id: randomId(),
      type: "arrow",
      x: 460,
      y: 150,
      points: [[0, 0], [260, 110]],
      strokeColor: "#1e1e1e",
      strokeWidth: 2
    }
  ];

  return {
    type: "excalidraw",
    version: 2,
    source: "https://excaligen.local",
    elements,
    appState: { viewBackgroundColor: "#fcfaf7" }
  };
}

module.exports = {
  generateDiagram,
  generateMermaidDiagram,
  generateExcalidrawDiagram,
  getFallbackMermaid,
  getFallbackExcalidraw
};
