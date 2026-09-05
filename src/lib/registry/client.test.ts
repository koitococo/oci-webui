import test from "node:test";
import assert from "node:assert/strict";

import {
  RegistryClient,
  RegistryRequestError,
} from "./client";

const registry = {
  name: "test",
  url: "https://registry.test",
};

type FetchCall = {
  url: string;
  init?: RequestInit;
};

async function withMockFetch(
  handler: (
    url: string,
    init: RequestInit | undefined,
    callIndex: number
  ) => Response | Promise<Response>,
  run: (calls: FetchCall[]) => Promise<void>
): Promise<void> {
  const previousFetch = globalThis.fetch;
  const calls: FetchCall[] = [];

  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    calls.push({ url, init });
    return handler(url, init, calls.length - 1);
  };

  try {
    await run(calls);
  } finally {
    globalThis.fetch = previousFetch;
  }
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

function header(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

test("anonymous public requests do not send Authorization", async () => {
  await withMockFetch(
    (_url, _init) => jsonResponse({ repositories: ["repo"] }),
    async (calls) => {
      const result = await new RegistryClient(registry, undefined, "none").listRepositories();

      assert.deepEqual(result.repositories, ["repo"]);
      assert.equal(calls.length, 1);
      assert.equal(header(calls[0].init, "authorization"), null);
    }
  );
});

test("anonymous bearer challenge requests a token without Basic and retries once with Bearer", async () => {
  await withMockFetch(
    (url, init, callIndex) => {
      if (callIndex === 0) {
        assert.equal(header(init, "authorization"), null);
        return new Response(null, {
          status: 401,
          headers: {
            "www-authenticate":
              'Bearer realm="https://auth.test/token",service="registry.test",scope="repository:repo:pull"',
          },
        });
      }

      if (callIndex === 1) {
        assert.equal(url, "https://auth.test/token?service=registry.test&scope=repository%3Arepo%3Apull");
        assert.equal(header(init, "authorization"), null);
        return jsonResponse({ token: "anonymous-token" });
      }

      assert.equal(callIndex, 2);
      assert.equal(header(init, "authorization"), "Bearer anonymous-token");
      return jsonResponse({ name: "repo", tags: ["latest"] });
    },
    async (calls) => {
      const result = await new RegistryClient(registry, undefined, "none").listTags("repo");

      assert.deepEqual(result.tags, ["latest"]);
      assert.equal(calls.length, 3);
    }
  );
});

test("anonymous Basic challenge returns the original failed response", async () => {
  await withMockFetch(
    (_url, _init, callIndex) => {
      assert.equal(callIndex, 0);
      return new Response(null, {
        status: 401,
        headers: { "www-authenticate": 'Basic realm="registry"' },
      });
    },
    async (calls) => {
      await assert.rejects(
        new RegistryClient(registry, undefined, "none").listTags("repo"),
        (error: unknown) =>
          error instanceof RegistryRequestError && error.status === 401
      );
      assert.equal(calls.length, 1);
    }
  );
});

test("basic authentication sends credentials on the first request", async () => {
  await withMockFetch(
    (_url, init) => {
      assert.equal(header(init, "authorization"), "Basic dXNlcjpwYXNz");
      return jsonResponse({ name: "repo", tags: ["latest"] });
    },
    async () => {
      const result = await new RegistryClient(
        registry,
        "dXNlcjpwYXNz",
        "basic"
      ).listTags("repo");
      assert.deepEqual(result.tags, ["latest"]);
    }
  );
});

test("credentialed bearer challenge sends Basic only to the token realm", async () => {
  await withMockFetch(
    (_url, init, callIndex) => {
      if (callIndex === 0) {
        assert.equal(header(init, "authorization"), null);
        return new Response(null, {
          status: 401,
          headers: {
            "www-authenticate": 'Bearer realm="https://auth.test/token"',
          },
        });
      }

      if (callIndex === 1) {
        assert.equal(header(init, "authorization"), "Basic dXNlcjpwYXNz");
        return jsonResponse({ access_token: "registry-token" });
      }

      assert.equal(header(init, "authorization"), "Bearer registry-token");
      return jsonResponse({ repositories: [] });
    },
    async (calls) => {
      const result = await new RegistryClient(
        registry,
        "dXNlcjpwYXNz",
        "bearer"
      ).listRepositories();
      assert.deepEqual(result.repositories, []);
      assert.equal(calls.length, 3);
    }
  );
});

test("getManifest requests a child digest and preserves response metadata", async () => {
  const childDigest = "sha256:child";

  await withMockFetch(
    (url, init) => {
      assert.equal(url, `https://registry.test/v2/repo/manifests/${childDigest}`);
      assert.equal(header(init, "authorization"), null);
      assert.match(
        header(init, "accept") ?? "",
        /application\/vnd\.oci\.image\.manifest\.v1\+json/
      );
      return jsonResponse(
        {
          schemaVersion: 2,
          mediaType: "application/vnd.oci.image.manifest.v1+json",
          config: { mediaType: "application/vnd.oci.image.config.v1+json", digest: "sha256:config", size: 1 },
          layers: [],
        },
        200,
        {
          "docker-content-digest": childDigest,
          "content-type": "application/vnd.oci.image.manifest.v1+json",
        }
      );
    },
    async () => {
      const result = await new RegistryClient(registry, undefined, "none").getManifest(
        "repo",
        childDigest
      );

      assert.equal(result.digest, childDigest);
      assert.equal(
        result.contentType,
        "application/vnd.oci.image.manifest.v1+json"
      );
      assert.equal(result.manifest.schemaVersion, 2);
    }
  );
});

test("getImageConfig requests the blob with both config media types", async () => {
  const configDigest = "sha256:config";
  const imageConfig = {
    architecture: "amd64",
    os: "linux",
    config: {
      User: "",
      Env: ["PATH=/usr/bin"],
      Labels: { maintainer: "example" },
    },
    rootfs: { type: "layers", diff_ids: ["sha256:layer"] },
    history: [{ created_by: "/bin/sh", empty_layer: false }],
    customExtension: { source: "test" },
  };

  await withMockFetch(
    (url, init) => {
      assert.equal(url, `https://registry.test/v2/repo/blobs/${configDigest}`);
      assert.equal(header(init, "authorization"), null);
      const accept = header(init, "accept") ?? "";
      assert.match(accept, /application\/vnd\.oci\.image\.config\.v1\+json/);
      assert.match(accept, /application\/vnd\.docker\.container\.image\.v1\+json/);
      return jsonResponse(imageConfig, 200, {
        "content-type": "application/vnd.oci.image.config.v1+json",
      });
    },
    async () => {
      const result = await new RegistryClient(registry, undefined, "none").getImageConfig(
        "repo",
        configDigest
      );

      assert.deepEqual(result.config, imageConfig);
      assert.equal(
        result.contentType,
        "application/vnd.oci.image.config.v1+json"
      );
    }
  );
});

test("registry response status is preserved by RegistryRequestError", async () => {
  const cases: Array<{
    status: number;
    invoke: (client: RegistryClient) => Promise<unknown>;
  }> = [
    { status: 401, invoke: (client) => client.listRepositories() },
    { status: 403, invoke: (client) => client.listTags("repo") },
    { status: 401, invoke: (client) => client.getManifest("repo", "latest") },
    { status: 403, invoke: (client) => client.getImageConfig("repo", "sha256:config") },
    { status: 401, invoke: (client) => client.deleteManifest("repo", "sha256:manifest") },
  ];

  for (const { status, invoke } of cases) {
    await withMockFetch(
      () => new Response(null, { status }),
      async () => {
        await assert.rejects(
          invoke(new RegistryClient(registry, undefined, "none")),
          (error: unknown) =>
            error instanceof RegistryRequestError && error.status === status
        );
      }
    );
  }
});
