(function(){
  // Cada speaker se define una vez; las ediciones (sedes) listan sus ids en orden.
  // "verified" marca a las docentes de Harmony. Sin "instagram" no se muestra el botón.
  var SPEAKERS = {
    "loreto-campos":   { name: "Dra. Loreto Campos",   role: "Docente Harmony Instituto Internacional", verified: true, instagram: "https://www.instagram.com/dra.loretocampos/" },
    "javiera-vergara": { name: "Dra. Javiera Vergara", role: "Docente Harmony Instituto Internacional", verified: true, instagram: "https://www.instagram.com/dra.javieravergarae/" },
    "miguel-romero":   { name: "Dr. Miguel Romero",    role: "Alumno de Postgrado · Cohorte 7", instagram: "https://www.instagram.com/docmiguelromero/" },
    "marjorie-gold":   { name: "Dra. Marjorie Gold",   role: "Speaker Osamedic", instagram: "https://www.instagram.com/gyh.dentalyestetica/" },
    "sofia-montes":    { name: "Dra. Sofía Montes",    role: "Exalumna de Postgrado · Cohorte 4", instagram: "https://www.instagram.com/dra.sofimo_/" },
    "pamela-flores":   { name: "Dra. Pamela Flores",   role: "Exalumna de Postgrado · Cohorte 5", instagram: "https://www.instagram.com/dra.pamelareneeflores/" }
  };

  var EDITIONS = [
    {
      id: "edicion-concepcion", num: "01", city: "Concepción", date: "Sáb 17 oct 2026",
      speakers: ["javiera-vergara", "pamela-flores", "marjorie-gold"]
    },
    {
      id: "edicion-antofagasta", num: "02", city: "Antofagasta", date: "Sáb 24 oct 2026",
      speakers: ["loreto-campos", "miguel-romero", "marjorie-gold", "sofia-montes"]
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

      var linkHtml = s.instagram ? (
        '<a class="speaker-btn" href="' + escapeHtml(s.instagram) + '" target="_blank" rel="noopener" aria-label="Ver perfil de Instagram de ' + escapeHtml(s.name) + '">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg>' +
          'Ver perfil' +
        '</a>'
      ) : "";

      return (
        '<article class="speaker-card">' +
          '<img class="speaker-photo" src="' + escapeHtml(photo) + '" alt="' + escapeHtml(s.name) + ', ' + escapeHtml(s.role) + '" width="640" height="800" loading="lazy">' +
          '<div class="speaker-scrim"></div>' +
          '<div class="speaker-content">' +
            '<div class="speaker-name-row">' +
              '<h4 class="speaker-name">' + escapeHtml(s.name) + '</h4>' +
              verifiedHtml +
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

  // Un solo producto/link de Hotmart para ambas sedes. Se agregan parámetros:
  //  - sck: sede (HOT_CONCEPCION / HOT_ANTOFAGASTA) -> Reportes > Ventas por origen de checkout
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
