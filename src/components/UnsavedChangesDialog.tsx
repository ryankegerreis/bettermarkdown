import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UnsavedChangesDialogProps {
  open: boolean;
  fileName: string;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

/** Save / Don't Save / Cancel guard shown before discarding an edited buffer. */
export function UnsavedChangesDialog({
  open,
  fileName,
  onSave,
  onDontSave,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save changes to “{fileName}”?</DialogTitle>
          <DialogDescription>
            Your changes will be lost if you don’t save them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={onDontSave}>
            Don’t Save
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
