// Panel privado de postulaciones Guayaquil (ver api/panel.js).
(function(){
  "use strict";

  var ESTADOS = [
    { key: "En revisión", cls: "e-revision", chip: "En revisión" },
    { key: "Aprobado", cls: "e-aprobado", chip: "Aprobados" },
    { key: "Confirmado", cls: "e-confirmado", chip: "Confirmados" },
    { key: "Lista de espera", cls: "e-espera", chip: "Lista de espera" },
    { key: "No aprobado", cls: "e-rechazado", chip: "No aprobados" }
  ];

  var state = { items: [], resumen: null, filtro: "En revisión", q: "", sort: "prioridad" };
  var $ = function(id){ return document.getElementById(id); };

  function api(op, opts){
    opts = opts || {};
    return fetch("/api/panel?op=" + op, {
      method: opts.body ? "POST" : (opts.method || "GET"),
      headers: opts.body ? { "Content-Type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin"
    }).then(function(res){
      return res.json().catch(function(){ return {}; }).then(function(data){
        if(res.status === 401 && op !== "login"){ showLogin(); throw new Error("Tu sesión expiró. Ingresa de nuevo."); }
        if(!res.ok || !data.ok) throw new Error(data.error || "Error " + res.status);
        return data;
      });
    });
  }

  var toastTimer;
  function toast(text, isError){
    var el = $("toast");
    el.textContent = text;
    el.classList.toggle("error", !!isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.hidden = true; }, isError ? 6000 : 3500);
  }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function norm(s){
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  // ----- Ingreso -----
  function showLogin(){
    $("app").hidden = true;
    $("login").hidden = false;
  }

  function showApp(roleLabel){
    $("who-role").textContent = roleLabel;
    $("login").hidden = true;
    $("app").hidden = false;
  }

  $("login-form").addEventListener("submit", function(e){
    e.preventDefault();
    var msg = $("login-msg");
    var btn = e.target.querySelector("button[type=submit]");
    msg.hidden = true;
    var role = $("role").value;
    var password = $("password").value;
    if(!role){ msg.textContent = "Selecciona tu rol."; msg.hidden = false; return; }
    if(!password){ msg.textContent = "Ingresa la contraseña."; msg.hidden = false; return; }
    btn.disabled = true;
    btn.textContent = "Ingresando…";
    api("login", { body: { role: role, password: password } })
      .then(function(data){
        $("password").value = "";
        showApp(data.roleLabel);
        load();
      })
      .catch(function(err){ msg.textContent = err.message; msg.hidden = false; })
      .then(function(){ btn.disabled = false; btn.textContent = "Ingresar"; });
  });

  $("logout").addEventListener("click", function(){
    api("logout", { body: {} }).catch(function(){}).then(function(){
      state.items = [];
      $("list").innerHTML = "";
      showLogin();
    });
  });

  // ----- Datos -----
  function load(){
    $("refresh").disabled = true;
    return api("lista")
      .then(function(data){
        state.items = data.postulaciones || [];
        state.resumen = data.resumen;
        $("who-role").textContent = data.roleLabel;
        render();
      })
      .catch(function(err){ toast(err.message, true); })
      .then(function(){ $("refresh").disabled = false; });
  }

  $("refresh").addEventListener("click", load);

  function renderStats(){
    var r = state.resumen;
    if(!r) return;
    $("s-ocupados").textContent = r.ocupados;
    $("s-cupo").textContent = r.cupo;
    $("s-bar").style.width = Math.min(100, Math.round(r.ocupados / r.cupo * 100)) + "%";
    var libres = Math.max(0, r.cupo - r.ocupados);
    $("s-note").textContent = r.aprobados + " aprobados sin confirmar · " + r.confirmados + " confirmados · " + (libres ? libres + " cupos libres" : "Cupo completo");
    $("s-revision").textContent = r.revision;
    $("s-confirmados").textContent = r.confirmados;
    $("s-espera").textContent = r.espera;
    $("s-total").textContent = r.total;
  }

  function renderChips(){
    var counts = {};
    state.items.forEach(function(p){ counts[p.estado] = (counts[p.estado] || 0) + 1; });
    var chips = [{ key: "", chip: "Todas", n: state.items.length }].concat(ESTADOS.map(function(e){
      return { key: e.key, chip: e.chip, n: counts[e.key] || 0 };
    }));
    $("chips").innerHTML = chips.map(function(c){
      return '<button type="button" class="chip" data-filter="' + esc(c.key) + '" aria-pressed="' + (state.filtro === c.key) + '">' + esc(c.chip) + '<b>' + c.n + '</b></button>';
    }).join("");
  }

  $("chips").addEventListener("click", function(e){
    var chip = e.target.closest(".chip");
    if(!chip) return;
    state.filtro = chip.getAttribute("data-filter");
    render();
  });
  $("search").addEventListener("input", function(e){ state.q = norm(e.target.value.trim()); renderList(); });
  $("sort").addEventListener("change", function(e){ state.sort = e.target.value; renderList(); });

  function visibleItems(){
    var items = state.items.filter(function(p){
      if(state.filtro && p.estado !== state.filtro) return false;
      if(!state.q) return true;
      return norm([p.nombre, p.email, p.profesion, p.otraProfesion, p.codigo, p.whatsapp].join(" ")).indexOf(state.q) !== -1;
    });
    var byDate = function(a, b){ return String(a.fecha).localeCompare(String(b.fecha)); };
    var sorts = {
      // Profesionales antes que estudiantes; dentro de cada grupo, por orden de postulación.
      prioridad: function(a, b){ return (a.estudiante - b.estudiante) || byDate(a, b); },
      recientes: function(a, b){ return byDate(b, a); },
      antiguos: byDate,
      nombre: function(a, b){ return a.nombre.localeCompare(b.nombre, "es"); }
    };
    return items.sort(sorts[state.sort] || sorts.prioridad);
  }

  function fmtFecha(s){
    // Jotform entrega "YYYY-MM-DD HH:MM:SS" (hora del servidor de Jotform, EST).
    var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(s || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] + " " + m[4] + ":" + m[5] : esc(s);
  }

  function waLink(n){
    var digits = String(n || "").replace(/[^0-9]/g, "");
    return digits ? "https://wa.me/" + digits : "";
  }

  function actionsFor(p){
    var b = function(accion, label, cls){ return '<button type="button" class="btn btn-small ' + cls + '" data-accion="' + accion + '">' + label + '</button>'; };
    switch(p.estado){
      case "Aprobado":
      case "Confirmado":
        return b("reenviar", "Reenviar correo", "") + b("espera", "Mover a lista de espera", "btn-wait") + b("rechazar", "No aprobar", "btn-reject");
      case "Lista de espera":
        return b("aprobar", "Aprobar", "btn-approve") + b("rechazar", "No aprobar", "btn-reject") + b("revision", "Volver a revisión", "");
      case "No aprobado":
        return b("aprobar", "Aprobar", "btn-approve") + b("espera", "Lista de espera", "btn-wait") + b("revision", "Volver a revisión", "");
      default:
        return b("aprobar", "Aprobar", "btn-approve") + b("espera", "Lista de espera", "btn-wait") + b("rechazar", "No aprobar", "btn-reject");
    }
  }

  function card(p){
    var est = ESTADOS.filter(function(e){ return e.key === p.estado; })[0] || ESTADOS[0];
    var prof = esc(p.profesion) + (p.otraProfesion ? ": <span class=\"ok\">" + esc(p.otraProfesion) + "</span>" : "");
    var wa = waLink(p.whatsapp);
    return '<article class="card" data-id="' + esc(p.id) + '">' +
      '<div>' +
        '<div class="name">' + esc(p.nombre) +
          (p.estudiante ? '<span class="tag tag-est">Estudiante</span>' : '<span class="tag tag-pro">Profesional</span>') +
          (/pagado/i.test(p.pago) ? '<span class="tag tag-pago">Pagó (pre-venta)</span>' : '') +
        '</div>' +
        '<div class="meta">' +
          '<span>' + prof + '</span>' +
          '<span>' + esc(p.nivel) + '</span>' +
        '</div>' +
        '<div class="meta">' +
          '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' +
          (wa ? '<a href="' + wa + '" target="_blank" rel="noopener">WhatsApp ' + esc(p.whatsapp) + '</a>' : '') +
          '<span>Postuló el ' + fmtFecha(p.fecha) + '</span>' +
        '</div>' +
        (p.revisado ? '<div class="audit">' + esc(p.revisado) + '</div>' : '') +
      '</div>' +
      '<div class="side">' +
        '<span class="estado ' + est.cls + '">' + esc(p.estado) + '</span>' +
        (p.codigo && (p.estado === "Aprobado" || p.estado === "Confirmado") ? '<span class="codigo">' + esc(p.codigo) + '</span>' : '') +
        '<div class="actions">' + actionsFor(p) + '</div>' +
      '</div>' +
    '</article>';
  }

  function renderList(){
    var items = visibleItems();
    $("list").innerHTML = items.length
      ? items.map(card).join("")
      : '<p class="empty">' + (state.items.length ? "No hay postulaciones con este filtro." : "Aún no hay postulaciones para Guayaquil.") + '</p>';
  }

  function render(){
    renderStats();
    renderChips();
    renderList();
  }

  // ----- Acciones -----
  var CONFIRM = {
    aprobar: function(p){ return "¿Aprobar a " + p.nombre + "?\n\nSe le enviará de inmediato el correo con su ticket de acceso a " + p.email + "."; },
    reenviar: function(p){ return "¿Reenviar el correo de aprobación a " + p.email + "?"; },
    espera: function(p){ return (p.estado === "Aprobado" || p.estado === "Confirmado")
      ? p.nombre + " ya recibió su correo de aprobación. ¿Mover su postulación a lista de espera y liberar el cupo?\n\n(No se le envía ningún correo automático: avísale personalmente.)"
      : null; },
    rechazar: function(p){ return (p.estado === "Aprobado" || p.estado === "Confirmado")
      ? p.nombre + " ya recibió su correo de aprobación. ¿Marcar su postulación como no aprobada y liberar el cupo?\n\n(No se le envía ningún correo automático: avísale personalmente.)"
      : null; }
  };

  $("list").addEventListener("click", function(e){
    var btn = e.target.closest("[data-accion]");
    if(!btn) return;
    var cardEl = btn.closest(".card");
    var id = cardEl.getAttribute("data-id");
    var accion = btn.getAttribute("data-accion");
    var p = state.items.filter(function(x){ return x.id === id; })[0];
    if(!p) return;
    var question = CONFIRM[accion] && CONFIRM[accion](p);
    if(question && !window.confirm(question)) return;

    cardEl.classList.add("is-busy");
    api("accion", { body: { id: id, accion: accion } })
      .then(function(data){
        if(data.sinCambios){ toast(data.mensaje); return load(); }
        var texto = {
          aprobar: "Postulación aprobada: " + p.nombre + " (" + data.codigo + ")" + (data.emailSent === false ? " · ⚠ el correo no se pudo enviar, usa “Reenviar correo”" : " · correo enviado"),
          reenviar: data.emailSent === false ? "No se pudo reenviar el correo." : "Correo reenviado a " + p.email,
          espera: "Postulación de " + p.nombre + " en lista de espera",
          rechazar: "Postulación de " + p.nombre + " marcada como no aprobada",
          revision: "Postulación de " + p.nombre + " de vuelta en revisión"
        }[accion];
        toast(texto, data.emailSent === false);
        return load();
      })
      .catch(function(err){ toast(err.message, true); cardEl.classList.remove("is-busy"); });
  });

  // ----- CSV (lista filtrada actual) -----
  $("export").addEventListener("click", function(){
    var rows = [["Estado", "Código", "Nombre", "Correo", "WhatsApp", "Profesión", "Otra profesión", "Nivel", "Postuló", "Revisado por"]]
      .concat(visibleItems().map(function(p){
        return [p.estado, p.codigo, p.nombre, p.email, p.whatsapp, p.profesion, p.otraProfesion, p.nivel, p.fecha, p.revisado];
      }));
    var csv = rows.map(function(r){
      return r.map(function(v){
        v = String(v == null ? "" : v);
        if(/^[=+\-@]/.test(v)) v = "'" + v;
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(";");
    }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "postulaciones-guayaquil" + (state.filtro ? "-" + norm(state.filtro).replace(/\s+/g, "-") : "") + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  // ----- Inicio: ¿hay sesión abierta? -----
  api("sesion")
    .then(function(data){ showApp(data.roleLabel); load(); })
    .catch(function(){ showLogin(); });
})();
