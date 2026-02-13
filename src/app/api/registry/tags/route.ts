import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/registry/server";

export async function GET(request: Request) {
  try {
    const { client } = await getAuthedClient();
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    if (!repo) {
      return NextResponse.json(
        { error: "repo query parameter is required" },
        { status: 400 }
      );
    }
    const n = searchParams.get("n")
      ? Number(searchParams.get("n"))
      : undefined;
    const last = searchParams.get("last") ?? undefined;

    const tags = await client.listTags(repo, n, last);
    return NextResponse.json(tags);
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
