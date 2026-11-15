// Botón de pantalla completa (se muestra en pantallas anchas; en el celular se puede instalar el juego).
(() => {
  const b = document.getElementById('pc'), d = document.documentElement;
  const ok = !!(d.requestFullscreen || d.webkitRequestFullscreen);
  if (!b) return; if (!ok) { b.remove(); return; }
  const dentro = () => document.fullscreenElement || document.webkitFullscreenElement;
  b.addEventListener('click', () => { if (dentro()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (d.requestFullscreen || d.webkitRequestFullscreen).call(d).catch?.(() => {}); });
  const sync = () => b.setAttribute('aria-label', dentro() ? 'Salir de pantalla completa' : 'Pantalla completa');
  document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
})();
