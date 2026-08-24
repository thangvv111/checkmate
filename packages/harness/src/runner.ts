import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { XMLParser } from 'fast-xml-parser';
import type { KetQuaProbe } from './sandbox.js';

// Runner cấu hình được (spec §12 · B4.5): repo đích khai cách chạy test của CHÍNH NÓ qua checkmate.yml.
// Không có file → đường vitest mặc định (đường demo) giữ nguyên. Hợp đồng kết quả: JUnit XML.

export interface RunnerCfg {
  test_cmd: string; // template, placeholder {files} và {out}
  framework: string; // hướng dẫn model viết probe: pytest | junit | vitest...
  probe_dir: string;
  probe_ext: string;
  probe_file?: string; // tên file probe đầy đủ (Java cần trùng tên class, vd CheckerProbeTest.java)
  timeout_s: number;
  huong_dan_probe?: string; // ghi chú repo-specific cho model (cách dựng app, fixture, dải dữ liệu...)
}

export function docRunnerCfg(repoPath: string): RunnerCfg | null {
  const f = join(repoPath, 'checkmate.yml');
  if (!existsSync(f)) return null;
  const raw = parseYaml(readFileSync(f, 'utf8')) as { runner?: Partial<RunnerCfg> };
  const r = raw?.runner;
  if (!r?.test_cmd) return null;
  return {
    test_cmd: r.test_cmd,
    framework: r.framework ?? 'theo file test mẫu của repo',
    probe_dir: r.probe_dir ?? 'test',
    probe_ext: r.probe_ext ?? '.test.txt',
    probe_file: r.probe_file,
    timeout_s: Math.min(1800, Math.max(30, Number(r.timeout_s) || 300)),
    huong_dan_probe: r.huong_dan_probe,
  };
}

// Parse JUnit XML → danh sách kết quả test (chuẩn chung vitest/pytest/surefire đều xuất được)
export function parseJUnit(xml: string, file: string): KetQuaProbe[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const goc = (doc.testsuites ?? doc.testsuite) as unknown;
  if (!goc) return [];
  const suites = Array.isArray(goc) ? goc : [goc];
  const cases: Array<Record<string, unknown>> = [];
  const gom = (s: Record<string, unknown>): void => {
    const con = s.testsuite;
    if (con) (Array.isArray(con) ? con : [con]).forEach((x) => gom(x as Record<string, unknown>));
    const tc = s.testcase;
    if (tc) (Array.isArray(tc) ? tc : [tc]).forEach((x) => cases.push(x as Record<string, unknown>));
  };
  suites.forEach((s) => gom(s as Record<string, unknown>));

  const layText = (node: unknown): string => {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(layText).join('\n');
    const o = node as Record<string, unknown>;
    return [o['@_message'], o['#text']].filter(Boolean).join('\n');
  };

  return cases.map((c) => {
    const fail = c.failure ?? c.error;
    const skipped = c.skipped !== undefined;
    return {
      title: String(c['@_name'] ?? ''),
      status: fail ? ('failed' as const) : skipped ? ('skipped' as const) : ('passed' as const),
      message: layText(fail).slice(0, 1500),
      file,
    };
  });
}
