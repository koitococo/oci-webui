import type { OCITagList } from "@/lib/registry/types";

type ListTags = (name: string) => Promise<OCITagList>;

function hasValidTags(tags: string[] | undefined): boolean {
  return (tags ?? []).some((tag) => tag.trim().length > 0);
}

export async function filterRepositoriesWithTags(
  repositories: string[],
  listTags: ListTags,
  shouldPropagateError: (error: unknown) => boolean = () => false
): Promise<string[]> {
  const checks = repositories.map(async (repository) => {
    try {
      const tagList = await listTags(repository);

      return hasValidTags(tagList.tags) ? repository : null;
    } catch (error) {
      if (shouldPropagateError(error)) {
        throw error;
      }

      return null;
    }
  });

  const results = await Promise.all(checks);

  return results.filter((repository): repository is string => repository !== null);
}
