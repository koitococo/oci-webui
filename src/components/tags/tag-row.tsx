"use client";

import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

export function TagRow({
  repoName,
  tag,
}: {
  repoName: string;
  tag: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <Badge variant="secondary" className="font-mono">
          {tag}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Link href={`/repos/${repoName}/_tag/${tag}`}>
          <Button variant="ghost" size="sm">
            <Eye className="mr-1 h-4 w-4" />
            Inspect
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}
