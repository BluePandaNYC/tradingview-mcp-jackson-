/**
 * Base agent — handles the Claude tool-use loop.
 * All specialized agents extend this.
 */
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../config.js';

export class BaseAgent {
  constructor(name) {
    this.name = name;
    this.client = new Anthropic({ apiKey: getApiKey() });
  }

  /**
   * Run the agent with a model, system prompt, user message, and tool definitions.
   * Automatically handles multi-turn tool-use loops until Claude stops calling tools.
   *
   * @param {object} opts
   * @param {string} opts.model
   * @param {string} opts.system
   * @param {string} opts.task
   * @param {Array}  opts.tools        - Anthropic tool definitions [{name, description, input_schema}]
   * @param {Function} opts.executeTool - async (name, input) => string result
   * @param {boolean} [opts.stream]    - stream text to stdout while running
   * @returns {{ text, tools_used, tokens }}
   */
  async run({ model, system, task, tools = [], executeTool, stream = true }) {
    const messages = [{ role: 'user', content: task }];
    const tools_used = [];
    let totalInput = 0;
    let totalOutput = 0;
    let finalText = '';

    while (true) {
      // Wrap system prompt as array with cache_control so Anthropic caches it
      // for 5 minutes across repeated calls (cuts input cost ~90% on cache hits).
      const systemPayload = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];

      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPayload,
        tools: tools.length ? tools : undefined,
        messages,
        betas: ['prompt-caching-2024-07-31'],
      });

      totalInput  += response.usage?.input_tokens         || 0;
      totalOutput += response.usage?.output_tokens        || 0;
      // cache_read_input_tokens are billed at ~10% — already included in input_tokens count

      // Collect text content from response
      const textBlocks = response.content.filter(b => b.type === 'text');
      const toolBlocks = response.content.filter(b => b.type === 'tool_use');

      for (const b of textBlocks) {
        finalText += b.text;
        if (stream) process.stdout.write(b.text);
      }

      // If no tool calls, we're done
      if (toolBlocks.length === 0 || response.stop_reason === 'end_turn') {
        if (stream) process.stdout.write('\n');
        break;
      }

      // Execute all tool calls
      const toolResults = [];
      for (const toolCall of toolBlocks) {
        tools_used.push(toolCall.name);
        if (stream) {
          process.stdout.write(`\n[${this.name}] → ${toolCall.name}(${JSON.stringify(toolCall.input).substring(0, 80)})\n`);
        }

        let result;
        try {
          result = executeTool
            ? await executeTool(toolCall.name, toolCall.input)
            : 'Tool not implemented';
        } catch (err) {
          result = `Error: ${err.message}`;
        }

        if (stream) process.stdout.write(`[${this.name}] ← ${String(result).substring(0, 120)}\n`);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: String(result),
        });
      }

      // Continue the conversation with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    return {
      text:       finalText.trim(),
      tools_used: [...new Set(tools_used)],
      tokens:     { input: totalInput, output: totalOutput },
    };
  }
}
