// Recebe os avisos (webhooks) do Mercado Pago e atualiza a tabela pagamentos.
// Publicada SEM exigir login (verify_jwt = false): quem chama é o Mercado Pago.
//
// Segurança: o aviso só traz o número do pagamento. Os dados (status, valor, a qual
// pagamento nosso se refere) são sempre buscados de novo na API do Mercado Pago com o
// nosso Access Token, então um aviso falso não consegue marcar nada como pago.
// Com MP_WEBHOOK_SECRET configurado, a assinatura do aviso também é conferida.
//
// Segredos: MP_ACCESS_TOKEN (obrigatório), MP_WEBHOOK_SECRET (Suas integrações > Webhooks > Assinatura secreta).
import { createClient } from "jsr:@supabase/supabase-js@2";

// Chave secreta do banco: a antiga (service_role) ou a nova (sb_secret_), a que existir.
function chaveSecreta() {
  const antiga = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default as string; } catch { return ""; }
}

const STATUS: Record<string, string> = {
  approved: "aprovado",
  authorized: "em_analise",
  in_process: "em_analise",
  in_mediation: "em_analise",
  pending: "pendente",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "devolvido",
  charged_back: "devolvido",
};
const METODO: Record<string, string> = {
  bank_transfer: "pix",
  credit_card: "cartão de crédito",
  debit_card: "cartão de débito",
  account_money: "saldo Mercado Pago",
  ticket: "boleto",
};

async function hmacHex(segredo: string, texto: string) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(assinatura)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Confere o cabeçalho x-signature ("ts=...,v1=...") como manda a documentação do Mercado Pago.
async function assinaturaValida(req: Request, dataId: string, segredo: string) {
  const partes = Object.fromEntries((req.headers.get("x-signature") || "").split(",").map((p) => p.trim().split("=", 2)));
  const requestId = req.headers.get("x-request-id") || "";
  if (!partes.ts || !partes.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifesto = `id:${id};request-id:${requestId};ts:${partes.ts};`;
  return iguais(await hmacHex(segredo, manifesto), partes.v1);
}

const ok = () => new Response("ok", { status: 200 });

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!token) return new Response("não configurado", { status: 503 });

  const url = new URL(req.url);
  let corpo: Record<string, any> = {};
  try { corpo = await req.json(); } catch { /* alguns avisos vêm só na URL */ }

  const tipo = url.searchParams.get("type") || url.searchParams.get("topic") || corpo.type || corpo.topic || "";
  if (tipo !== "payment") return ok();   // outros avisos (pedido, estorno de disputa...) não importam aqui
  const dataId = String(url.searchParams.get("data.id") || corpo?.data?.id || url.searchParams.get("id") || "");
  if (!/^\d{1,30}$/.test(dataId)) return ok();

  const segredo = Deno.env.get("MP_WEBHOOK_SECRET");
  if (segredo && !(await assinaturaValida(req, dataId, segredo))) {
    console.warn("assinatura inválida", dataId);
    return new Response("assinatura inválida", { status: 401 });
  }

  // Fonte da verdade: a API do Mercado Pago.
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    console.error("consulta pagamento", dataId, r.status);
    return new Response("erro ao consultar", { status: 502 });   // o Mercado Pago tenta de novo depois
  }
  const p = await r.json();
  const nossoId = Number.parseInt(String(p.external_reference || ""), 10);
  if (!Number.isFinite(nossoId)) return ok();

  const db = createClient(Deno.env.get("SUPABASE_URL")!, chaveSecreta(), {
    auth: { persistSession: false },
  });
  const { data: linha, error } = await db.from("pagamentos")
    .select("id, valor, status, mp_payment_id").eq("id", nossoId).maybeSingle();
  if (error) return new Response("erro no banco", { status: 500 });
  if (!linha) return ok();

  let status = STATUS[p.status] || "pendente";
  // Uma mesma tentativa pode ter vários pagamentos (ex.: cartão recusado e depois Pix aprovado).
  // Se já está aprovado por outro pagamento, avisos antigos de tentativas recusadas não mudam nada.
  if (linha.status === "aprovado" && linha.mp_payment_id && linha.mp_payment_id !== dataId) return ok();
  // Valor pago menor que o do plano: não libera sozinho, a nutri confere.
  if (status === "aprovado" && Number(p.transaction_amount) + 0.009 < Number(linha.valor)) {
    console.warn("valor menor que o esperado", nossoId, p.transaction_amount, linha.valor);
    status = "em_analise";
  }

  const { error: e2 } = await db.from("pagamentos").update({
    status,
    mp_payment_id: dataId,
    metodo: METODO[p.payment_type_id] || p.payment_type_id || null,
    parcelas: p.installments || null,
    // pago_em fica registrado mesmo se depois houver devolução
    ...(status === "aprovado" ? { pago_em: p.date_approved || new Date().toISOString() } : {}),
  }).eq("id", nossoId);
  if (e2) {
    console.error("update pagamento", e2);
    return new Response("erro no banco", { status: 500 });
  }
  return ok();
});
