"use client";

import { useTags } from "@/hooks/use-registry";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TagRow } from "./tag-row";

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
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded" />
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tag</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.tags.map((tag) => (
          <TagRow key={tag} repoName={repoName} tag={tag} />
        ))}
      </TableBody>
    </Table>
  );
}
