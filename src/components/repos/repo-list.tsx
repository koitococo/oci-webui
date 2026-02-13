"use client";

import { useRepositories } from "@/hooks/use-registry";
import { useAtom } from "jotai";
import { searchQueryAtom, sortOrderAtom } from "@/store/atoms";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RepoCard } from "./repo-card";
import { ArrowUpDown, Search } from "lucide-react";
import { useMemo } from "react";

export function RepoList() {
  const { data, isLoading, error } = useRepositories();
  const [search, setSearch] = useAtom(searchQueryAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);

  const filtered = useMemo(() => {
    if (!data?.repositories) return [];
    let repos = data.repositories.filter((r) =>
      r.toLowerCase().includes(search.toLowerCase())
    );
    repos.sort((a, b) =>
      sortOrder === "asc" ? a.localeCompare(b) : b.localeCompare(a)
    );
    return repos;
  }, [data, search, sortOrder]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load repositories: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
          }
          title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {search ? "No repositories match your search." : "No repositories found."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((name) => (
            <RepoCard key={name} name={name} />
          ))}
        </div>
      )}
    </div>
  );
}
