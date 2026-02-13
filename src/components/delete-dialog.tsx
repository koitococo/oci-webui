"use client";

import { useAtom } from "jotai";
import { deleteDialogAtom } from "@/store/atoms";
import { useDeleteManifest } from "@/hooks/use-registry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DeleteDialog() {
  const [dialog, setDialog] = useAtom(deleteDialogAtom);
  const deleteMutation = useDeleteManifest();

  function handleClose() {
    setDialog({ open: false, repoName: "", digest: "", tag: "" });
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync({
        name: dialog.repoName,
        digest: dialog.digest,
      });
      toast.success(`Deleted ${dialog.repoName}:${dialog.tag}`);
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete manifest"
      );
    }
  }

  return (
    <Dialog open={dialog.open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete manifest?</DialogTitle>
          <DialogDescription>
            This will permanently delete the manifest for{" "}
            <strong>
              {dialog.repoName}:{dialog.tag}
            </strong>
            . This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
