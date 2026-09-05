"use client";

import { useState } from "react";
import { useManifest, useImageConfig } from "@/hooks/use-registry";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LayerTable } from "./layer-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useAtom } from "jotai";
import { deleteDialogAtom } from "@/store/atoms";
import type { OCIIndex, OCIManifest } from "@/lib/registry/types";

type PlatformDescriptor = OCIIndex["manifests"][number];

type PlatformOption = {
  descriptor: PlatformDescriptor;
  label: string;
  value: string;
};

function isIndex(
  manifest: OCIManifest | OCIIndex
): manifest is OCIIndex {
  return (
    manifest !== null &&
    typeof manifest === "object" &&
    "manifests" in manifest &&
    Array.isArray(manifest.manifests)
  );
}

function isPlatformDescriptor(
  value: unknown
): value is PlatformDescriptor {
  return (
    value !== null &&
    typeof value === "object" &&
    "digest" in value &&
    typeof value.digest === "string" &&
    value.digest.length > 0
  );
}

function isImageManifest(
  manifest: OCIManifest | OCIIndex
): manifest is OCIManifest {
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    isIndex(manifest) ||
    !("config" in manifest) ||
    !("layers" in manifest)
  ) {
    return false;
  }

  return (
    isPlatformDescriptor(manifest.config) &&
    Array.isArray(manifest.layers)
  );
}

function platformLabel(descriptor: PlatformDescriptor): string {
  const platform = descriptor.platform;
  if (
    !platform ||
    typeof platform.os !== "string" ||
    typeof platform.architecture !== "string"
  ) {
    return "unknown";
  }

  return `${platform.os}/${platform.architecture}${
    platform.variant ? `/${platform.variant}` : ""
  }`;
}

function platformOptions(manifest: OCIIndex): PlatformOption[] {
  return manifest.manifests.reduce<PlatformOption[]>(
    (options, descriptor, index) => {
      if (!isPlatformDescriptor(descriptor)) {
        return options;
      }

      options.push({
        descriptor,
        label: platformLabel(descriptor),
        value: `${descriptor.digest}:${index}`,
      });
      return options;
    },
    []
  );
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
        <>
          <ManifestNode repoName={repoName} manifest={manifest} />
          <Separator />
          <RawJsonCard title="Raw Index" value={manifest} />
        </>
      ) : isImageManifest(manifest) ? (
        <ImageManifestDetails repoName={repoName} manifest={manifest} />
      ) : (
        <>
          <Alert variant="destructive">
            <AlertDescription>
              Manifest does not contain an image config and layers.
            </AlertDescription>
          </Alert>
          <Separator />
          <RawJsonCard title="Raw Manifest" value={manifest} />
        </>
      )}

      <DeleteDialog />
    </div>
  );
}

function ManifestNode({
  repoName,
  manifest,
}: {
  repoName: string;
  manifest: OCIManifest | OCIIndex;
}) {
  if (isIndex(manifest)) {
    return <IndexNode repoName={repoName} manifest={manifest} />;
  }

  if (isImageManifest(manifest)) {
    return <ImageManifestDetails repoName={repoName} manifest={manifest} />;
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>
        Manifest does not contain an image config and layers.
      </AlertDescription>
    </Alert>
  );
}

function IndexNode({
  repoName,
  manifest,
}: {
  repoName: string;
  manifest: OCIIndex;
}) {
  const options = platformOptions(manifest);

  if (options.length === 0) {
    return (
      <Alert>
        <AlertDescription>No platform manifests available.</AlertDescription>
      </Alert>
    );
  }

  return <PopulatedIndex repoName={repoName} options={options} />;
}

function PopulatedIndex({
  repoName,
  options,
}: {
  repoName: string;
  options: PlatformOption[];
}) {
  const [selectedValue, setSelectedValue] = useState(
    options[0]?.value ?? ""
  );
  const selectedOption =
    options.find((option) => option.value === selectedValue) ?? options[0];
  const effectiveValue = selectedOption?.value ?? "";


  const { data, isLoading, error } = useManifest(
    repoName,
    selectedOption?.descriptor.digest ?? ""
  );

  return (
    <>
      <PlatformSelector
        options={options}
        value={effectiveValue}
        selectedOption={selectedOption}
        onValueChange={setSelectedValue}
      />
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load platform manifest: {error.message}
            </AlertDescription>
          </Alert>
        ) : data ? (
          <ManifestNode
            key={effectiveValue}
            repoName={repoName}
            manifest={data.manifest}
          />
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              Platform manifest is unavailable.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
}

function PlatformSelector({
  options,
  value,
  selectedOption,
  onValueChange,
}: {
  options: PlatformOption[];
  value: string;
  selectedOption: PlatformOption | undefined;
  onValueChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platforms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger aria-label="Platform">
            <SelectValue placeholder="Select a platform" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOption ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selectedOption.label}</Badge>
            <code className="break-all text-xs text-muted-foreground">
              {selectedOption.descriptor.digest}
            </code>
            {typeof selectedOption.descriptor.size === "number" ? (
              <span className="text-xs text-muted-foreground">
                {formatBytes(selectedOption.descriptor.size)}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ImageManifestDetails({
  repoName,
  manifest,
}: {
  repoName: string;
  manifest: OCIManifest;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Config Descriptor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {typeof manifest.config.mediaType === "string"
                ? manifest.config.mediaType
                : "unknown"}
            </Badge>
            <code className="break-all text-xs text-muted-foreground">
              {manifest.config.digest}
            </code>
            {typeof manifest.config.size === "number" ? (
              <span className="text-xs text-muted-foreground">
                {formatBytes(manifest.config.size)}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ImageConfigCard
        repoName={repoName}
        digest={manifest.config.digest}
      />

      <LayerTable layers={manifest.layers} />

      <Separator />
      <RawJsonCard title="Raw Image Manifest" value={manifest} />
    </>
  );
}

function ImageConfigCard({
  repoName,
  digest,
}: {
  repoName: string;
  digest: string;
}) {
  const { data, isLoading, error } = useImageConfig(repoName, digest);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Image Config</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load image config: {error.message}
            </AlertDescription>
          </Alert>
        ) : data ? (
          <ScrollArea className="max-h-96">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted p-4 text-xs">
              {JSON.stringify(data.config, null, 2)}
            </pre>
          </ScrollArea>
        ) : (
          <Alert variant="destructive">
            <AlertDescription>Image config is unavailable.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function RawJsonCard({ title, value }: { title: string; value: unknown }) {
  const json = JSON.stringify(value, null, 2);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-96">
          <pre className="overflow-x-auto rounded bg-muted p-4 text-xs">
            {json ?? "Unable to serialize manifest."}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}
