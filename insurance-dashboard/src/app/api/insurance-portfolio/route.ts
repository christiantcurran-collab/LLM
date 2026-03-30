import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const TABLE = "insurance_demo_portfolios";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase env vars not configured");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const companyName = new URL(req.url).searchParams.get("company") || "Insurance Company A";
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select("company_name,total_market_value,weights_json")
      .eq("company_name", companyName)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ companyName, totalMarketValue: null, weights: null }, { status: 200 });

    return NextResponse.json({
      companyName: data.company_name,
      totalMarketValue: Number(data.total_market_value ?? 0),
      weights: data.weights_json ?? {},
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const companyName = String(body?.companyName || "Insurance Company A");
    const totalMarketValue = Number(body?.totalMarketValue ?? 0);
    const weights = typeof body?.weights === "object" && body.weights ? body.weights : {};
    const supabase = getServerSupabase();

    const { error } = await supabase.from(TABLE).upsert(
      {
        company_name: companyName,
        total_market_value: totalMarketValue,
        weights_json: weights,
      },
      { onConflict: "company_name" }
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save portfolio" },
      { status: 500 }
    );
  }
}
