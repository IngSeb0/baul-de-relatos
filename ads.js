/* Espacios de anuncios (Google AdSense).
   Para activarlos: pon tu ID de editor (ca-pub-…) en CLIENTE y el ID de cada
   bloque que crees en AdSense en BLOQUES. Mientras CLIENTE esté vacío, los
   espacios no se muestran ni se carga nada de Google. */
(function () {
  var CLIENTE = '';            // ej. 'ca-pub-1234567890123456'
  var BLOQUES = {              // ID del bloque de anuncio de cada espacio
    'inicio-medio': '',
    'inicio-final': '',
    'juego-franja': ''
  };
  if (!CLIENTE) return;
  var espacios = document.querySelectorAll('[data-anuncio]');
  if (!espacios.length) return;
  var s = document.createElement('script');
  s.async = true; s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CLIENTE);
  document.head.appendChild(s);
  espacios.forEach(function (el) {
    var id = BLOQUES[el.getAttribute('data-anuncio')];
    if (!id) return;
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', CLIENTE);
    ins.setAttribute('data-ad-slot', id);
    if (el.id === 'franja') { ins.style.height = '100%'; ins.setAttribute('data-full-width-responsive', 'false'); }
    else { ins.setAttribute('data-ad-format', 'auto'); ins.setAttribute('data-full-width-responsive', 'true'); }
    el.hidden = false; el.removeAttribute('aria-hidden');
    if (el.id === 'franja') document.documentElement.style.setProperty('--franja', '60px');
    el.appendChild(ins);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
})();
