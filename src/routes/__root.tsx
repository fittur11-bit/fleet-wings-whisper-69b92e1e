import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { useState, useEffect, createContext, useContext } from "react";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
 import { SplashScreen } from "@/components/SplashScreen";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold gold-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "FlightCore — Gestão de Frotas Aeronáuticas" },
      { name: "description", content: "Plataforma profissional para gestão de frotas aeronáuticas: aeronaves, manutenção, conformidade CVA e biblioteca técnica." },
      { name: "author", content: "FlightCore" },
      { property: "og:title", content: "FlightCore — Gestão de Frotas Aeronáuticas" },
      { property: "og:description", content: "Plataforma profissional para gestão de frotas aeronáuticas: aeronaves, manutenção, conformidade CVA e biblioteca técnica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#0F2139" },
      { name: "background-color", content: "#081020" },
      { name: "application-name", content: "FlightCore" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "FlightCore" },
      { name: "format-detection", content: "telephone=no" },
      { name: "msapplication-TileColor", content: "#0F2139" },
      { name: "msapplication-tap-highlight", content: "no" },
      { name: "twitter:title", content: "FlightCore — Gestão de Frotas Aeronáuticas" },
      { name: "twitter:description", content: "Plataforma profissional para gestão de frotas aeronáuticas: aeronaves, manutenção, conformidade CVA e biblioteca técnica." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e692e94f-691b-4c93-897f-5ad01ac8f718/id-preview-6e168a87--0f5ffe6a-715a-4275-9fa6-47307f34f1d2.lovable.app-1777904687193.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e692e94f-691b-4c93-897f-5ad01ac8f718/id-preview-6e168a87--0f5ffe6a-715a-4275-9fa6-47307f34f1d2.lovable.app-1777904687193.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "FlightCore",
              url: "https://coreflight.studioonze11.com.br",
              logo: "https://coreflight.studioonze11.com.br/icon-512.png",
            },
            {
              "@type": "WebSite",
              name: "FlightCore",
              url: "https://coreflight.studioonze11.com.br",
              inLanguage: "pt-BR",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

 function RootComponent() {
   const [queryClient] = useState(() => new QueryClient({
     defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
   }));
   const [showSplash, setShowSplash] = useState(true);
   const [theme, setTheme] = useState<Theme>("dark");

   useEffect(() => {
     const saved = typeof window !== "undefined" ? (localStorage.getItem("flightcore-theme") as Theme | null) : null;
     if (saved && saved !== theme) {
       setTheme(saved);
       return;
     }
     const root = window.document.documentElement;
     root.classList.remove("light", "dark");
     root.classList.add(theme);
     try { localStorage.setItem("flightcore-theme", theme); } catch {}
   }, [theme]);

   const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
 
   return (
     <QueryClientProvider client={queryClient}>
       <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
         <AuthProvider>
           {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
           <div className={showSplash ? "hidden" : "block"}>
             <Outlet />
           </div>
           <Toaster position="top-right" theme={theme} />
         </AuthProvider>
       </ThemeContext.Provider>
     </QueryClientProvider>
   );
 }
