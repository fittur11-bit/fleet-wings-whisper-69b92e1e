import type { ReactNode } from "react";

// DEV MODE: autenticação temporariamente desativada até o app ser finalizado.
// Para reativar, restaure a versão anterior deste arquivo.
export function AuthGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}