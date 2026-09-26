// Fin de la preventa: 16 de octubre de 2026, 00:00 hora de Chile (UTC-3).
// Va en el <head> para que el precio correcto se vea desde el primer pintado.
// Para probar: agregar ?precio=general o ?precio=preventa a la URL.
(function(){
  var PRESALE_END = Date.parse("2026-10-16T00:00:00-03:00");
  var forced = new URLSearchParams(location.search).get("precio");
  var over = forced ? forced === "general" : Date.now() >= PRESALE_END;
  if(over) document.documentElement.classList.add("presale-over");
})();
