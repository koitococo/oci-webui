import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/registry/server";
import { RegistryRequestError } from "@/lib/registry/client";

export async function GET(request: Request) {
  try {
    const { client } = await getAuthedClient();
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const ref = searchParams.get("ref");
    if (!repo || !ref) {
      return NextResponse.json(
        { error: "repo and ref query parameters are required" },
        { status: 400 }
      );
    }

    const result = await client.getManifest(repo, ref);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof RegistryRequestError &&
      error.status >= 400 &&
      error.status <= 499
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { client } = await getAuthedClient();
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const ref = searchParams.get("ref");
    if (!repo || !ref) {
      return NextResponse.json(
        { error: "repo and ref query parameters are required" },
        { status: 400 }
      );
    }

    await client.deleteManifest(repo, ref);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      error instanceof RegistryRequestError &&
      error.status >= 400 &&
      error.status <= 499
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
