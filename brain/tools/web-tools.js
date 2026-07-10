/**
 * Web tools — search and fetch for research agents.
 * Uses the native fetch() available in Node 18+.
 */

export const WEB_TOOL_DEFS = [
  {
    name: 'web_fetch',
    description: 'Fetch and read the content of a web page URL.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL to fetch' },
      },
      required: ['url'],
    },
  },
];

export async function executeWebTool(name, input) {
  switch (name) {
    case 'web_fetch': {
      const resp = await fetch(input.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrainBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      const html = await resp.text();
      // Strip HTML tags and collapse whitespace
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 6000);
      return text;
    }
    default:
      return `Unknown web tool: ${name}`;
  }
}
