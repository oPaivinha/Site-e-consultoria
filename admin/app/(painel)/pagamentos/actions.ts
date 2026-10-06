"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin";
import { supabaseServidor } from "@/lib/supabase/server";

export type Resultado = { ok?: string; erro?: string };

// Valor e parcelamento de um plano. É este valor que o Mercado Pago cobra.
export async function salvarPreco(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const plano = String(form.get("plano") ?? "");
  const valor = Number(String(form.get("valor") ?? "").replace(/\./g, "").replace(",", "."));
  const parcelas = Number.parseInt(String(form.get("parcelas") ?? "1"), 10);
  const ativo = form.get("ativo") === "on";
  if (!/^[a-z0-9_-]{1,30}$/.test(plano)) return { erro: "Plano inválido." };
  if (!Number.isFinite(valor) || valor <= 0 || valor > 100000) return { erro: "Valor inválido." };
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) return { erro: "Parcelas: de 1 a 12." };

  const supabase = await supabaseServidor();
  const { error } = await supabase.from("precos")
    .update({ valor: Math.round(valor * 100) / 100, parcelas_max: parcelas, ativo })
    .eq("plano", plano);
  if (error) return { erro: "Não foi possível salvar: " + error.message };
  revalidatePath("/pagamentos");
  return { ok: "Salvo." };
}
