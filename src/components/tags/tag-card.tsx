"use client";

import Link from "next/link";
import { useManifest } from "@/hooks/use-registry";
import { useAtom } from "jotai";
import { deleteDialogAtom } from "@/store/atoms";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Trash2, Tag } from "lucide-react";

function shortDigest(digest: string): string {
  // sha256:abc123... → sha256:abc123 (first 12 hex chars)
  const [algo, hash] = digest.split(":");
  return `${algo}:${hash.slice(0, 12)}`;
}

export function TagCard({
  repoName,
  tag,
}: {
  repoName: string;
  tag: string;
}) {
  const { data, isLoading } = useManifest(repoName, tag);
  const [, setDeleteDialog] = useAtom(deleteDialogAtom);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-3 px-4 py-3">
        <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <Badge variant="secondary" className="font-mono">
            {tag}
          </Badge>
          <div className="mt-1">
            {isLoading ? (
              <Skeleton className="h-3.5 w-28" />
            ) : data?.digest ? (
              <code className="text-xs text-muted-foreground">
                {shortDigest(data.digest)}
              </code>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Link href={`/repos/${repoName}/_tag/${tag}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Inspect">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete"
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
      </CardContent>
    </Card>
  );
}
