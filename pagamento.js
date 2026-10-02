// Tela de pagamento: último passo depois do cadastro e da anamnese.
// O valor cobrado vem da tabela "precos" do banco; descrição e duração vêm do planos.js.
// O botão chama a Edge Function mp-checkout, que cria o pagamento no Mercado Pago e devolve
// o link da página segura de pagamento. A confirmação chega pelo aviso (webhook) do Mercado
// Pago na Edge Function mp-webhook, que atualiza a tabela "pagamentos".
(function () {
  var cfg = window.SITE_CONFIG || {};
  var PN = window.PN || {};
  var PLANOS = window.PLANOS || [];
  var params = new URLSearchParams(window.location.search);
  var retorno = params.get("retorno");   // aprovado | pendente | falhou (volta do Mercado Pago)
  function $(id) { return document.getElementById(id); }

  var ESTADOS = ["estAnamnese", "estAvaliacao", "estProcessando", "estPago", "estEscolha"];
  function mostrar(id) {
    $("carregando").hidden = true;
    ESTADOS.forEach(function (e) { $(e).hidden = e !== id; });
    window.scrollTo({ top: 0 });
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function reais(n) {
    return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function dataBR(iso) { return iso ? new Date(iso).toLocaleDateString("pt-BR") : ""; }
  function duracao(meses) { return meses === 1 ? "1 mês" : meses + " meses"; }

  // Links do WhatsApp e da agenda
  if (cfg.whatsapp) {
    document.querySelectorAll("[data-whats]").forEach(function (a) {
      a.href = "https://wa.me/" + cfg.whatsapp;
      a.hidden = false;
    });
  }
  if (cfg.schedulingUrl) { $("btnAgendar").href = cfg.schedulingUrl; $("btnAgendar").hidden = false; }

  // ---------- Planos ----------
  var planos = [];   // [{ id, nome, valor, parcelas, meses, inclui, destaque }]
  var escolhido = null;

  function juntarPlanos(precos) {
    var porId = {};
    (precos || []).forEach(function (p) { porId[p.plano] = p; });
    planos = PLANOS.filter(function (p) { return porId[p.id]; }).map(function (p) {
      var pr = porId[p.id];
      return { id: p.id, nome: pr.nome || p.nome, valor: Number(pr.valor), parcelas: pr.parcelas_max || 1,
               meses: p.meses || 1, inclui: p.inclui || [], destaque: !!p.destaque };
    });
  }

  function guardado() {
    try { return localStorage.getItem("pn_plano"); } catch (e) { return null; }
  }

  function montarPlanos() {
    var lista = $("listaPlanos");
    if (!planos.length) {
      lista.innerHTML = '<p class="msg msg--aviso">Nenhum plano disponível para pagamento agora. Fale comigo pelo WhatsApp.</p>';
      $("btnPagar").disabled = true;
      return;
    }
    var inicial = guardado();
    if (!planos.some(function (p) { return p.id === inicial; })) {
      inicial = (planos.filter(function (p) { return p.destaque; })[0] || planos[0]).id;
    }
    lista.innerHTML = planos.map(function (p) {
      var porMes = p.meses > 1 ? "<small>equivale a " + esc(reais(p.valor / p.meses)) + "/mês</small>" : "";
      var parc = p.parcelas > 1 ? "<small>ou em até " + p.parcelas + "x no cartão</small>" : "";
      return (
        '<label class="option pay-plan">' +
          (p.destaque ? '<span class="pay-plan__badge">Mais escolhido</span>' : "") +
          '<input type="radio" name="plano" value="' + esc(p.id) + '"' + (p.id === inicial ? " checked" : "") + ">" +
          '<span><span class="pay-plan__name">' + esc(p.nome) + '</span><span class="pay-plan__dur">' + duracao(p.meses) + " de acompanhamento</span></span>" +
          '<span class="pay-plan__price">' + esc(reais(p.valor)) + porMes + parc + "</span>" +
          '<ul class="pay-plan__list">' + p.inclui.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" +
        "</label>"
      );
    }).join("");
    escolher(inicial);
  }

  function escolher(id) {
    escolhido = planos.filter(function (p) { return p.id === id; })[0] || null;
    if (!escolhido) return;
    try { localStorage.setItem("pn_plano", id); } catch (e) { /* tudo bem */ }
    $("resPlano").textContent = escolhido.nome;
    $("resDuracao").textContent = duracao(escolhido.meses);
    $("resTotal").textContent = reais(escolhido.valor);
    $("resFormas").textContent = "Pix ou cartão de crédito" + (escolhido.parcelas > 1 ? " (até " + escolhido.parcelas + "x)" : "");
    $("resumo").hidden = false;
  }

  $("listaPlanos").addEventListener("change", function (e) {
    if (e.target.name === "plano") escolher(e.target.value);
  });
  $("aceite").addEventListener("change", function () {
    $("aceite").closest("[data-field]").classList.remove("has-error");
  });

  // ---------- Pagar ----------
  function erroPagar(texto) {
    $("erroPagar").textContent = texto;
    $("erroPagar").classList.add("is-visible");
  }

  $("payForm").addEventListener("submit", function (e) {
    e.preventDefault();
    $("erroPagar").classList.remove("is-visible");
    if (!escolhido) { erroPagar("Escolha um plano."); return; }
    if (!$("aceite").checked) { $("aceite").closest("[data-field]").classList.add("has-error"); return; }

    if (!PN.ready) {
      console.log("[MODO DEMO] Pagamento que seria criado:", escolhido);
      erroPagar("Modo demonstração: aqui você iria para a página do Mercado Pago.");
      return;
    }

    var btn = $("btnPagar");
    btn.disabled = true;
    btn.textContent = "Abrindo o Mercado Pago...";
    PN.sb.functions.invoke("mp-checkout", { body: { plano: escolhido.id } }).then(function (r) {
      if (r.error) {
        // Mensagem amigável que a função devolve no corpo da resposta
        var ctx = r.error.context;
        return (ctx && ctx.json ? ctx.json().catch(function () { return {}; }) : Promise.resolve({})).then(function (j) {
          throw new Error(j.erro || "Não foi possível abrir o pagamento agora. Tente de novo em alguns minutos.");
        });
      }
      if (!r.data || !r.data.url) throw new Error("Não foi possível abrir o pagamento agora.");
      window.location.href = r.data.url;
    }).catch(function (err) {
      erroPagar(err.message);
      btn.disabled = false;
      btn.textContent = "Ir para o pagamento";
    });
  });

  // ---------- Estado da pessoa ----------
  function telaPago(p) {
    var plano = planos.filter(function (x) { return x.id === p.plano; })[0];
    $("txtPago").textContent = "Plano " + (plano ? plano.nome : p.plano) + ", " + reais(p.valor) +
      (p.metodo ? " por " + p.metodo : "") + (p.pago_em ? ", em " + dataBR(p.pago_em) : "") + "." +
      (cfg.schedulingUrl ? "" : " Vou te chamar no WhatsApp para marcarmos a consulta.");
    mostrar("estPago");
  }

  function telaEscolha() {
    montarPlanos();
    mostrar("estEscolha");
  }

  function buscarPagamentos() {
    return PN.sb.from("pagamentos").select("id, plano, valor, status, metodo, pago_em, created_at")
      .order("created_at", { ascending: false }).limit(10)
      .then(function (r) { if (r.error) throw r.error; return r.data || []; });
  }

  // Depois de voltar do Mercado Pago, espera o aviso de confirmação chegar (até ~2 minutos).
  function aguardar(tentativa) {
    buscarPagamentos().then(function (lista) {
      var ultimo = lista[0];
      var aprovado = lista.filter(function (p) { return p.status === "aprovado"; })[0];
      if (aprovado && ultimo && aprovado.id === ultimo.id) { telaPago(aprovado); return; }
      if (ultimo && (ultimo.status === "recusado" || ultimo.status === "cancelado")) {
        $("msgRetorno").textContent = "O pagamento não foi aprovado. Você pode tentar de novo ou usar outra forma de pagamento.";
        $("msgRetorno").hidden = false;
        telaEscolha();
        return;
      }
      if (tentativa >= 30) {
        $("txtProcessando").textContent = retorno === "pendente"
          ? "Seu pagamento ainda está pendente. Se escolheu Pix, conclua no app do seu banco com o código do Mercado Pago. Assim que ele for aprovado, esta tela mostra a confirmação."
          : "A confirmação está demorando mais que o normal. Você pode fechar esta página: assim que o pagamento for aprovado, ele aparece aqui e no seu perfil.";
        return;
      }
      setTimeout(function () { aguardar(tentativa + 1); }, 4000);
    }).catch(function () { setTimeout(function () { aguardar(tentativa + 1); }, 6000); });
  }

  // Modo demonstração (site sem Supabase): mostra os planos com o valor do planos.js.
  if (!PN.ready) {
    $("msgDemo").hidden = false;
    juntarPlanos(PLANOS.map(function (p) {
      return { plano: p.id, nome: p.nome, valor: (p.valorMensal || 0) * (p.meses || 1), parcelas_max: p.meses > 1 ? 12 : 1 };
    }));
    telaEscolha();
    return;
  }

  var renovar = false;
  $("lnkRenovar").addEventListener("click", function (e) {
    e.preventDefault();
    renovar = true;
    telaEscolha();
  });

  PN.requireLogin().then(function (s) {
    var uid = s.user.id;
    return Promise.all([
      PN.sb.from("precos").select("plano, nome, valor, parcelas_max"),
      PN.sb.from("anamneses").select("id").eq("profile_id", uid).limit(1),
      PN.sb.from("pre_formularios").select("revisar").eq("profile_id", uid).order("created_at", { ascending: false }).limit(1),
      PN.sb.from("liberacoes_pagamento").select("profile_id").eq("profile_id", uid).maybeSingle(),
      buscarPagamentos()
    ]);
  }).then(function (r) {
    var falha = r.slice(0, 4).filter(function (x) { return x.error; })[0];
    if (falha) throw falha.error;
    juntarPlanos(r[0].data);
    var temAnamnese = (r[1].data || []).length > 0;
    var revisar = !!((r[2].data || [])[0] || {}).revisar;
    var liberado = !!r[3].data;
    var pagamentos = r[4];
    var ultimo = pagamentos[0];
    var aprovado = pagamentos.filter(function (p) { return p.status === "aprovado"; })[0];

    if ((retorno === "aprovado" || retorno === "pendente") && ultimo && (ultimo.status === "pendente" || ultimo.status === "em_analise")) {
      if (ultimo.status === "em_analise") {
        $("txtProcessando").textContent = "Seu pagamento está em análise pelo Mercado Pago. Isso pode levar algumas horas no cartão. Você recebe a confirmação por e-mail e ela aparece aqui.";
      }
      mostrar("estProcessando");
      aguardar(0);
      return;
    }
    if (aprovado && !renovar) { telaPago(aprovado); return; }
    if (!temAnamnese) { mostrar("estAnamnese"); return; }
    if (revisar && !liberado) { mostrar("estAvaliacao"); return; }
    if (retorno === "falhou") {
      $("msgRetorno").textContent = "O pagamento não foi concluído. Você pode tentar de novo ou escolher outra forma de pagamento.";
      $("msgRetorno").hidden = false;
    }
    telaEscolha();
  }).catch(function (e) {
    $("carregando").textContent = "Não foi possível carregar agora. " + PN.erro(e);
  });
})();
