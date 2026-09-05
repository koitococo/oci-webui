import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/registry/server";
import { RegistryRequestError } from "@/lib/registry/client";
import { filterRepositoriesWithTags } from "@/lib/registry/catalog-filter";

export async function GET(request: Request) {
  try {
    const { client } = await getAuthedClient();
    const { searchParams } = new URL(request.url);
    const n = searchParams.get("n")
      ? Number(searchParams.get("n"))
      : undefined;
    const last = searchParams.get("last") ?? undefined;

    const catalog = await client.listRepositories(n, last);
    const repositories = await filterRepositoriesWithTags(
      catalog.repositories,
      (name) => client.listTags(name)
    );

    return NextResponse.json({ ...catalog, repositories });
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
