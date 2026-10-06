"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin";
import { supabaseServidor } from "@/lib/supabase/server";

export type Resultado = { ok?: string; erro?: string };

// Libera (ou bloqueia de novo) o pagamento de quem teve alerta no pré-formulário.
export async function liberarPagamento(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = String(form.get("profile_id") ?? "");
  const liberar = form.get("liberar") === "sim";
  if (!/^[0-9a-f-]{36}$/.test(id)) return { erro: "Paciente inválido." };

  const supabase = await supabaseServidor();
  const { error } = liberar
    ? await supabase.from("liberacoes_pagamento").upsert({ profile_id: id }, { onConflict: "profile_id" })
    : await supabase.from("liberacoes_pagamento").delete().eq("profile_id", id);
  if (error) return { erro: "Não foi possível salvar: " + error.message };
  revalidatePath(`/pacientes/${id}`);
  return { ok: liberar ? "Pagamento liberado. Avise o paciente que já pode pagar." : "Pagamento bloqueado de novo." };
}
