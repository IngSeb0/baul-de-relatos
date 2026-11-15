// La Arena: lógica de la página (estado en vivo, cuenta, acciones del día)
(() => {
  const CONFIG = {
    supabaseUrl: 'https://shncnofgelobyskwghse.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobmNub2ZnZWxvYnlza3dnaHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2ODI1ODAsImV4cCI6MjExMDI1ODU4MH0.-yjQWT9hiiY7u-aP_lt4C2gJKAnQ_g2tnXcvWUfap_0',
    inicio: '2026-11-16', cierreInscripcion: 10,
  };
  const LINKS = [
    { c: 'ig', n: 'Instagram', h: '@baul_de_relatos', u: 'https://www.instagram.com/baul_de_relatos/', i: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="#fff"/></svg>' },
    { c: 'tt', n: 'TikTok', h: '@baulderelatos0', u: 'https://www.tiktok.com/@baulderelatos0', i: '<svg viewBox="0 0 24 24"><path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46V8.5a6.5 6.5 0 1 0 6 6.48V9.2c1.1.8 2.5 1.3 4 1.3V7.4c-2.2 0-4-1.9-4-4.4z" fill="#fff"/></svg>' },
    { c: 'yt', n: 'YouTube', h: '@baulderelatos67', u: 'https://www.youtube.com/@baulderelatos67', i: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4" fill="#fff"/><path d="M10 9v6l5-3z" fill="#e62117"/></svg>' },
  ];
  const HORAS = [['México y Centroamérica', -6], ['EE. UU. Pacífico', -8], ['Colombia · Perú · Ecuador · Panamá', -5], ['EE. UU. Este', -5], ['Venezuela · Bolivia · R. Dominicana', -4], ['Chile · Argentina · Uruguay', -3], ['España', 1]];
  const ZONAS = [{ id: 'Bosque', x: 140, y: 150, c: '#2f9e5a' }, { id: 'Pantano', x: 370, y: 140, c: '#4f7a6a' }, { id: 'Desierto', x: 120, y: 360, c: '#d9a441' }, { id: 'Volcán', x: 380, y: 360, c: '#d8441c' }, { id: 'Ruinas', x: 250, y: 255, c: '#7a6aa8' }];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800); };
  const bogota = () => new Date(Date.now() - 5 * 3600e3);
  const diaDe = () => Math.max(0, Math.min(31, Math.floor((bogota() - new Date(CONFIG.inicio + 'T00:00:00Z')) / 864e5) + 1));
  const fmt = (n) => Number(n || 0).toLocaleString('es');

  let almacen; try { almacen = localStorage; almacen.getItem('x'); } catch { almacen = undefined; }
  const sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: !!almacen, storage: almacen, storageKey: 'dragones-de-los-meses-sesion', autoRefreshToken: true } });
  const st = { e: { dia: 0, vivos: 0, zonas: {}, abiertas: ZONAS.map((z) => z.id), lista_caidos: [], hoy: null }, user: null, yo: null };

  // ---------- cabecera ----------
  const tick = () => {
    const d = diaDe(), b = bogota(), next = new Date(b); next.setUTCHours(24, 0, 0, 0); const ms = next - b, p = (x) => String(x).padStart(2, '0');
    $('sDia').textContent = d < 1 ? 'PRONTO' : d > 30 ? 'FIN' : d + '/30'; $('sDiaL').textContent = d < 1 ? 'Empieza esta noche' : 'Día';
    $('sReloj').textContent = `${p(Math.floor(ms / 36e5))}:${p(Math.floor(ms / 6e4) % 60)}:${p(Math.floor(ms / 1e3) % 60)}`;
    $('sRelojL').textContent = d < 1 ? 'Para el día 1' : 'Próxima noche';
  };
  tick(); setInterval(tick, 1000);
  const start = new Date(CONFIG.inicio + 'T05:00:00Z');
  $('times').innerHTML = HORAS.map(([n, off]) => { const t = new Date(start.getTime() + off * 3600e3), h = t.getUTCHours(), hh = ((h + 11) % 12) + 1; return `<div class="time"><span>${n}<small>${t.getUTCDate()} nov</small></span><b>${hh}:00 ${h < 12 ? 'a. m.' : 'p. m.'}</b></div>`; }).join('');

  // ---------- mapa ----------
  const drawMap = (sel) => {
    $('map').innerHTML = `<defs><radialGradient id="g" cx="50%" cy="45%"><stop offset="0" stop-color="#3b2860"/><stop offset="1" stop-color="#0f0819"/></radialGradient></defs><circle cx="250" cy="255" r="235" fill="url(#g)" stroke="#ffd060" stroke-width="4" stroke-dasharray="10 8"/>` +
      ZONAS.map((z) => { const open = st.e.abiertas.includes(z.id); return `<g opacity="${open ? 1 : 0.35}"><ellipse cx="${z.x}" cy="${z.y + 32}" rx="90" ry="20" fill="#000" opacity=".4"/><circle cx="${z.x}" cy="${z.y}" r="${z.id === sel ? 86 : 78}" fill="${z.c}" stroke="${z.id === sel ? '#ffd060' : '#fff'}" stroke-width="${z.id === sel ? 7 : 3}"/><text class="zl" x="${z.x}" y="${z.y + 4}" text-anchor="middle">${z.id.toUpperCase()}</text><text class="zn" x="${z.x}" y="${z.y + 30}" text-anchor="middle">${open ? fmt(st.e.zonas[z.id] || 0) + ' jugadores' : 'CERRADA'}</text><text class="zn" x="${z.x}" y="${z.y + 54}" text-anchor="middle" style="font-size:13px;opacity:.85">${open ? fmt((st.e.inscritos || {})[z.id] || 0) + ' reclamados' : ''}</text></g>`; }).join('');
  };

  // ---------- ruleta de cierres ----------
  let ruletaVista = '';
  const drawRuleta = () => {
    const c = st.e.cierres || [], box = $('ruleta'); if (!box) return;
    const ult = c[c.length - 1], prox = [10, 17, 23].find((d) => !c.some((x) => x.dia === d));
    const n = ZONAS.length, seg = 360 / n;
    const rueda = ZONAS.map((z, i) => { const a0 = (i * seg - 90) * Math.PI / 180, a1 = ((i + 1) * seg - 90) * Math.PI / 180, am = (a0 + a1) / 2, cerr = c.some((x) => x.zona === z.id); return `<path d="M100 100 L${100 + 92 * Math.cos(a0)} ${100 + 92 * Math.sin(a0)} A92 92 0 0 1 ${100 + 92 * Math.cos(a1)} ${100 + 92 * Math.sin(a1)}Z" fill="${z.c}" opacity="${cerr ? 0.25 : 1}" stroke="#0f0819" stroke-width="3"/><text x="${100 + 58 * Math.cos(am)}" y="${104 + 58 * Math.sin(am)}" text-anchor="middle" font-family="Bungee" font-size="11" fill="#fff" transform="rotate(${(i + 0.5) * seg} ${100 + 58 * Math.cos(am)} ${100 + 58 * Math.sin(am)})">${z.id.toUpperCase()}</text>`; }).join('');
    const idx = ult ? ZONAS.findIndex((z) => z.id === ult.zona) : 0, giro = ult ? 360 * 6 - (idx + 0.5) * seg : 0;
    const clave = ult ? ult.dia + ult.zona : 'nada';
    box.innerHTML = `<div class="ruedaw"><svg viewBox="0 0 200 200" width="220" height="220" aria-hidden="true"><g id="rueda" style="transform-origin:100px 100px;transition:transform ${ruletaVista === clave ? 0 : 4.5}s cubic-bezier(.12,.75,.12,1)">${rueda}</g><circle cx="100" cy="100" r="14" fill="#ffd060"/><path d="M100 2 L90 22 L110 22Z" fill="#fff"/></svg></div>` +
      `<div><h3 style="font-size:22px;margin:0 0 6px">La ruleta de la arena</h3><p class="note">Los días 10, 17 y 23 se cierra una zona, y nadie sabe cuál: la decide la ruleta un día antes. Si la tuya cae, te mudas a la fuerza.</p>${c.map((x) => `<p><b>Día ${x.dia}:</b> se cierra <b style="color:var(--gold)">${esc(x.zona)}</b></p>`).join('')}${prox ? `<p class="note">Próximo giro: día ${prox - 1}</p>` : ''}</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const r = document.getElementById('rueda'); if (r) r.style.transform = `rotate(${giro}deg)`; }));
    ruletaVista = clave;
  };

  // ---------- datos en vivo ----------
  async function cargar() {
    try {
    const { data } = await sb.rpc('arena_estado'); if (data) { const prev = st.e.vivos; st.e = data; if (prev !== data.vivos) { const v = $('sVivos'); v.classList.remove('bump'); void v.offsetWidth; v.classList.add('bump'); } }
    if (st.user) { const { data: yo } = await sb.rpc('arena_yo'); st.yo = yo; }
    } catch (e) { /* sin conexión: se reintenta en 20 s */ }
    render();
  }

  function render() {
    const e = st.e, D = e.dia; $('sVivos').textContent = fmt(e.vivos); drawMap(st.yo ? undefined : undefined); drawRuleta();
    const hechas = st.yo?.hechas || [];
    $('todo').innerHTML = [
      ...(D <= CONFIG.cierreInscripcion ? [['ENTRAR', `Crea tu cuenta y entra a La Arena con tu usuario de Instagram. Inscripción hasta el día ${CONFIG.cierreInscripcion}.`]] : []),
      ['VIDEO', hechas.includes('video') ? 'Listo: ya cobraste el agua de hoy.' : 'Mira el video del día en esta página y gana 1 agua.'],
      ['PALABRA', hechas.includes('palabra') ? 'Ya respondiste hoy.' : 'Escribe la palabra secreta del video y gana 1 comida.'],
      ...(D >= 4 ? [['VOTA', hechas.includes('voto') ? 'Ya votaste hoy.' : 'Vota qué zona se salva esta noche.']] : []),
    ].map(([k, t]) => `<div class="todo"><span class="k">${k}</span><span>${t}</span></div>`).join('');
    const h = e.hoy;
    $('evt').textContent = D >= 4 && h ? `Esta noche: ${h.evento}` : 'Primera tormenta: día 4';
    $('evtTxt').textContent = D >= 4 && h ? 'La zona menos votada sufre el evento. Si estás ahí y no tienes refugio, pierdes 1 corazón.' : 'Hasta entonces solo cuentan el agua y la comida. Elige bien tu zona.';
    $('vote').innerHTML = D >= 4 && h?.zona_a ? `<button class="oa" data-v="A"><span class="bg">A</span>${esc(h.zona_a)}</button><button class="ob" data-v="B"><span class="bg">B</span>${esc(h.zona_b)}</button>` : '';
    $('mud').innerHTML = e.abiertas.map((z) => `<option>${z}</option>`).join('');
    $('fallen').innerHTML = e.lista_caidos.length ? e.lista_caidos.map((n) => `<span>@${esc(n)}</span>`).join('') : '<span>Nadie… todavía</span>';
    renderEntrar(); setupVideo();
  }

  function renderEntrar() {
    const b = $('entBody');
    if (!st.user) { $('entTit').textContent = 'Entra a La Arena'; b.innerHTML = `<p><b>Si ya seguías a @baul_de_relatos, ya estás dentro.</b> Reclama tu @ antes del día 1 y ganas el premio de fundador (+1 agua y un refugio): crea tu cuenta (sin correo, solo nombre y contraseña) y escribe tu usuario de Instagram. Si no lo reclamas, tu jugador no puede juntar agua y caerá en las primeras noches.</p><button id="goLogin">Crear cuenta y reclamar mi @</button>`; $('goLogin').onclick = abrirModal; return; }
    if (st.yo?.ig) { $('entTit').textContent = `Estás dentro como @${st.yo.ig}`; b.innerHTML = `<p>Revisa tu ficha y cumple lo de hoy para no quedarte sin agua.</p><button id="verMia">Ver mi ficha</button>`; $('verMia').onclick = () => { $('q').value = st.yo.ig; buscar(st.yo.ig); location.hash = 'ficha'; }; return; }
    $('entTit').textContent = 'Último paso: reclama tu @ o entra';
    b.innerHTML = `<form id="entF" class="act"><input id="eig" placeholder="tu usuario de Instagram (sin @)" maxlength="31" required><select id="ezo">${st.e.abiertas.map((z) => `<option>${z}</option>`).join('')}</select><button>Reclamar / entrar</button></form><p class="note">Si ya me seguías, tu @ ya está en La Arena: escríbelo para reclamarlo (antes del día 1 puedes cambiar tu zona). Usa tu usuario real: el ganador se verifica antes del premio.</p><p class="err" id="entMsg"></p>`;
    $('entF').onsubmit = async (ev) => { ev.preventDefault(); const { data, error } = await sb.rpc('arena_entrar', { usuario: $('eig').value, zona_elegida: $('ezo').value }); $('entMsg').textContent = error ? 'No se pudo conectar. Intenta de nuevo.' : data; if (!error) { toast(data); cargar(); } };
  }

  // ---------- ficha ----------
  const meter = (l, v, max, c) => `<div class="meter"><b>${l}: ${v}</b><div class="bar"><i style="width:${Math.min(100, v / max * 100)}%;background:${c}"></i></div></div>`;
  async function buscar(q) {
    const out = $('fichaOut'), k = String(q || '').trim().replace(/^@/, '').toLowerCase();
    if (!k) { out.innerHTML = '<h3 style="font-size:22px">Busca un usuario</h3><p class="note">Verás sus corazones, agua, comida, objetos y el diario de cada noche.</p>'; drawMap(); return; }
    const { data: j } = await sb.rpc('arena_ficha', { usuario: k });
    if (!j) { out.innerHTML = `<h3 style="font-size:22px">@${esc(k)}</h3><p>No está en La Arena.</p>`; drawMap(); return; }
    const c = Math.max(0, j.corazones);
    out.innerHTML = `<h3 style="font-size:24px;overflow-wrap:anywhere">@${esc(j.ig)}</h3><span class="tag ${c ? 'ok' : 'no'}">${c ? 'Sigue en pie' : 'Espíritu'}</span><span class="tag">Zona: ${esc(j.zona)}</span>${j.reclamado ? '' : '<span class="tag warn">Sin reclamar</span>'}${c && j.agua === 0 ? '<span class="tag warn">¡Sin agua!</span>' : ''}
      <div class="hearts">${'❤️'.repeat(c)}${'🖤'.repeat(3 - c)}</div>
      <div class="meters">${meter('Agua', j.agua, 5, '#4ab0ff')}${meter('Comida', j.comida, 5, '#e0a050')}</div>
      <div class="bag">${[['refugio', 'Refugio'], ['arma', 'Arma'], ['botiquin', 'Botiquín']].map(([key, l]) => `<span class="item ${j[key] ? '' : 'off'}">${l}</span>`).join('')}</div>
      <ul class="log">${j.diario.length ? j.diario.map(([d, t]) => `<li><span class="d">D${d}</span>${esc(t)}</li>`).join('') : '<li>Su diario empieza esta noche.</li>'}</ul>`;
    drawMap(j.zona);
  }
  $('f').onsubmit = (e) => { e.preventDefault(); buscar($('q').value); };

  // ---------- acciones ----------
  const necesitaCuenta = () => { if (!st.user) { abrirModal(); return true; } return false; };
  $('palF').onsubmit = async (e) => { e.preventDefault(); if (necesitaCuenta()) return; const v = $('pal').value.trim(); if (!v) return; const { data, error } = await sb.rpc('arena_palabra', { respuesta: v }); $('palMsg').textContent = error ? 'No se pudo conectar.' : data; $('pal').value = ''; cargar(); };
  $('vote').onclick = async (e) => { const b = e.target.closest('button[data-v]'); if (!b || necesitaCuenta()) return; const { data, error } = await sb.rpc('arena_votar', { opcion: b.dataset.v }); $('voteMsg').textContent = error ? 'No se pudo conectar.' : data; cargar(); };
  $('mudF').onsubmit = async (e) => { e.preventDefault(); if (necesitaCuenta()) return; const { data, error } = await sb.rpc('arena_mudar', { zona_nueva: $('mud').value }); $('mudMsg').textContent = error ? 'No se pudo conectar.' : data; cargar(); };

  // ---------- video del día (YouTube) ----------
  let videoListo = null;
  function setupVideo() {
    const id = st.e.hoy?.video; if (!id || videoListo === id) return; videoListo = id;
    $('player').innerHTML = '<div id="yt"></div>';
    const crear = () => new YT.Player('yt', { videoId: id, host: 'https://www.youtube-nocookie.com', playerVars: { playsinline: 1, rel: 0 }, events: { onStateChange: async (ev) => {
      if (ev.data === 1) { const p = ev.target, iv = setInterval(() => { $('vidBar').style.width = Math.min(100, p.getCurrentTime() / Math.max(1, p.getDuration()) * 100) + '%'; if (p.getPlayerState() !== 1) clearInterval(iv); }, 500); }
      if (ev.data === 0) { $('vidBar').style.width = '100%'; if (!st.user) { $('vidState').textContent = 'Inicia sesión para cobrar tu agua'; abrirModal(); return; } const { data } = await sb.rpc('arena_video'); $('vidState').textContent = data; toast(data); cargar(); }
    } } });
    if (window.YT?.Player) crear(); else { window.onYouTubeIframeAPIReady = crear; const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); }
  }

  // ---------- cuenta ----------
  let modo = 'ent';
  function abrirModal() { $('mod').classList.add('on'); $('au').focus(); }
  const setModo = (m) => { modo = m; $('tEnt').classList.toggle('off', m !== 'ent'); $('tReg').classList.toggle('off', m !== 'reg'); $('authB').textContent = m === 'ent' ? 'Entrar' : 'Crear cuenta'; $('ap').autocomplete = m === 'ent' ? 'current-password' : 'new-password'; };
  $('tEnt').onclick = () => setModo('ent'); $('tReg').onclick = () => setModo('reg'); $('lc').onclick = () => $('mod').classList.remove('on');
  $('loginBtn').onclick = async () => { if (st.user) { await sb.auth.signOut(); toast('Sesión cerrada'); } else abrirModal(); };
  const MSG = { usuario: 'El nombre debe tener de 3 a 16 caracteres: letras, números o _', clave: 'La contraseña debe tener al menos 6 caracteres', existe: 'Ese nombre ya existe', limite: 'Demasiadas cuentas nuevas desde esta red hoy', datos: 'Nombre o contraseña incorrectos', error: 'No se pudo conectar' };
  $('authF').onsubmit = async (e) => {
    e.preventDefault(); const u = $('au').value.trim().toLowerCase(), c = $('ap').value; $('authMsg').textContent = '';
    if (!/^[a-z0-9_]{3,16}$/.test(u)) { $('authMsg').textContent = MSG.usuario; return; }
    if (modo === 'reg') {
      if (c.length < 6) { $('authMsg').textContent = MSG.clave; return; }
      try { const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/registro`, { method: 'POST', headers: { apikey: CONFIG.supabaseKey, Authorization: `Bearer ${CONFIG.supabaseKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: u, clave: c }) });
        if (!r.ok) { const j = await r.json().catch(() => ({})); $('authMsg').textContent = MSG[j.error] || MSG.error; return; } } catch { $('authMsg').textContent = MSG.error; return; }
    }
    const { error } = await sb.auth.signInWithPassword({ email: `${u}@jugador.invalid`, password: c });
    if (error) { $('authMsg').textContent = error.status === 400 ? MSG.datos : MSG.error; return; }
    $('mod').classList.remove('on'); $('ap').value = ''; toast('¡Dentro!'); location.hash = 'entrar';
  };
  sb.auth.onAuthStateChange((_ev, s) => { st.user = s?.user || null; $('loginBtn').textContent = st.user ? 'Salir' : 'Entrar'; $('vidState').textContent = st.user ? 'Mira el video completo para cobrar tu agua' : 'Inicia sesión para cobrar tu agua'; if (!st.user) st.yo = null; cargar(); });

  $('links').innerHTML = LINKS.map((l) => `<a class="${l.c}" href="${l.u}" target="_blank" rel="noopener">${l.i}<span>${l.n}<small>${l.h}</small></span></a>`).join('');
  $('fans').innerHTML = Array.from({ length: 90 }, (_, i) => { const a = Math.PI + (i % 30 + 0.5) / 30 * Math.PI, r = 3 - Math.floor(i / 30), cx = 600 + Math.cos(a) * (560 - r * 40), cy = 700 + Math.sin(a) * (360 - r * 30); return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="9" fill="${['#ff6a2a', '#ffd060', '#7cf0ff', '#ff8ae0', '#96e66e'][i % 5]}" opacity=".85"/>`; }).join('');
  render(); buscar(''); cargar(); setInterval(() => { if (!document.hidden) cargar(); }, 20000);
})();
