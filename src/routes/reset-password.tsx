import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Study" },
      { name: "description", content: "Defina uma nova senha para sua conta Study." },
      { property: "og:title", content: "Nova senha — Study" },
      { property: "og:description", content: "Defina uma nova senha para sua conta Study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="card-surface w-full max-w-md p-8 sm:p-10">
        <Brand to="/" />
        <h1 className="mt-8 text-2xl font-extrabold">Defina uma nova senha</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Abra esta página pelo link enviado para o seu e-mail.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const { error } = await supabase.auth.updateUser({ password });
              setLoading(false);
              if (error) {
                toast.error("Não foi possível alterar a senha", { description: error.message });
                return;
              }
              toast.success("Senha alterada!");
              navigate({ to: "/dashboard", replace: true });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" variant="hero" className="h-11 w-full" disabled={loading}>
              Salvar nova senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
