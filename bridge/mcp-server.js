/**
 * BARAK Brain — Remote MCP HTTP Server
 * Exposes OVTLYR + TradingView tools over HTTP so Claude.ai (iPhone) can use them.
 *
 * Transport: MCP Streamable HTTP (POST /mcp)
 * Tunnel:    cloudflared provides the public HTTPS URL
 *
 * Usage:
 *   node bridge/mcp-server.js
 */
import 'dotenv/config';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { executeOvtlyrTool } from '../brain/tools/ovtlyr-tools.js';
import { executeTvTool } from '../brain/tools/tv-tools.js';
import { getOvtlyrContext } from '../brain/knowledge/ovtlyr.js';

const PORT = process.env.MCP_PORT || 3333;

const INSTRUCTIONS = `You are connected to BARAK Brain — a live trading intelligence system.

Tools available:
- ovtlyr_dashboard   → SPY + QQQ 9-layer scores, BUY/SELL signal, price
- ovtlyr_screener    → Top BUY stocks sorted by 9-confirmation score
- ovtlyr_sector_map  → Sector performance + fear/greed heatmap
- tv_get_quote       → Real-time price (requires TradingView open in Chrome)
- tv_get_indicators  → EMA, RSI, MACD values from chart
- tv_health          → Check if TradingView is connected

${getOvtlyrContext('full')}

RULES:
- Always check dashboard first (SPY/QQQ scores)
- QQQ < 5/9 or SELL → recommend Plan SICADFU (BOXX)
- SPY ≥ 6/9 BUY → check sector map, then screener
- Never recommend selling options — only buy deep ITM calls (~80 delta)
- Avoid Healthcare sector stocks always
`;

function buildServer() {
  const server = new McpServer(
    { name: 'barak-brain', version: '1.0.0' },
    { instructions: INSTRUCTIONS },
  );

  server.tool(
    'ovtlyr_dashboard',
    'Read live OVTLYR dashboard: SPY and QQQ 9-layer scores, BUY/SELL signals, prices, and Bull List count.',
    {},
    async () => {
      try {
        const text = await executeOvtlyrTool('ovtlyr_dashboard', {});
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    },
  );

  server.tool(
    'ovtlyr_sector_map',
    'Read OVTLYR Sector Intelligence Map — sector performance across 1D/1W/1M/3M/6M and fear/greed status.',
    {},
    async () => {
      try {
        const text = await executeOvtlyrTool('ovtlyr_sector_map', {});
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    },
  );

  server.tool(
    'ovtlyr_screener',
    'Get top BUY stocks from the OVTLYR screener, sorted by 9-confirmation score. Each row shows symbol, score, sector, price, heat map %, signal return %, and signal date.',
    {
      screener_name: z.string().optional().describe('Saved screener name: barak1, barak2, barak4 (default: barak1)'),
    },
    async ({ screener_name }) => {
      try {
        const text = await executeOvtlyrTool('ovtlyr_screener', { screener_name: screener_name || 'barak1' });
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    },
  );

  server.tool(
    'tv_get_quote',
    'Get real-time price quote for a symbol. Requires TradingView open in Chrome with CDP.',
    {
      symbol: z.string().describe('Ticker symbol e.g. SPY, QQQ, AAPL, FTNT'),
    },
    async ({ symbol }) => {
      try {
        const text = await executeTvTool('tv_get_quote', { symbol });
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    },
  );

  server.tool(
    'tv_get_indicators',
    'Get current EMA, RSI, MACD and other indicator values from TradingView chart. Requires TradingView open.',
    {
      symbol: z.string().describe('Ticker symbol to analyze'),
    },
    async ({ symbol }) => {
      try {
        const text = await executeTvTool('tv_get_indicators', { symbol });
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    },
  );

  server.tool(
    'tv_health',
    'Check if TradingView is connected and responding via CDP.',
    {},
    async () => {
      try {
        const text = await executeTvTool('tv_health', {});
        return { content: [{ type: 'text', text }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }] };
      }
    },
  );

  return server;
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', server: 'barak-brain-mcp', port: PORT }));

app.post('/mcp', async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close().catch(() => {}));
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('[MCP] Error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.get('/mcp', async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => transport.close().catch(() => {}));
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error('[MCP] Error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\nBARAK Brain MCP server — http://localhost:${PORT}/mcp`);
  console.log('Waiting for Cloudflare tunnel URL...\n');
});
