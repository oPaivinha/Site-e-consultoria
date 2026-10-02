// Pré-formulário em etapas com triagem.
// Regra: respostas de saúde nunca encerram o fluxo. Cada "sim" vira um alerta no envio
// (alertas + revisar: true) para o nutricionista avaliar o caso.
// Menores de 18 anos são atendidos: aparece a etapa do responsável legal (consentimento
// obrigatório) e o envio leva menor: true. O SCOFF não aparece para menores de 12.
// A última etapa cria a conta no Supabase (e-mail e senha). As respostas vão junto no cadastro
// (options.data) e o banco grava o perfil e o pré-formulário sozinho (trigger handle_new_user).
// Menores: a conta fica no e-mail do responsável.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var PN = window.PN || {};
  if (PN.ready) PN.redirectIfLoggedIn();   // quem já tem conta e está logado vai para "Meu perfil"
  var form = document.getElementById("prefForm");
  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var order = ["1", "2", "3", "4", "conta"];  // etapas de preenchimento (a etapa "resp" entra para menores)
  var current = 0;
  var sending = false;

  var bar = document.getElementById("bar");
  var label = document.getElementById("progressLabel");
  var btnNext = document.getElementById("btnNext");
  var btnBack = document.getElementById("btnBack");
  var actions = document.getElementById("actions");
  var submitError = document.getElementById("submitError");

  function stepEl(key) { return form.querySelector('.step[data-step="' + key + '"]'); }

  function show(key) {
    steps.forEach(function (s) { s.classList.toggle("is-active", s.dataset.step === key); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    show(order[current]);
    var pct = (current / order.length) * 100;
    bar.style.width = Math.max(pct, 8) + "%";
    label.textContent = "Etapa " + (current + 1) + " de " + order.length;
    btnBack.hidden = current === 0;
    btnNext.textContent = current === order.length - 1 ? "Enviar" : "Continuar";
    submitError.classList.remove("is-visible");
  }

  // ---------- helpers ----------
  function val(name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el.length && el[0] && el[0].type === "radio") {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : "";
    }
    return (el.value || "").trim();
  }

  function setError(fieldEl, on) {
    if (!fieldEl) return;
    fieldEl.classList.toggle("has-error", !!on);
  }

  function calcAge(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return null;
    var t = new Date();
    var age = t.getFullYear() - d.getFullYear();
    var m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
    return age;
  }

  function onlyDigits(s) { return (s || "").replace(/\D/g, ""); }

  // máscara simples de telefone BR
  ["whatsapp", "resp_whatsapp"].forEach(function (id) {
    var wa = document.getElementById(id);
    wa.addEventListener("input", function () {
      var d = onlyDigits(wa.value).slice(0, 11);
      var out = d;
      if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
      if (d.length > 7) out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
      wa.value = out;
    });
  });

  function validPhone(name) { var n = onlyDigits(val(name)); return n.length === 10 || n.length === 11; }
  function validEmail(name) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val(name)); }
  function validFullName(name) { return val(name).split(/\s+/).length >= 2 && val(name).length >= 5; }

  // ---------- idade: menor de 18 / menor de 12 ----------
  function age() { return calcAge(val("nascimento")); }
  function isMinor() { var a = age(); return a !== null && a < 18; }
  function isChild() { var a = age(); return a !== null && a < 12; }

  // Monta a ordem das etapas conforme a idade e ajusta o que depende dela
  function applyAge() {
    order = isMinor() ? ["1", "2", "resp", "3", "4", "conta"] : ["1", "2", "3", "4", "conta"];
    document.getElementById("scoffBlock").hidden = isChild();
    form.querySelectorAll("[data-if-child]").forEach(function (el) { el.hidden = !isChild(); });
    form.querySelectorAll("[data-paciente-nome]").forEach(function (el) { el.textContent = val("nome") || "este paciente"; });
  }

  // ---------- campos condicionais: data-if="campo=valor" ----------
  function applyConditionals() {
    form.querySelectorAll("[data-if]").forEach(function (el) {
      var parts = el.getAttribute("data-if").split("=");
      el.hidden = val(parts[0]) !== parts[1];
    });
  }
  form.addEventListener("change", applyConditionals);

  var HEALTH_QUESTIONS = ["t_gestacao", "t_diabetes", "t_renal_hepatica", "t_cardio", "t_ta", "t_cirurgia", "t_outras", "t_medicamento"];
  var SCOFF_QUESTIONS = ["scoff_1", "scoff_2", "scoff_3", "scoff_4", "scoff_5"];

  // ---------- validação por etapa ----------
  function validate(key) {
    var ok = true;
    function need(fieldName, test) {
      var wrapper = form.querySelector('[data-field="' + fieldName + '"]');
      var good = test();
      setError(wrapper, !good);
      if (!good) ok = false;
    }

    if (key === "1") {
      need("consent", function () { return form.elements.consent.checked; });
    }
    if (key === "2") {
      need("nome", function () { return validFullName("nome"); });
      need("whatsapp", function () { return validPhone("whatsapp"); });
      need("email", function () { return validEmail("email"); });
      need("nascimento", function () {
        var a = calcAge(val("nascimento"));
        return a !== null && a >= 0 && a < 110;
      });
      need("sexo", function () { return val("sexo") !== ""; });
    }
    if (key === "resp") {
      need("resp_nome", function () { return validFullName("resp_nome"); });
      need("resp_parentesco", function () { return val("resp_parentesco") !== ""; });
      need("resp_whatsapp", function () { return validPhone("resp_whatsapp"); });
      need("resp_email", function () { return validEmail("resp_email"); });
      if (isChild()) need("resp_presente", function () { return val("resp_presente") !== ""; });
      need("resp_consent", function () { return form.elements.resp_consent.checked; });
    }
    if (key === "3") {
      var names = HEALTH_QUESTIONS.concat(isChild() ? [] : SCOFF_QUESTIONS);
      var allAnswered = names.every(function (n) { return val(n) !== ""; });
      document.getElementById("triagemError").classList.toggle("is-visible", !allAnswered);
      if (!allAnswered) ok = false;
    }
    if (key === "4") {
      need("objetivo", function () { return val("objetivo") !== ""; });
      var adulto = !isMinor();
      need("peso", function () { var p = parseFloat(val("peso")); return p >= (adulto ? 30 : 5) && p <= 300; });
      need("altura", function () { var h = parseInt(val("altura"), 10); return h >= (adulto ? 120 : 50) && h <= 230; });
      need("treino_freq", function () { return val("treino_freq") !== ""; });
    }
    if (key === "conta") {
      need("senha", function () { return form.elements.senha.value.length >= 8; });
      need("senha2", function () { return form.elements.senha2.value === form.elements.senha.value && form.elements.senha2.value !== ""; });
    }
    if (!ok) {
      var firstErr = form.querySelector(".step.is-active .has-error, .step.is-active .error.is-visible");
      if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ok;
  }

  // ---------- triagem ----------
  function scoffScore() {
    if (isChild()) return null;
    return SCOFF_QUESTIONS.filter(function (n) { return val(n) === "sim"; }).length;
  }

  // Lista dos itens de saúde marcados como "sim" (sem o prefixo t_), mais scoff_positivo (2+ "sim")
  function healthAlerts() {
    var list = HEALTH_QUESTIONS.filter(function (n) { return val(n) === "sim"; })
      .map(function (n) { return n.slice(2); });
    if (scoffScore() >= 2) list.push("scoff_positivo");
    return list;
  }

  function healthDetails() {
    var out = {};
    HEALTH_QUESTIONS.forEach(function (n) {
      out[n.slice(2)] = { resposta: val(n), qual: val(n) === "sim" ? val(n + "_qual") : "" };
    });
    out.diabetes.usa_insulina = val("t_diabetes") === "sim" ? val("t_insulina") : "";
    return out;
  }



  // E-mail da conta: do paciente, ou do responsável quando é menor
  function accountEmail() { return (isMinor() ? val("resp_email") : val("email")).toLowerCase(); }

  function fillAccountStep() {
    document.getElementById("contaEmail").textContent = accountEmail();
    document.getElementById("contaEmailHint").textContent = isMinor()
      ? "Como o paciente é menor de idade, a conta fica no e-mail do responsável. Para trocar, volte à etapa do responsável."
      : "É o e-mail que você informou nos seus dados. Para trocar, volte à etapa de dados.";
  }

  // ---------- envio ----------
  function buildPayload() {
    var data = {
      enviado_em: new Date().toISOString(),
      versao_consentimento: cfg.consentVersion || "",
      consentimento: true,
      consentimento_em: new Date().toISOString(),
      aceita_checkin: form.elements.aceita_checkin.checked,
      nome: val("nome"),
      whatsapp: "55" + onlyDigits(val("whatsapp")),
      email: val("email"),
      nascimento: val("nascimento"),
      sexo: val("sexo"),
      objetivo: val("objetivo"),
      peso_kg: parseFloat(val("peso")),
      altura_cm: parseInt(val("altura"), 10),
      treino_freq: val("treino_freq"),
      modalidade: val("modalidade"),
      tentativas: val("tentativas"),
      origem: val("origem"),
      saude: healthDetails(),
      scoff_sim: scoffScore(),
      alertas: healthAlerts(),
      revisar: healthAlerts().length > 0,
      menor: isMinor(),
      responsavel: isMinor() ? {
        nome: val("resp_nome"),
        parentesco: val("resp_parentesco"),
        whatsapp: "55" + onlyDigits(val("resp_whatsapp")),
        email: val("resp_email"),
        presente_na_consulta: isChild() ? val("resp_presente") : "",
        consentimento: form.elements.resp_consent.checked
      } : null
    };
    return data;
  }

  function finish(payload, demo) {
    document.getElementById("okNome").textContent = payload.nome.split(" ")[0];
    // Com alerta de saúde, o nutricionista avalia antes do agendamento
    document.getElementById("okPadrao").hidden = !!payload.revisar;
    document.getElementById("okRevisar").hidden = !payload.revisar;
    var agendar = document.getElementById("btnAgendar");
    var whats = document.getElementById("btnWhats");
    if (cfg.schedulingUrl && !payload.revisar) { agendar.href = cfg.schedulingUrl; agendar.hidden = false; }
    if (cfg.whatsapp) {
      var msg = encodeURIComponent("Olá! Acabei de preencher o pré-formulário no site. Meu nome é " + payload.nome.split(" ")[0] + ".");
      whats.href = "https://wa.me/" + cfg.whatsapp + "?text=" + msg;
      whats.hidden = false;
    }
    document.getElementById("okEmail").hidden = demo;
    document.getElementById("okEmailAddr").textContent = accountEmail();
    document.getElementById("demoNote").hidden = !demo;
    show("ok");
    actions.hidden = true;
    bar.style.width = "100%";
    label.textContent = "Concluído";
  }

  // Dados que vão no cadastro. O trigger handle_new_user grava em profiles e pre_formularios.
  function signUpData(p) {
    var r = p.responsavel || {};
    return {
      nome: p.nome,
      whatsapp: p.whatsapp,
      nascimento: p.nascimento,
      sexo: p.sexo,
      email_paciente: p.menor ? p.email : "",
      aceita_checkin: p.aceita_checkin,
      menor: p.menor,
      responsavel_nome: r.nome || "",
      responsavel_parentesco: r.parentesco || "",
      responsavel_whatsapp: r.whatsapp || "",
      responsavel_email: r.email || "",
      consentimento_em: p.consentimento_em,
      versao_consentimento: p.versao_consentimento,
      pre_formulario: {
        enviado_em: p.enviado_em,
        objetivo: p.objetivo,
        peso_kg: p.peso_kg,
        altura_cm: p.altura_cm,
        treino_freq: p.treino_freq,
        modalidade: p.modalidade,
        tentativas: p.tentativas,
        origem: p.origem,
        saude: p.saude,
        scoff_sim: p.scoff_sim,
        alertas: p.alertas,
        revisar: p.revisar,
        responsavel: p.responsavel,
        consentimento: p.consentimento,
        consentimento_em: p.consentimento_em,
        versao_consentimento: p.versao_consentimento
      }
    };
  }

  function showSubmitError(text) {
    submitError.textContent = text;
    submitError.classList.add("is-visible");
    submitError.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function submit() {
    if (sending) return;
    // honeypot: se preenchido, finge sucesso sem enviar
    if (form.elements.website && form.elements.website.value) { finish({ nome: "" }, false); return; }

    var payload = buildPayload();

    if (!PN.ready) {
      console.log("[MODO DEMO] Cadastro que seria criado:", { email: accountEmail(), data: signUpData(payload) });
      finish(payload, true);
      return;
    }

    sending = true;
    btnNext.disabled = true;
    btnNext.textContent = "Enviando...";
    PN.sb.auth.signUp({
      email: accountEmail(),
      password: form.elements.senha.value,
      options: { data: signUpData(payload), emailRedirectTo: PN.callbackUrl }
    }).then(function (r) {
      if (r.error) throw r.error;
      // E-mail já cadastrado: o Supabase devolve um usuário sem identidades e não envia nada
      if (r.data.user && r.data.user.identities && r.data.user.identities.length === 0) {
        throw { code: "user_already_exists" };
      }
      form.elements.senha.value = form.elements.senha2.value = "";
      finish(payload, false);
    }).catch(function (e) {
      showSubmitError(PN.erro(e));
      btnNext.textContent = "Enviar";
    }).finally(function () {
      sending = false;
      btnNext.disabled = false;
    });
  }

  // Reenviar o e-mail de confirmação
  var cooldown = 0;
  document.getElementById("btnReenviar").addEventListener("click", function () {
    var btn = this;
    var msg = document.getElementById("reenvioMsg");
    if (!PN.ready || cooldown > Date.now()) return;
    btn.disabled = true;
    PN.sb.auth.resend({ type: "signup", email: accountEmail(), options: { emailRedirectTo: PN.callbackUrl } })
      .then(function (r) {
        if (r.error) throw r.error;
        msg.textContent = "Pronto, enviamos de novo. Pode levar alguns minutos para chegar.";
        cooldown = Date.now() + 60000;
      })
      .catch(function (e) { msg.textContent = PN.erro(e); })
      .finally(function () { setTimeout(function () { btn.disabled = false; }, 60000); });
  });

  // ---------- navegação ----------
  btnNext.addEventListener("click", function () {
    var key = order[current];
    if (!validate(key)) return;

    if (key === "2") applyAge();   // decide se a etapa do responsável entra
    if (order[current + 1] === "conta") fillAccountStep();

    if (current === order.length - 1) { submit(); return; }
    current++;
    render();
  });

  btnBack.addEventListener("click", function () {
    if (current > 0) { current--; render(); }
  });

  // limpa erro ao interagir
  form.addEventListener("input", function (e) {
    var f = e.target.closest("[data-field]");
    if (f) f.classList.remove("has-error");
    submitError.classList.remove("is-visible");
    if (e.target.name && /^(t_|scoff_)/.test(e.target.name)) {
      document.getElementById("triagemError").classList.remove("is-visible");
    }
  });

  // Enter não envia sem validar
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      btnNext.click();
    }
  });

  applyConditionals();
  render();
})();
