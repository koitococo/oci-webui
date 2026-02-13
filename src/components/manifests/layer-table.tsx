"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OCIDescriptor } from "@/lib/registry/types";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export function LayerTable({ layers }: { layers: OCIDescriptor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Layers ({layers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Digest</TableHead>
              <TableHead>Media Type</TableHead>
              <TableHead className="text-right">Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {layers.map((layer, i) => (
              <TableRow key={layer.digest}>
                <TableCell className="text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <code className="text-xs">{layer.digest.slice(0, 19)}...</code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {layer.mediaType.split(".").pop()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatBytes(layer.size)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
