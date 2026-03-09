import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";

const BASES = [
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.API_BASE_URL,
  "http://localhost:8000",
  "http://localhost:8001",
].filter(Boolean) as string[];
const execFileAsync = promisify(execFile);

async function tryFetch(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ spk_id: string }> }
) {
  const { spk_id } = await params;
  const errors: Array<{ base: string; status?: number; error?: string }> = [];

  // Fast local artifact fallback from frontend/public for offline mode.
  try {
    const publicPath = path.join(process.cwd(), "public", "full_reports.json");
    if (fs.existsSync(publicPath)) {
      const raw = fs.readFileSync(publicPath, "utf-8");
      const parsed = JSON.parse(raw || "{}");
      const report = parsed?.[spk_id] || parsed?.[String(spk_id).toUpperCase()];
      if (report) {
        return NextResponse.json(report, { status: 200 });
      }
      errors.push({ base: "public-json-fallback", error: `spk_id ${spk_id} not found in public artifact` });
    } else {
      errors.push({ base: "public-json-fallback", error: "public/full_reports.json not found" });
    }
  } catch (e: any) {
    errors.push({ base: "public-json-fallback", error: e?.message || "public artifact read failed" });
  }

  for (const base of BASES) {
    try {
      const target = `${base}/v1/asteroid/${encodeURIComponent(spk_id)}/full-report`;
      const out = await tryFetch(target);
      if (out.ok && !out.json?.error) {
        return NextResponse.json(out.json, { status: 200 });
      }
      errors.push({ base, status: out.status, error: out.json?.error || "non-200 response" });
    } catch (e: any) {
      errors.push({ base, error: e?.message || "request failed" });
    }
  }

  // Offline/local fallback: generate report directly from SQLite via Python script.
  try {
    const frontendRoot = process.cwd();
    const workspaceRoot = path.resolve(frontendRoot, "..");
    const backendDir = path.join(workspaceRoot, "backend");
    const pyPath = path.join(backendDir, ".venv", "Scripts", "python.exe");
    const scriptPath = path.join(backendDir, "scripts", "get_full_report.py");

    const { stdout } = await execFileAsync(pyPath, [scriptPath, spk_id], {
      cwd: backendDir,
      windowsHide: true,
      timeout: 20000,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || "sqlite:///./aether.db",
      },
    });
    const parsed = JSON.parse(stdout || "{}");
    if (!parsed?.error) {
      return NextResponse.json(parsed, { status: 200 });
    }
    errors.push({ base: "local-python-fallback", error: parsed.error || "unknown" });
  } catch (e: any) {
    errors.push({ base: "local-python-fallback", error: e?.message || "fallback execution failed" });
  }

  // Artifact fallback: pre-generated report JSON from training pipeline.
  try {
    const frontendRoot = process.cwd();
    const workspaceRoot = path.resolve(frontendRoot, "..");
    const reportsPath = path.join(workspaceRoot, "backend", "data", "reports", "full_reports.json");
    if (!fs.existsSync(reportsPath)) {
      errors.push({ base: "json-artifact-fallback", error: "full_reports.json not found" });
    } else {
      const raw = fs.readFileSync(reportsPath, "utf-8");
      const parsed = JSON.parse(raw || "{}");
      const report = parsed?.[spk_id];
      if (report) {
        return NextResponse.json(report, { status: 200 });
      }
      errors.push({ base: "json-artifact-fallback", error: `spk_id ${spk_id} not found in artifact` });
    }
  } catch (e: any) {
    errors.push({ base: "json-artifact-fallback", error: e?.message || "artifact read failed" });
  }

  return NextResponse.json(
    {
      error: "Failed to fetch full intelligence report from all configured sources.",
      attempts: errors,
    },
    { status: 502 }
  );
}
