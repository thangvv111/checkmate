import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// MCP server (spec §12 · B4.4): agent khác gọi CheckMate như một THÀNH VIÊN ĐỘC LẬP trong dàn.
// Là client mỏng của web app (tái dùng trọn pipeline + cổng + sổ cái) — cần web đang chạy.
// Checker không nhận context của maker: tool chỉ nhận số PR / nội dung tài liệu, không nhận "giải thích".

const BASE = process.env.CHECKMATE_URL ?? 'http://127.0.0.1:4000';

async function goi(path: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...(init?.headers ?? {}) },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = { loi: `HTTP ${res.status} (không phải JSON)` };
  }
  return { status: res.status, body };
}

function traVe(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: 'checkmate', version: '0.1.0' });

server.tool(
  'list_pending_prs',
  'Danh sách PR đang mở chờ review trên repo đã cấu hình, kèm trạng thái verdict của đúng commit hiện tại (nếu đã chấm).',
  {},
  async () => traVe((await goi('/api/prs')).body),
);

server.tool(
  'get_verdict',
  'Lấy verdict + findings đầy đủ của một PR (theo đúng head commit hiện tại). Trả về trạng thái nếu chưa chấm.',
  { pr: z.number().int().positive() },
  async ({ pr }) => {
    const prs = (await goi('/api/prs')).body as Array<{ so: number; headSha: string; da_cham: { run_id: string } | null }>;
    if (!Array.isArray(prs)) return traVe(prs);
    const muc = prs.find((p) => p.so === pr);
    if (!muc) return traVe({ trang_thai: 'khong_thay_pr_mo', ghi_chu: `PR #${pr} không nằm trong danh sách PR đang mở` });
    if (!muc.da_cham) return traVe({ trang_thai: 'chua_cham', head_sha: muc.headSha, goi_y: `Gọi review_pr với pr=${pr} để chấm` });
    return traVe((await goi(`/api/runs/${muc.da_cham.run_id}/info`)).body);
  },
);

server.tool(
  'get_run',
  'Trạng thái + verdict của một run theo run_id (dùng sau khi review_pr / review_doc trả về run_id).',
  { run_id: z.string() },
  async ({ run_id }) => traVe((await goi(`/api/runs/${encodeURIComponent(run_id)}/info`)).body),
);

server.tool(
  'review_pr',
  'Yêu cầu CheckMate chấm một PR (chạy nền vài phút). Trả run_id — gọi get_run để lấy verdict khi xong. Nếu commit hiện tại đã có verdict thì trả luôn run_id đã có.',
  { pr: z.number().int().positive() },
  async ({ pr }) => {
    const kq = await goi('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `kieu=pr&so=${pr}`,
    });
    return traVe(kq.body);
  },
);

server.tool(
  'review_doc',
  'Yêu cầu CheckMate chấm một tài liệu yêu cầu/đặc tả (text/markdown, ≥200 ký tự). Trả run_id — gọi get_run để lấy verdict khi xong.',
  { noi_dung: z.string().min(200) },
  async ({ noi_dung }) => {
    const kq = await goi('/api/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `kieu=doc&noi_dung=${encodeURIComponent(noi_dung)}`,
    });
    return traVe(kq.body);
  },
);

await server.connect(new StdioServerTransport());
