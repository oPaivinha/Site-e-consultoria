/**
 * CHECK-IN QUINZENAL E AVISOS — Google Apps Script lendo o Supabase (grátis)
 *
 * Esta versão substitui a que lia a Planilha Google. Os dados agora ficam no Supabase;
 * o site grava direto lá. Este script é só o "robô":
 *  1. verificarNovos (a cada 10 min): vê pré-formulários, anamneses e check-ins novos,
 *     confere os sinais de alerta do check-in e te avisa por e-mail.
 *  2. rotinaDiaria (todo dia às 8h): vê quem está com check-in vencido:
 *     - canal "email": envia o e-mail sozinho para o paciente;
 *     - canal "whatsapp": te manda um resumo com links que abrem o WhatsApp com a mensagem pronta.
 *     Também cuida dos lembretes para quem não respondeu. De quebra, mantém o projeto
 *     Supabase grátis acordado (ele pausa depois de 7 dias sem uso).
 *
 * Instalação (uma vez):
 *  1. Crie um projeto novo em script.google.com (não precisa estar ligado a planilha) e cole este arquivo.
 *  2. Engrenagem "Configurações do projeto" > Propriedades do script > adicione:
 *       SUPABASE_URL               https://SEU-PROJETO.supabase.co
 *       SUPABASE_SERVICE_ROLE_KEY  (Supabase > Project Settings > API Keys > service_role / secret)
 *     A service_role vê todos os pacientes: ela fica SÓ aqui, nunca no site nem no GitHub.
 *  3. Ajuste o CONFIG abaixo, rode testarConexao e depois instalarGatilhos (autorize quando pedir).
 * IMPORTANTE: enquanto MODO_TESTE = true, nenhum e-mail sai para paciente: tudo vai para você.
 */

var CONFIG = {
  MODO_TESTE: true,                                 // troque para false só quando estiver tudo conferido
  EMAIL_NUTRI: "seu-email@exemplo.com",             // onde você recebe alertas e o resumo diário
  NOME_NUTRI: "Gabriel Paiva",
  SITE_URL: "https://site-five-chi-48.vercel.app/",
  LEMBRETE_1_DIAS: 2,   // dias após o envio sem resposta
  LEMBRETE_2_DIAS: 7,   // segundo lembrete + aviso para você
  HORA_ROTINA: 8        // hora do envio diário (fuso do projeto do Apps Script)
};

// ---------------------------------------------------------------------------
// Textos (mesmo tom das mensagens do site; ajuste à vontade)
// ---------------------------------------------------------------------------
var TEXTOS = {
  checkin:
    "Oi, {nome}! Hora do nosso check-in quinzenal. 😊\n\n" +
    "São só 2 minutinhos: {link}\n\n" +
    "Suas respostas me ajudam a ajustar o plano para você. Se preferir, pode responder por aqui mesmo, até por áudio.\n\n" +
    "Para não receber mais estes lembretes, responda PAUSAR.",
  lembrete1:
    "Oi, {nome}! Sei que a rotina aperta. Quando puder, responde o check-in, mesmo que seja só a nota de 0 a 10 da adesão: {link} 😉",
  lembrete2:
    "{nome}, ainda não recebi seu check-in. Aconteceu algo ou está difícil seguir o plano? Se preferir, a gente conversa por ligação rápida. Link: {link}",
  // Menores de 18: a mensagem vai para o responsável legal
  checkinResponsavel:
    "Oi, {resp}! Hora do check-in quinzenal de {nome}. 😊\n\n" +
    "São só 2 minutinhos, e vocês podem responder juntos: {link}\n\n" +
    "As respostas me ajudam a ajustar o plano. Para não receber mais estes lembretes, responda PAUSAR.",
  lembrete1Responsavel:
    "Oi, {resp}! Quando puderem, respondam o check-in de {nome}, mesmo que seja só a nota de 0 a 10 da adesão: {link} 😉",
  lembrete2Responsavel:
    "{resp}, ainda não recebi o check-in de {nome}. Está tudo bem? Se preferir, a gente conversa por ligação rápida. Link: {link}",
  assuntoEmail: "Seu check-in quinzenal"
};
// Quando o paciente responder PAUSAR: no Supabase, Table Editor > acompanhamentos > pausado = true.

