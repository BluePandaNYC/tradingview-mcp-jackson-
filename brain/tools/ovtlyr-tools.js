/**
 * OVTLYR CDP tools — reads live signal data from the OVTLYR console browser.
 */
import CDP from 'chrome-remote-interface';

async function getOvtlyrClient() {
  const resp = await fetch('http://localhost:9222/json/list');
  const targets = await resp.json();
  const target = targets.find(t => t.type === 'page' && /ovtlyr/i.test(t.url));
  if (!target) throw new Error('OVTLYR browser tab not found. Open console.ovtlyr.com first.');
  const client = await CDP({ host: 'localhost', port: 9222, target: target.id });
  await client.Runtime.enable();
  await client.Page.enable();
  return client;
}

/** Poll document.body.innerText until a condition is met or timeout. */
async function pollForContent(client, isReady, maxMs = 12000, sliceChars = 6000) {
  const start = Date.now();
  let content = '';
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 1000));
    const res = await client.Runtime.evaluate({
      expression: `document.body.innerText.substring(0, ${sliceChars})`,
      returnByValue: true,
    });
    content = res.result.value || '';
    if (isReady(content)) break;
  }
  return content;
}

/**
 * Tool definitions for Anthropic tool_use.
 */
export const OVTLYR_TOOL_DEFS = [
  {
    name: 'ovtlyr_dashboard',
    description: 'Read OVTLYR dashboard: SPY and QQQ confirmation scores (out of 9), signals (BUY/SELL), prices, and Bull List count.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'ovtlyr_sector_map',
    description: 'Read OVTLYR Sector Intelligence Map — shows which sectors are bullish/bearish and fear/greed status.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'ovtlyr_screener',
    description: 'Read current stocks from the OVTLYR Nine screener (stocks meeting the 9-confirmation criteria).',
    input_schema: {
      type: 'object',
      properties: {
        screener_name: { type: 'string', description: 'Name of saved screener: barak1, barak2, barak4, barak12, or "Barak buy"', default: 'barak1' },
      },
    },
  },
];

/**
 * Execute an OVTLYR tool call.
 */
