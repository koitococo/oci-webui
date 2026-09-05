import test from "node:test";
import assert from "node:assert/strict";

import { filterRepositoriesWithTags } from "./catalog-filter";
import { RegistryRequestError } from "./client";

test("filterRepositoriesWithTags keeps repositories with at least one valid tag", async () => {
  const repositories = ["repo-a", "repo-b", "repo-c"];

  const result = await filterRepositoriesWithTags(
    repositories,
    async (name: string) => {
      if (name === "repo-a") {
        return { name, tags: ["latest"] };
      }

      if (name === "repo-b") {
        return { name, tags: [] };
      }

      return { name, tags: [""] };
    }
  );

  assert.deepEqual(result, ["repo-a"]);
});

test("filterRepositoriesWithTags filters repositories when tag lookup fails", async () => {
  const repositories = ["repo-a", "repo-b"];

  const result = await filterRepositoriesWithTags(
    repositories,
    async (name: string) => {
      if (name === "repo-a") {
        return { name, tags: ["stable"] };
      }

      throw new Error("tag lookup failed");
    }
  );

  assert.deepEqual(result, ["repo-a"]);
});

test("filterRepositoriesWithTags propagates registry request errors", async () => {
  await assert.rejects(
    () =>
      filterRepositoriesWithTags(["repo-a"], async () => {
        throw new RegistryRequestError("forbidden", 403);
      }),
    (error: unknown) =>
      error instanceof RegistryRequestError && error.status === 403
  );
});
