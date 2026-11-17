// Guia de instalação: mostra primeiro o passo a passo do celular de quem abriu.
// A instalação em si é feita a partir do link pessoal (/?c=CODIGO), para o app já abrir com acesso.
"use strict";

(() => {
  const botoes = document.querySelectorAll("[data-sistema]");

  function mostrar(sistema) {
    botoes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.sistema === sistema)));
    document.getElementById("android").hidden = sistema !== "android";
    document.getElementById("iphone").hidden = sistema !== "iphone";
  }

  botoes.forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.sistema)));
  mostrar(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? "iphone" : "android");

})();