// ---------------------------------------------------------------------------
// 1. Envios novos: avisos para a nutri
// ---------------------------------------------------------------------------
function verificarNovos() {
  // evita aviso em dobro se a rotina diária e o gatilho de 10 min rodarem juntos
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try { verificarNovos_(); } finally { lock.releaseLock(); }
}

function verificarNovos_() {
  var agora = new Date().toISOString();

  sb_("get", "pre_formularios?avisado_em=is.null&order=created_at.asc&select=*,profiles(*)").forEach(function (f) {
    var p = f.profiles || {};
    var resp = f.responsavel || {};
    var alertas = f.alertas || [];
    MailApp.sendEmail(CONFIG.EMAIL_NUTRI,
      "[Site] Novo pré-formulário: " + p.nome + (f.revisar ? " (REVISAR antes de agendar)" : ""),
      "Nome: " + p.nome + "\nWhatsApp: " + (p.whatsapp || "-") + "\nE-mail da conta: " + (p.email || "-") +
      "\nObjetivo: " + (f.objetivo || "-") +
      (alertas.length ? "\nAlertas de saúde: " + alertas.join(", ") : "") +
      (p.menor ? "\nMenor de idade. Responsável: " + (resp.nome || p.responsavel_nome || "-") + " (" + (resp.whatsapp || p.responsavel_whatsapp || "-") + ")" : "") +
      "\n\nA pessoa já tem conta no site (precisa confirmar o e-mail para entrar)." +
      "\nLink da anamnese para enviar depois do pagamento (pede login):\n" + CONFIG.SITE_URL + "anamnese.html" +
      "\n\nPara iniciar o acompanhamento: Supabase > Table Editor > acompanhamentos > preencha inicio_acompanhamento.");
    sb_("patch", "pre_formularios?id=eq." + f.id, { avisado_em: agora });
  });

  sb_("get", "anamneses?avisado_em=is.null&order=created_at.asc&select=id,profiles(nome)").forEach(function (a) {
    MailApp.sendEmail(CONFIG.EMAIL_NUTRI, "[Site] Anamnese recebida: " + ((a.profiles || {}).nome || "sem nome"),
      "A resposta completa está no Supabase: Table Editor > anamneses (coluna respostas).");
    sb_("patch", "anamneses?id=eq." + a.id, { avisado_em: agora });
  });

  sb_("get", "checkins?avisado_em=is.null&order=created_at.asc&select=*,profiles(nome)").forEach(function (c) {
    var anterior = sb_("get", "checkins?profile_id=eq." + c.profile_id + "&id=lt." + c.id +
      "&order=created_at.desc&limit=1&select=adesao,bristol")[0] || null;
    var avisos = avaliar_(c, anterior);
    sb_("patch", "checkins?id=eq." + c.id, { avisos_para_nutri: avisos.join(" | "), avisado_em: agora });
    if (avisos.length) {
      var nome = (c.profiles || {}).nome || "Paciente";
      MailApp.sendEmail(CONFIG.EMAIL_NUTRI, "[Check-in] " + nome + ": " + avisos[0],
        "Avisos:\n- " + avisos.join("\n- ") + "\n\nRecado do paciente: " + (c.recado || "(nenhum)") +
        "\n\nResposta completa no Supabase: Table Editor > checkins.");
    }
  });
}

