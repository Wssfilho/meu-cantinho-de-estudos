import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECT_COLORS, subjectColor } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

type Props = {
  trigger: ReactNode;
  title: string;
  submitLabel: string;
  initial?: { name: string; color: string };
  pending?: boolean;
  onSubmit: (values: { name: string; color: string }) => Promise<unknown>;
};

export function SubjectDialog({ trigger, title, submitLabel, initial, pending, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "sky");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setColor(initial?.color ?? "sky");
    }
  }, [open, initial?.name, initial?.color]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            await onSubmit({ name, color });
            setOpen(false);
          }}
          className="space-y-6"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Dê um nome e escolha uma cor para identificar a matéria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="subject-name">Nome</Label>
            <Input
              id="subject-name"
              autoFocus
              maxLength={60}
              placeholder="Ex: Matemática"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-3">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={subjectColor(c).label}
                  onClick={() => setColor(c)}
                  className={cn(
                    "grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-card transition",
                    subjectColor(c).dot,
                    color === c && "ring-2 ring-ring",
                  )}
                >
                  {color === c && <Check className="size-4 text-primary-foreground" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
