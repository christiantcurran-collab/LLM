import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

interface ClaimPayload {
  policy_number: string;
  claim_amount: number;
  claim_date: string;
  claim_type: string;
  description: string;
}

function findProjectRoot(): string {
  // Walk up from this file's compiled location to find src/
  let dir = process.cwd();
  // In standalone mode, cwd is /app but server.js is in /app/.next/standalone
  // The source files are at /app/src/ since we don't copy them into standalone
  if (require("fs").existsSync(path.join(dir, "src", "lib", "claude", "client.py"))) {
    return dir;
  }
  // Fallback: try parent directories
  const parent = path.dirname(dir);
  if (require("fs").existsSync(path.join(parent, "src", "lib", "claude", "client.py"))) {
    return parent;
  }
  return dir;
}

function runTriagePython(payload: ClaimPayload): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const root = findProjectRoot();
    const scriptPath = path.join(root, "src", "lib", "claude", "client.py");
    const py = spawn("python", [scriptPath], { stdio: ["pipe", "pipe", "pipe"], cwd: root });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (d) => { stdout += d.toString(); });
    py.stderr.on("data", (d) => { stderr += d.toString(); });
    py.on("error", (err) => reject(err));

    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Failed to parse Python output"));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ClaimPayload;

    if (!body.policy_number || !body.description) {
      return NextResponse.json(
        { error: "policy_number and description are required" },
        { status: 400 }
      );
    }

    const result = await runTriagePython({
      policy_number: body.policy_number,
      claim_amount: body.claim_amount || 0,
      claim_date: body.claim_date || new Date().toISOString().split("T")[0],
      claim_type: body.claim_type || "property",
      description: body.description,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Triage failed" },
      { status: 500 }
    );
  }
}
