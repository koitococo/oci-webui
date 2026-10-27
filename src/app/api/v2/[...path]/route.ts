import { NextResponse } from "next/server";
import { getAuthedClient } from "@/lib/registry/server";
import { log } from "@/lib/logger";

async function proxy(request: Request): Promise<Response> {
  try {
    const { client } = await getAuthedClient();
    return await client.proxy(request);
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    if (!unauthorized) {
      log
        .withMetadata({
          method: request.method,
          pathname: new URL(request.url).pathname,
        })
        .withError(error)
        .error("Registry proxy request failed");
    }
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "Registry proxy request failed" },
      { status: unauthorized ? 401 : 502 }
    );
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const DELETE = proxy;
