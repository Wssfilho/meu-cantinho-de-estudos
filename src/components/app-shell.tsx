import { useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, Library, LogOut, Menu, Settings, Timer } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSignOut } from "@/hooks/use-sign-out";
import { cn } from "@/lib/utils";
import checklistImg from "@/assets/checklist.png";

const NAV = [
  { to: "/dashboard", label: "Painel", icon: Home },
  { to: "/materias", label: "Matérias", icon: Library },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function SidebarContentInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();

  return (
    <div className="flex h-full flex-col">
      <div className="px-7 pt-6 pb-6">
        <Brand />
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-4 px-9 py-3 text-[15px] font-semibold transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground",
              )}
            >
              {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-primary" />}
              <item.icon className={cn("size-5", active && "text-primary")} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={signOut}
          className="flex items-center gap-4 px-9 py-3 text-left text-[15px] font-semibold text-sidebar-foreground transition-colors hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-5" strokeWidth={1.8} />
          Sair
        </button>
      </nav>

      <div className="mt-auto p-5">
        <div className="rounded-2xl bg-sidebar-accent px-5 pb-5 pt-4 text-center">
          <img
            src={checklistImg}
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            className="mx-auto h-24 w-auto [@media(max-height:760px)]:hidden"
          />
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
            Divida cada matéria em conteúdos pequenos
          </p>
          <Button asChild size="sm" className="mt-4 w-full font-semibold">
            <Link to="/materias" onClick={onNavigate}>
              Ver matérias
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="mx-auto flex h-full w-full overflow-hidden bg-background">
        <aside className="hidden w-64 shrink-0 overflow-y-auto bg-sidebar lg:block">
          <SidebarContentInner />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b bg-shell px-5 py-3 lg:hidden">
            <Brand />
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </div>
          {/* Páginas maiores que a tela rolam aqui dentro, não na janela. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SidebarContentInner onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
