// Cria o pagamento no Mercado Pago e devolve o link da página de pagamento (Checkout Pro).
// Chamado pela página pagamento.html com o login do paciente. O login é conferido aqui no
// código (auth.getUser), por isso a função é publicada com verify_jwt = false.
//
// Segredos (Supabase > Edge Functions > Secrets):
//   MP_ACCESS_TOKEN  Access Token do Mercado Pago (Suas integrações > Credenciais). Nunca vai para o site.
//   SITE_URL         endereço do site público, sem barra no fim (opcional; padrão abaixo).
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.
import { createClient } from "jsr:@supabase/supabase-js@2";

// Chave secreta do banco: a antiga (service_role) ou a nova (sb_secret_), a que existir.
function chaveSecreta() {
  const antiga = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (antiga) return antiga;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default as string; } catch { return ""; }
}

const SITE_URL = (Deno.env.get("SITE_URL") || "https://paivanutri.vercel.app").replace(/\/+$/, "");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta({ erro: "Método não permitido." }, 405);

  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!token) return resposta({ erro: "O pagamento ainda não foi configurado. Fale com a nutricionista." }, 503);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, chaveSecreta(), {
    auth: { persistSession: false },
  });

  // Quem está pedindo? (o token do login vem no cabeçalho Authorization)
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return resposta({ erro: "Entre na sua conta para pagar." }, 401);
  const { data: u } = await db.auth.getUser(jwt);
  const user = u?.user;
  if (!user) return resposta({ erro: "Entre na sua conta para pagar." }, 401);

  let plano = "";
  try { plano = String((await req.json())?.plano || ""); } catch { /* corpo vazio */ }
  if (!/^[a-z0-9_-]{1,30}$/.test(plano)) return resposta({ erro: "Escolha um plano." }, 400);

  const [preco, perfil, anamnese, pre, liberacao] = await Promise.all([
    db.from("precos").select("plano, nome, valor, parcelas_max").eq("plano", plano).eq("ativo", true).maybeSingle(),
    db.from("profiles").select("id, nome, deleted_at").eq("id", user.id).maybeSingle(),
    db.from("anamneses").select("id").eq("profile_id", user.id).is("deleted_at", null).limit(1),
    db.from("pre_formularios").select("revisar").eq("profile_id", user.id).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(1),
    db.from("liberacoes_pagamento").select("profile_id").eq("profile_id", user.id).maybeSingle(),
  ]);
  const falha = [preco, perfil, anamnese, pre, liberacao].find((r) => r.error);
  if (falha) {
    console.error("consulta", falha.error);
    return resposta({ erro: "Não foi possível preparar o pagamento agora." }, 500);
  }
  if (!preco.data) return resposta({ erro: "Este plano não está disponível." }, 400);
  if (!perfil.data || perfil.data.deleted_at) return resposta({ erro: "Conta não encontrada." }, 403);
  if (!anamnese.data?.length) return resposta({ erro: "Preencha a anamnese antes de pagar.", passo: "anamnese" }, 409);
  if (pre.data?.[0]?.revisar && !liberacao.data) {
    return resposta({ erro: "A nutricionista vai avaliar suas respostas antes do pagamento.", passo: "avaliacao" }, 409);
  }

  // Valor sempre vem do banco, nunca do navegador.
  const valor = Number(preco.data.valor);
  const novo = await db.from("pagamentos")
    .insert({ profile_id: user.id, plano: preco.data.plano, valor })
    .select("id").single();
  if (novo.error) {
    console.error("insert pagamento", novo.error);
    return resposta({ erro: "Não foi possível preparar o pagamento agora." }, 500);
  }
  const id = novo.data.id as number;

  const preferencia = {
    items: [{
      id: preco.data.plano,
      title: `Paiva Nutri · Plano ${preco.data.nome}`,
      quantity: 1,
      currency_id: "BRL",
      unit_price: valor,
    }],
    payer: { email: user.email },
    external_reference: String(id),
    payment_methods: {
      installments: preco.data.parcelas_max,
      // Só Pix e cartão: boleto demora dias para compensar.
      excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
    },
    back_urls: {
      success: `${SITE_URL}/pagamento.html?retorno=aprovado`,
      pending: `${SITE_URL}/pagamento.html?retorno=pendente`,
      failure: `${SITE_URL}/pagamento.html?retorno=falhou`,
    },
    auto_return: "approved",
    notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
    statement_descriptor: "PAIVANUTRI",
  };

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pagamento-${id}`,
    },
    body: JSON.stringify(preferencia),
  });
  const mp = await r.json().catch(() => ({}));
  if (!r.ok || !mp.init_point) {
    console.error("mercado pago", r.status, mp);
    await db.from("pagamentos").update({ status: "cancelado" }).eq("id", id);
    return resposta({ erro: "O Mercado Pago não respondeu. Tente de novo em alguns minutos." }, 502);
  }

  await db.from("pagamentos").update({ mp_preference_id: mp.id }).eq("id", id);
  return resposta({ url: mp.init_point, id });
});
