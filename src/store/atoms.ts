import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const searchQueryAtom = atom("");
export const sortOrderAtom = atomWithStorage<"asc" | "desc">("sortOrder", "asc");
export const sidebarOpenAtom = atom(false);
export const deleteDialogAtom = atom<{
  open: boolean;
  repoName: string;
  digest: string;
  tag: string;
}>({ open: false, repoName: "", digest: "", tag: "" });
export const themeAtom = atom<"light" | "dark" | "system">("system");
export const repoViewModeAtom = atomWithStorage<"grid" | "tree">("repoViewMode", "grid");
