import { atom } from "jotai";

export const searchQueryAtom = atom("");
export const sortOrderAtom = atom<"asc" | "desc">("asc");
export const sidebarOpenAtom = atom(false);
export const deleteDialogAtom = atom<{
  open: boolean;
  repoName: string;
  digest: string;
  tag: string;
}>({ open: false, repoName: "", digest: "", tag: "" });
export const themeAtom = atom<"light" | "dark" | "system">("system");