// Regras de aviso para a nutricionista. Ordem = prioridade (o primeiro vai no assunto do e-mail).
function avaliar_(d, anterior) {
  var a = [];
  var alertas = d.alerta || [];
  if (alertas.length) a.push("SINAL DE ALERTA: " + alertas.join(", ") + ". Ligar hoje.");
  if (d.quer_contato) a.push("Pediu para conversar.");
  if (d.adesao <= 4) a.push("Adesão baixa (" + d.adesao + "/10).");
  else if (d.adesao <= 5 && anterior && Number(anterior.adesao) <= 5) a.push("Adesão ≤ 5 duas vezes seguidas.");
  if (d.freq_evacuacao === "1_2x_semana" || d.freq_evacuacao === "menos") a.push("Intestino preso (" + d.freq_evacuacao + ").");
  else if (d.bristol && d.bristol <= 2) a.push("Fezes ressecadas (Bristol " + d.bristol + ").");
  if (d.bristol === 7) a.push("Fezes líquidas (Bristol 7).");
  else if (d.bristol === 6 && anterior && Number(anterior.bristol) >= 6) a.push("Fezes moles (Bristol 6+) duas vezes seguidas.");
  if (d.agua === "menos_1l") a.push("Água abaixo de 1 L por dia.");
  if (d.deslizes === "mais_5") a.push("Mais de 5 deslizes na quinzena.");
  if (d.fome === "passando_fome") a.push("Relata estar passando fome.");
  return a;
}

// ---------------------------------------------------------------------------
// 2. Rotina diária: envia check-ins vencidos e lembretes
// ---------------------------------------------------------------------------
function rotinaDiaria() {
  verificarNovos();   // garante que nada ficou sem aviso

  // ativos, não pausados, com o perfil junto. A data do próximo check-in é marcada pelo banco
  // quando você preenche inicio_acompanhamento e a cada check-in respondido.
  var lista = sb_("get", "acompanhamentos?ativo=is.true&pausado=is.false&select=*,profiles(*)");
  var dia = hoje_();
  var paraWhats = [];
  var semResposta = [];

  lista.forEach(function (a) {
    var p = a.profiles || {};
    if (!p.aceita_checkin) return;   // só quem marcou o consentimento para receber check-ins

    var proximo = data_(a.proximo_checkin);
    var envio = data_(a.ultimo_envio);
    var respondeu = data_(a.ultima_resposta);
    var pendente = envio && (!respondeu || respondeu < envio);

    var tipo = null, mud = null;
    if (proximo && proximo <= dia && (!envio || envio < proximo)) {
      tipo = "checkin";
      mud = { ultimo_envio: isoDia_(dia), lembretes_enviados: 0 };
    } else if (pendente) {
      var dias = diasEntre_(envio, dia);
      var feitos = Number(a.lembretes_enviados) || 0;
      if (dias >= CONFIG.LEMBRETE_2_DIAS && feitos < 2) {
        tipo = "lembrete2";
        semResposta.push(p.nome + " (enviado há " + dias + " dias)");
      } else if (dias >= CONFIG.LEMBRETE_1_DIAS && feitos < 1) {
        tipo = "lembrete1";
      }
      if (tipo) mud = { lembretes_enviados: tipo === "lembrete2" ? 2 : 1 };
    }
    if (!tipo) return;
    sb_("patch", "acompanhamentos?profile_id=eq." + a.profile_id, mud);

    var menor = !!p.menor;
    var texto = montar_(TEXTOS[menor ? tipo + "Responsavel" : tipo] || TEXTOS[tipo], p);
    // Menor: a conta já é do responsável, então p.email é o e-mail dele
    var email = menor ? (p.responsavel_email || p.email) : p.email;
    var whats = menor ? p.responsavel_whatsapp : p.whatsapp;
    var rotulo = p.nome + (menor ? " (via responsável " + (p.responsavel_nome || "") + ")" : "");
    if (p.canal === "email" && email) {
      var destino = CONFIG.MODO_TESTE ? CONFIG.EMAIL_NUTRI : email;
      MailApp.sendEmail(destino, (CONFIG.MODO_TESTE ? "[TESTE para " + email + "] " : "") + TEXTOS.assuntoEmail,
        texto + "\n\n" + CONFIG.NOME_NUTRI);
    } else if (whats) {
      paraWhats.push({ nome: rotulo, tipo: tipo, link: "https://wa.me/" + soDigitos_(whats) + "?text=" + encodeURIComponent(texto) });
    }
  });

  if (paraWhats.length || semResposta.length) {
    var nomesTipo = { checkin: "check-in", lembrete1: "1º lembrete", lembrete2: "2º lembrete" };
    var html = "<p>Bom dia! Mensagens de hoje. Toque em cada link para abrir o WhatsApp com o texto pronto e enviar:</p><ul>" +
      paraWhats.map(function (w) {
        return "<li>" + esc_(w.nome) + " (" + nomesTipo[w.tipo] + "): <a href=\"" + w.link + "\">abrir WhatsApp</a></li>";
      }).join("") + "</ul>";
    if (semResposta.length) {
      html += "<p><strong>Sem resposta há uma semana:</strong> " + semResposta.map(esc_).join(", ") + ". Vale um contato pessoal.</p>";
    }
    MailApp.sendEmail({ to: CONFIG.EMAIL_NUTRI, subject: "Check-ins de hoje (" + paraWhats.length + ")", htmlBody: html });
  }
}

