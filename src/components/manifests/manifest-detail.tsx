"use client";

import { useManifest } from "@/hooks/use-registry";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayerTable } from "./layer-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useAtom } from "jotai";
import { deleteDialogAtom } from "@/store/atoms";
import type { OCIManifest, OCIIndex } from "@/lib/registry/types";

function isIndex(
  manifest: OCIManifest | OCIIndex
): manifest is OCIIndex {
  return "manifests" in manifest;
}

export function ManifestDetail({
  repoName,
  tag,
}: {
  repoName: string;
  tag: string;
}) {
  const { data, isLoading, error } = useManifest(repoName, tag);
  const [, setDeleteDialog] = useAtom(deleteDialogAtom);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load manifest: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const { manifest, digest, contentType } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Badge variant="outline">{contentType}</Badge>
        <code className="text-xs text-muted-foreground">{digest}</code>
        <div className="ml-auto">
          <Button
            variant="destructive"
            size="sm"
            onClick={() =>
              setDeleteDialog({
                open: true,
                repoName,
                digest,
                tag,
              })
            }
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {isIndex(manifest) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {manifest.manifests.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {m.platform
                      ? `${m.platform.os}/${m.platform.architecture}${
                          m.platform.variant
                            ? `/${m.platform.variant}`
                            : ""
                        }`
                      : "unknown"}
                  </Badge>
                  <code className="text-xs text-muted-foreground">
                    {m.digest}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(m.size)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Config</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{manifest.config.mediaType}</Badge>
                <code className="text-xs text-muted-foreground">
                  {manifest.config.digest}
                </code>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(manifest.config.size)}
                </span>
              </div>
            </CardContent>
          </Card>

          <LayerTable layers={manifest.layers} />
        </>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Raw Manifest</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            <pre className="overflow-x-auto rounded bg-muted p-4 text-xs">
              {JSON.stringify(manifest, null, 2)}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>

      <DeleteDialog />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}
