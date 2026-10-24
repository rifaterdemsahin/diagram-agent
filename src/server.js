require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const basicAuth = require('basic-auth');
const { generateDiagram } = require('./agent');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurable credentials (defaulting to the specified password protection)
const AUTH_USER = process.env.AUTH_USER || 'rifaterdemsahin';
const AUTH_PASS = process.env.AUTH_PASS || 'Welcome.Oct.SH.9!';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint (unauthenticated for Fly.io platform probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mimoConfigured: Boolean(process.env.MIMO_API_KEY)
  });
});

// Basic Authentication Middleware
const authMiddleware = (req, res, next) => {
  const credentials = basicAuth(req);

  if (!credentials || credentials.name !== AUTH_USER || credentials.pass !== AUTH_PASS) {
    res.setHeader('WWW-Authenticate', 'Basic realm="AI Diagram Generator"');
    return res.status(401).send('Access denied: Authentication required.');
  }

  next();
};

// Protect everything else with Basic Auth
app.use(authMiddleware);

// API: Generate Diagrams
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, format, diagramType, palette } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await generateDiagram({
      prompt,
      format: format || 'auto',
      diagramType: diagramType || 'flowchart',
      palette: palette || 'warm'
    });

    res.json(result);
  } catch (err) {
    console.error('API /api/generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AI Diagram Generator running on http://0.0.0.0:${PORT}`);
  console.log(`🔒 Password protection active for user: ${AUTH_USER}`);
});
