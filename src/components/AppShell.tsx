import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-200">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-background/60 backdrop-blur-xl px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="font-display font-semibold tracking-tight">FleetControl</span>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}