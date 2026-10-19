import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignOut } from "@/hooks/use-sign-out";
import { profileQuery, useUpdateProfile } from "@/lib/study-data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Study" },
      { name: "description", content: "Ajuste seu nome e sua conta." },
      { property: "og:title", content: "Configurações — Study" },
      { property: "og:description", content: "Ajuste seu nome e sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery(context.user.id)),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useSuspenseQuery(profileQuery(user.id));
  const [name, setName] = useState(profile?.display_name ?? "");
  const update = useUpdateProfile(user.id);
  const signOut = useSignOut();

  useEffect(() => setName(profile?.display_name ?? ""), [profile?.display_name]);

  return (
    <main className="flex-1 space-y-7 p-5 sm:p-8">
      <PageHeader title="Configurações" />
      <section className="card-surface max-w-xl p-7 sm:p-8">
        <h2 className="font-bold">Seu perfil</h2>
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) update.mutate(name);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="h-11" />
            <p className="text-xs text-muted-foreground">Aparece na mensagem de boas-vindas do painel.</p>
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={user.email ?? ""} disabled className="h-11" />
          </div>
          <Button type="submit" disabled={!name.trim() || update.isPending}>
            Salvar
          </Button>
        </form>
      </section>
      <section className="card-surface max-w-xl p-7 sm:p-8">
        <h2 className="font-bold">Conta</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sair desta conta neste aparelho.</p>
        <Button variant="outline" className="mt-5" onClick={signOut}>
          Sair
        </Button>
      </section>
    </main>
  );
}
