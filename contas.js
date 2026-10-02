// Telas de conta: entrar, esqueci a senha, nova senha, retorno do link do e-mail e "Meu perfil".
// Cada página diz quem ela é em <body data-page="...">.
(function () {
  var PN = window.PN;
  var page = document.body.getAttribute("data-page");
  function $(id) { return document.getElementById(id); }

  function showMsg(el, text, ok) {
    el.textContent = text;
    el.className = "msg " + (ok ? "msg--ok" : "msg--erro");
    el.hidden = !text;
  }
  function busy(btn, on, label) {
    btn.disabled = on;
    if (label) btn.textContent = label;
  }
  function onlyDigits(s) { return String(s || "").replace(/\D/g, ""); }
  function phoneMask(input) {
    input.addEventListener("input", function () {
      var d = onlyDigits(input.value).slice(0, 11);
      var out = d;
      if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
      if (d.length > 7) out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
      input.value = out;
    });
  }
  function dataBR(iso) {
    if (!iso) return "";
    var d = new Date(String(iso).length === 10 ? iso + "T12:00:00" : iso);
    return isNaN(d) ? "" : d.toLocaleDateString("pt-BR");
  }

  // Texto único para quando o servidor não responde (o detalhe técnico vai só para o console).
  var SEM_CONEXAO = "Não foi possível conectar ao servidor agora. Tente novamente mais tarde.";

  // Sem Supabase configurado: as telas abrem, mas avisam de forma discreta.
  if (!PN.ready) {
    var demo = $("demoMsg");
    if (demo) demo.hidden = false;
    console.error("[Paiva Nutri] Supabase não configurado em config.js: supabaseUrl e supabaseAnonKey estão vazios.");
  }

  // ---------------------------------------------------------------------------
  // Entrar
  // ---------------------------------------------------------------------------
  if (page === "entrar") {
    var form = $("loginForm"), msg = $("msg"), btn = $("btnEntrar"), btnResend = $("btnReenviar");
    if (PN.ready) PN.redirectIfLoggedIn();
    if (PN.linkParams.get("saiu")) showMsg(msg, "Você saiu da sua conta.", true);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      btnResend.hidden = true;
      var email = form.email.value.trim().toLowerCase(), senha = form.senha.value;
      if (!PN.validEmail(email) || !senha) { showMsg(msg, "Informe seu e-mail e sua senha.", false); return; }
      if (!PN.ready) { showMsg(msg, SEM_CONEXAO, false); return; }
      busy(btn, true, "Entrando...");
      PN.sb.auth.signInWithPassword({ email: email, password: senha }).then(function (r) {
        if (r.error) throw r.error;
        window.location.replace(PN.safeNext() || PN.url("perfil.html"));
      }).catch(function (err) {
        showMsg(msg, PN.erro(err), false);
        if (err.code === "email_not_confirmed" || /not confirmed/i.test(err.message || "")) btnResend.hidden = false;
        busy(btn, false, "Entrar");
      });
    });

    btnResend.addEventListener("click", function () {
      var email = form.email.value.trim().toLowerCase();
      busy(btnResend, true);
      PN.sb.auth.resend({ type: "signup", email: email, options: { emailRedirectTo: PN.callbackUrl } }).then(function (r) {
        if (r.error) throw r.error;
        showMsg(msg, "Enviamos um novo link para " + email + ". Abra o e-mail e clique nele para confirmar.", true);
        btnResend.hidden = true;
      }).catch(function (err) { showMsg(msg, PN.erro(err), false); })
        .finally(function () { busy(btnResend, false); });
    });
  }

  // ---------------------------------------------------------------------------
  // Esqueci minha senha
  // ---------------------------------------------------------------------------
  if (page === "esqueci") {
    var fEsq = $("esqueciForm"), mEsq = $("msg"), bEsq = $("btnEnviar");
    fEsq.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = fEsq.email.value.trim().toLowerCase();
      if (!PN.validEmail(email)) { showMsg(mEsq, "Informe um e-mail válido.", false); return; }
      if (!PN.ready) { showMsg(mEsq, SEM_CONEXAO, false); return; }
      busy(bEsq, true, "Enviando...");
      PN.sb.auth.resetPasswordForEmail(email, { redirectTo: PN.novaSenhaUrl }).then(function (r) {
        if (r.error) throw r.error;
        // Mesma resposta exista ou não a conta, para não revelar quem é paciente
        showMsg(mEsq, "Se existir uma conta com " + email + ", enviamos um link para criar uma senha nova. Confira também o spam.", true);
        fEsq.hidden = true;
      }).catch(function (err) {
        showMsg(mEsq, PN.erro(err), false);
        busy(bEsq, false, "Enviar link");
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Nova senha (link de recuperação, convite, ou trocar a senha estando logado)
  // ---------------------------------------------------------------------------
  if (page === "nova-senha") {
    var fNova = $("novaForm"), mNova = $("msg"), bNova = $("btnSalvar");
    var linkErro = PN.linkParams.get("error_code") || PN.linkParams.get("error");
    PN.getSession().then(function (s) {
      if (!PN.ready) { fNova.hidden = false; return; }
      if (!s) {
        showMsg(mNova, linkErro ? PN.erro({ code: "otp_expired" }) : "Abra esta página pelo link que enviamos para o seu e-mail.", false);
        $("pedirOutro").hidden = false;
        return;
      }
      $("contaEmail").textContent = s.user.email;
      fNova.hidden = false;
    });
    fNova.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = fNova.senha.value, b = fNova.senha2.value;
      if (a.length < 8) { showMsg(mNova, "A senha precisa ter pelo menos 8 caracteres.", false); return; }
      if (a !== b) { showMsg(mNova, "As senhas não são iguais.", false); return; }
      if (!PN.ready) { showMsg(mNova, SEM_CONEXAO, false); return; }
      busy(bNova, true, "Salvando...");
      PN.sb.auth.updateUser({ password: a }).then(function (r) {
        if (r.error) throw r.error;
        showMsg(mNova, "Senha salva. Levando você para a sua conta...", true);
        setTimeout(function () { window.location.replace(PN.url("perfil.html")); }, 1200);
      }).catch(function (err) {
        showMsg(mNova, PN.erro(err), false);
        busy(bNova, false, "Salvar senha");
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Retorno do link do e-mail (confirmação de cadastro, convite, troca de e-mail)
  // ---------------------------------------------------------------------------
  if (page === "callback") {
    var mCb = $("msg");
    var tipo = PN.linkParams.get("type");
    var erroLink = PN.linkParams.get("error_code") || PN.linkParams.get("error");
    PN.getSession().then(function (s) {
      if (s) {
        // Convite (importação da planilha) e recuperação: a pessoa ainda precisa criar a senha
        if (tipo === "invite" || tipo === "recovery") { window.location.replace(PN.novaSenhaUrl); return; }
        showMsg(mCb, "E-mail confirmado! Entrando na sua conta...", true);
        setTimeout(function () { window.location.replace(PN.url("perfil.html")); }, 900);
        return;
      }
      $("titulo").textContent = "Não foi possível confirmar";
      showMsg(mCb, erroLink ? PN.erro({ code: "otp_expired" }) + " Entre com seu e-mail e senha: se a conta ainda não estiver confirmada, você pode pedir um novo link lá."
        : "Este endereço só funciona pelo link enviado para o seu e-mail.", false);
      $("links").hidden = false;
    });
  }

  // ---------------------------------------------------------------------------
  // Meu perfil
  // ---------------------------------------------------------------------------
  if (page === "perfil") {
    var fP = $("perfilForm"), mP = $("msg"), bP = $("btnSalvar");
    var userId = null;
    phoneMask(fP.whatsapp);
    phoneMask(fP.responsavel_whatsapp);
    $("btnSair").addEventListener("click", function () { PN.signOut(); });

    function fill(p) {
      $("ola").textContent = (p.nome || "").split(" ")[0] || "você";
      $("contaEmail").textContent = p.email || "";
      ["nome", "nascimento", "sexo", "email_paciente", "responsavel_nome", "responsavel_parentesco", "responsavel_email"].forEach(function (k) {
        if (fP[k]) fP[k].value = p[k] || "";
      });
      fP.whatsapp.value = String(p.whatsapp || "").replace(/^55/, "");
      fP.responsavel_whatsapp.value = String(p.responsavel_whatsapp || "").replace(/^55/, "");
      fP.whatsapp.dispatchEvent(new Event("input"));
      fP.responsavel_whatsapp.dispatchEvent(new Event("input"));
      fP.canal.value = p.canal || "whatsapp";
      fP.aceita_checkin.checked = !!p.aceita_checkin;
      $("blocoResponsavel").hidden = !p.menor;
    }

    function loadStatus() {
      return Promise.all([
        PN.sb.from("acompanhamentos").select("ativo, pausado, inicio_acompanhamento, proximo_checkin").eq("profile_id", userId).maybeSingle(),
        PN.sb.from("anamneses").select("id, created_at").order("created_at", { ascending: false }).limit(1),
        PN.sb.from("checkins").select("id, created_at, adesao").order("created_at", { ascending: false }).limit(10),
        PN.sb.from("pagamentos").select("plano, valor, pago_em").eq("status", "aprovado").order("pago_em", { ascending: false }).limit(1)
      ]).then(function (res) {
        var ac = res[0].data || {}, an = res[1].data || [], ck = res[2].data || [], pg = res[3].data || [];
        var status;
        if (ac.ativo && !ac.pausado) {
          status = "Acompanhamento ativo desde " + dataBR(ac.inicio_acompanhamento) + "." +
            (ac.proximo_checkin ? " Próximo check-in: " + dataBR(ac.proximo_checkin) + "." : "");
        } else if (ac.pausado) {
          status = "Os lembretes de check-in estão pausados.";
        } else {
          status = "Recebi seu pré-formulário. Vou te chamar para os próximos passos.";
        }
        $("status").textContent = status;
        $("anamneseFeita").hidden = !an.length;
        $("anamneseData").textContent = an.length ? dataBR(an[0].created_at) : "";
        $("btnAnamnese").textContent = an.length ? "Enviar anamnese de novo" : "Responder a anamnese";
        $("btnCheckin").hidden = !ac.ativo;
        // Pagamento: depois da anamnese, enquanto não houver pagamento aprovado
        $("btnPagamento").hidden = !an.length || pg.length > 0 || !!ac.ativo;
        $("pagamentoInfo").hidden = !pg.length;
        if (pg.length) {
          $("pagamentoInfo").innerHTML = "";
          $("pagamentoInfo").append("Pagamento do plano " + pg[0].plano + " confirmado em " + dataBR(pg[0].pago_em) + ". ");
          var lk = document.createElement("a"); lk.href = "pagamento.html"; lk.textContent = "Ver pagamento";
          $("pagamentoInfo").appendChild(lk);
        }
        var ul = $("historico");
        ul.innerHTML = "";
        ck.forEach(function (c) {
          var li = document.createElement("li");
          var a = document.createElement("span"); a.textContent = dataBR(c.created_at);
          var b = document.createElement("span"); b.className = "muted"; b.textContent = "Adesão " + c.adesao + "/10";
          li.appendChild(a); li.appendChild(b); ul.appendChild(li);
        });
        $("semHistorico").hidden = ck.length > 0;
      });
    }

    if (!PN.ready) {
      fill({ nome: "Paciente Exemplo", email: "paciente@exemplo.com", menor: false });
      $("conteudo").hidden = false;
    } else {
      PN.requireLogin().then(function (s) {
        userId = s.user.id;
        return PN.loadProfile();
      }).then(function (p) {
        fill(p || { email: "" });
        $("conteudo").hidden = false;
        return loadStatus();
      }).catch(function (err) {
        $("conteudo").hidden = false;
        showMsg(mP, "Não consegui carregar seus dados. " + PN.erro(err), false);
      });
    }

    fP.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = fP.nome.value.trim();
      var w = onlyDigits(fP.whatsapp.value), rw = onlyDigits(fP.responsavel_whatsapp.value);
      if (nome.split(/\s+/).length < 2) { showMsg(mP, "Informe o nome completo.", false); return; }
      if (w.length !== 10 && w.length !== 11) { showMsg(mP, "Informe um WhatsApp válido com DDD.", false); return; }
      if (rw && rw.length !== 10 && rw.length !== 11) { showMsg(mP, "O WhatsApp do responsável não parece válido.", false); return; }
      if (fP.responsavel_email.value && !PN.validEmail(fP.responsavel_email.value)) { showMsg(mP, "O e-mail do responsável não parece válido.", false); return; }
      if (fP.email_paciente.value && !PN.validEmail(fP.email_paciente.value)) { showMsg(mP, "O e-mail do paciente não parece válido.", false); return; }
      var dados = {
        nome: nome,
        whatsapp: "55" + w,
        nascimento: fP.nascimento.value || null,
        sexo: fP.sexo.value || null,
        canal: fP.canal.value,
        aceita_checkin: fP.aceita_checkin.checked,
        email_paciente: fP.email_paciente.value.trim() || null,
        responsavel_nome: fP.responsavel_nome.value.trim() || null,
        responsavel_parentesco: fP.responsavel_parentesco.value.trim() || null,
        responsavel_whatsapp: rw ? "55" + rw : null,
        responsavel_email: fP.responsavel_email.value.trim() || null
      };
      if (!PN.ready) { console.log("[Paiva Nutri] Sem conexão. Perfil que seria salvo:", dados); showMsg(mP, SEM_CONEXAO, false); return; }
      busy(bP, true, "Salvando...");
      PN.sb.from("profiles").update(dados).eq("id", userId).then(function (r) {
        if (r.error) throw r.error;
        showMsg(mP, "Dados salvos.", true);
        $("ola").textContent = nome.split(" ")[0];
      }).catch(function (err) { showMsg(mP, "Não consegui salvar. " + PN.erro(err), false); })
        .finally(function () { busy(bP, false, "Salvar alterações"); });
    });
  }
})();
