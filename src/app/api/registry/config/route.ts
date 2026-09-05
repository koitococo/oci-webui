import { NextResponse } from "next/server";
import { RegistryRequestError } from "@/lib/registry/client";
import { getAuthedClient } from "@/lib/registry/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const repo = searchParams.get("repo");
    const digest = searchParams.get("digest");
    if (!repo || !digest) {
      return NextResponse.json(
        { error: "repo and digest query parameters are required" },
        { status: 400 }
      );
    }

    const { client } = await getAuthedClient();
    const config = await client.getImageConfig(repo, digest);
    return NextResponse.json(config);
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