// ---------------------------------------------------------------------------
// 3. Para rodar à mão no editor
// ---------------------------------------------------------------------------

// Confere se as Propriedades do script estão certas. Mostra quantos pacientes existem.
function testarConexao() {
  var r = sb_("get", "profiles?select=id");
  console.log("Conexão OK. Pacientes cadastrados: " + r.length);
}

// Liga a rotina diária e a verificação de envios novos. Rode uma vez.
function instalarGatilhos() {
  removerGatilhos();
  ScriptApp.newTrigger("rotinaDiaria").timeBased().everyDays(1).atHour(CONFIG.HORA_ROTINA).create();
  ScriptApp.newTrigger("verificarNovos").timeBased().everyMinutes(10).create();
}

// Desliga tudo.
function removerGatilhos() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
}

// ---------------------------------------------------------------------------
// Internos
// ---------------------------------------------------------------------------

// Chamada à API REST do Supabase com a chave service_role (ignora o RLS: só para este script).
function sb_(metodo, caminho, corpo) {
  var props = PropertiesService.getScriptProperties();
  var url = String(props.getProperty("SUPABASE_URL") || "").replace(/\/$/, "");
  var chave = props.getProperty("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !chave) throw new Error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas Propriedades do script.");
  var opcoes = {
    method: metodo,
    contentType: "application/json",
    headers: { apikey: chave, Authorization: "Bearer " + chave, Prefer: "return=minimal" },
    muteHttpExceptions: true
  };
  if (corpo) opcoes.payload = JSON.stringify(corpo);
  var r = UrlFetchApp.fetch(url + "/rest/v1/" + caminho, opcoes);
  var codigo = r.getResponseCode();
  if (codigo >= 300) throw new Error("Supabase " + codigo + " em " + caminho.split("?")[0] + ": " + r.getContentText());
  var texto = r.getContentText();
  return texto ? JSON.parse(texto) : null;
}

function montar_(modelo, p) {
  var primeiroNome = String(p.nome || "").split(" ")[0];
  var resp = String(p.responsavel_nome || "").split(" ")[0];
  return modelo.replace(/\{nome\}/g, primeiroNome).replace(/\{resp\}/g, resp).replace(/\{link\}/g, CONFIG.SITE_URL + "checkin.html");
}

function hoje_() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function data_(v) {
  if (!v) return null;
  // "2026-10-16" (date) é lido como dia local; timestamps com hora seguem o fuso deles
  var d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00") : new Date(v);
  if (isNaN(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}
function isoDia_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); }
function diasEntre_(a, b) { return Math.round((b - a) / 86400000); }
function soDigitos_(s) { return String(s || "").replace(/\D/g, ""); }
function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
