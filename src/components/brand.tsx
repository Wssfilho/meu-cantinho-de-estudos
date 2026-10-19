import { Link } from "@tanstack/react-router";
import { BookOpenCheck } from "lucide-react";

export function Brand({ to = "/dashboard" }: { to?: "/dashboard" | "/" }) {
  return (
    <Link to={to} className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-float">
        <BookOpenCheck className="size-5" strokeWidth={2.4} />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-foreground">Study</span>
    </Link>
  );
}
