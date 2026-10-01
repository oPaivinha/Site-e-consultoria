// Anamnese em etapas. Valida campos marcados com data-required e envia ao webhook.
// Parâmetros opcionais do link enviado ao paciente:
//   ?p=<código do paciente>  liga a anamnese ao cadastro do pré-formulário
//   &s=feminino|masculino     mostra o ciclo menstrual só para sexo feminino
//   &idade=<anos>             idade < 12 mostra as perguntas para crianças
(function () {
  var cfg = window.SITE_CONFIG || {};
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

  // ---------- parâmetros do link ----------
  var params = new URLSearchParams(window.location.search);
  document.getElementById("codigo").value = params.get("p") || "";
  var sexo = params.get("s");
  var idade = parseInt(params.get("idade"), 10);
  form.querySelectorAll("[data-sexo]").forEach(function (el) {
    if (sexo && el.getAttribute("data-sexo") !== sexo) el.hidden = true;
  });
  form.querySelectorAll("[data-child]").forEach(function (el) { el.hidden = !(idade < 12); });

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

    if (!cfg.webhookUrl) {
      console.log("[MODO DEMO] Anamnese que seria enviada:", payload);
      finish(payload.nome, true);
      return;
    }

    sending = true;
    btnNext.disabled = true;
    btnNext.textContent = "Enviando...";
    fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain evita preflight CORS (necessário para Google Apps Script); o corpo continua JSON
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      finish(payload.nome, false);
    }).catch(function () {
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
})();
