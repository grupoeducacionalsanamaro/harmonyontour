// Pre-venta exclusiva Guayaquil (USD 24.99) hasta el 10 de noviembre de 2026.
// Termina el 11 de noviembre, 00:00 hora de Ecuador (UTC-5); luego vuelve a USD 49.99.
// Va en el <head> para que el precio correcto se vea desde el primer pintado.
// Para probar: agregar ?precio=general o ?precio=preventa a la URL.
(function(){
  var PRESALE_END = Date.parse("2026-11-11T00:00:00-05:00");
  var forced = new URLSearchParams(location.search).get("precio");
  var over = forced ? forced === "general" : Date.now() >= PRESALE_END;
  if(over) document.documentElement.classList.add("presale-over");
})();
