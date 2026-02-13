"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCatalog,
  fetchTags,
  fetchManifest,
  deleteManifest,
} from "@/lib/api-client";

export function useRepositories() {
  return useQuery({
    queryKey: ["repositories"],
    queryFn: () => fetchCatalog(),
  });
}

export function useTags(repoName: string) {
  return useQuery({
    queryKey: ["tags", repoName],
    queryFn: () => fetchTags(repoName),
    enabled: !!repoName,
  });
}

export function useManifest(repoName: string, ref: string) {
  return useQuery({
    queryKey: ["manifest", repoName, ref],
    queryFn: () => fetchManifest(repoName, ref),
    enabled: !!repoName && !!ref,
  });
}

export function useDeleteManifest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, digest }: { name: string; digest: string }) =>
      deleteManifest(name, digest),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tags", variables.name],
      });
    },
  });
}
