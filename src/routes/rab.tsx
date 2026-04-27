import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/rab")({
  component: Page,
});

function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <div className="p-8">
          <h1 className="font-display text-3xl font-bold gold-text">Consulta RAB</h1>
          <p className="mt-2 text-muted-foreground">Em construção.</p>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