export async function executeOvtlyrTool(name, input) {
  let client;
  try {
    client = await getOvtlyrClient();

    switch (name) {
      case 'ovtlyr_dashboard': {
        // SPY dashboard — wait until content is large enough to contain actual data
        // (loading skeleton ~1100 chars; full page with scores ~5000+ chars)
        await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/SPY' });
        const spyContent = await pollForContent(
          client,
          c => c.length > 4000,
          20000,
          7000,
        );

        // QQQ dashboard
        await client.Page.navigate({ url: 'https://console.ovtlyr.com/dashboard/QQQ' });
        const qqqContent = await pollForContent(
          client,
          c => c.length > 4000,
          20000,
          7000,
        );

        return `=== SPY DASHBOARD ===\n${spyContent.substring(0, 4000)}\n\n=== QQQ DASHBOARD ===\n${qqqContent.substring(0, 4000)}`;
      }

      case 'ovtlyr_sector_map': {
        await client.Page.navigate({ url: 'https://console.ovtlyr.com/sector-intelligence-map' });
        // Poll until we see actual sector names
        const content = await pollForContent(
          client,
          c => c.includes('Technology') || c.includes('Energy') || c.includes('Financials') || c.includes('Consumer') || c.includes('Communication'),
          14000,
          8000,
        );
        // Extract structured sector data
        const structured = await client.Runtime.evaluate({
          expression: `
            (function() {
              // Get all rows/cells that have sector data
              var rows = document.querySelectorAll('tr, [class*="row"], [class*="sector"]');
              var data = Array.from(rows).map(r => r.innerText.trim()).filter(t => t.length > 3 && t.length < 300);
              return data.slice(0, 80).join('\n');
            })()
          `,
          returnByValue: true,
        });
        const sectorRows = structured.result.value || '';
        return content + (sectorRows ? '\n\n--- SECTOR ROWS ---\n' + sectorRows.substring(0, 3000) : '');
      }

      case 'ovtlyr_screener': {
        // Navigate to stocks-etfs to activate the auth session and set cookies
        await client.Network.enable();
        await client.Page.navigate({ url: 'https://console.ovtlyr.com/stocks-etfs' });
        // Wait for the page and its auth cookies to fully load
        await new Promise(r => setTimeout(r, 4000));

        // Extract auth cookies from the browser session
        const cookiesResp = await client.Network.getCookies({ urls: ['https://console.ovtlyr.com'] });
        const cookieStr = cookiesResp.cookies.map(c => `${c.name}=${c.value}`).join('; ');
        if (!cookieStr) {
          return 'OVTLYR not authenticated — open console.ovtlyr.com and log in first.';
        }

        // Call GetStocks API directly from Node.js using the browser's auth cookies —
        // bypasses the broken screener UI which is always positioned off-screen.
        const body = {
          searchKeyword: null,
          filter_sectorIds: null,
          filter_industryNames: null,
          page_size: 100,
          page_index: 0,
          filter_OvtlyrSignalReturn: null,
          filter_OvtlyrCapitalEfficency: null,
          filter_min30DayAvgVol: null,
          filter_max30DayAvgVol: null,
          filter_CurrentBuySellStatus: 'buy',
          filter_PriceCorrectionPeriod: null,
          filter_PriceCorrectionValue: '0',
          filter_minMarkerCap: 0,
          filter_maxMarkerCap: 10000000000000,
          filter_minClosePrice: null,
          filter_maxClosePrice: null,
          filter_minHeatMap: '0',
          filter_maxHeatMap: '100',
          filter_relativeVolume: null,
          filter_SignalType: null,
          filter_sectorRelativeGreed: null,
          filter_BuySellStatusDateFrom: null,
          filter_BuySellStatusDateFromIsActive: null,
          filter_MarketTrend: null,
          filter_MarketSignal: null,
          filter_MarketBreadth: null,
          filter_SectorFearGreed: null,
          filter_SectorBreadth: null,
          filter_StockTrend: null,
          filter_StockFearGreed: null,
          filter_StockOvtlyrBlock: null,
          filter_StockSignal: null,
          filter_UNA: false,
          filter_UNAType: null,
          filter_TMT: false,
          filter_OscilatorMovingUpDown: null,
          filter_isShowUpTreandIndicator: true,
          filter_isShowDownTreandIndicator: true,
          filter_isShowNeutralIndicator: true,
          isIncludePartialData: true,
          filter_OverlayIndicator: null,
          GetSelectedFilterId: null,
          SendFilterId: '',
          isExport: false,
        };

        const apiResp = await fetch('https://console.ovtlyr.com/stocks-etfs?handler=GetStocks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieStr,
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://console.ovtlyr.com/stocks-etfs',
            'Origin': 'https://console.ovtlyr.com',
          },
          body: JSON.stringify(body),
        });

        if (!apiResp.ok) {
          return `GetStocks API error: ${apiResp.status} ${apiResp.statusText}`;
        }

        const data = await apiResp.json();
        if (data.result !== '1') {
          return `GetStocks returned failure: ${JSON.stringify(data).substring(0, 300)}`;
        }

        const stocks = data.lst_stk || [];
        if (stocks.length === 0) {
          return 'No BUY stocks found.';
        }

        // Sort by 9-layer score desc, then heatMap desc
        stocks.sort((a, b) =>
          (b.Ovtlyr9_CountGreens - a.Ovtlyr9_CountGreens) || (b.heatMap - a.heatMap)
        );

        const screenerName = input.screener_name || 'barak1';
        const lines = [
          `OVTLYR SCREENER — ${screenerName} — ${stocks.length} BUY stocks (sorted by 9-score)`,
          '='.repeat(65),
          'SYMBOL  SCORE  SECTOR           PRICE    HM     RET     SIGNAL DATE',
          '-'.repeat(65),
        ];

        for (const s of stocks.slice(0, 50)) {
          const score = `${s.Ovtlyr9_CountGreens}/9`;
          const sector = (s.gics_Sector || '').substring(0, 14).padEnd(14);
          const price = s.closePrice != null ? `$${s.closePrice.toFixed(2)}`.padStart(8) : '       ?';
          const hm = s.heatMap != null ? s.heatMap.toFixed(1).padStart(5) : '    ?';
          const ret = s.ovtlyrSignalReturn != null
            ? ((s.ovtlyrSignalReturn >= 0 ? '+' : '') + s.ovtlyrSignalReturn.toFixed(1) + '%').padStart(7)
            : '      ?';
          const date = s.buySellDateStr || '';
          lines.push(`${s.Symbol.padEnd(7)} ${score.padEnd(6)} ${sector} ${price} ${hm}% ${ret}  ${date}`);
        }

        if (stocks.length > 50) {
          lines.push(`... and ${stocks.length - 50} more stocks`);
        }

        return lines.join('\n');
      }

      default:
        return `Unknown OVTLYR tool: ${name}`;
    }
  } finally {
    if (client) await client.close().catch(() => {});
  }
}
