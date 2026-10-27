import test from "node:test";
import assert from "node:assert/strict";
import { RegistryClient } from "./client";

const registry = { name: "test", url: "https://registry.test/prefix" };

async function withFetch(
  handler: (url: string, headers: Headers, index: number) => Response,
  run: () => Promise<void>
) {
  const previous = globalThis.fetch;
  let index = 0;
  globalThis.fetch = async (input, init) => handler(
    String(input), new Headers(init?.headers), index++
  );
  try {
    await run();
  } finally {
    globalThis.fetch = previous;
  }
}

function request() {
  return new Request("https://ui.test/api/v2/team%2Frepo/tags/list?n=2&last=a%2Fb", {
    headers: { authorization: "Bearer browser-secret", cookie: "session=secret" },
  });
}

test("anonymous requests remove browser credentials and preserve encoded OCI paths", async () => {
  await withFetch((url, headers) => {
    assert.equal(url, "https://registry.test/prefix/v2/team%2Frepo/tags/list?n=2&last=a%2Fb");
    assert.equal(headers.get("authorization"), null);
    assert.equal(headers.get("cookie"), null);
    return new Response(null, { status: 200 });
  }, async () => {
    await new RegistryClient(registry, undefined, "none").proxy(request());
  });
});

for (const credentials of [undefined, "dXNlcjpwYXNz"]) {
  test(`Bearer challenge exchanges ${credentials ? "session" : "anonymous"} credentials only at realm`, async () => {
    await withFetch((url, headers, index) => {
      if (index === 0) {
        assert.equal(headers.get("authorization"), null);
        return new Response(null, {
          status: 401,
          headers: { "www-authenticate": 'Bearer realm="https://auth.test/token",service="registry",scope="repository:team/repo:pull"' },
        });
      }
      if (index === 1) {
        assert.equal(url, "https://auth.test/token?service=registry&scope=repository%3Ateam%2Frepo%3Apull");
        assert.equal(headers.get("authorization"), credentials ? `Basic ${credentials}` : null);
        return Response.json({ access_token: "registry-token" });
      }
      assert.equal(index, 2);
      assert.equal(headers.get("authorization"), "Bearer registry-token");
      return new Response("upstream denied", { status: 403 });
    }, async () => {
      const response = await new RegistryClient(registry, credentials, "bearer").proxy(request());
      assert.equal(response.status, 403);
      assert.equal(await response.text(), "upstream denied");
    });
  });
}

test("Basic uses session credentials rather than browser authorization", async () => {
  await withFetch((_url, headers) => {
    assert.equal(headers.get("authorization"), "Basic dXNlcjpwYXNz");
    assert.equal(headers.get("cookie"), null);
    return new Response(null, { status: 200 });
  }, async () => {
    await new RegistryClient(registry, "dXNlcjpwYXNz", "basic").proxy(request());
  });
});

test("unsupported Basic challenge is returned without an auth retry", async () => {
  await withFetch((_url, _headers, index) => {
    assert.equal(index, 0);
    return new Response("login required", {
      status: 401,
      headers: { "www-authenticate": 'Basic realm="registry"' },
    });
  }, async () => {
    const response = await new RegistryClient(registry, undefined, "none").proxy(request());
    assert.equal(response.status, 401);
    assert.equal(await response.text(), "login required");
  });
});
