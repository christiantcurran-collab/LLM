import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

function runEvalPython(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "eval", "run_eval.py");
    const py = spawn("python", [scriptPath, "--json"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (d) => { stdout += d.toString(); });
    py.stderr.on("data", (d) => { stderr += d.toString(); });
    py.on("error", (err) => reject(err));

    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Eval exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Failed to parse eval output"));
      }
    });

    py.stdin.end();
  });
}

export async function POST() {
  try {
    const result = await runEvalPython();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Eval failed" },
      { status: 500 }
    );
  }
}
