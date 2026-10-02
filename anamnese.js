// Anamnese em etapas. Valida campos marcados com data-required e grava na tabela "anamneses" do Supabase.
// Exige login: o paciente é quem está logado. Sexo e idade vêm do perfil (cadastro do pré-formulário):
//   sexo masculino esconde o ciclo menstrual; idade < 12 mostra as perguntas para crianças.
// O que a pessoa já respondeu no pré-formulário (doenças, medicamentos, treino) vem preenchido
// para ela só conferir, em vez de responder de novo.
// Em modo demonstração (sem Supabase em config.js) aceita ?s=feminino|masculino&idade=<anos> no link.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var PN = window.PN || {};
  var session = null;
  var form = document.getElementById("anamneseForm");
  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var order = steps.map(function (s) { return s.dataset.step; }).filter(function (k) { return /^\d+$/.test(k); });
  var current = 0;
  var sending = false;

  var bar = document.getElementById("bar");
  var label = document.getElementById("progressLabel");
  var btnNext = document.getElementById("btnNext");
  var btnBack = document.getElementById("btnBack");
  var actions = document.getElementById("actions");
  var submitError = document.getElementById("submitError");

  function show(key) {
    steps.forEach(function (s) { s.classList.toggle("is-active", s.dataset.step === key); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    show(order[current]);
    bar.style.width = Math.max((current / order.length) * 100, 6) + "%";
    label.textContent = "Etapa " + (current + 1) + " de " + order.length;
    btnBack.hidden = current === 0;
    btnNext.textContent = current === order.length - 1 ? "Enviar" : "Continuar";
    submitError.classList.remove("is-visible");
  }

  // ---------- perfil do paciente: sexo e idade ----------
  function calcAge(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return NaN;
    var t = new Date(), a = t.getFullYear() - d.getFullYear();
    if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--;
    return a;
  }
  function applyProfile(sexo, idade) {
    form.querySelectorAll("[data-sexo]").forEach(function (el) {
      el.hidden = !!sexo && el.getAttribute("data-sexo") !== sexo;
    });
    form.querySelectorAll("[data-child]").forEach(function (el) { el.hidden = !(idade < 12); });
  }
  var params = new URLSearchParams(window.location.search);
  applyProfile(PN.ready ? null : params.get("s"), PN.ready ? NaN : parseInt(params.get("idade"), 10));

  // ---------- campos condicionais ----------
  // data-if="campo=valor": aparece só com esse valor
  // data-if-not="campo=valor": aparece quando o campo foi respondido com outro valor
  function radioOrSelect(name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    if (checked) return checked.value;
    var el = form.elements[name];
    return el && el.tagName === "SELECT" ? el.value : "";
  }
  function applyConditionals() {
    form.querySelectorAll("[data-if], [data-if-not]").forEach(function (el) {
      var neg = el.hasAttribute("data-if-not");
      var parts = el.getAttribute(neg ? "data-if-not" : "data-if").split("=");
      var v = radioOrSelect(parts[0]);
      el.hidden = neg ? (v === "" || v === parts[1]) : v !== parts[1];
    });
  }
  form.addEventListener("change", applyConditionals);
  applyConditionals();

  function onlyDigits(s) { return (s || "").replace(/\D/g, ""); }

  // máscara de telefone
  var wa = document.getElementById("whatsapp");
  wa.addEventListener("input", function () {
    var d = onlyDigits(wa.value).slice(0, 11);
    var out = d;
    if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 7) out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
    wa.value = out;
  });

  // opções exclusivas ("Nenhum"): marcar desmarca as demais e vice-versa
  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.type !== "checkbox") return;
    var group = form.querySelectorAll('input[type="checkbox"][name="' + t.name + '"]');
    if (t.checked && t.hasAttribute("data-exclusive")) {
      group.forEach(function (c) { if (c !== t) c.checked = false; });
    } else if (t.checked) {
      group.forEach(function (c) { if (c.hasAttribute("data-exclusive")) c.checked = false; });
    }
  });

  function fieldFilled(wrapper) {
    var inputs = wrapper.querySelectorAll("input, select, textarea");
    if (!inputs.length) return true;
    var first = inputs[0];
    if (first.type === "radio" || first.type === "checkbox") {
      return Array.prototype.some.call(inputs, function (i) { return i.checked; });
    }
    var v = (first.value || "").trim();
    if (first.name === "whatsapp") { var n = onlyDigits(v).length; return n === 10 || n === 11; }
    if (first.name === "nome") { return v.length >= 5 && v.split(/\s+/).length >= 2; }
    return v !== "";
  }

  function validate(key) {
    var section = form.querySelector('.step[data-step="' + key + '"]');
    var ok = true;
    var firstBad = null;
    section.querySelectorAll("[data-required]").forEach(function (w) {
      if (w.closest("[hidden]")) return;   // campo escondido não é obrigatório
      var good = fieldFilled(w);
      w.classList.toggle("has-error", !good);
      if (!good) { ok = false; if (!firstBad) firstBad = w; }
    });
    if (firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  function buildPayload() {
    var agora = new Date().toISOString();
    var data = {
      tipo: "anamnese",
      enviado_em: agora,
      versao_consentimento: cfg.consentVersion || "",
      consentimento: form.elements.consent.checked,
      consentimento_em: agora
    };
    var fd = new FormData(form);
    fd.forEach(function (value, key) {
      if (key === "website" || key === "consent") return;
      value = typeof value === "string" ? value.trim() : value;
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    // checkboxes viram sempre lista (facilita no n8n)
    ["historico_familiar", "sintomas_gi", "sintomas_gerais", "onde_come", "restricoes"].forEach(function (k) {
      if (data[k] !== undefined && !Array.isArray(data[k])) data[k] = [data[k]];
    });
    data.whatsapp = "55" + onlyDigits(data.whatsapp);
    return data;
  }

  // Linha da tabela "anamneses": Bristol e água em colunas próprias (comparar com os check-ins), o resto em "respostas"
  function toRow(d) {
    var respostas = {};
    Object.keys(d).forEach(function (k) {
      if (["tipo", "enviado_em", "versao_consentimento", "consentimento", "consentimento_em"].indexOf(k) < 0) respostas[k] = d[k];
    });
    var bristol = parseInt(d.bristol, 10);
    return {
      profile_id: session.user.id,
      enviado_em: d.enviado_em,
      bristol: bristol >= 1 && bristol <= 7 ? bristol : null,
      agua: d.agua || null,
      respostas: respostas,
      consentimento: d.consentimento,
      consentimento_em: d.consentimento_em,
      versao_consentimento: d.versao_consentimento
    };
  }

  function finish(nome, demo) {
    document.getElementById("okNome").textContent = (nome || "").split(" ")[0];
    var whats = document.getElementById("btnWhats");
    if (cfg.whatsapp) {
      var msg = encodeURIComponent("Olá! Acabei de enviar minha anamnese. Meu nome é " + (nome || "").split(" ")[0] + ".");
      whats.href = "https://wa.me/" + cfg.whatsapp + "?text=" + msg;
      whats.hidden = false;
    }
    document.getElementById("demoNote").hidden = !demo;
    show("ok");
    actions.hidden = true;
    bar.style.width = "100%";
    label.textContent = "Concluído";
  }

  function submit() {
    if (sending) return;
    if (form.elements.website && form.elements.website.value) { finish("", false); return; }
    var payload = buildPayload();

    if (!PN.ready) {
      console.log("[MODO DEMO] Anamnese que seria enviada:", payload);
      finish(payload.nome, true);
      return;
    }

    sending = true;
    btnNext.disabled = true;
    btnNext.textContent = "Enviando...";
    PN.sb.from("anamneses").insert(toRow(payload)).then(function (r) {
      if (r.error) throw r.error;
      finish(payload.nome, false);
    }).catch(function (e) {
      submitError.textContent = "Não foi possível enviar agora. " + PN.erro(e);
      submitError.classList.add("is-visible");
      btnNext.textContent = "Enviar";
    }).finally(function () {
      sending = false;
      btnNext.disabled = false;
    });
  }

  btnNext.addEventListener("click", function () {
    if (!validate(order[current])) return;
    if (current === order.length - 1) { submit(); return; }
    current++;
    render();
  });

  btnBack.addEventListener("click", function () {
    if (current > 0) { current--; render(); }
  });

  form.addEventListener("input", function (e) {
    var f = e.target.closest("[data-field]");
    if (f) f.classList.remove("has-error");
  });
  form.addEventListener("change", function (e) {
    var f = e.target.closest("[data-field]");
    if (f) f.classList.remove("has-error");
  });

  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      btnNext.click();
    }
  });

  render();

  // ---------- reaproveita o pré-formulário ----------
  // Só preenche campos vazios. Não traz respostas sobre transtorno alimentar nem gestação.
  var DOENCAS = {
    diabetes: "Diabetes ou pré-diabetes",
    renal_hepatica: "Doença nos rins ou no fígado",
    cardio: "Pressão, coração ou colesterol",
    cirurgia: "Cirurgia do aparelho digestivo",
    outras: "Outra doença"
  };
  var FREQ = { "0": "0", "1-2": "1_2", "3-4": "3_4", "5+": "5_mais" };
  function prefill(pf) {
    if (!pf) return;
    var usado = false;
    function set(name, value) {
      var el = form.elements[name];
      if (!el || !value || (el.value || "").trim()) return;
      el.value = value;
      usado = true;
    }
    var s = pf.saude || {};
    var doencas = Object.keys(DOENCAS).filter(function (k) { return s[k] && s[k].resposta === "sim"; })
      .map(function (k) {
        var extra = k === "diabetes" && s[k].usa_insulina === "sim" ? " (usa insulina)" : "";
        return DOENCAS[k] + (s[k].qual ? ": " + s[k].qual : "") + extra;
      });
    if (doencas.length) set("doencas_cirurgias", doencas.join("\n"));
    if (s.medicamento && s.medicamento.resposta === "sim") set("medicamentos", s.medicamento.qual);
    set("modalidades", pf.modalidade);
    set("freq_treino", FREQ[pf.treino_freq]);
    if (usado) form.querySelectorAll("[data-prefill-note]").forEach(function (n) { n.hidden = false; });
  }

  // Exige login e preenche o que já sabemos do cadastro
  if (PN.ready) {
    form.hidden = true;
    PN.requireLogin().then(function (s) {
      session = s;
      return PN.loadProfile();
    }).then(function (p) {
      if (p) {
        if (!form.elements.nome.value) form.elements.nome.value = p.nome || "";
        if (!wa.value && p.whatsapp) { wa.value = String(p.whatsapp).replace(/^55/, ""); wa.dispatchEvent(new Event("input")); }
        applyProfile(p.sexo, calcAge(p.nascimento));
      }
      // último pré-formulário da própria pessoa (o RLS só deixa ler os dela)
      return PN.sb.from("pre_formularios").select("saude, modalidade, treino_freq")
        .eq("profile_id", session.user.id).order("enviado_em", { ascending: false }).limit(1)
        .then(function (r) { if (!r.error && r.data && r.data[0]) prefill(r.data[0]); });
    }).catch(function () { /* sem perfil: o formulário segue com tudo à mostra */ })
      .finally(function () { form.hidden = false; });
  }
})();
