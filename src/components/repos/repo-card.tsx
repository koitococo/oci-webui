"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export function RepoCard({ name }: { name: string }) {
  return (
    <Link href={`/repos/${name}`}>
      <Card className="gap-0 py-0 transition-colors hover:bg-accent">
        <CardHeader className="flex flex-row items-center gap-3 px-4 py-3">
          <Package className="h-5 w-5 shrink-0 text-muted-foreground" />
          <CardTitle className="truncate text-sm font-medium">
            {name}
          </CardTitle>
        </CardHeader>
      </Card>
    </Link>
  );
}
