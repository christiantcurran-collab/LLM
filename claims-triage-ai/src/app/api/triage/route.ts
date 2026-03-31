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
  // Check for tools.py (not traced by Next.js standalone, so only exists in real source)
  const marker = path.join("src", "lib", "claude", "tools.py");
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    "/app",
  ];
  for (const dir of candidates) {
    if (require("fs").existsSync(path.join(dir, marker))) {
      return dir;
    }
  }
  return process.cwd();
}

function runTriagePython(payload: ClaimPayload): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const root = findProjectRoot();
    const scriptPath = path.join(root, "src", "lib", "claude", "client.py");
    const py = spawn("python", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: root,
      env: { ...process.env, PROJECT_ROOT: root },
    });

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
