import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/registry/server";

export async function GET(request: Request) {
  try {
    const { client } = await getAuthedClient();
    const { searchParams } = new URL(request.url);
    const n = searchParams.get("n")
      ? Number(searchParams.get("n"))
      : undefined;
    const last = searchParams.get("last") ?? undefined;

    const catalog = await client.listRepositories(n, last);
    return NextResponse.json(catalog);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
