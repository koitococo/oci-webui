import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/registry/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string[]; ref: string }> }
) {
  try {
    const { client } = await getAuthedClient();
    const { name, ref } = await params;
    const repoName = name.join("/");

    const result = await client.getManifest(repoName, ref);
    return NextResponse.json(result);
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string[]; ref: string }> }
) {
  try {
    const { client } = await getAuthedClient();
    const { name, ref } = await params;
    const repoName = name.join("/");

    await client.deleteManifest(repoName, ref);
    return NextResponse.json({ ok: true });
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
