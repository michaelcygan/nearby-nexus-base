import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { submitReport } from "@/features/moderation/report.functions";
import {
  reportReasonLabels,
  reportReasons,
  reportTargetLabels,
} from "@/features/moderation/types";
import type { ReportReason, ReportTarget } from "@/features/moderation/types";
import { useSession } from "@/hooks/use-session";
import { Link } from "@tanstack/react-router";

export function ReportButton({
  targetType,
  targetId,
  label,
}: {
  targetType: ReportTarget;
  targetId: string;
  label?: string;
}) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitReport({ data: { target_type: targetType, target_id: targetId, reason, note } }),
    onSuccess: () => {
      toast.success("Thanks — a moderator will take a look.");
      setOpen(false);
      setNote("");
    },
    onError: (error: Error) =>
      toast.error(error.message || "That report didn't go through. Try again."),
  });

  if (!session) {
    return (
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link to="/auth">Sign in to report</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          {label ?? "Report"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report this {reportTargetLabels[targetType].toLowerCase()}</DialogTitle>
          <DialogDescription>
            Reports are private. Moderators see what you send, the other neighbor doesn't. Our{" "}
            <Link
              to="/community-guidelines"
              className="underline underline-offset-4"
              onClick={() => setOpen(false)}
            >
              community guidelines
            </Link>{" "}
            explain what we act on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup
            value={reason}
            onValueChange={(value) => setReason(value as ReportReason)}
            className="gap-2"
          >
            {reportReasons.map((value) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`reason-${targetId}-${value}`} />
                <Label htmlFor={`reason-${targetId}-${value}`} className="font-normal">
                  {reportReasonLabels[value]}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor={`note-${targetId}`}>Anything else? (optional)</Label>
            <Textarea
              id={`note-${targetId}`}
              value={note}
              maxLength={500}
              rows={3}
              placeholder="Add context that would help a moderator."
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
