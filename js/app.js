(function(){
  // Cada speaker se define una vez; las ediciones (sedes) listan sus ids en orden.
  // "verified" marca a las docentes de Harmony. Sin "instagram" no se muestra el botón.
  // "noPhoto: true" muestra una tarjeta con iniciales hasta tener la foto en /speakers/<id>.webp.
  var SPEAKERS = {
    "loreto-campos":   { name: "Dra. Loreto Campos",   role: "Docente Harmony Instituto Internacional", verified: true, instagram: "https://www.instagram.com/dra.loretocampos/" },
    "javiera-vergara": { name: "Dra. Javiera Vergara", role: "Docente Harmony Instituto Internacional", verified: true, instagram: "https://www.instagram.com/dra.javieravergarae/" },
    "nathaly-fuentes": { name: "Dra. Nathaly Fuentes", role: "Exalumna de Postgrado · Cohorte 1", instagram: "https://www.instagram.com/dra.nathalyfuentes/" },
    "miguel-romero":   { name: "Dr. Miguel Romero",    role: "Alumno de Postgrado · Cohorte 7", instagram: "https://www.instagram.com/docmiguelromero/" },
    "marjorie-gold":   { name: "Dra. Marjorie Gold",   role: "Speaker Osamedic", instagram: "https://www.instagram.com/gyh.dentalyestetica/" },
    // Cupo de Antofagasta aún sin nombre (patrocina Estética y Ortopedia).
    "por-confirmar-eyo": { name: "Speaker por confirmar", role: "Speaker Estética y Ortopedia", noPhoto: true, pending: true },
    "sofia-montes":    { name: "Dra. Sofía Montes",    role: "Exalumna de Postgrado · Cohorte 4", instagram: "https://www.instagram.com/dra.sofimo_/" },
    "pamela-flores":   { name: "Dra. Pamela Flores",   role: "Exalumna de Postgrado · Cohorte 5", instagram: "https://www.instagram.com/dra.pamelareneeflores/" },
    "rafaela-melo":    { name: "Dra. Rafaela Melo",    role: "Speaker AFORMI" },
    "malu-lobato":     { name: "Dra. Malu Lobato",     role: "Speaker AFORMI" },
    "andrea-mazzo":    { name: "Dra. Andrea Mazzo",    role: "Docente Harmony Instituto Internacional", verified: true }
  };

  var EDITIONS = [
    {
      id: "edicion-concepcion", num: "01", city: "Concepción", date: "Sáb 17 oct 2026",
      speakers: ["javiera-vergara", "nathaly-fuentes", "pamela-flores", "marjorie-gold"],
      agenda: [
        { time: "10:00 – 10:10", kind: "info", title: "Bienvenida", detail: "Harmony Instituto Internacional" },
        { time: "10:10 – 10:55", speaker: "nathaly-fuentes", topic: "Trabajar con precursores de colágeno para la mejora de la matriz extracelular" },
        { time: "10:55 – 11:40", speaker: "marjorie-gold", topic: "El ABC de los Polinucleótidos: “Meline y el Futuro de la Regeneración Cutánea”, técnicas y predictibilidad" },
        { time: "11:40 – 12:00", kind: "break", title: "Break" },
        { time: "12:00 – 12:45", speaker: "pamela-flores", topic: "Hialuronidasa: una herramienta esencial para una práctica segura en estética facial" },
        { time: "12:45 – 13:30", speaker: "javiera-vergara", topic: "“Descifrando la toxina botulínica”: del mecanismo de acción a la decisión clínica" },
        { time: "13:30 – 14:00", kind: "networking", title: "Networking" }
      ]
    },
    {
      id: "edicion-antofagasta", num: "02", city: "Antofagasta", date: "Sáb 24 oct 2026",
      speakers: ["loreto-campos", "miguel-romero", "por-confirmar-eyo", "sofia-montes"],
      agenda: [
        { time: "10:00 – 10:10", kind: "info", title: "Bienvenida", detail: "Harmony Instituto Internacional" },
        { time: "10:10 – 10:55", speaker: "sofia-montes", topic: "¿Por qué dos pieles de la misma edad no envejecen igual?" },
        { time: "10:55 – 11:40", speaker: "por-confirmar-eyo", topic: "Tema por confirmar" },
        { time: "11:40 – 12:00", kind: "break", title: "Break" },
        { time: "12:00 – 12:45", speaker: "miguel-romero", topic: "Rellenos faciales full face, con criterio", subtitle: "Pensar por capas. Decidir por paciente." },
        { time: "12:45 – 13:30", speaker: "loreto-campos", topic: "Toxina botulínica: anatomía funcional, dinámica muscular y estrategias de aplicación para resultados predecibles y naturales" },
        { time: "13:30 – 14:00", kind: "networking", title: "Networking" }
      ]
    },
    {
      // Sede internacional. Sin "agenda" el cronograma muestra "en elaboración".
      id: "edicion-guayaquil", num: "03", city: "Guayaquil", date: "Ecuador · Sáb 28 nov 2026", tabDate: "Sáb 28 nov 2026",
      venue: "Hotel Wyndham Guayaquil Puerto Santa Ana",
      speakers: ["rafaela-melo", "malu-lobato", "andrea-mazzo", "javiera-vergara"]
    }
  ];

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch];
    });
  }

  function speakerCard(id){
      var s = SPEAKERS[id];
      if(!s) return "";
      var photo = "/speakers/" + id + ".webp";

      var verifiedHtml = s.verified ? (
        '<span class="speaker-verified" title="Docente confirmada Harmony" aria-hidden="true">' +
        '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</span>'
      ) : "";

      // La última palabra y la insignia van juntas (nunca queda la insignia sola en otra línea).
      var words = s.name.split(" ");
      var last = words.pop();
      var nameHtml = s.verified
        ? escapeHtml(words.join(" ")) + ' <span class="nw">' + escapeHtml(last) + verifiedHtml + '</span>'
        : escapeHtml(s.name);

      var linkHtml = s.instagram ? (
        '<a class="speaker-btn" href="' + escapeHtml(s.instagram) + '" target="_blank" rel="noopener" aria-label="Ver perfil de Instagram de ' + escapeHtml(s.name) + '">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg>' +
          'Ver perfil' +
        '</a>'
      ) : "";

      var initials = s.name.replace(/^Dr[a]?\.\s*/, "").split(" ").map(function(w){ return w.charAt(0); }).join("").slice(0, 2);
      var photoHtml = s.noPhoto
        ? '<div class="speaker-photo speaker-nophoto" role="img" aria-label="' + escapeHtml(s.name) + ', ' + escapeHtml(s.role) + '"><span>' + escapeHtml(s.pending ? "?" : initials) + '</span><small>' + (s.pending ? "Por confirmar" : "Foto próximamente") + '</small></div>'
        : '<img class="speaker-photo" src="' + escapeHtml(photo) + '" alt="' + escapeHtml(s.name) + ', ' + escapeHtml(s.role) + '" width="640" height="800" loading="lazy">';

      return (
        '<article class="speaker-card">' +
          photoHtml +
          '<div class="speaker-scrim"></div>' +
          '<div class="speaker-content">' +
            '<div class="speaker-name-row">' +
              '<h4 class="speaker-name">' + nameHtml + '</h4>' +
            '</div>' +
            '<p class="speaker-role">' + escapeHtml(s.role) + '</p>' +
            linkHtml +
          '</div>' +
        '</article>'
      );
  }

  function renderEditions(){
    var root = document.getElementById("editions");
    if(!root) return;

    root.innerHTML = EDITIONS.map(function(ed){
      return (
        '<section class="edition" id="' + escapeHtml(ed.id) + '" aria-labelledby="' + escapeHtml(ed.id) + '-title">' +
          '<div class="edition-head">' +
            '<span class="edition-num">EDICIÓN ' + escapeHtml(ed.num) + '</span>' +
            '<h3 class="edition-city" id="' + escapeHtml(ed.id) + '-title">' + escapeHtml(ed.city) + '</h3>' +
            '<span class="edition-date">' + escapeHtml(ed.date) + '</span>' +
            '<span class="edition-count">' + ed.speakers.length + ' speakers</span>' +
          '</div>' +
          '<div class="speaker-grid">' + ed.speakers.map(speakerCard).join("") + '</div>' +
        '</section>'
      );
    }).join("");
  }

  renderEditions();

  // ---------- CRONOGRAMA: pestañas por sede ----------
  var AGENDA_ICONS = {
    info: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    break: '<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
    networking: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15 14.5c2.8.3 5 2.6 5 5.5"/>'
  };

  function agendaItem(item){
    var timeHtml = '<span class="ag-time">' + escapeHtml(item.time) + '</span>';
    if(item.speaker){
      var s = SPEAKERS[item.speaker] || { name: item.speaker, role: "" };
      return (
        '<li class="ag-item ag-talk">' + timeHtml +
          '<div class="ag-card">' +
            (s.noPhoto
              ? '<span class="ag-avatar ag-avatar-empty" aria-hidden="true">' + (s.pending ? "?" : escapeHtml(s.name.replace(/^Dr[a]?\.\s*/, "").split(" ").map(function(w){ return w.charAt(0); }).join("").slice(0, 2))) + '</span>'
              : '<img class="ag-avatar" src="/speakers/' + escapeHtml(item.speaker) + '.webp" alt="" width="56" height="56" loading="lazy">') +
            '<div class="ag-body">' +
              '<p class="ag-speaker">' + escapeHtml(s.name) + '<span class="ag-role">' + escapeHtml(s.role) + '</span></p>' +
              '<p class="ag-topic">' + escapeHtml(item.topic) + '</p>' +
              (item.subtitle ? '<p class="ag-subtitle">' + escapeHtml(item.subtitle) + '</p>' : '') +
            '</div>' +
          '</div>' +
        '</li>'
      );
    }
    return (
      '<li class="ag-item ag-' + escapeHtml(item.kind) + '">' + timeHtml +
        '<div class="ag-card">' +
          '<span class="ag-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (AGENDA_ICONS[item.kind] || "") + '</svg></span>' +
          '<div class="ag-body"><p class="ag-title">' + escapeHtml(item.title) + '</p>' +
          (item.detail ? '<p class="ag-detail">' + escapeHtml(item.detail) + '</p>' : '') +
          '</div>' +
        '</div>' +
      '</li>'
    );
  }

  function renderAgenda(){
    var root = document.getElementById("agenda");
    if(!root) return;

    var tabs = EDITIONS.map(function(ed, i){
      return (
        '<button type="button" class="ag-tab" role="tab" id="tab-' + escapeHtml(ed.id) + '" aria-controls="panel-' + escapeHtml(ed.id) + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-edition="' + escapeHtml(ed.id) + '">' +
          '<span class="ag-tab-city">' + escapeHtml(ed.city) + '</span>' +
          '<span class="ag-tab-date">' + escapeHtml(ed.tabDate || ed.date) + '</span>' +
        '</button>'
      );
    }).join("");

    var panels = EDITIONS.map(function(ed, i){
      return (
        '<div class="ag-panel" role="tabpanel" id="panel-' + escapeHtml(ed.id) + '" aria-labelledby="tab-' + escapeHtml(ed.id) + '"' + (i === 0 ? '' : ' hidden') + '>' +
          (ed.agenda
            ? '<ol class="ag-list">' + ed.agenda.map(agendaItem).join("") + '</ol>'
            : '<div class="ag-pending">' +
                '<span class="ag-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>' +
                '<div><p class="ag-title">Cronograma en elaboración</p>' +
                '<p class="ag-detail">Jornada de 10:00 a 14:00 hrs' + (ed.venue ? ' en el ' + escapeHtml(ed.venue) : '') + '. Muy pronto publicaremos el programa con las charlas de cada speaker.</p></div>' +
              '</div>') +
        '</div>'
      );
    }).join("");

    root.innerHTML = '<div class="ag-tabs" role="tablist" aria-label="Elige la sede">' + tabs + '</div>' + panels;

    var tabEls = root.querySelectorAll(".ag-tab");
    tabEls.forEach(function(tab, i){
      tab.addEventListener("click", function(){ selectAgenda(tab.getAttribute("data-edition")); });
      tab.addEventListener("keydown", function(e){
        if(e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var next = tabEls[(i + (e.key === "ArrowRight" ? 1 : tabEls.length - 1)) % tabEls.length];
        selectAgenda(next.getAttribute("data-edition"));
        next.focus();
      });
    });
  }

  function selectAgenda(editionId){
    document.querySelectorAll("#agenda .ag-tab").forEach(function(tab){
      var on = tab.getAttribute("data-edition") === editionId;
      tab.setAttribute("aria-selected", on);
      tab.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll("#agenda .ag-panel").forEach(function(panel){
      panel.hidden = panel.id !== "panel-" + editionId;
    });
  }

  renderAgenda();

  // Enlaces externos (p. ej. el correo de confirmación) abren la pestaña de su sede:
  // /?cronograma=antofagasta#cronograma
  var agendaParam = new URLSearchParams(location.search).get("cronograma");
  if(agendaParam && document.getElementById("panel-edicion-" + agendaParam)){
    selectAgenda("edicion-" + agendaParam);
  }

  // Enlaces "Ver cronograma" de los tickets: abren la pestaña de su sede.
  document.querySelectorAll("[data-agenda]").forEach(function(link){
    link.addEventListener("click", function(){ selectAgenda(link.getAttribute("data-agenda")); });
  });

  // Solo un formulario abierto a la vez: al abrir uno se repliegan los demás.
  var toggles = document.querySelectorAll(".js-toggle-form");
  var stops = document.querySelector(".stops");
  var FORM_ANIM_MS = 420;

  // Anima de 0 a la altura real y luego libera la altura (auto) para que
  // los mensajes de error/éxito puedan cambiar el tamaño sin cortarse.
  function expandForm(form){
    if(!form._openedAt) form._openedAt = Date.now();
    clearTimeout(form._animTimer);
    form.classList.remove("hidden-form", "is-entering");
    var target = form.scrollHeight;
    form.style.height = "0px";
    form.style.opacity = "0";
    void form.offsetHeight;
    form.classList.add("is-entering");
    form.style.height = target + "px";
    form.style.opacity = "1";
    form._animTimer = setTimeout(function(){
      form.style.height = "";
      form.style.opacity = "";
    }, FORM_ANIM_MS);
  }

  function collapseForm(form){
    if(form.classList.contains("hidden-form")) return false;
    clearTimeout(form._animTimer);
    form.style.height = form.scrollHeight + "px";
    void form.offsetHeight;
    form.style.height = "0px";
    form.style.opacity = "0";
    form._animTimer = setTimeout(function(){
      form.classList.add("hidden-form");
      form.classList.remove("is-entering");
      form.style.height = "";
      form.style.opacity = "";
    }, FORM_ANIM_MS);
    return true;
  }

  toggles.forEach(function(btn){
    btn.addEventListener("click", function(){
      var form = document.getElementById(btn.getAttribute("data-target"));
      if(!form) return;
      var closedAnother = false;
      toggles.forEach(function(other){
        if(other === btn) return;
        var otherForm = document.getElementById(other.getAttribute("data-target"));
        if(otherForm && collapseForm(otherForm)) closedAnother = true;
        if(other.hidden){
          other.hidden = false;
          other.classList.remove("is-revealed");
          void other.offsetWidth;
          other.classList.add("is-revealed");
        }
      });
      btn.hidden = true;
      expandForm(form);
      if(stops) stops.classList.add("has-open");

      // Si se replegó otro formulario (en mobile queda arriba), esperar a que
      // termine para que el scroll no quede desfasado.
      var wait = closedAnother ? FORM_ANIM_MS : 0;
      setTimeout(function(){
        btn.closest(".ticket-stub").scrollIntoView({ behavior: "smooth", block: "start" });
      }, wait);
      setTimeout(function(){
        var firstField = form.querySelector("input, select");
        if(firstField) firstField.focus({ preventScroll: true });
      }, FORM_ANIM_MS);
    });
  });

  function validate(form){
    var errors = [];
    var nombre = form.nombre.value.trim();
    var email = form.email.value.trim();
    var whatsapp = form.whatsapp.value.trim();
    var profesion = form.profesion.value;
    var nivel = form.nivel.value;

    if(nombre.length < 3) errors.push("Ingresa tu nombre y apellido.");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Ingresa un correo válido.");
    if(whatsapp.replace(/[^0-9]/g,"").length < 8) errors.push("Ingresa un número de WhatsApp válido.");
    if(!profesion) errors.push("Selecciona tu profesión.");
    if(!nivel) errors.push("Selecciona tu nivel de formación.");

    return errors;
  }

  // Un solo producto/link de Hotmart para todas las sedes. Se agregan parámetros:
  //  - sck: sede (HOT_CONCEPCION / HOT_ANTOFAGASTA / HOT_GUAYAQUIL) -> Reportes > Ventas por origen de checkout
  //  - src: id de la preinscripción en Jotform (JF<id>) -> enlaza el pago con su inscripción
  //  - email / name: autocompletan el checkout para que el correo coincida con Jotform
  function buildPayUrl(baseHref, form, payload, submissionId){
    var url = new URL(baseHref);
    url.searchParams.set("sck", form.getAttribute("data-sck"));
    if(submissionId) url.searchParams.set("src", "JF" + submissionId);
    url.searchParams.set("email", payload.email);
    url.searchParams.set("name", payload.nombre);
    return url.toString();
  }

  document.querySelectorAll(".reg-form").forEach(function(form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var msg = form.querySelector(".reg-msg");
      var success = form.querySelector(".reg-success");
      var submitBtn = form.querySelector("button[type=submit]");

      msg.classList.remove("show");
      msg.textContent = "";

      var errors = validate(form);
      if(errors.length){
        msg.textContent = errors[0];
        msg.classList.add("show");
        return;
      }

      var payload = {
        sede: form.getAttribute("data-sede"),
        nombre: form.nombre.value.trim(),
        email: form.email.value.trim(),
        whatsapp: form.whatsapp.value.trim(),
        profesion: form.profesion.value,
        nivel: form.nivel.value,
        empresa: form.empresa ? form.empresa.value : "",
        t: form._openedAt ? Date.now() - form._openedAt : 0
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando…";

      fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(function(res){ return res.json().then(function(data){ return { ok: res.ok, data: data }; }); })
      .then(function(result){
        if(!result.ok || !result.data || !result.data.success){
          throw new Error((result.data && result.data.error) || "No pudimos registrar tu inscripción.");
        }
        var mailNote = form.querySelector(".reg-mail-note");
        if(mailNote && result.data.emailSent){
          mailNote.querySelector(".reg-mail-to").textContent = payload.email;
          mailNote.hidden = false;
        }
        var payLink = form.querySelector("[data-pay-link]");
        if(payLink) payLink.href = buildPayUrl(payLink.href, form, payload, result.data.submissionId);
        form.querySelectorAll(".field, .reg-msg, button[type=submit], .reg-fallback").forEach(function(el){ el.style.display = "none"; });
        success.classList.add("show");
      })
      .catch(function(err){
        msg.textContent = "No pudimos enviar tu inscripción (" + err.message + "). Prueba de nuevo o usa el enlace de abajo.";
        msg.classList.add("show");
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar inscripción";
      });
    });
  });
})();
