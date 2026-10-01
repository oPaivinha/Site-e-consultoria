// Check-in quinzenal em etapas. Mesmo padrão da anamnese: valida campos com data-required e envia ao webhook.
// O paciente é identificado pelo código do link (checkin.html?p=CODIGO); sem código, pede o WhatsApp.
(function () {
  var cfg = window.SITE_CONFIG || {};
  var form = document.getElementById("checkinForm");
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

  var codigo = (new URLSearchParams(window.location.search).get("p") || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  var fieldWhats = document.getElementById("fieldWhats");
  if (!codigo) {
    fieldWhats.hidden = false;
    fieldWhats.setAttribute("data-required", "");
  }

  function show(key) {
    steps.forEach(function (s) { s.classList.toggle("is-active", s.dataset.step === key); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    show(order[current]);
    bar.style.width = Math.max((current / order.length) * 100, 8) + "%";
    label.textContent = "Etapa " + (current + 1) + " de " + order.length;
    btnBack.hidden = current === 0;
    btnNext.textContent = current === order.length - 1 ? "Enviar" : "Continuar";
    submitError.classList.remove("is-visible");
  }

  function onlyDigits(s) { return (s || "").replace(/\D/g, ""); }
  function checked(name) {
    return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
  }

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

  // perguntas que aparecem conforme a resposta
  var fieldMotivo = document.getElementById("fieldMotivo");
  var alertaAviso = document.getElementById("alertaAviso");
  form.addEventListener("change", function (e) {
    if (e.target.name === "deslizes") {
      var teve = e.target.value !== "nenhuma";
      fieldMotivo.hidden = !teve;
      if (teve) fieldMotivo.setAttribute("data-required", "");
      else {
        fieldMotivo.removeAttribute("data-required");
        fieldMotivo.classList.remove("has-error");
        form.querySelectorAll('input[name="deslize_motivo"]').forEach(function (c) { c.checked = false; });
      }
    }
    if (e.target.name === "alerta") {
      alertaAviso.hidden = !checked("alerta").some(function (v) { return v !== "nenhum"; });
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
    return v !== "";
  }

  function validate(key) {
    var section = form.querySelector('.step[data-step="' + key + '"]');
    var ok = true;
    var firstBad = null;
    section.querySelectorAll("[data-required]").forEach(function (w) {
      if (w.hidden) return;
      var good = fieldFilled(w);
      w.classList.toggle("has-error", !good);
      if (!good) { ok = false; if (!firstBad) firstBad = w; }
    });
    if (firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  function buildPayload() {
    var alerta = checked("alerta").filter(function (v) { return v !== "nenhum"; });
    var peso = parseFloat(form.elements.peso.value);
    return {
      tipo: "checkin",
      enviado_em: new Date().toISOString(),
      codigo: codigo,
      whatsapp: codigo ? "" : "55" + onlyDigits(wa.value),
      adesao: parseInt(form.querySelector('input[name="adesao"]:checked').value, 10),
      refeicoes_dificeis: checked("refeicoes_dificeis"),
      fome: checked("fome")[0] || "",
      deslizes: checked("deslizes")[0] || "",
      deslize_motivo: checked("deslize_motivo"),
      agua: form.elements.agua.value,
      freq_evacuacao: form.elements.freq_evacuacao.value,
      bristol: parseInt(checked("bristol")[0], 10),
      sintomas_gi: checked("sintomas_gi"),
      alerta: alerta,
      energia: checked("energia")[0] || "",
      peso_kg: peso >= 30 && peso <= 300 ? peso : null,
      recado: form.elements.recado.value.trim(),
      quer_contato: checked("quer_contato")[0] === "sim"
    };
  }

  function finish(demo) {
    document.getElementById("demoNote").hidden = !demo;
    show("ok");
    actions.hidden = true;
    bar.style.width = "100%";
    label.textContent = "Concluído";
  }

  function submit() {
    if (sending) return;
    if (form.elements.website && form.elements.website.value) { finish(false); return; }
    var payload = buildPayload();

    if (!cfg.webhookUrl) {
      console.log("[MODO DEMO] Check-in que seria enviado:", payload);
      finish(true);
      return;
    }

    sending = true;
    btnNext.disabled = true;
    btnNext.textContent = "Enviando...";
    // text/plain evita a checagem de CORS do navegador; funciona com Google Apps Script e com n8n/Make.
    fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      finish(false);
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
