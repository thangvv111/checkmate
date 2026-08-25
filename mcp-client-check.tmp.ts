// Client MCP kiểm thử B4.4 — đóng vai "agent khác" gọi CheckMate qua stdio (không commit, *.tmp.ts)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['node_modules/tsx/dist/cli.mjs', 'apps/mcp/src/server.ts'],
  env: { ...process.env } as Record<string, string>,
});
const client = new Client({ name: 'phien-claude-khac', version: '0.0.1' });
await client.connect(transport);

const tools = await client.listTools();
console.log('TOOLS:', tools.tools.map((t) => t.name).join(' · '));

const ds = await client.callTool({ name: 'list_pending_prs', arguments: {} });
const dsText = (ds.content as Array<{ text: string }>)[0].text;
const prs = JSON.parse(dsText) as Array<{ so: number; da_cham: unknown }>;
console.log('PENDING PRS:', prs.map((p) => `#${p.so}${p.da_cham ? '(đã chấm)' : ''}`).join(' '));

const v = await client.callTool({ name: 'get_verdict', arguments: { pr: 7 } });
const vText = (v.content as Array<{ text: string }>)[0].text;
const meta = JSON.parse(vText) as { verdict?: { result: string; findings: unknown[] }; trang_thai?: string };
console.log('GET_VERDICT PR#7:', meta.verdict ? `${meta.verdict.result} · ${meta.verdict.findings.length} finding` : meta.trang_thai);

await client.close();
console.log('MCP CLIENT CHECK: OK');
