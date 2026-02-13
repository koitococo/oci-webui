import { NextResponse } from "next/server";
import { discoverAuthProvider } from "@/lib/registry/auth-provider";

export async function POST(request: Request) {
  try {
    const { registryUrl } = await request.json();
    if (!registryUrl) {
      return NextResponse.json(
        { error: "registryUrl is required" },
        { status: 400 }
      );
    }

    const { provider } = await discoverAuthProvider(registryUrl);
    return NextResponse.json({ authType: provider.type });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
