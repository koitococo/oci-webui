"use client";

import { useTags } from "@/hooks/use-registry";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TagCard } from "./tag-card";
import { DeleteDialog } from "@/components/delete-dialog";

export function TagList({ repoName }: { repoName: string }) {
  const { data, isLoading, error } = useTags(repoName);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load tags: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.tags || data.tags.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No tags found for this repository.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.tags.map((tag) => (
          <TagCard key={tag} repoName={repoName} tag={tag} />
        ))}
      </div>
      <DeleteDialog />
    </>
  );
}
