import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/registry/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string[] }> }
) {
  try {
    const { client } = await getAuthedClient();
    const { name } = await params;
    const repoName = name.join("/");
    const { searchParams } = new URL(request.url);
    const n = searchParams.get("n")
      ? Number(searchParams.get("n"))
      : undefined;
    const last = searchParams.get("last") ?? undefined;

    const tags = await client.listTags(repoName, n, last);
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
