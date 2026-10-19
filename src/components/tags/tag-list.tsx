"use client";

import { useTags } from "@/hooks/use-registry";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TagRow } from "./tag-row";
import { DeleteDialog } from "@/components/delete-dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      <div className="flex flex-col gap-3">
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
      <div className="min-w-0 rounded-lg border">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.tags.map((tag) => (
              <TagRow key={tag} repoName={repoName} tag={tag} />
            ))}
          </TableBody>
        </Table>
      </div>
      <DeleteDialog />
    </>
  );
}
