// Postulaciones Guayaquil (entrada gratuita, cupos sujetos a aprobación) hasta el 19 de noviembre de 2026.
// Cierran el 20 de noviembre, 00:00 hora de Ecuador (UTC-5); la API aplica la misma fecha.
// Va en el <head> para que el estado correcto se vea desde el primer pintado.
// Para probar: agregar ?postulacion=cerrada o ?postulacion=abierta a la URL.
(function(){
  var CIERRE = Date.parse("2026-11-20T00:00:00-05:00");
  var forced = new URLSearchParams(location.search).get("postulacion");
  var closed = forced ? forced === "cerrada" : Date.now() >= CIERRE;
  if(closed) document.documentElement.classList.add("postulacion-cerrada");
})();
