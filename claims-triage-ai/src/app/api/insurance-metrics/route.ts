import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import type { Bond } from "@/lib/insurance-dashboard-data";

interface MetricsRequest {
  bonds: Bond[];
}

function runPythonMetrics(bonds: Bond[]): Promise<Bond[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "python", "calculate_bond_metrics.py");
    const py = spawn("python", [scriptPath], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    py.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    py.on("error", (err) => {
      reject(err);
    });

    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python process exited with code ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed.bonds ?? []);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse Python output"));
      }
    });

    py.stdin.write(JSON.stringify({ bonds }));
    py.stdin.end();
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MetricsRequest;
    const bonds = Array.isArray(body?.bonds) ? body.bonds : [];
    if (bonds.length === 0) {
      return NextResponse.json({ bonds: [] });
    }

    const calculated = await runPythonMetrics(bonds);
    return NextResponse.json({ bonds: calculated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to calculate bond metrics" },
      { status: 500 }
    );
  }
}
