"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Folder, FolderOpen, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  isRepo: boolean;
}

function buildTree(repos: string[]): TreeNode {
  const root: TreeNode = {
    name: "",
    fullPath: "",
    children: new Map(),
    isRepo: false,
  };

  for (const repo of repos) {
    const parts = repo.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: parts.slice(0, i + 1).join("/"),
          children: new Map(),
          isRepo: false,
        });
      }
      current = current.children.get(part)!;
    }
    current.isRepo = true;
  }

  return root;
}

function TreeItem({
  node,
  depth,
}: {
  node: TreeNode;
  depth: number;
}) {
  const hasChildren = node.children.size > 0;
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.isRepo && !hasChildren) {
    return (
      <Link
        href={`/repos/${node.fullPath}`}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent",
          node.isRepo && "font-medium"
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90"
          )}
        />
        {expanded ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
        {node.isRepo && (
          <Link
            href={`/repos/${node.fullPath}`}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            View tags
          </Link>
        )}
      </button>
      {expanded && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => {
              // Folders first, then repos
              const aIsFolder = a.children.size > 0 && !a.isRepo;
              const bIsFolder = b.children.size > 0 && !b.isRepo;
              if (aIsFolder && !bIsFolder) return -1;
              if (!aIsFolder && bIsFolder) return 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeItem key={child.fullPath} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export function RepoTree({ repos }: { repos: string[] }) {
  const tree = useMemo(() => buildTree(repos), [repos]);

  if (repos.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No repositories found.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-2">
      {Array.from(tree.children.values())
        .sort((a, b) => {
          const aIsFolder = a.children.size > 0 && !a.isRepo;
          const bIsFolder = b.children.size > 0 && !b.isRepo;
          if (aIsFolder && !bIsFolder) return -1;
          if (!aIsFolder && bIsFolder) return 1;
          return a.name.localeCompare(b.name);
        })
        .map((child) => (
          <TreeItem key={child.fullPath} node={child} depth={0} />
        ))}
    </div>
  );
}
