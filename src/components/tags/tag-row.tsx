"use client";

import Link from "next/link";
import { useManifest } from "@/hooks/use-registry";
import { useAtom } from "jotai";
import { deleteDialogAtom } from "@/store/atoms";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Trash2 } from "lucide-react";

function shortDigest(digest: string): string {
  // sha256:abc123... → sha256:abc123 (first 12 hex chars)
  const [algo, hash] = digest.split(":");
  return `${algo}:${hash.slice(0, 12)}`;
}

export function TagRow({
  repoName,
  tag,
}: {
  repoName: string;
  tag: string;
}) {
  const { data, isLoading } = useManifest(repoName, tag);
  const [, setDeleteDialog] = useAtom(deleteDialogAtom);

  return (
    <TableRow>
      <TableCell className="min-w-0 whitespace-normal">
        <Link
          href={`/repos/${repoName}/_tag/${tag}`}
          className="block font-mono break-all hover:underline"
        >
          {tag}
        </Link>
        <div className="mt-1">
          {isLoading ? (
            <Skeleton className="h-3.5 w-28 max-w-full" />
          ) : data?.digest ? (
            <code className="text-xs break-all text-muted-foreground">
              {shortDigest(data.digest)}
            </code>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="w-24">
        <div className="flex justify-end gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Inspect"
            aria-label={`Inspect ${tag}`}
          >
            <Link href={`/repos/${repoName}/_tag/${tag}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete"
            aria-label={`Delete ${tag}`}
            disabled={!data?.digest}
            onClick={() => {
              if (data?.digest) {
                setDeleteDialog({
                  open: true,
                  repoName,
                  digest: data.digest,
                  tag,
                });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
