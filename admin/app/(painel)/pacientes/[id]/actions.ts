"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin";
import { supabaseServidor } from "@/lib/supabase/server";

export type Resultado = { ok?: string; erro?: string };
const UUID = /^[0-9a-f-]{36}$/;

// Salva a observação interna sobre o paciente (só admin vê).
export async function salvarObservacao(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = String(form.get("profile_id") ?? "");
  const texto = String(form.get("texto") ?? "").trim();
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  if (texto.length > 5000) return { erro: "Texto muito longo (máximo 5.000 caracteres)." };

  const supabase = await supabaseServidor();
  const { data: atual } = await supabase.from("notas_internas").select("id").eq("profile_id", id).is("checkin_id", null).maybeSingle();
  const r = atual
    ? await supabase.from("notas_internas").update({ texto }).eq("id", atual.id)
    : texto
      ? await supabase.from("notas_internas").insert({ profile_id: id, texto })
      : { error: null };
  if (r.error) return { erro: "Não foi possível salvar: " + r.error.message };
  revalidatePath(`/pacientes/${id}`);
  return { ok: "Observação salva." };
}

// Início do acompanhamento e pausa. O banco calcula o próximo check-in sozinho.
export async function salvarAcompanhamento(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = String(form.get("profile_id") ?? "");
  const inicio = String(form.get("inicio") ?? "");
  const pausado = form.get("pausado") === "on";
  if (!UUID.test(id)) return { erro: "Paciente inválido." };
  if (inicio && !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return { erro: "Data de início inválida." };

  const supabase = await supabaseServidor();
  const { error } = await supabase
    .from("acompanhamentos")
    .upsert({ profile_id: id, inicio_acompanhamento: inicio || null, pausado }, { onConflict: "profile_id" });
  if (error) return { erro: "Não foi possível salvar: " + error.message };
  revalidatePath(`/pacientes/${id}`);
  return { ok: "Acompanhamento salvo." };
}
