import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const resetPasswordWithSecurity = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; answer: string; newPassword: string }) => {
    if (!input?.email || !input?.answer || !input?.newPassword) {
      throw new Error("Campos obrigatórios ausentes");
    }
    if (input.newPassword.length < 6) {
      throw new Error("A nova senha deve ter ao menos 6 caracteres");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { data: verify, error: verr } = await supabaseAdmin.rpc("verify_security_answer", {
      _email: data.email,
      _answer: data.answer,
    });
    if (verr) throw new Error(verr.message);
    const result = verify as { ok: boolean; user_id?: string; reason?: string };
    if (!result?.ok || !result.user_id) {
      throw new Error("Resposta de segurança incorreta ou usuário não encontrado");
    }

    const { error: uerr } = await supabaseAdmin.auth.admin.updateUserById(result.user_id, {
      password: data.newPassword,
    });
    if (uerr) throw new Error(uerr.message);

    return { ok: true };
  });