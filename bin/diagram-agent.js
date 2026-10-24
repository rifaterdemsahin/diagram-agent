#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateDiagram, generateMermaidDiagram, generateExcalidrawDiagram } = require('../src/agent.js');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
AI Diagram Agent CLI
====================

Usage:
  node bin/diagram-agent.js [options] "<prompt>"

Options:
  --format <mermaid|excalidraw|both>   Output format (default: mermaid)
  --type <flowchart|sequence|state>    Mermaid diagram type (default: flowchart)
  --palette <warm|blueprint|mono>      Excalidraw color palette
  --output <file>                      Save diagram directly to file
  --help, -h                           Show this help message

Examples:
  node bin/diagram-agent.js "Kubernetes ingress to microservice cluster with redis cache"
  node bin/diagram-agent.js --format mermaid --type sequence "OAuth2 Authorization Code flow"
  node bin/diagram-agent.js --format excalidraw --output board.excalidraw.json "Bot fleet state map"
`);
    process.exit(0);
  }

  let format = 'mermaid';
  let diagramType = 'flowchart';
  let palette = 'warm';
  let outputFile = null;
  const promptParts = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) {
      format = args[++i];
    } else if (args[i] === '--type' && args[i + 1]) {
      diagramType = args[++i];
    } else if (args[i] === '--palette' && args[i + 1]) {
      palette = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[++i];
    } else {
      promptParts.push(args[i]);
    }
  }

  const prompt = promptParts.join(' ').trim();
  if (!prompt) {
    console.error('Error: Please provide a prompt description.');
    process.exit(1);
  }

  console.log(`🤖 Diagram Agent synthesizing [${format.toUpperCase()}] for: "${prompt}"...`);

  if (format === 'mermaid') {
    const res = await generateMermaidDiagram(prompt, diagramType);
    if (outputFile) {
      fs.writeFileSync(outputFile, res.code, 'utf8');
      console.log(`Saved Mermaid diagram to ${outputFile}`);
    } else {
      console.log('\n--- Mermaid Diagram ---');
      console.log(res.code);
      console.log('-----------------------\n');
    }
  } else if (format === 'excalidraw') {
    const res = await generateExcalidrawDiagram(prompt, palette);
    const jsonStr = JSON.stringify(res.diagram, null, 2);
    if (outputFile) {
      fs.writeFileSync(outputFile, jsonStr, 'utf8');
      console.log(`Saved Excalidraw JSON to ${outputFile}`);
    } else {
      console.log('\n--- Excalidraw JSON ---');
      console.log(jsonStr);
      console.log('-----------------------\n');
    }
  } else {
    const res = await generateDiagram({ prompt, format: 'both', diagramType, palette });
    console.log('\n--- Mermaid ---');
    console.log(res.mermaid.code);
    console.log('\n--- Excalidraw Elements ---');
    console.log(`Generated ${res.excalidraw.diagram?.elements?.length || 0} Excalidraw elements.`);
  }
}

main().catch((err) => {
  console.error('CLI execution error:', err.message);
  process.exit(1);
});
