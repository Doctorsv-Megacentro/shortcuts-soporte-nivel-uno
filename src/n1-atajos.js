(() => {
  /* Atajos N1 — panel de mensajes para WhatsApp Web (DoctorSV).
     Se ejecuta como marklet: un clic abre el panel, otro clic lo cierra. */
  const FID = 'n1kit-frame';
  const prev = document.getElementById(FID);
  if (prev) { window.__n1kitId = null; prev.remove(); return; }

  /* Algunas páginas (SDP usa Prototype.js) cambian cómo se guardan las listas en JSON:
     guardaban ["a","b"] como texto y al leerlas ya no eran listas → panel en blanco.
     jsonStr guarda sin esos cambios y reparar() arregla lo que ya se guardó mal. */
  const jsonStr = (o, r, sp) => {
    const protos = [Array.prototype, String.prototype, Number.prototype, Boolean.prototype], quitados = [];
    protos.forEach(pr => { if (Object.prototype.hasOwnProperty.call(pr, 'toJSON')) { quitados.push([pr, pr.toJSON]); try { delete pr.toJSON; } catch (e) {} } });
    try { return JSON.stringify(o, r, sp); }
    finally { quitados.forEach(([pr, f]) => { pr.toJSON = f; }); }
  };
  const reparar = x => {
    if (typeof x === 'string' && /^\s*[\[{]/.test(x)) { try { const y = JSON.parse(x); if (y && typeof y === 'object') return reparar(y); } catch (e) {} return x; }
    if (Array.isArray(x)) return x.map(reparar);
    if (x && typeof x === 'object') { for (const k in x) if (Object.prototype.hasOwnProperty.call(x, k)) x[k] = reparar(x[k]); return x; }
    return x;
  };
  const KEY = 'n1kit';
  let st = {};
  try { st = reparar(JSON.parse(localStorage.getItem(KEY))) || {}; } catch (e) {}
  if (!st || typeof st !== 'object' || Array.isArray(st)) st = {};
  const save = () => { try { localStorage.setItem(KEY, jsonStr(st)); } catch (e) {} };

  /* ---------- grabador de red y consola (para analizar NERDS u otra página) ----------
     Registra fetch, XHR, WebSocket, consola y errores de la página donde se abre el panel.
     La grabación se guarda en el navegador: si la página se recarga (p. ej. al iniciar sesión),
     se vuelve a tocar el marcador y sigue grabando. Al detener, genera un .md para analizar. */
  const RK = 'n1kit-red';
  const SENS = /pass|pwd|contrase|clave|token|secret|otp|authorization|cookie|session|api[-_]?key|jwt|bearer|credential|\bpin\b/i;
  const rT = s => (s || '').replace(/\s+/g, ' ').trim();
  const corta = (s, n) => { if (s == null) return ''; s = String(s); return s.length > n ? s.slice(0, n) + ' …(' + s.length + ' caracteres en total)' : s; };
  const enmascarar = s => {
    if (s == null) return s;
    s = String(s);
    try {
      const j = JSON.parse(s);
      if (j && typeof j === 'object') {
        const walk = o => { for (const k in o) { if (o[k] && typeof o[k] === 'object') walk(o[k]); else if (SENS.test(k)) o[k] = '***'; } };
        walk(j); s = jsonStr(j);
      }
    } catch (e) {
      if (/^[^=&\s]+=[^&]*(&[^=&\s]+=[^&]*)*$/.test(s)) s = s.split('&').map(p => { const k = p.split('=')[0]; let dk = k; try { dk = decodeURIComponent(k); } catch (_) {} return SENS.test(dk) ? k + '=***' : p; }).join('&');
    }
    return s.replace(/eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{6,}/g, 'eyJ***(token oculto)').replace(/(bearer\s+)[\w.~+/-]+=*/gi, '$1***');
  };
  const urlM = u => { try { const x = new URL(u, location.href); [...x.searchParams.keys()].forEach(k => { if (SENS.test(k)) x.searchParams.set(k, '***'); }); return x.href; } catch (e) { return String(u); } };
  const hdrs = h => {
    const o = {};
    try {
      const it = h && typeof h.forEach === 'function' && !Array.isArray(h) ? (() => { const a = []; h.forEach((v, k) => a.push([k, v])); return a; })() : Array.isArray(h) ? h : Object.entries(h || {});
      it.forEach(([k, v]) => { o[k] = SENS.test(k) ? '***' : corta(v, 200); });
    } catch (e) {}
    return o;
  };
  const cuerpo = b => {
    if (b == null || b === '') return '';
    if (typeof b === 'string') return corta(enmascarar(b), 3000);
    if (typeof URLSearchParams !== 'undefined' && b instanceof URLSearchParams) return corta(enmascarar(b.toString()), 3000);
    if (typeof FormData !== 'undefined' && b instanceof FormData) { const a = []; b.forEach((v, k) => a.push(k + '=' + (SENS.test(k) ? '***' : typeof v === 'string' ? corta(v, 200) : '(archivo)'))); return a.join('&'); }
    return '(' + ((b.constructor && b.constructor.name) || 'datos') + ')';
  };
  const recLeer = () => {
    try {
      const r = JSON.parse(localStorage.getItem(RK));
      if (!r || typeof r !== 'object') return null;
      if (typeof r.ev === 'string') { try { r.ev = JSON.parse(r.ev); } catch (e) { r.ev = []; } }
      if (!Array.isArray(r.ev)) r.ev = [];
      return r;
    } catch (e) { return null; }
  };
  let REC = recLeer(), recT = 0;
  const recGuardarYa = () => {
    if (!REC) return;
    try { localStorage.setItem(RK, jsonStr(REC)); }
    catch (e) {
      /* sin espacio: recorta respuestas antiguas y vuelve a intentar */
      REC.ev.forEach((x, i) => { if (i < REC.ev.length - 200) { if (x.resBody) x.resBody = corta(x.resBody, 300); if (x.reqBody) x.reqBody = corta(x.reqBody, 300); } });
      REC.recortado = true;
      try { localStorage.setItem(RK, jsonStr(REC)); } catch (_) {}
    }
  };
  const recGuardar = () => { clearTimeout(recT); recT = setTimeout(recGuardarYa, 700); };
  const rutaActual = () => location.pathname + location.search.slice(0, 80) + location.hash;
  const recAdd = e => {
    if (!REC || !REC.activo) return;
    if (!e.t0) e.t0 = Date.now();
    if (/^(fetch|xhr|recurso|ws)$/.test(e.tipo) && REC.filtro && !String(e.url || '').toLowerCase().includes(REC.filtro.toLowerCase())) return;
    if (!e.ruta) e.ruta = rutaActual();
    if (REC.ev.length >= 4000) { REC.lleno = true; return; }
    REC.ev.push(e); recGuardar();
  };
  const instalarRed = () => {
    if (window.__n1net) return;
    window.__n1net = true;
    const W = window;
    if (W.fetch) {
      const of = W.fetch;
      W.fetch = function (input, init) {
        const t0 = Date.now(), p0 = performance.now(), req = (typeof Request !== 'undefined' && input instanceof Request) ? input : null;
        const e = { tipo: 'fetch', t0, method: String((init && init.method) || (req && req.method) || 'GET').toUpperCase(), url: urlM(req ? req.url : String(input)), ruta: rutaActual(), reqHeaders: hdrs((init && init.headers) || (req && req.headers)), reqBody: cuerpo(init && init.body) };
        return of.apply(this, arguments).then(res => {
          try {
            e.status = res.status; e.ms = Math.round(performance.now() - p0); e.type = res.headers.get('content-type') || ''; e.resHeaders = hdrs(res.headers);
            const len = +res.headers.get('content-length') || 0;
            if (/json|text|xml|javascript|html/i.test(e.type) && len < 400000 && !/event-stream/i.test(e.type)) {
              Promise.race([res.clone().text(), new Promise(r => setTimeout(() => r('(no se leyó: tardó demasiado)'), 4000))])
                .then(tx => { e.resBody = corta(enmascarar(tx), 4000); recAdd(e); }, () => recAdd(e));
            } else { e.resBody = e.type ? '(' + e.type + ')' : ''; recAdd(e); }
          } catch (_) { recAdd(e); }
          return res;
        }, err => { e.error = String((err && err.message) || err); e.ms = Math.round(performance.now() - p0); recAdd(e); throw err; });
      };
    }
    const XO = W.XMLHttpRequest && W.XMLHttpRequest.prototype;
    if (XO) {
      const oOpen = XO.open, oSend = XO.send, oSet = XO.setRequestHeader;
      XO.open = function (m, u) { this.__n1 = { tipo: 'xhr', method: String(m).toUpperCase(), url: urlM(String(u)), reqHeaders: {} }; return oOpen.apply(this, arguments); };
      XO.setRequestHeader = function (k, v) { if (this.__n1) this.__n1.reqHeaders[k] = SENS.test(k) ? '***' : corta(v, 200); return oSet.apply(this, arguments); };
      XO.send = function (b) {
        const e = this.__n1;
        if (e) {
          e.t0 = Date.now(); e.ruta = rutaActual(); const p0 = performance.now(); e.reqBody = cuerpo(b);
          this.addEventListener('loadend', () => {
            e.status = this.status; e.ms = Math.round(performance.now() - p0);
            try { e.type = this.getResponseHeader('content-type') || ''; } catch (_) {}
            try { const rh = {}; (this.getAllResponseHeaders() || '').trim().split(/[\r\n]+/).forEach(l => { const i = l.indexOf(':'); if (i > 0) rh[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); e.resHeaders = hdrs(rh); } catch (_) {}
            try {
              if (this.responseType === '' || this.responseType === 'text') e.resBody = corta(enmascarar(this.responseText), 4000);
              else if (this.responseType === 'json') e.resBody = corta(enmascarar(jsonStr(this.response)), 4000);
              else e.resBody = '(' + this.responseType + ')';
            } catch (_) {}
            if (!this.status) e.error = 'sin respuesta (red, CORS, tiempo agotado o cancelada)';
            recAdd(e);
          });
        }
        return oSend.apply(this, arguments);
      };
    }
    if (W.WebSocket) {
      const OWS = W.WebSocket;
      const NW = function (url, prot) {
        const ws = prot !== undefined ? new OWS(url, prot) : new OWS(url);
        const u = urlM(String(url)); let n = 0;
        const msg = (dir, d) => { if (n++ > 400) return; recAdd({ tipo: 'ws', dir, url: u, data: corta(enmascarar(typeof d === 'string' ? d : '(binario ' + (d && (d.byteLength || d.size) || '') + ' bytes)'), 800) }); };
        recAdd({ tipo: 'ws', dir: 'abre', url: u });
        ws.addEventListener('message', ev => msg('recibe', ev.data));
        ws.addEventListener('close', ev => recAdd({ tipo: 'ws', dir: 'cierra', url: u, data: 'código ' + ev.code + (ev.reason ? ' · ' + ev.reason : '') }));
        ws.addEventListener('error', () => recAdd({ tipo: 'ws', dir: 'error', url: u }));
        const os = ws.send; ws.send = function (d) { msg('envía', d); return os.apply(this, arguments); };
        return ws;
      };
      NW.prototype = OWS.prototype;
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => { NW[k] = OWS[k]; });
      W.WebSocket = NW;
    }
    ['log', 'info', 'warn', 'error', 'debug'].forEach(l => {
      const o = console[l];
      if (typeof o !== 'function') return;
      console[l] = function (...a) {
        try {
          recAdd({ tipo: 'console', nivel: l, msg: corta(enmascarar(a.map(x => {
            if (typeof x === 'string') return x;
            if (x instanceof Error) return x.stack || x.message;
            try { return jsonStr(x); } catch (e) { return String(x); }
          }).join(' ')), 1500) });
        } catch (e) {}
        return o.apply(this, a);
      };
    });
    W.addEventListener('error', ev => {
      const tg = ev.target, src = tg && tg !== W && (tg.src || tg.href);
      recAdd({ tipo: 'error', msg: corta(src ? 'No cargó: ' + urlM(src) : (ev.message || 'error') + (ev.filename ? ' @ ' + ev.filename + ':' + ev.lineno : ''), 1500) });
    }, true);
    W.addEventListener('unhandledrejection', ev => {
      const r = ev.reason;
      recAdd({ tipo: 'error', msg: 'Promesa rechazada: ' + corta(r && (r.stack || r.message) || String(r), 1500) });
    });
    let ultima = location.href;
    const navego = () => { setTimeout(() => { if (location.href !== ultima) { ultima = location.href; recAdd({ tipo: 'pagina', accion: 'navega', url: urlM(location.href), titulo: document.title }); } }, 0); };
    ['pushState', 'replaceState'].forEach(m => { const o = history[m]; if (typeof o !== 'function') return; history[m] = function () { const r = o.apply(this, arguments); navego(); return r; }; });
    W.addEventListener('popstate', navego); W.addEventListener('hashchange', navego);
    W.addEventListener('pagehide', () => {
      if (REC && REC.activo) { REC.ev.push({ tipo: 'pagina', accion: 'sale', url: urlM(location.href), t0: Date.now() }); clearTimeout(recT); recGuardarYa(); }
    });
  };
  /* Al activar en una página: instala los ganchos y recupera lo que cargó antes (Resource Timing) */
  const recAdjuntar = () => {
    if (!REC || !REC.activo) return;
    const nueva = !window.__n1net;
    instalarRed();
    if (!nueva) return;
    recAdd({ tipo: 'pagina', accion: 'activa', url: urlM(location.href), titulo: document.title });
    try {
      const base = performance.timeOrigin || (Date.now() - performance.now());
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav && base + nav.startTime >= REC.inicio - 1000) recAdd({ tipo: 'recurso', previo: true, method: 'GET', recurso: 'documento', url: urlM(nav.name), status: nav.responseStatus || '', ms: Math.round(nav.duration), t0: Math.round(base + nav.startTime) });
      performance.getEntriesByType('resource').forEach(r => {
        const t0 = Math.round(base + r.startTime);
        if (t0 < REC.inicio - 1000) return;
        const api = /xmlhttprequest|fetch|beacon|other/.test(r.initiatorType), malo = r.responseStatus >= 400;
        if (!api && !malo) return;
        recAdd({ tipo: 'recurso', previo: true, recurso: r.initiatorType, url: urlM(r.name), status: r.responseStatus || '', ms: Math.round(r.duration), t0 });
      });
    } catch (e) {}
  };
  const recIniciar = filtro => {
    REC = { activo: true, inicio: Date.now(), host: location.host, ua: navigator.userAgent, filtro: rT(filtro), ev: [] };
    recGuardarYa();
    if (window.__n1net) recAdd({ tipo: 'pagina', accion: 'activa', url: urlM(location.href), titulo: document.title });
    else recAdjuntar();
  };
  const recMarcar = txt => recAdd({ tipo: 'nota', msg: rT(txt) || 'Marca' });
  const recDetener = () => { if (!REC) return; REC.activo = false; REC.fin = Date.now(); clearTimeout(recT); recGuardarYa(); };
  const recBorrar = () => { REC = null; try { localStorage.removeItem(RK); } catch (e) {} };

  /* Borra cookies y datos guardados de la página (lo que se puede desde la página) */
  const borrarDatosSitio = async () => {
    const r = [];
    let nombres = [];
    try { nombres = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(Boolean); } catch (e) {}
    const host = location.hostname, partes = host.split('.'), doms = [''];
    for (let i = 0; i < partes.length - 1; i++) doms.push(partes.slice(i).join('.'), '.' + partes.slice(i).join('.'));
    const rutas = [...new Set(['/', location.pathname, location.pathname.replace(/\/[^/]*$/, '') || '/'])];
    nombres.forEach(n => doms.forEach(dm => rutas.forEach(pa => { document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + pa + (dm ? '; domain=' + dm : ''); })));
    let quedan = 0; try { quedan = document.cookie.split(';').filter(c => c.trim()).length; } catch (e) {}
    r.push('Cookies: ' + nombres.length + ' borradas' + (quedan ? ' (quedan ' + quedan + ')' : ''));
    try { let n = 0; Object.keys(localStorage).forEach(k => { if (k !== KEY && k !== RK) { localStorage.removeItem(k); n++; } }); r.push('Almacenamiento local: ' + n + ' datos'); } catch (e) {}
    try { const n = sessionStorage.length; sessionStorage.clear(); r.push('Almacenamiento de sesión: ' + n + ' datos'); } catch (e) {}
    try { if (indexedDB.databases) { const dbs = await indexedDB.databases(); dbs.forEach(db => { if (db.name) indexedDB.deleteDatabase(db.name); }); r.push('Bases IndexedDB: ' + dbs.length); } } catch (e) {}
    try { if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); r.push('Caché: ' + ks.length); } } catch (e) {}
    recAdd({ tipo: 'nota', msg: 'Se borraron cookies y datos del sitio desde Atajos N1' });
    return r;
  };

  /* ---------- reporte .md ---------- */
  const mmss = ms => { ms = Math.max(0, ms || 0); const m = Math.floor(ms / 60000), s = (ms % 60000) / 1000; return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0'); };
  const celda = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
  const cerco = (s, lang) => { s = String(s || ''); const f = s.includes('```') ? '~~~~' : '```'; return f + (lang || '') + '\n' + s + '\n' + f; };
  const bonito = s => { try { return jsonStr(JSON.parse(s), null, 2); } catch (e) { return s; } };
  const rutaCorta = u => { try { const x = new URL(u); return x.host === location.host ? x.pathname + x.search : x.host + x.pathname + x.search; } catch (e) { return u; } };
  const esReq = e => e.tipo === 'fetch' || e.tipo === 'xhr' || e.tipo === 'recurso' || e.tipo === 'har';
  const fallo = e => esReq(e) && (e.error || (e.status !== '' && e.status != null && (+e.status >= 400 || +e.status === 0)));
  const generarMD = (R, extra) => {
    const ev = R.ev.slice().sort((a, b) => a.t0 - b.t0), ini = R.inicio || (ev[0] && ev[0].t0) || Date.now(), fin = R.fin || (ev.length ? ev[ev.length - 1].t0 : ini);
    const reqs = ev.filter(esReq), malos = reqs.filter(fallo), cons = ev.filter(e => e.tipo === 'console'), errs = ev.filter(e => e.tipo === 'error'), ws = ev.filter(e => e.tipo === 'ws');
    const consErr = cons.filter(e => e.nivel === 'error' || e.nivel === 'warn');
    const L = [];
    const rel = t => mmss(t - ini);
    L.push('# Grabación de red y consola — ' + (R.host || ''), '');
    L.push('- **Origen:** ' + (R.origen || 'Atajos N1 (grabación en la página)'));
    L.push('- **Inicio:** ' + new Date(ini).toLocaleString() + ' · **Fin:** ' + new Date(fin).toLocaleString() + ' · **Duración:** ' + mmss(fin - ini));
    if (R.ua) L.push('- **Navegador:** ' + R.ua);
    L.push('- **Solicitudes:** ' + reqs.length + ' (' + malos.length + ' con error) · **Errores de página:** ' + errs.length + ' · **Consola:** ' + cons.length + ' mensajes (' + consErr.length + ' errores/avisos) · **WebSocket:** ' + ws.length + ' eventos');
    if (R.filtro) L.push('- **Solo URLs que contienen:** `' + R.filtro + '`');
    if (R.recortado) L.push('- ⚠️ Se recortaron respuestas antiguas porque la grabación era muy grande.');
    if (R.lleno) L.push('- ⚠️ Se alcanzó el máximo de 4000 eventos; lo posterior no se guardó.');
    L.push('', '> Contraseñas, tokens, cookies y el encabezado Authorization aparecen como `***`. Revisa el archivo antes de compartirlo.', '');

    /* Análisis automático */
    const endp = u => { try { const x = new URL(u); const p = x.pathname.split('/').map(sg => /^\d+$/.test(sg) || /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(sg) || /^[0-9a-f]{16,}$/i.test(sg) || /^[\w-]{28,}$/.test(sg) ? '{id}' : sg).join('/'); return (x.host === R.host ? '' : x.host) + p; } catch (e) { return String(u); } };
    const explica = e => {
      const s = +e.status;
      if (e.error || !s) return 'no llegó respuesta: sin conexión, bloqueo por CORS, tiempo agotado o se canceló.';
      if (s === 401) return 'la sesión o el token no son válidos (¿expiró o se cerró la sesión?).';
      if (s === 403) return 'el usuario no tiene permiso para esa acción.';
      if (s === 404) return 'la dirección no existe o cambió.';
      if (s === 400 || s === 422) return 'el servidor rechazó los datos enviados; revisa el payload.';
      if (s === 408 || s === 504) return 'el servidor tardó demasiado en responder.';
      if (s === 429) return 'demasiadas solicitudes seguidas.';
      if (s >= 500) return 'error del lado del servidor.';
      return '';
    };
    const hall = [];
    const grupos = {};
    malos.forEach(e => { const k = (e.method || e.recurso || '') + ' ' + endp(e.url); (grupos[k] = grupos[k] || []).push(e); });
    Object.entries(grupos).sort((a, b) => b[1].length - a[1].length).forEach(([k, arr]) => {
      const sts = [...new Set(arr.map(e => e.error ? 'sin respuesta' : e.status))].join(', ');
      hall.push('**' + k + '** falló ' + arr.length + (arr.length === 1 ? ' vez' : ' veces') + ' (' + sts + '): ' + explica(arr[0]) + ' Ver #' + arr.slice(0, 6).map(e => reqs.indexOf(e) + 1).join(', #') + '.');
    });
    const lentas = reqs.filter(e => e.ms > 3000).sort((a, b) => b.ms - a.ms).slice(0, 5);
    if (lentas.length) hall.push('**Lentas (más de 3 s):** ' + lentas.map(e => '#' + (reqs.indexOf(e) + 1) + ' ' + (e.method || '') + ' ' + endp(e.url) + ' (' + (e.ms / 1000).toFixed(1) + ' s)').join('; ') + '.');
    const ce = {};
    ev.filter(e => e.tipo === 'error' || (e.tipo === 'console' && e.nivel === 'error')).forEach(e => { const k = corta(e.msg, 140); ce[k] = (ce[k] || 0) + 1; });
    Object.entries(ce).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([k, n]) => hall.push('**Error en consola' + (n > 1 ? ' (' + n + ' veces)' : '') + ':** ' + k));
    ws.filter(e => e.dir === 'cierra' && !/código (1000|1005)\b/.test(e.data || '')).forEach(e => hall.push('**WebSocket cerrado de forma anormal** en ' + rel(e.t0) + ' (' + rutaCorta(e.url) + ', ' + e.data + ')' + (/1006/.test(e.data) ? ': se perdió la conexión.' : '.')));
    L.push('## Análisis automático', '');
    if (hall.length) hall.forEach(x => L.push('- ' + x)); else L.push('- No se encontraron solicitudes con error, errores de consola ni cierres anormales.');
    L.push('');

    /* Endpoints por pantalla */
    const porRuta = new Map();
    reqs.forEach(e => { const r = e.ruta || '(sin dato)'; if (!porRuta.has(r)) porRuta.set(r, new Map()); const m = porRuta.get(r), k = (e.method || e.recurso || '') + ' ' + endp(e.url); if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
    if (porRuta.size) {
      L.push('## Endpoints por pantalla', '', '_Agrupados por la pantalla (ruta) en la que estabas. Los números largos de la URL se muestran como `{id}`._', '');
      porRuta.forEach((m, r) => {
        L.push('### ' + r, '', '| Método y endpoint | Veces | Estados | ms promedio |', '|---|---|---|---|');
        m.forEach((arr, k) => L.push('| ' + celda(corta(k, 150)) + ' | ' + arr.length + ' | ' + celda([...new Set(arr.map(e => e.error ? 'falló' : e.status))].join(', ')) + ' | ' + Math.round(arr.reduce((a, e) => a + (e.ms || 0), 0) / arr.length) + ' |'));
        L.push('');
      });
    }

    L.push('## Línea de tiempo', '', '| Tiempo | Evento |', '|---|---|');
    L.push('| 00:00.0 | ▶️ Inicio de la grabación |');
    ev.forEach(e => {
      let x = '';
      if (e.tipo === 'pagina') x = (e.accion === 'sale' ? '↪️ Sale de: ' : e.accion === 'navega' ? '➡️ Navega a: ' : '📄 Página: ') + rutaCorta(e.url) + (e.titulo ? ' — ' + e.titulo : '');
      else if (e.tipo === 'nota') x = '📌 **' + e.msg + '**';
      else if (e.tipo === 'error') x = '❌ Error de página: ' + corta(e.msg, 160);
      else if (e.tipo === 'console' && e.nivel === 'error') x = '🟥 Consola: ' + corta(e.msg, 160);
      else if (fallo(e)) x = '⚠️ ' + (e.method || e.recurso || '') + ' ' + rutaCorta(e.url) + ' → ' + (e.error || e.status);
      else if (e.tipo === 'ws' && /abre|cierra|error/.test(e.dir)) x = '🔌 WebSocket ' + e.dir + ': ' + rutaCorta(e.url) + (e.data ? ' (' + e.data + ')' : '');
      if (x) L.push('| ' + rel(e.t0) + ' | ' + celda(x) + ' |');
    });
    L.push('| ' + mmss(fin - ini) + ' | ⏹️ Fin de la grabación |', '');

    if (malos.length) {
      L.push('## Solicitudes con error', '', '| # | Tiempo | Método | Estado | ms | URL |', '|---|---|---|---|---|---|');
      malos.forEach(e => L.push('| ' + (reqs.indexOf(e) + 1) + ' | ' + rel(e.t0) + ' | ' + (e.method || e.recurso || '') + ' | ' + celda(e.error || e.status) + ' | ' + (e.ms != null ? e.ms : '') + ' | ' + celda(corta(e.url, 160)) + ' |'));
      L.push('');
    }
    L.push('## Todas las solicitudes', '', '| # | Tiempo | Método | Estado | ms | URL |', '|---|---|---|---|---|---|');
    reqs.forEach((e, i) => L.push('| ' + (i + 1) + ' | ' + rel(e.t0) + ' | ' + (e.previo ? '(carga) ' : '') + (e.method || e.recurso || '') + ' | ' + celda(e.error ? 'falló' : e.status) + ' | ' + (e.ms != null ? e.ms : '') + ' | ' + celda(corta(e.url, 160)) + ' |'));
    if (reqs.some(e => e.previo)) L.push('', '_(carga) = solicitudes de cuando la página cargó, antes de volver a tocar el marcador: solo hay URL, estado y tiempo._');
    L.push('');

    const det = reqs.filter(e => e.tipo !== 'recurso' && (e.reqBody || e.resBody || e.error || Object.keys(e.reqHeaders || {}).length));
    if (det.length) {
      L.push('## Detalle de solicitudes', '');
      const orden = det.filter(fallo).concat(det.filter(e => !fallo(e))).slice(0, 400);
      if (det.length > 400) L.push('_Se muestran 400 de ' + det.length + ' (primero las que fallaron)._', '');
      orden.forEach(e => {
        L.push('### #' + (reqs.indexOf(e) + 1) + ' · ' + (e.method || '') + ' ' + corta(rutaCorta(e.url), 120) + ' — ' + (e.error ? 'falló' : e.status) + ' · ' + (e.ms != null ? e.ms + ' ms' : '') + ' · ' + rel(e.t0));
        L.push('', '- **URL:** `' + e.url + '`');
        if (e.ruta) L.push('- **Pantalla:** ' + e.ruta);
        if (e.error) L.push('- **Error:** ' + e.error);
        try { const qp = [...new URL(e.url).searchParams]; if (qp.length) L.push('- **Parámetros (query):** ' + qp.map(([k, v]) => '`' + k + '=' + corta(v, 80) + '`').join(', ')); } catch (_) {}
        if (e.type) L.push('- **Tipo de respuesta:** ' + e.type);
        const hs = Object.entries(e.reqHeaders || {});
        if (hs.length) L.push('- **Encabezados enviados:** ' + hs.map(([k, v]) => '`' + k + ': ' + v + '`').join(', '));
        if (e.resHeaders && Object.keys(e.resHeaders).length) L.push('- **Encabezados recibidos:** ' + Object.entries(e.resHeaders).map(([k, v]) => '`' + k + ': ' + v + '`').join(', '));
        if (e.tipo !== 'har' && !hs.length) L.push('- **Encabezados enviados:** solo los que pone el navegador (cookies, user-agent…); esos se ven completos en el HAR.');
        if (e.reqBody) L.push('', '**Enviado (payload):**', '', cerco(bonito(e.reqBody), /^[[{]/.test(e.reqBody) ? 'json' : ''));
        if (e.resBody) L.push('', '**Respuesta:**', '', cerco(bonito(e.resBody), /^[[{]/.test(e.resBody) ? 'json' : ''));
        L.push('');
      });
    }
    if (ws.length) {
      L.push('## WebSocket', '', '| Tiempo | Dirección | Conexión | Datos |', '|---|---|---|---|');
      ws.slice(0, 1500).forEach(e => L.push('| ' + rel(e.t0) + ' | ' + e.dir + ' | ' + celda(corta(rutaCorta(e.url), 80)) + ' | ' + celda(corta(e.data, 300)) + ' |'));
      L.push('');
    }
    if (cons.length || errs.length) {
      L.push('## Consola y errores de la página', '');
      L.push(cerco(ev.filter(e => e.tipo === 'console' || e.tipo === 'error').map(e => '[' + rel(e.t0) + '] ' + (e.tipo === 'error' ? 'ERROR DE PÁGINA' : e.nivel.toUpperCase()) + ' ' + e.msg).join('\n')), '');
    }
    if (extra) L.push(extra, '');
    L.push('## Notas del análisis', '', '_Qué se estaba haciendo, qué se esperaba y qué pasó:_', '');
    return L.join('\n');
  };
  /* HAR exportado desde DevTools → mismo formato de eventos */
  const harAEventos = (har, soloApi) => {
    const log = har && har.log; if (!log || !log.entries) throw new Error('El archivo no parece un HAR de DevTools');
    const ev = [];
    const pag = {};
    (log.pages || []).forEach(p => { pag[p.id] = p.title || p.id; ev.push({ tipo: 'pagina', accion: 'activa', url: p.title || p.id, t0: Date.parse(p.startedDateTime) }); });
    const rutaDe = id => { const t = pag[id]; if (!t) return ''; try { const x = new URL(t); return x.pathname + x.hash; } catch (e) { return t; } };
    log.entries.forEach(x => {
      const rt = x._resourceType || '', st = x.response ? x.response.status : 0;
      const api = /xhr|fetch|document|websocket|eventsource|preflight|other/i.test(rt) || !rt;
      if (soloApi && !api && !(st >= 400 || st === 0)) return;
      const t0 = Date.parse(x.startedDateTime), rq = x.request || {}, rs = x.response || {}, ct = (rs.content && rs.content.mimeType) || '';
      if (/websocket/i.test(rt) && x._webSocketMessages) {
        ev.push({ tipo: 'ws', dir: 'abre', url: urlM(rq.url), t0 });
        x._webSocketMessages.slice(0, 400).forEach(m => ev.push({ tipo: 'ws', dir: m.type === 'send' ? 'envía' : 'recibe', url: urlM(rq.url), data: corta(enmascarar(m.data), 800), t0: Math.round(m.time * 1000) }));
        return;
      }
      const hh = {}; (rq.headers || []).forEach(h => { if (!/^:/.test(h.name)) hh[h.name] = SENS.test(h.name) ? '***' : corta(h.value, 200); });
      const rh = {}; (rs.headers || []).forEach(h => { if (!/^:/.test(h.name)) rh[h.name] = SENS.test(h.name) ? '***' : corta(h.value, 200); });
      let body = rs.content && rs.content.text;
      if (body && rs.content.encoding === 'base64') body = '(contenido en base64, ' + body.length + ' caracteres)';
      else if (body && !/json|text|xml|javascript|html/i.test(ct)) body = '(' + ct + ')';
      ev.push({ tipo: 'har', method: rq.method, url: urlM(rq.url), ruta: rutaDe(x.pageref), status: st, ms: Math.round(x.time || 0), t0, type: ct, recurso: rt,
        reqHeaders: hh, resHeaders: rh, reqBody: rq.postData ? corta(enmascarar(rq.postData.text || ''), 3000) : '', resBody: body ? corta(enmascarar(body), 4000) : '',
        error: st === 0 ? ((x._error || x.response && x.response._error) || 'sin respuesta') : '' });
    });
    return ev;
  };
  const descargar = (nombre, texto, tipo) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo || 'text/markdown;charset=utf-8' }));
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const sello = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  recAdjuntar(); // si había una grabación activa (p. ej. tras iniciar sesión), sigue grabando en esta página

  /* ---------- utilidades de texto ---------- */
  const LOCS = ['Megacentro', 'TM1', 'TM2', 'TM3', 'HES', 'UGP Triage', 'Phoenix'];
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'; };
  const slotNow = () => { const d = new Date(), h = d.getHours(); return (h % 12 || 12) + ':' + (d.getMinutes() < 30 ? '00' : '30') + (h < 12 ? 'am' : 'pm'); };
  const fecha = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const today = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()); };
  /* baja la mayúscula inicial tras el saludo, salvo nombres propios (Karla Martínez, Luis:) */
  const lf = s => /^(Status\b|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]*\s+[a-záéíóúñ])/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
  const cap = s => s ? s.replace(/^([¿¡]?)(.)/, (m, a, b) => a + b.toUpperCase()) : s;
  const dot = s => { s = (s || '').trim(); return !s ? '' : /[.!?:]$/.test(s) ? s : s + '.'; };
  const sent = s => dot(cap((s || '').trim()));
  const and = a => { a = a.filter(Boolean); return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; };
  const parts = s => (s || '').split(/\s*(?:,|;|\n|\sy\s)\s*/).map(x => x.trim()).filter(Boolean);
  const lines = s => (s || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);
  const otp = n => { const x = n.replace(/\D/g, ''); return x.length === 8 ? '503' + x : (x || n); };
  const DOM = '@doctorsv.gob.sv';
  /* si escriben solo el usuario, se le pone el dominio de DoctorSV */
  const correo = s => { s = T(s).replace(/\s+/g, ''); return !s ? '' : s.includes('@') ? s : s.replace(/@+$/, '') + DOM; };
  const kv = (l, x) => x ? '*' + l + ':* ' + x : '';
  const NL = a => a.filter(Boolean).join('\n');
  const SP = a => a.filter(Boolean).join(' ');
  const T = s => (s || '').trim();

  const PROB = [
    ['Cable HDMI (falso / intermitencia)', 'el cable HDMI presenta falso o intermitencia'],
    ['Hub no reconoce Ethernet', 'el hub no reconoce la conexión Ethernet'],
    ['Sin señal Ethernet', 'el puesto no recibe señal Ethernet'],
    ['Hub sin video, carga ni conexión', 'el hub no presenta video, carga ni conexión'],
    ['Headset / micrófono', 'el micrófono del headset no funciona'],
    ['Monitor no enciende', 'el monitor no enciende'],
    ['Cargador no funciona', 'el cargador no funciona'],
    ['Wifi / red intermitente', 'la red presenta intermitencia'],
    ['Cámara de la laptop', 'la cámara de la laptop presenta fallas'],
    ['Enrolamiento biométrico (nuevo ingreso)', 'enrolamiento en biométricos de médico de nuevo ingreso'],
    ['Enrolado pero no lo reconoce', 'el médico ya fue enrolado pero el biométrico no lo reconoce'],
    ['Permisos de configuración del equipo', 'permisos de configuración del equipo del médico'],
    ['Otro', '']
  ];
  const ACC = ['el ingreso al módulo', 'la generación de productos (receta, estudios, referencia)', 'la generación de nota médica / apreciación diagnóstica', 'la finalización de la consulta', 'la confirmación del paciente', 'la carga de la agenda', 'otra acción'];
  /* ---------- botón de pausa: plantillas de respuesta por correo ---------- */
  const PLAN = [
    'Activar botón de pausa', 'Retirar botón de pausa', 'Retirar + perfil de reserva',
    'Pausa + agendamiento automático', 'Bloqueo de comida o descanso',
    'Faltan datos', 'No le aparece al médico', 'Incidencia escalada a Jira'];
  const P_MED = [0, 1, 2, 3, 4, 6];   /* plantillas que nombran al médico */
  const P_HOR = [0, 4];               /* llevan horario */
  const P_PERF = [0, 1];              /* llevan perfil */
  const TRATOS = ['Dr./Dra.', 'Dr.', 'Dra.', 'Lic.', 'Licda.', 'Sr.', 'Sra.', '(sin título)'];
  const CODIGO = /\b\d{3}[A-Z0-9]{3}\b/gi;
  /* lee el correo pegado y rellena lo que se pueda reconocer solo */
  const leerCorreo = (txt, poner) => {
    const t = String(txt || '');
    if (!T(t)) return;
    /* solicitante: la línea "De:" o la firma del correo */
    let nom = (t.match(/(?:^|\n)\s*(?:De|From|Remitente)\s*:\s*([^\n<(]+)/i) || [])[1] || '';
    /* "El jue, 22 oct 2026 a las 7:05, Maria Flores <maria@...> escribió:" */
    if (!nom) nom = (t.match(/\d{1,2}:\d{2}\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)?\s*,\s*([^\n<(]{4,60}?)\s*[<(]/i) || [])[1] || '';
    /* firma al final del correo */
    if (!nom) nom = (t.match(/(?:Saludos[^\n]*|Atentamente|Cordialmente|Quedo atent[oa][^\n]*|Gracias)[,.]?\s*\n+\s*([^\n<]{4,60})/i) || [])[1] || '';
    /* si solo pegaron el nombre, eso es el solicitante */
    if (!nom && !/\n/.test(T(t)) && T(t).length < 60 && !CODIGO.test(t)) nom = T(t);
    CODIGO.lastIndex = 0;
    nom = T(nom).replace(/["'`]/g, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (nom) {
      const pal = nom.replace(/\b(dr|dra|lic|licda|sr|sra|ing|inga)\.?(?=\s|$)/gi, '').split(/[\s.,]+/).filter(x => /[a-záéíóúñ]/i.test(x));
      /* nombre(s) + apellidos: con 4 o más palabras el primer apellido es la tercera */
      const ape = pal.length ? (pal.length >= 4 ? pal[2] : pal[pal.length - 1]) : '';
      if (ape) poner('ape', cap(ape.toLowerCase()));
      /* el trato puede venir en el "De:" o más abajo, en la firma */
      let tt = nom;
      if (!/\b(dr|dra|lic|licda|sr|sra)\b/i.test(NZ(nom)) && ape) {
        try { tt = (t.match(new RegExp('\\b(dra|dr|licda|lic|sra|sr)\\.?\\s+[^\\n]{0,40}?' + ape, 'i')) || [])[0] || ''; } catch (e) { tt = ''; }
      }
      const z = NZ(tt);
      const tr = /\blicda\b/.test(z) ? 'Licda.' : /\blic\b/.test(z) ? 'Lic.'
        : /\bdra\b/.test(z) ? 'Dra.' : /\bdr\b/.test(z) ? 'Dr.'
        : /\bsra\b/.test(z) ? 'Sra.' : /\bsr\b/.test(z) ? 'Sr.' : '';
      if (tr) poner('trato', tr);
    }
    /* acción pedida */
    const iRet = t.search(/retir|elimin|quitar|desactiv|remover|deshabilit/i), iAct = t.search(/activ|asign|generar|colocar|habilit/i);
    if (iRet >= 0 || iAct >= 0) {
      const esRet = iRet >= 0 && (iAct < 0 || iRet < iAct);
      poner('plan', PLAN[esRet ? 1 : 0]);
      poner('perfil', esRet ? 'médico de reserva' : 'médico consultante por servicios profesionales');
    }
    /* códigos de médico y, si viene al lado, su nombre */
    const cods = [...new Set((t.match(CODIGO) || []).map(x => x.toUpperCase()))];
    if (cods.length) {
      const NOMBRE = '((?:[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]*\\.?\\s+){1,4}[A-ZÁÉÍÓÚÑ][\\wáéíóúñ]+)';
      const limpia = x => T(x).replace(/\b(licda|dra|lic|sra|dr|sr)\b\.?\s*/gi, '').replace(/\s*\b(de|del|la|los|para|con|quien|que|y|el)\b\s*$/i, '').trim();
      poner('meds', cods.map(c => {
        let n = (t.match(new RegExp(c + '\\s*[-–—:,]?\\s*' + NOMBRE)) || [])[1]
          || (t.match(new RegExp(NOMBRE + '\\s*[-–—:,(]*\\s*' + c)) || [])[1] || '';
        return [c, limpia(n), ''];
      }));
    }
    /* horario */
    const hm = t.match(/(\d{1,2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|hrs?)?)\s*(?:a|-|–|—|hasta)\s*(\d{1,2}(?::\d{2})?\s*(?:a\.?\s*m\.?|p\.?\s*m\.?|hrs?)?)/i);
    if (hm && /[ap]\.?\s*m|:/i.test(hm[0])) poner('hor', T(hm[1]) + ' – ' + T(hm[2]));
    const tsj = (t.match(/TSJ-?\s*(\d+)/i) || [])[1];
    if (tsj) poner('jira', 'TSJ-' + tsj);
  };

  /* equipo de los puestos: [etiqueta, como se escribe, artículo, es plural] */
  const EQ = [
    ['Headsets', 'headsets', 'los', 1],
    ['Mouses', 'mouses', 'los', 1],
    ['Equipo', 'equipo', 'el', 0],
    ['Adaptador de headset', 'adaptador de headset', 'el', 0],
    ['HDMI', 'HDMI', 'el', 0],
    ['Hub', 'hub', 'el', 0],
    ['Bolsa para audífonos', 'bolsa para audífonos', 'la', 0],
    ['Cargador', 'cargador', 'el', 0]];
  const COP = { tipo1: v => v._i.tipo === 1 };

  /* Redacciones del status de slot: [estado][con supervisores, sin supervisores]. Cada status usa una distinta a la anterior. */
  const STV = [
    [[
      'Se realiza ronda de monitoreo y se consulta con médicos supervisores; no se reportan incidencias hasta el momento. Las citas continúan con normalidad.',
      'Pasamos ronda y consultamos con médicos supervisores: todo tranquilo, sin incidencias. Las citas siguen fluyendo con normalidad.',
      'Bloque sin incidencias. Hicimos ronda y los médicos supervisores nos confirman que todo va bien.',
      'Ronda de monitoreo hecha; los médicos supervisores no reportan inconvenientes y las citas se están dando con normalidad.',
      'Todo fluye correctamente: se pasa ronda, se consulta con médicos supervisores y no hay incidencias por el momento.',
      'Se valida con médicos supervisores que las citas se están dando bien y se les consulta si han tenido inconvenientes con copiloto; nos comentan que no. Sin incidencias por ahora.',
      'Seguimos sin novedades: ronda hecha y los médicos supervisores comentan que todo va con normalidad.'
    ], [
      'Se realiza ronda de monitoreo; no se reportan incidencias hasta el momento. Las citas continúan con normalidad.',
      'Pasamos ronda por los puestos: todo tranquilo y sin incidencias. Las citas siguen con normalidad.',
      'Bloque sin incidencias; ronda hecha y todo fluye correctamente.',
      'Ronda de monitoreo hecha, sin novedades. Las citas se están dando con normalidad.',
      'Todo en orden por ahora: se pasa ronda y no hay incidencias. Seguimos pendientes.',
      'Se valida en ronda que las citas se están dando bien; sin incidencias reportadas.'
    ]],
    [[
      'Se realiza ronda y se consulta con médicos supervisores; hubo incidencias menores que ya quedaron solventadas, sin afectar las citas. Todo sigue con normalidad.',
      'Pasamos ronda y apoyamos con un par de detalles menores que ya quedaron resueltos; los médicos supervisores confirman que las citas siguen bien.',
      'Se presentaron incidencias menores y se solventaron en el momento, sin afectar las citas. Seguimos en contacto con médicos supervisores.',
      'Bloque con detalles menores ya resueltos; los médicos supervisores comentan que las citas continúan con normalidad.'
    ], [
      'Se realiza ronda; hubo incidencias menores que ya quedaron solventadas, sin afectar las citas. Todo sigue con normalidad.',
      'Pasamos ronda y apoyamos con detalles menores que ya quedaron resueltos; las citas siguen bien.',
      'Se presentaron incidencias menores y se solventaron en el momento, sin afectar las citas.',
      'Bloque con detalles menores ya resueltos; las citas continúan con normalidad.'
    ]],
    [[
      'Se realiza ronda y se consulta con médicos supervisores; se reporta {d}. Seguimos dando seguimiento.',
      'En la ronda se identifica {d}. Ya se informó a médicos supervisores y estamos dando seguimiento.',
      'Se reporta {d}. Lo comentamos con médicos supervisores y seguimos pendientes del caso.',
      'Pasamos ronda y se presenta {d}; los médicos supervisores ya están enterados y le damos seguimiento.'
    ], [
      'Se realiza ronda; se reporta {d}. Seguimos dando seguimiento.',
      'En la ronda se identifica {d}. Estamos dando seguimiento.',
      'Se reporta {d}; seguimos pendientes del caso.',
      'Pasamos ronda y se presenta {d}; le damos seguimiento.'
    ]],
    [[
      'Se valida con médicos supervisores el cierre del slot: las citas finalizaron con normalidad, sin incidencias.',
      'Cerramos el slot sin incidencias; los médicos supervisores confirman que las citas terminaron bien.',
      'Finaliza el bloque con normalidad. Se consulta con médicos supervisores y no hubo inconvenientes.',
      'Ronda de cierre hecha: los médicos supervisores comentan que las citas del bloque terminaron sin novedades.'
    ], [
      'Cierre del slot: las citas finalizaron con normalidad, sin incidencias.',
      'Cerramos el slot sin novedades; las citas terminaron bien.',
      'Ronda de cierre hecha; las citas del bloque concluyeron sin incidencias.',
      'Finaliza el bloque con normalidad, sin incidencias reportadas.'
    ]]];
  /* Status de latencia (sin latencia): [con supervisores, sin supervisores] */
  const LATV = [[
    'Se realiza ronda de monitoreo y se consulta con médicos supervisores si han presentado latencia con la TCA y comentan que no; no se reportan incidencias hasta el momento. Las citas continúan con normalidad.',
    'Pasamos ronda y preguntamos a los médicos supervisores por latencia en la TCA; nos comentan que todo va bien, sin lentitud. Las citas siguen con normalidad.',
    'Se consulta con médicos supervisores si han tenido lentitud con la TCA y nos dicen que no; la plataforma responde bien y las citas fluyen con normalidad.',
    'Ronda de monitoreo hecha: los médicos supervisores nos confirman que la TCA va fluida, sin latencia. Seguimos pendientes.',
    'Validamos con médicos supervisores y no han presentado latencia con la TCA; sin incidencias por ahora y las citas siguen su curso normal.'
  ], [
    'Se realiza ronda de monitoreo y no se observa latencia en la TCA; no se reportan incidencias hasta el momento. Las citas continúan con normalidad.',
    'Pasamos ronda por los puestos y la TCA responde bien, sin latencia. Las citas siguen con normalidad.',
    'Ronda hecha: la TCA va fluida y ningún médico reporta lentitud. Seguimos pendientes.',
    'Sin latencia en la TCA por el momento; las citas fluyen con normalidad y seguimos monitoreando.'
  ]];

  /* ---------- acciones ---------- */
  const A = [
    /* Respuestas a médicos: cada botón elige una variante al azar (sin repetir la anterior).
       [etiqueta, lleva saludo, variantes] */
    { n: 'Responder a médicos', ic: '🩺', wide: 1, groups: [
      ['Verificado ✅', 0, ['Verificado ✅']],
      ['Solventado ✅', 0, ['Solventado ✅']],
      ['Enseguida 🫡', 0, ['Enseguida 🫡']],
      ['Con gusto 😊', 0, ['Con gusto 😊']]] },

    /* Gestión de ticket (SDP): modelo, datos de la cita y TSJ + Estado Jira, cada uno con su botón */
    { n: 'Gestión de ticket (SDP)', ic: '🧾', wide: 1, view: () => gestionView() },

    /* Gestionando / Escalado: lee el ticket de SDP abierto (N.º, TSJ y tipificaciones) */
    { n: 'Gestionando / Escalado (SDP)', ic: '📌', sal: 0, f: [
      { k: 'tipo', l: 'Mensaje', t: 'sel', o: ['Gestionando', 'Escalado (con TSJ)'], d: () => (leerSDP().tsj ? 'Escalado (con TSJ)' : 'Gestionando') },
      { k: 'sdp', l: 'N.º de SDP', t: 'txt', d: () => leerSDP().sdp, ph: 'Se toma del ticket abierto', req: 1 },
      { k: 'tsj', l: 'TSJ', t: 'txt', d: () => leerSDP().tsj, ph: 'Ej. 13790', show: v => v._i.tipo === 1, req: 1 },
      { k: 't2', l: 'Tipificación 2', t: 'txt', d: () => leerSDP().t2, show: v => v._i.tipo === 1 },
      { k: 't3', l: 'Tipificación 3', t: 'txt', d: () => leerSDP().t3, show: v => v._i.tipo === 1 }],
      g: v => {
        const sdp = T(v.sdp).replace(/\D/g, '') || '(N.º SDP)';
        if (v._i.tipo === 0) return 'gestionando ' + sdp;
        const n = T(v.tsj).replace(/^tsj-?/i, '').replace(/\D/g, '') || '(TSJ)';
        return ['SDP# ' + sdp + ' ||[TSJ-' + n + '](https://telemedicina-sv.atlassian.net/servicedesk/customer/portal/40/TSJ-' + n + ')'].concat([T(v.t2), T(v.t3)].filter(Boolean)).join(' || ');
      } },

    { n: 'Credenciales NERDS', ic: '🔑', sal: 1, f: [
      { k: 'tipo', l: 'Tipo de solicitud', t: 'sel', o: ['Alta: nuevo ingreso, sin cuenta', 'Restablecer contraseña: no le cae el correo', 'Quitar doble verificación'] },
      { k: 'meds', l: 'Médico(s)', t: 'pairs', req: 1 },
      { k: 'nota', l: 'Nota (opcional)', t: 'txt', ph: 'Ej. se encuentra en consulta en TM1-C4' }],
      g: v => {
        const m = v.meds.filter(p => T(p[0]) || T(p[1])), pl = m.length > 1;
        const head = [
          'Me apoyan con el alta y credenciales de NERDS para ' + (pl ? 'los siguientes médicos de nuevo ingreso (aún no tienen cuenta)' : 'médico de nuevo ingreso (aún no tiene cuenta)') + ':',
          'Me apoyan con el restablecimiento de contraseña de NERDS ' + (pl ? 'de los siguientes médicos; ya tienen cuenta pero no les llega' : 'del siguiente médico; ya tiene cuenta pero no le llega') + ' el correo de restablecimiento:',
          'Me apoyan eliminando la doble verificación de NERDS ' + (pl ? 'de los siguientes médicos' : 'del siguiente médico') + ':'][v._i.tipo];
        return head + '\n\n' + (m.length ? m.map(p => NL([T(p[0]), T(p[1])])).join('\n\n') : '(nombre y correo)') + (T(v.nota) ? '\n\n' + sent(v.nota) : '');
      } },

    { n: 'Eliminar doble verificación', ic: '🔓', sal: 0, f: [
      { k: 'id', l: 'Piden el ID de empleado', t: 'chk', mem: 1 },
      { k: 'meds', l: 'Médico(s)', t: 'pairs', p3: 'DSV000', show3: v => v.id, req: 1 },
      { k: 'nota', l: 'Nota (opcional)', t: 'txt', ph: 'Ej. se encuentra en consulta en TM1-C4' }],
      g: v => {
        /* el correo sale con @doctorsv.gob.sv si solo escriben el usuario */
        const m = v.meds.filter(p => T(p[0]) || T(p[1]) || T(p[2]));
        const bloque = p => NL([T(p[0]), correo(p[1]), v.id ? T(p[2]) : '']);
        return 'Me ayudan con eliminación de verificación de dos pasos\n\n' + (m.length ? m.map(bloque).join('\n\n') : '(nombre y correo)') + (T(v.nota) ? '\n\n' + sent(v.nota) : '');
      } },

    { n: 'Status de slot', ic: '📋', sal: 0, vary: 1, f: [
      { k: 'ubic', l: 'Ubicación', t: 'loc' },
      { k: 'slot', l: 'Slot', t: 'txt', d: slotNow },
      { k: 'est', l: 'Estado', t: 'sel', o: ['Sin incidencias', 'Incidencias menores solventadas', 'Con incidencia', 'Cierre de slot'] },
      { k: 'det', l: 'Detalle', t: 'txt', ph: 'Opcional; obligatorio si hay incidencia', reqIf: v => v._i.est === 2 },
      { k: 'sup', l: 'Consulté con médicos supervisores', t: 'chk', d: 1 }],
      g: v => {
        const e = v._i.est, det = T(v.det), D = lf(det.replace(/\.$/, '')) || '(detalle)';
        const L = STV[e][v.sup ? 0 : 1];
        const b = v._pick('st' + e + (v.sup ? 's' : 'n'), L).replace('{d}', D);
        return 'Status ' + v.ubic + ' | Slot ' + T(v.slot) + ':\n' + b + (e !== 2 && det ? ' ' + sent(det) : '');
      } },

    { n: 'Apoyo de soporte', ic: '🛠️', sal: 1, f: [
      { k: 'lug', l: 'Ubicación', t: 'txt', ph: 'Ej. TM1-J12', req: 1 },
      { k: 'prob', l: 'Problema', t: 'sel', o: PROB.map(p => p[0]) },
      { k: 'otro', l: 'Describe el problema', t: 'txt', req: 1, show: v => v.prob === 'Otro' },
      { k: 'med', l: 'Médico (opcional)', t: 'txt', show: v => /nrol/.test(v.prob) },
      { k: 'pru', l: 'Pruebas realizadas (opcional)', t: 'txt', ph: 'Ej. se probó con otro equipo y persiste' },
      { k: 'cons', l: 'El médico', t: 'sel', o: ['Está en consulta', 'Está disponible', 'No indicar'] }],
      g: v => {
        const p = v.prob === 'Otro' ? lf(T(v.otro) || '(problema)') : PROB[v._i.prob][1];
        const med = /nrol/.test(v.prob) && T(v.med) ? ' (' + T(v.med) + ')' : '';
        return SP([
          'Se solicita apoyo de soporte en ' + (T(v.lug) || '(ubicación)') + ': ' + dot(p + med),
          T(v.pru) ? 'Pruebas realizadas: ' + lf(dot(v.pru)) : '',
          ['El médico se encuentra en consulta.', 'El médico se encuentra disponible en este momento.', ''][v._i.cons]]);
      } },

    /* Botón de pausa: respuesta al correo del solicitante */
    { n: 'Botón de pausa (correo)', ic: '⏸️', sal: 0, f: [
      { k: 'pegar', l: 'Pega aquí el correo', t: 'area', ph: 'Con esto se llenan solos el solicitante, el código del médico, el horario y la acción.',
        auto: (txt, poner) => leerCorreo(txt, poner) },
      { k: 'trato', l: 'Trato', t: 'sel', o: TRATOS },
      { k: 'ape', l: 'Apellido del solicitante', t: 'txt', ph: 'Ej. Flores', req: 1 },
      { k: 'plan', l: 'Respuesta', t: 'sel', o: PLAN,
        auto: (x, poner) => poner('perfil', PLAN.indexOf(x) === 1 ? 'médico de reserva' : 'médico consultante por servicios profesionales') },
      { k: 'meds', l: 'Médico(s)', t: 'pairs', p1: 'Código 000XXX', p2: 'Nombre del médico', show: v => P_MED.includes(v._i.plan) },
      { k: 'hor', l: 'Horario', t: 'txt', ph: 'Ej. 7:00 a. m. – 1:00 p. m.', show: v => P_HOR.includes(v._i.plan) },
      { k: 'perfil', l: 'Perfil', t: 'sel', o: ['médico consultante por servicios profesionales', 'médico de célula', 'médico de reserva', '(no indicar)'], show: v => P_PERF.includes(v._i.plan) },
      { k: 'acc', l: 'Botón de pausa', t: 'sel', o: ['activado', 'retirado'], show: v => v._i.plan === 3 },
      { k: 'agen', l: 'Agendamiento automático', t: 'sel', o: ['habilitado', 'deshabilitado'], show: v => v._i.plan === 3 },
      { k: 'bloq', l: 'Bloqueo', t: 'sel', o: ['tiempo de comida', 'descanso'], show: v => v._i.plan === 4 },
      { k: 'fecha', l: 'Fecha', t: 'txt', d: fecha, show: v => v._i.plan === 4 },
      { k: 'falta', l: 'Qué hace falta', t: 'chks', o: ['Código y nombre completo del médico', 'Horario del turno', 'Perfil del día (reserva, célula, servicios profesionales)', 'Si se activa o se retira el botón'], d: ['Código y nombre completo del médico', 'Horario del turno'], show: v => v._i.plan === 5 },
      { k: 'desc', l: 'Qué se reportó', t: 'txt', ph: 'Ej. un paciente agendado con el médico en pausa', req: 1, show: v => v._i.plan === 7 },
      { k: 'jira', l: 'Número de Jira', t: 'txt', ph: 'Ej. TSJ-13790', show: v => v._i.plan === 7 },
      { k: 'estado', l: 'Estado actual', t: 'sel', o: ['en análisis', 'en espera de implementación', 'en pruebas'], show: v => v._i.plan === 7 },
      { k: 'firma', l: 'Tu nombre (firma)', t: 'txt', d: 'Josué López', mem: 1 }],
      g: v => {
        const p = v._i.plan, m = v.meds.filter(x => T(x[0]) || T(x[1]));
        const NB = x => x.filter(y => y != null && y !== false).join('\n');  /* conserva los renglones en blanco */
        const id = x => SP([T(x[0]).toUpperCase(), T(x[1]) ? '– ' + T(x[1]) : '']) || '[código] – [médico]';
        const uno = m.length ? and(m.map(id)) : '[código] – [médico]';
        const varios = m.length > 1;
        const enc = greet() + ', ' + (v.trato === '(sin título)' ? '' : v.trato + ' ') + (T(v.ape) || '[apellido]') + '.';
        const fin = NB(['Saludos cordiales,', T(v.firma) || 'Josué López', 'Equipo de Soporte Técnico']);
        const det = conHor => NB([
          ...(m.length === 1 ? ['- Código: ' + id(m[0])] : (m.length ? m.map(x => '- ' + id(x)) : ['- Código: [código] – [médico]'])),
          conHor && T(v.hor) ? '- Horario: ' + T(v.hor) : '',
          v.perfil === '(no indicar)' ? '' : '- Perfil' + (p === 0 ? ' del día' : '') + ': ' + v.perfil]);
        const cuerpo = [
          () => NB([enc, '', 'Se activó el botón de pausa para ' + (varios ? 'los siguientes médicos:' : 'el siguiente médico:'), '', det(1), '',
            'Le agradecemos validar en la agenda médica que el botón ya aparece y confirmarnos en este mismo correo.', '', 'Quedamos atentos.', fin]),
          () => NB([enc, '', 'Se retiró el botón de pausa ' + (varios ? 'de los siguientes médicos:' : 'del siguiente médico:'), '', det(0), '',
            'Le agradecemos validar en la agenda médica que el botón ya no aparece y confirmarnos en este mismo correo.', '', 'Quedamos atentos.', fin]),
          () => NB([enc, '', 'Se realizaron los siguientes cambios para ' + uno + ':', '',
            '1. Botón de pausa: retirado.', '2. Perfil: cambiado a médico de reserva.', '',
            'Por favor valide en la agenda médica que ambos cambios se reflejan y confírmenos en este mismo correo.', '', fin]),
          () => NB([enc, '', 'Para ' + uno + ' se realizó lo siguiente:', '',
            '1. Botón de pausa: ' + v.acc + '.', '2. Agendamiento automático de pacientes: ' + v.agen + '.', '',
            'Por favor valide en la agenda médica y confírmenos en este mismo correo.', '', fin]),
          () => NB([enc, '', 'Se realizó el bloqueo de ' + v.bloq + ' para ' + uno + ':', '',
            '- Fecha: ' + (T(v.fecha) || fecha()), T(v.hor) ? '- Horario bloqueado: ' + T(v.hor) : '', '',
            'Por favor valide en la agenda médica.', '', fin]),
          () => NB([enc, '', 'Para atender su solicitud necesitamos que nos confirme:', '',
            NB((v.falta.length ? v.falta : ['(qué hace falta)']).map(x => '- ' + x)), '',
            'En cuanto recibamos la información procedemos de inmediato.', '', fin]),
          () => NB([enc, '', 'El cambio sí está aplicado en el sistema para ' + uno + '. Si no lo ve reflejado, le pedimos al médico:', '',
            '1. Cerrar sesión por completo.', '2. Volver a ingresar y actualizar la agenda médica.', '',
            'Si después de esto continúa sin aparecer, respóndanos con una captura de pantalla de su agenda y lo escalamos.', '', fin]),
          () => NB([enc, '', 'En seguimiento al caso reportado, le informamos que el problema relacionado con '
            + lf(T(v.desc).replace(/\.$/, '') || '[qué se reportó]') + ' fue identificado y escalado al área correspondiente bajo el número de Jira '
            + (T(v.jira) || '[TSJ-XXXXX]') + '.', '', 'Estado actual: ' + v.estado + '.', '',
            'Agradecemos el reporte y las evidencias proporcionadas, que contribuyeron a la identificación del caso.', '', fin])][p];
        return cuerpo ? cuerpo() : '';
      } },

    /* Modelo y versión de la app de un usuario */
    { n: 'Pedir modelo y versión', ic: '📲', sal: 0, f: [
      { k: 'users', l: 'Usuario(s)', t: 'pairs', p1: 'Nombre completo', p2: 'DUI (01234567-8)', mas: '+ Agregar otro usuario', req: 1 }],
      g: v => {
        const u = v.users.filter(x => T(x[0]) || T(x[1]));
        const dui = x => { const n = T(x).replace(/\D/g, ''); return n.length === 9 ? n.slice(0, 8) + '-' + n.slice(8) : T(x); };
        return 'Me apoyan con el modelo del dispositivo y la versión de la app ' + (u.length > 1 ? 'de los siguientes usuarios' : 'del siguiente usuario')
          + ':\n\n' + (u.length ? u.map(x => NL([T(x[0]), dui(x[1])])).join('\n\n') : '(nombre y DUI)');
      } },

    /* Equipo dañado o faltante: "Máquina: 00431 patchcore: PP3-N8-D45. Falta adaptador de headset." */
    { n: 'Equipo dañado o faltante', ic: '🧰', sal: 0, f: [
      { k: 'maq', l: 'Máquina (activo fijo)', t: 'txt', ph: 'Ej. 00431', req: 1 },
      { k: 'pc', l: 'Patchcore', t: 'txt', ph: 'Ej. PP3-N8-D45' },
      { k: 'tipo', l: 'Reporte', t: 'sel', o: ['Falta', 'Está dañado'] },
      { k: 'cosas', l: '¿Qué?', t: 'chks', o: EQ.map(x => x[0]), reqIf: v => !T(v.otro) },
      { k: 'otro', l: 'Otro (opcional)', t: 'txt', ph: 'Ej. base del monitor' },
      { k: 'lug', l: 'Ubicación (opcional)', t: 'txt', ph: 'Ej. TM1-C4' },
      { k: 'nota', l: 'Nota (opcional)', t: 'txt', ph: 'Ej. se dejó el equipo apagado' }],
      g: v => {
        const sel = EQ.filter(x => v.cosas.includes(x[0])).map(x => ({ t: x[1], art: x[2], pl: x[3] }));
        if (T(v.otro)) sel.push({ t: lf(T(v.otro)), art: 'el', pl: 0 });
        const pl = sel.length > 1 || sel.some(x => x.pl);
        const cab = 'Máquina: ' + (T(v.maq) || '(activo fijo)') + (T(v.pc) ? ' patchcore: ' + T(v.pc) : '') + (T(v.lug) ? ' (' + T(v.lug) + ')' : '');
        let cuerpo;
        if (!sel.length) cuerpo = '(qué falta o qué está dañado)';
        else if (v._i.tipo === 0) cuerpo = (pl ? 'Faltan ' : 'Falta ') + and(sel.map(x => x.t));
        else {
          const adj = pl ? (sel.every(x => x.art === 'la') ? 'dañadas' : 'dañados') : (sel[0].art === 'la' ? 'dañada' : 'dañado');
          cuerpo = (pl ? 'Están ' : 'Está ') + adj + ' ' + and(sel.map(x => x.art + ' ' + x.t));
        }
        return SP([cab + '.', dot(cuerpo), T(v.nota) ? sent(v.nota) : '']);
      } },

    /* Ticket de ronda (SDP): genera los 4 campos del ticket, cada uno con su botón Copiar */
    { n: 'Ticket de ronda', ic: '🎫', sdp: 1, outs: [['sol', 'Solicitante'], ['res', 'Resumen del caso'], ['des', 'Descripción'], ['com', 'Comentario de cierre del ticket']], f: [
      { k: 'tipo', l: 'Tipo de ronda', t: 'sel', o: ['Inicio de operaciones', 'Ronda intermedia', 'Cierre de operaciones'] },
      { k: 'sol', l: 'Solicitante (como aparece en SDP)', t: 'txt', ph: 'Ej. ST Josue Adonai Perez Lopez', mem: 1, req: 1 },
      { k: 'locs', l: 'Telemedicina(s)', t: 'chks', o: ['TM1', 'TM2', 'TM3', 'HES', 'Megacentro', 'Phoenix'], d: ['TM1'], mem: 1, req: 1 },
      { k: 'hora', l: 'Hora / slot', t: 'txt', d: slotNow },
      { k: 'a0', l: 'Actividades', t: 'chks', show: v => v._i.tipo === 0,
        o: ['Verificación de equipos en los puestos', 'Validación de que los médicos ingresan sin inconvenientes', 'Validación de que las citas inician correctamente', 'Consulta con médicos supervisores sobre posibles inconvenientes con copiloto'],
        d: ['Verificación de equipos en los puestos', 'Validación de que los médicos ingresan sin inconvenientes', 'Validación de que las citas inician correctamente', 'Consulta con médicos supervisores sobre posibles inconvenientes con copiloto'] },
      { k: 'a1', l: 'Actividades', t: 'chks', show: v => v._i.tipo === 1,
        o: ['Ronda de monitoreo en los puestos', 'Validación de que las citas se brindan correctamente', 'Consulta con médicos supervisores sobre posibles inconvenientes con copiloto', 'Apoyo a médicos en su puesto'],
        d: ['Ronda de monitoreo en los puestos', 'Validación de que las citas se brindan correctamente', 'Consulta con médicos supervisores sobre posibles inconvenientes con copiloto'] },
      { k: 'a2', l: 'Actividades', t: 'chks', show: v => v._i.tipo === 2,
        o: ['Validación de que las citas finalizan correctamente', 'Consulta con médicos supervisores sobre inconvenientes durante el bloque', 'Apagado y resguardo de equipos', 'Verificación de que los puestos quedan en orden'],
        d: ['Validación de que las citas finalizan correctamente', 'Consulta con médicos supervisores sobre inconvenientes durante el bloque'] },
      { k: 'otras', l: 'Otras actividades (una por línea, opcional)', t: 'area', ph: 'Ej. Apoyo a médico con configuración de audio en TM1-C4' },
      { k: 'inc', l: 'Incidencias', t: 'sel', o: ['Sin incidencias', 'Incidencia solventada en el momento', 'Incidencia reportada a soporte'] },
      { k: 'det', l: 'Qué se presentó', t: 'txt', ph: 'Ej. un falso en el cable HDMI de TM1-J12', show: v => v._i.inc > 0, req: 1 },
      { k: 'llt2', l: 'Al llenar en SDP, poner también la tipificación', t: 'chk', d: 1, mem: 1 },
      { k: 't1', l: 'Tipificación 1', t: 'txt', d: 'Gestiones complementarias de soporte tecnico', mem: 1, show: v => v.llt2 },
      { k: 't2', l: 'Tipificación 2', t: 'txt', d: 'Ronda de Monitoreo', mem: 1, show: v => v.llt2 },
      { k: 't3', l: 'Tipificación 3 (vacío = según la telemedicina marcada)', t: 'txt', ph: 'Automático: Telemedicina 1, 2 o 3', show: v => v.llt2 }],
      g: v => {
        const t = v._i.tipo, i = v._i.inc, L = and(v.locs) || '(telemedicina)', det = lf(T(v.det).replace(/\.$/, '')) || '(detalle)';
        const nom = ['ronda de inicio de operaciones', 'ronda intermedia de monitoreo', 'ronda de cierre de operaciones'][t];
        const acts = v['a' + t].concat((v.otras || '').split('\n').map(T).filter(Boolean).map(cap));
        const inc = [
          'Sin incidencias reportadas.',
          'Se presentó ' + det + '; se solventó en el momento, sin afectación en las citas.',
          'Se presentó ' + det + '; se reportó a soporte para que realicen las validaciones y gestiones correspondientes.'][i];
        const des = NL([
          'Se realiza ' + nom + ' en ' + L + (T(v.hora) ? ' (' + T(v.hora) + ')' : '') + '.',
          acts.length ? '\nActividades realizadas:\n' + acts.map(x => '- ' + x).join('\n') : '',
          '\n' + inc]);
        const ok = ['las citas inician correctamente', 'las citas se brindan correctamente', 'las citas del bloque finalizaron correctamente'][t];
        const com = 'Se completa la ' + nom + ' en ' + L + '. ' + [
          'Se valida que ' + ok + ', sin incidencias reportadas.',
          'Se presentó ' + det + ', que se solventó en el momento sin afectar las citas. Se valida que ' + ok + '.',
          'Se presentó ' + det + ' y se reportó a soporte para que realicen las validaciones y gestiones correspondientes. Se valida que ' + ok + '.'][i];
        return { sol: T(v.sol), res: cap(nom) + ' - ' + L + ' - ' + fecha(), des, com };
      } },

    { n: 'Respuestas al grupo', ic: '💬', quick: [
      'Enseguida validamos.',
      'Enseguida verificamos con médicos de triage.',
      'Con gusto.',
      'Validado.',
      'El médico se encuentra en consulta; validamos al finalizar y confirmamos.',
      'El médico ya pudo ingresar, muchas gracias por el apoyo.',
      'El médico ya recibió el correo, muchas gracias.',
      'Enterado, quedamos pendientes.',
      'Muchas gracias por el apoyo.'] },

    { n: 'Lluvia / filtraciones', ic: '🌧️', sal: 0, f: [
      { k: 'tipo', l: 'Reporte', t: 'sel', o: ['Inicia lluvia (monitoreo)', 'Filtración encontrada', 'Sin filtraciones', 'Filtración solventada'] },
      { k: 'ubic', l: 'Ubicación', t: 'loc', show: v => v._i.tipo === 0 },
      { k: 'lug', l: 'Lugar', t: 'sel', o: ['TM1', 'TM2', 'TM3', 'TIC', 'UGP Triage', 'HES', 'Phoenix'], show: v => v._i.tipo === 1 || v._i.tipo === 3 },
      { k: 'areas', l: 'Área(s)', t: 'txt', ph: 'Ej. H, K y A', show: v => v._i.tipo === 1 || v._i.tipo === 3 },
      { k: 'limp', l: 'Limpieza', t: 'sel', o: ['Ya se encuentra solventando', 'Se solicita apoyo de limpieza'], show: v => v._i.tipo === 1 },
      { k: 'eq', l: 'Equipos', t: 'sel', o: ['No afecta equipos', 'Se resguardan equipos de la zona', 'Afecta equipos'], show: v => v._i.tipo === 1 },
      { k: 'ok', l: 'Lugares sin filtraciones', t: 'chks', o: ['TM1', 'TM2', 'TM3', 'TIC', 'UGP Triage', 'HES', 'Phoenix'], d: ['TM2', 'TM3'], show: v => v._i.tipo === 2, reqIf: v => v._i.tipo === 2 }],
      g: v => {
        const ar = parts(v.areas), az = ar.length ? ', área' + (ar.length > 1 ? 's ' : ' ') + and(ar) : '';
        return [
          'Status ' + v.ubic + ': comienza la lluvia; estamos pendientes en las telemedicinas ante posibles filtraciones.',
          'Se reporta filtración en ' + v.lug + az + '; ' + ['personal de limpieza se encuentra solventando.', 'se solicita apoyo de personal de limpieza.'][v._i.limp] + ' ' + ['No afecta equipos.', 'Se resguardan los equipos de la zona.', 'Afecta equipos de la zona; se solicita apoyo.'][v._i.eq],
          'Se verifica en ' + (and(v.ok) || '(lugares)') + ' y no se reportan filtraciones hasta el momento; quedamos pendientes.',
          'Se solventa la filtración en ' + v.lug + az + '; no hubo afectación en equipos ni en las citas.'][v._i.tipo];
      } },

    { n: 'Corte de energía', ic: '🔌', sal: 0, f: [
      { k: 'tipo', l: 'Reporte', t: 'sel', o: ['Reporte del corte', 'Validación después del corte'] },
      { k: 'ubic', l: 'Ubicación', t: 'loc' },
      { k: 'dur', l: 'Duración en segundos (opcional)', t: 'txt', ph: 'Ej. 15', show: v => v._i.tipo === 0 }],
      g: v => v._i.tipo === 0
        ? 'Se reporta corte de energía en ' + v.ubic + (T(v.dur) ? ' con duración de ' + T(v.dur).replace(/\s*s(eg(undos)?)?\.?$/i, '') + ' segundos' : '') + '. Se procede a validar que no haya afectación en las citas.'
        : 'Status ' + v.ubic + ': se valida con médicos supervisores que las citas continúan con normalidad después del corte de energía; no se reportan afectaciones.' },

    { n: 'Validar OTP', ic: '📱', sal: 1, f: [
      { k: 'nums', l: 'Número(s), uno por línea', t: 'area', ph: '7083 8515', req: 1 }],
      g: v => {
        const n = lines(v.nums).map(otp);
        return 'Me apoyan validando si ' + (n.length > 1 ? 'los siguientes números reciben' : 'el siguiente número recibe') + ' códigos OTP, por favor:\n' + (n.join('\n') || '(número)');
      } },

    { n: 'NERDS en triage', ic: '☎️', sal: 0, f: [
      { k: 'lug', l: 'Lugar', t: 'sel', o: ['UGP Triage', 'TM1', 'TM2', 'TM3', 'Phoenix', 'Salas (Las Pavas, Chinchontepec, Las Delicias)'] },
      { k: 'res', l: 'Resultado', t: 'sel', o: ['Sin incidencias', 'Con incidencia'] },
      { k: 'det', l: 'Detalle de la incidencia', t: 'txt', req: 1, show: v => v._i.res === 1, ph: 'Ej. una médico no podía transferir; se configuró y se solventó' },
      { k: 'n', l: 'Pruebas de llamada (cantidad, opcional)', t: 'txt', ph: 'Ej. 3' },
      { k: 'tr', l: 'Incluye prueba de transferencia', t: 'chk' }],
      g: v => {
        const n = parseInt(v.n, 10);
        const who = /Salas/.test(v.lug) ? 'Se valida con médicos de célula en las salas Las Pavas, Chinchontepec y Las Delicias' : 'Se valida con médicos de triage en ' + v.lug;
        return SP([
          who + (v._i.res === 0 ? ': no presentan incidencias con NERDS.' : ': ' + lf(dot(T(v.det) || '(detalle)'))),
          n > 0 ? 'Se realiza' + (n > 1 ? 'n ' : ' ') + n + ' prueba' + (n > 1 ? 's' : '') + ' de llamada' + (v.tr ? ' con transferencia' : '') + ', ' + (n > 1 ? 'exitosas.' : 'exitosa.')
            : (v.tr ? 'Se realiza prueba de llamada con transferencia, exitosa.' : '')]);
      } },

    { n: 'Latencia TCA / Assist', ic: '🐢', sal: 0, vary: 1, f: [
      { k: 'modo', l: 'Qué vas a enviar', t: 'sel', o: ['Status: sin latencia', 'Reportar latencia'] },
      { k: 'ubic', l: 'Ubicación', t: 'loc', show: v => v._i.modo === 0 },
      { k: 'lug', l: 'Ubicación', t: 'txt', ph: 'Ej. TM1-E6', req: 1, show: v => v._i.modo === 1 },
      { k: 'slot', l: 'Slot', t: 'txt', d: slotNow },
      { k: 'sup', l: 'Consulté con médicos supervisores', t: 'chk', d: 1, show: v => v._i.modo === 0 },
      { k: 'acc', l: 'Acción que tardó', t: 'sel', o: ACC.map(cap), show: v => v._i.modo === 1 },
      { k: 'otra', l: 'Describe la acción', t: 'txt', req: 1, show: v => v._i.modo === 1 && v._i.acc === ACC.length - 1 },
      { k: 'tie', l: 'Tiempo aproximado', t: 'txt', ph: 'Ej. 3 min', req: 1, show: v => v._i.modo === 1 },
      { k: 'con', l: 'Conexión', t: 'sel', o: ['Ethernet', 'Wifi'], show: v => v._i.modo === 1 },
      { k: 'tabs', l: 'Pestañas abiertas (opcional)', t: 'txt', ph: 'Ej. 9', show: v => v._i.modo === 1 },
      { k: 'sol', l: 'Solución aplicada', t: 'sel', o: ['Borrado de cookies y caché + Assist en nueva pestaña', 'Nueva sesión de Assist en otra pestaña', 'Reinicio del navegador (chrome://restart)', 'Persiste, sin solución por el momento'], show: v => v._i.modo === 1 },
      { k: 'med', l: 'Médico', t: 'txt', req: 1, show: v => v._i.modo === 1 },
      { k: 'cor', l: 'Correo', t: 'txt', req: 1, show: v => v._i.modo === 1 },
      { k: 'vm', l: 'Máquina virtual', t: 'txt', ph: '(@MP-WEB-MIG-XXXX) 169-20261005_12345 | es-mx', req: 1, show: v => v._i.modo === 1 },
      { k: 'ev', l: 'Evidencia (link, opcional)', t: 'txt', show: v => v._i.modo === 1 }],
      g: v => v._i.modo === 0
        ? 'Status ' + v.ubic + ' | Slot ' + T(v.slot) + ':\n' + v._pick('lat' + (v.sup ? 's' : 'n'), LATV[v.sup ? 0 : 1])
        : NL([
        'Se reporta latencia en TCA/Assist en ' + (T(v.lug) || '(ubicación)') + ', slot ' + T(v.slot) + ', durante ' + (v._i.acc === ACC.length - 1 ? lf(T(v.otra) || '(acción)') : ACC[v._i.acc]) + ' (aprox. ' + (T(v.tie) || '?') + ').',
        'Conexión: ' + v.con + (T(v.tabs) ? ' | Pestañas abiertas: ' + T(v.tabs) : ''),
        'Solución aplicada: ' + lf(v.sol) + '.'])
        + '\n\n' + NL([kv('Médico', T(v.med)), kv('Correo', T(v.cor)), kv('Máquina virtual', T(v.vm)), kv('Evidencia', T(v.ev))]) },

    { n: 'Copiloto', ic: '🎙️', sal: 1, f: [
      { k: 'tipo', l: 'Tipo', t: 'sel', o: ['Verificar correo en BD de copiloto', 'Caso: falla al generar nota / transcripción'] },
      { k: 'cla', l: 'Clave del médico (opcional)', t: 'txt', ph: 'Ej. 000LF6', show: COP.tipo1 },
      { k: 'med', l: 'Nombre completo del médico', t: 'txt', req: 1 },
      { k: 'cor', l: 'Correo', t: 'txt', req: 1 },
      { k: 'fal', l: 'Falla', t: 'sel', o: ['No genera la nota médica', 'La transcripción se detiene', 'No transcribe desde el inicio de la Meet', 'La nota se genera incompleta', 'No permite identificarse / iniciar sesión', 'La nota tarda demasiado en generarse'], show: COP.tipo1 },
      { k: 'det', l: 'Detalle (opcional)', t: 'txt', show: COP.tipo1 },
      { k: 'acc', l: 'Acciones realizadas (opcional)', t: 'txt', ph: 'Ej. se borró caché desde el complemento', show: COP.tipo1 },
      { k: 'fh', l: 'Fecha y hora de la cita', t: 'txt', d: () => today() + ' - ' + slotNow(), req: 1, show: COP.tipo1 },
      { k: 'idc', l: 'ID de cita', t: 'txt', req: 1, show: COP.tipo1 },
      { k: 'pac', l: 'Paciente', t: 'txt', req: 1, show: COP.tipo1 },
      { k: 'meet', l: 'Liga de Meet', t: 'txt', ph: 'https://meet.google.com/...', req: 1, show: COP.tipo1 },
      { k: 'ev', l: 'Evidencia (link, opcional)', t: 'txt', show: COP.tipo1 }],
      g: v => {
        const TAG = '@Gabriela Guardado @Carolina Cortez';
        if (v._i.tipo === 0) return 'Me apoyan verificando si el correo del médico se encuentra habilitado en la BD de copiloto:\n\n' + NL([T(v.med) || '(nombre completo)', T(v.cor) || '(correo)']) + '\n\n@Christopher Urrutia ' + TAG;
        return SP(['Me apoyan verificando el siguiente caso de copiloto: ' + lf(v.fal) + '.', T(v.det) ? sent(v.det) : '', T(v.acc) ? 'Acciones realizadas: ' + lf(dot(v.acc)) : ''])
          + '\n\n' + NL([kv('Médico', SP([T(v.cla), T(v.cla) && T(v.med) ? '-' : '', T(v.med)])), kv('Correo', T(v.cor)), kv('Fecha y hora de la cita', T(v.fh)), kv('ID de cita', T(v.idc)), kv('Paciente', T(v.pac)), kv('Liga Meet', T(v.meet)), kv('Evidencia', T(v.ev))])
          + '\n\n' + TAG;
      } },

    { n: 'Visita', ic: '👥', sal: 0, f: [
      { k: 'tipo', l: 'Reporte', t: 'sel', o: ['Ingreso de visita', 'Retiro de visita', 'En espera de visita'] },
      { k: 'ubic', l: 'Ubicación', t: 'loc', o: ['TM1', 'TM2', 'TM3', 'HES', 'Megacentro', 'Phoenix'] }],
      g: v => 'Status ' + v.ubic + ': ' + ['se informa el ingreso de visita.', 'se informa el retiro de la visita.', 'se está a la espera de visita.'][v._i.tipo] },

    { n: 'Localizar médico', ic: '📍', sal: 0, f: [
      { k: 'med', l: 'Médico (opcional)', t: 'txt', ph: 'Ej. 000KM5 Karla Martínez' },
      { k: 'lug', l: 'Ubicación', t: 'txt', ph: 'Ej. TM1, área B', req: 1 },
      { k: 'est', l: 'Situación', t: 'sel', o: ['En consulta', 'Disponible', 'Se retiró', 'No se encuentra'] },
      { k: 'hora', l: 'Hora en que se retiró (opcional)', t: 'txt', ph: 'Ej. 3:00pm', show: v => v._i.est === 2 },
      { k: 'det', l: 'Detalle (opcional)', t: 'txt' }],
      g: v => {
        const l = T(v.lug) || '(ubicación)';
        const b = ['se encuentra en ' + l + ', en consulta.', 'se encuentra en ' + l + ', disponible.', 'se encontraba en ' + l + ' pero se retiró' + (T(v.hora) ? ' a las ' + T(v.hora) : '') + '.', 'no se encuentra en ' + l + '.'][v._i.est];
        return SP([T(v.med) ? T(v.med) + ': ' + b : cap(b), T(v.det) ? sent(v.det) : '']);
      } }
  ];

  /* ---------- salida: copiar y escribir en el chat ---------- */
  const copyText = async t => {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove(); return ok;
    }
  };
  const findBox = () => document.querySelector('#main footer [contenteditable="true"]') || document.querySelector('footer [contenteditable="true"]');
  const writeText = t => new Promise(res => {
    const el = findBox(); if (!el) return res(false);
    el.focus(); const before = el.textContent;
    try {
      const dt = new DataTransfer(); dt.setData('text/plain', t);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    } catch (e) {}
    setTimeout(() => { if (el.textContent === before) { el.focus(); try { document.execCommand('insertText', false, t); } catch (_) {} } res(true); }, 150);
  });

  /* ---------- llenar campos en Service Desk Plus (no guarda ni cierra el ticket) ---------- */
  const NZ = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const sdpDocs = () => {
    const out = [];
    const walk = d => { out.push(d); d.querySelectorAll('iframe').forEach(f => { if (f.id === FID) return; try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} }); };
    walk(document); return out;
  };
  const visible = el => { const r = el.getBoundingClientRect(); if (r.width || r.height) return true; const c = (el.id && el.ownerDocument.getElementById('s2id_' + el.id)) || [el.previousElementSibling, el.nextElementSibling].find(x => x && x.classList && x.classList.contains('select2-container')); return !!(c && c.getBoundingClientRect().width); };
  const etiquetaDe = el => {
    const d = el.ownerDocument, TT = x => (x || '').replace(/\s+/g, ' ').trim();
    if (el.id) { const l = [...d.querySelectorAll('label[for]')].find(x => x.htmlFor === el.id); if (l && TT(l.textContent)) return l.textContent; }
    let a = el.parentElement;
    for (let i = 0; i < 6 && a; i++, a = a.parentElement) {
      if (a.querySelectorAll('input:not([type=hidden]), select, textarea, iframe').length > 6) break;
      const ls = [...a.querySelectorAll('label, th, [class*="label" i], [class*="fieldname" i], [class*="field-name" i]')]
        .filter(x => !x.contains(el) && !x.querySelector('input, select, textarea') && TT(x.textContent) && (x.compareDocumentPosition(el) & 4));
      if (ls.length) return ls[ls.length - 1].textContent;
    }
    const r = el.getBoundingClientRect(); if (!r.width && !r.height) return '';
    let best = '', bs = 1e9;
    d.querySelectorAll('label, span, div, td, th, b, strong').forEach(c => {
      if (c.querySelector('input, select, textarea, label, span, div')) return;
      const t = TT(c.textContent); if (t.length < 2 || t.length > 70) return;
      const q = c.getBoundingClientRect(); if (!q.width) return;
      let sc = 1e9; const dy = r.top - q.bottom;
      if (dy > -6 && dy < 60 && Math.abs(q.left - r.left) < 220) sc = dy + Math.abs(q.left - r.left) / 4;
      else if (Math.abs((q.top + q.bottom) / 2 - (r.top + r.bottom) / 2) < 14 && q.right <= r.left + 6 && r.left - q.right < 300) sc = (r.left - q.right) / 2;
      if (sc < bs) { bs = sc; best = t; }
    });
    return best;
  };
  const limpiaEt = s => NZ(s).replace(/^\*\s*/, '').replace(/\s*[*:]\s*$/, '').replace(/\s*\*\s*$/, '');
  const buscar = (sels, re, tags) => {
    const docs = sdpDocs();
    /* En la pantalla de crear ticket los campos llevan el prefijo "udf_fields." (p.ej. udf_fields.udf_mline_6903);
       en la vista del ticket no. Probamos las dos formas con cada selector. */
    const ampliar = s => {
      const m = s.match(/\[name="(udf_[^"]+)"\]/);
      return m ? [s, s.replace(m[1], 'udf_fields.' + m[1])] : [s];
    };
    const todos = sels.reduce((a, s) => a.concat(ampliar(s)), []);
    for (const sel of todos) for (const d of docs) {
      let els;
      try { els = [...d.querySelectorAll(sel)]; } catch (e) { continue; }
      const e = els.find(visible) || els[0];
      if (e) return e;
    }
    if (!re) return null;
    for (const d of docs) for (const e of d.querySelectorAll(tags || 'input:not([type=hidden]), select, textarea')) {
      if ((/^s2id_/.test(e.id) && !e.classList.contains('select2-container')) || !visible(e)) continue;
      if (re.test(limpiaEt(etiquetaDe(e)))) return e;
    }
    return null;
  };
  const ponerTexto = (el, val) => {
    const w = el.ownerDocument.defaultView;
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    el.focus();
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    ['input', 'change'].forEach(t => el.dispatchEvent(new w.Event(t, { bubbles: true })));
    el.dispatchEvent(new w.KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    try { if (w.jQuery) w.jQuery(el).trigger('change'); } catch (e) {}
  };
  const ponerLista = async (el, texto, intentos) => {
    const w = el.ownerDocument.defaultView, t = NZ(texto);
    let op = null;
    for (let i = 0; i < (intentos || 30) && !op; i++) {
      const ops = [...el.options].filter(o => NZ(o.textContent));
      op = ops.find(o => NZ(o.textContent) === t) || ops.find(o => NZ(o.textContent).startsWith(t)) || ops.find(o => NZ(o.textContent).includes(t));
      if (!op) await esperar(250); // las tipificaciones 2 y 3 cargan después de elegir la anterior
    }
    if (!op) return null;
    el.value = op.value;
    try { if (w.jQuery) w.jQuery(el).val(op.value).trigger('change'); else el.dispatchEvent(new w.Event('change', { bubbles: true })); }
    catch (e) { el.dispatchEvent(new w.Event('change', { bubbles: true })); }
    return op.textContent.trim();
  };
  const clic = el => { const w = el.ownerDocument.defaultView; ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(t => { const K = t.startsWith('pointer') && w.PointerEvent ? w.PointerEvent : w.MouseEvent; el.dispatchEvent(new K(t, { bubbles: true, cancelable: true, view: w, button: 0 })); }); };
  const s2cont = el => {
    if (!el) return null;
    if (el.classList.contains('select2-container')) return el;
    const d = el.ownerDocument, sib = x => x && x.classList && x.classList.contains('select2-container') ? x : null;
    return (el.id && d.getElementById('s2id_' + el.id)) || sib(el.previousElementSibling) || sib(el.nextElementSibling) || el.closest('.select2-container');
  };
  const RESULTADOS = '.select2-result-label, .select2-results__option, li.select2-result, .ui-menu-item, [role="option"], .autocomplete-suggestion, .tt-suggestion';
  const NO_RES = /^(buscando|searching|cargando|loading|no se encontr|no results|no matches|sin resultados|por favor|please|ingrese|introduzca|escriba)/;
  const escribir = (inp, q) => {
    const w = inp.ownerDocument.defaultView;
    inp.focus();
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(inp, q);
    inp.dispatchEvent(new w.Event('input', { bubbles: true }));
    ['keydown', 'keyup'].forEach(ev => inp.dispatchEvent(new w.KeyboardEvent(ev, { bubbles: true, key: q.slice(-1) || 'a' })));
    try { if (w.jQuery) w.jQuery(inp).trigger('keyup-change'); } catch (e) {}
  };
  /* Espera los resultados de una lista y hace clic en el que coincide */
  const elegirResultado = async (d, t, diag) => {
    const w = d.defaultView;
    let vistos = [];
    for (let i = 0; i < 28; i++) {
      await esperar(250);
      const res = [...d.querySelectorAll(RESULTADOS)].filter(x => visible(x) && NZ(x.textContent) && !NO_RES.test(NZ(x.textContent)));
      vistos = res.map(x => T(x.textContent)).slice(0, 6);
      const m = res.find(x => NZ(x.textContent) === t) || res.find(x => NZ(x.textContent).startsWith(t)) || res.find(x => NZ(x.textContent).includes(t)) || res.find(x => t.includes(NZ(x.textContent)) && NZ(x.textContent).length > 8);
      if (m) {
        const li = m.closest('li, [role="option"]') || m;
        ['mouseover', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach(ev => li.dispatchEvent(new w.MouseEvent(ev, { bubbles: true, cancelable: true, view: w, button: 0 })));
        await esperar(350);
        return T(m.textContent);
      }
    }
    diag.push(vistos.length ? 'la lista mostró: ' + vistos.join(' / ') : 'la lista no mostró opciones');
    return null;
  };
  /* Combo con buscador (select2 de SDP): abre, escribe y elige como lo haría una persona */
  const ponerCombo = async (el, texto, diag) => {
    diag = diag || [];
    const t = NZ(texto), cont = s2cont(el);
    if (cont) {
      const d = cont.ownerDocument, w = d.defaultView;
      const orig = cont.id && cont.id.startsWith('s2id_') ? d.getElementById(cont.id.slice(5)) : (el !== cont ? el : (cont.nextElementSibling && /^(SELECT|INPUT)$/.test(cont.nextElementSibling.tagName) ? cont.nextElementSibling : cont.previousElementSibling));
      const palabras = texto.split(/\s+/).filter(x => x.length > 2 && !/^st$/i.test(x));
      const consultas = [...new Set([texto, palabras.slice(0, 2).join(' '), palabras[0] || ''])].filter(Boolean);
      for (const q of consultas) {
        let abierto = false;
        try { if (w.jQuery && orig && w.jQuery(orig).data('select2')) { w.jQuery(orig).select2('open'); abierto = true; } } catch (e) {}
        if (!abierto) clic(cont.querySelector('.select2-choice, .select2-selection, .select2-choices, a') || cont);
        await esperar(400);
        // nunca escribir en la cajita de un combo de selección múltiple (ej. "Derivación a especialidad")
        const bus = [...d.querySelectorAll('input.select2-input, input.select2-search__field')].find(x => visible(x) && !x.classList.contains('select2-offscreen') && !x.classList.contains('select2-focusser') && !x.closest('.select2-container-multi, .select2-search-field'));
        if (bus) escribir(bus, q); else diag.push('no se abrió el buscador de la lista');
        const got = await elegirResultado(d, NZ(texto), diag);
        if (got) {
          const ch = cont.querySelector('.select2-chosen, .select2-selection__rendered');
          const final = T(ch ? ch.textContent : got);
          if (!ch || NZ(final).includes(t) || t.includes(NZ(final))) return final;
          diag.push('quedó "' + final + '"');
        }
        try { if (w.jQuery && orig && w.jQuery(orig).data('select2')) w.jQuery(orig).select2('close'); } catch (e) {}
        if (!bus) break;
      }
    }
    if (el.tagName === 'SELECT') {
      const got = await ponerLista(el, texto, cont ? 4 : 30);
      if (got) return got;
      diag.push('opciones: ' + [...el.options].map(o => T(o.textContent)).filter(Boolean).slice(0, 6).join(' / '));
      return null;
    }
    if (el.tagName === 'INPUT' && !cont) {
      escribir(el, texto);
      const got = await elegirResultado(el.ownerDocument, t, diag);
      if (got) return got;
      return texto + ' (escrito; si sale una lista, elígelo)';
    }
    return null;
  };
  /* SOLO para el Solicitante (las tipificaciones siguen usando ponerCombo sin cambios).
     Escribe y elige únicamente dentro de la lista que se abrió para el Solicitante,
     así no escribe en otra cajita ni toca otros combos (p. ej. "Derivación a especialidad"). */
  const ponerSolicitante = async (el, texto, diag) => {
    const cont = s2cont(el);
    if (!cont) return null;
    const d = cont.ownerDocument, w = d.defaultView, t = NZ(texto);
    const orig = cont.id && cont.id.startsWith('s2id_') ? d.getElementById(cont.id.slice(5)) : (el !== cont ? el : null);
    const abierta = () => [...d.querySelectorAll('.select2-drop-active, .select2-container--open .select2-dropdown')]
      .find(x => x.getClientRects().length && !x.classList.contains('select2-display-none'));
    const palabras = texto.split(/\s+/).filter(x => x.length > 2 && !/^st$/i.test(x));
    const consultas = [...new Set([texto, palabras.slice(0, 2).join(' ')])].filter(Boolean);
    let vistos = [];
    for (const q of consultas) {
      let ok = false;
      try { if (w.jQuery && orig && w.jQuery(orig).data('select2')) { w.jQuery(orig).select2('open'); ok = true; } } catch (e) {}
      if (!ok) clic(cont.querySelector('.select2-choice, .select2-selection, a') || cont);
      await esperar(450);
      const drop = abierta();
      if (!drop) { diag.push('no se abrió la lista del solicitante'); break; }
      const bus = [...drop.querySelectorAll('input')].find(x => visible(x) && !x.classList.contains('select2-offscreen'));
      if (!bus) { diag.push('no apareció el buscador'); break; }
      escribir(bus, q);
      for (let i = 0; i < 28; i++) {
        await esperar(250);
        const res = [...drop.querySelectorAll('.select2-result-label, .select2-results__option')].filter(x => visible(x) && NZ(x.textContent) && !NO_RES.test(NZ(x.textContent)));
        vistos = res.map(x => T(x.textContent)).slice(0, 6);
        const m = res.find(x => NZ(x.textContent) === t) || res.find(x => NZ(x.textContent).includes(t)) || res.find(x => t.includes(NZ(x.textContent)) && NZ(x.textContent).length > 8);
        if (m) {
          const li = m.closest('li') || m;
          ['mouseover', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach(ev => li.dispatchEvent(new w.MouseEvent(ev, { bubbles: true, cancelable: true, view: w, button: 0 })));
          await esperar(350);
          const ch = cont.querySelector('.select2-chosen, .select2-selection__rendered');
          return T(ch ? ch.textContent : m.textContent);
        }
      }
      try { if (w.jQuery && orig && w.jQuery(orig).data('select2')) w.jQuery(orig).select2('close'); } catch (e) {}
    }
    if (vistos.length) diag.push('la lista mostró: ' + vistos.join(' / '));
    return null;
  };
  const ponerEditor = (texto) => {
    /* Descripción: editor de texto (iframe editable o div editable), si no, un cuadro de texto normal */
    let ed = null;
    for (const d of sdpDocs()) {
      if (d === document) continue;
      if ((d.designMode === 'on' || (d.body && d.body.isContentEditable)) && d.defaultView.frameElement && visible(d.defaultView.frameElement)) {
        const fr = d.defaultView.frameElement;
        const et = limpiaEt(etiquetaDe(fr));
        if (!ed || /descripci/.test(et)) ed = { doc: d, el: d.body };
        if (/descripci/.test(et)) break;
      }
    }
    if (!ed) for (const d of sdpDocs()) {
      const c = [...d.querySelectorAll('[contenteditable="true"]')].filter(x => visible(x) && !(x.parentElement && x.parentElement.closest('[contenteditable="true"]')));
      const pick = c.find(x => /descripci/.test(limpiaEt(etiquetaDe(x)))) || null;
      if (pick) { ed = { doc: d, el: pick }; break; }
    }
    const hidden = buscar(['textarea[name="description"]', 'textarea#HTMLDesc', 'textarea[name="HTMLDesc"]'], null);
    if (!ed) {
      const ta = buscar(['textarea[name="description"]'], /^descripcion$/, 'textarea');
      if (ta && visible(ta)) { ponerTexto(ta, texto); return 'cuadro de texto'; }
      if (hidden) { ponerTexto(hidden, texto); return 'campo oculto (revisa que se vea)'; }
      return null;
    }
    const { doc, el } = ed;
    el.focus();
    let ok = false;
    try { doc.execCommand('selectAll', false, null); ok = doc.execCommand('insertText', false, texto); } catch (e) {}
    if (!ok || NZ(el.textContent).length < NZ(texto).length * 0.8) {
      rc(el, ...texto.split('\n').map(l => { const p = doc.createElement('div'); if (l) p.textContent = l; else p.appendChild(doc.createElement('br')); return p; }));
    }
    el.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
    if (hidden) { try { Object.getOwnPropertyDescriptor(hidden.ownerDocument.defaultView.HTMLTextAreaElement.prototype, 'value').set.call(hidden, texto); } catch (e) {} }
    return 'editor';
  };
  /* Lee del ticket de SDP abierto: N.º de solicitud, TSJ y tipificaciones 2 y 3 */
  let cacheSDP = null, cacheT = 0;
  const leerSDP = () => {
    if (cacheSDP && Date.now() - cacheT < 3000) return cacheSDP;
    const r = { sdp: '', tsj: '', t2: '', t3: '' };
    try {
      const docs = sdpDocs();
      for (const dd of docs) { try { const id = new URLSearchParams(dd.defaultView.location.search).get('woID'); if (id) { r.sdp = id; break; } } catch (e) {} }
      if (!r.sdp) { const m = (document.title + ' ' + location.href).match(/(?:woID=|#)\s*(\d{6,8})/); if (m) r.sdp = m[1]; }
      const tsj = buscar(['input[name="udf_long_5708"]'], /^tsj$/, 'input');
      if (tsj) r.tsj = T(tsj.value);
      const tip = (sel, re) => {
        const el = buscar(sel, re, 'select, .select2-container');
        if (!el) return '';
        const c = s2cont(el), ch = c && c.querySelector('.select2-chosen, .select2-selection__rendered');
        const t = T(ch ? ch.textContent : el.tagName === 'SELECT' && el.selectedOptions[0] ? el.selectedOptions[0].textContent : '');
        return /^(sin especificar|seleccionar|--)/i.test(t) ? '' : t;
      };
      r.t2 = tip(['select[name="subcategory"]', '#s2id_subcategory'], /^tipificacion 2$|^subcategoria$/);
      r.t3 = tip(['select[name="item"]', '#s2id_item'], /^tipificacion 3$|^elemento$/);
    } catch (e) {}
    cacheSDP = r; cacheT = Date.now();
    return r;
  };
  const llenarSDP = async (o, tips) => {
    const r = [];
    const ok = (l, m) => r.push('✓ ' + l + (m ? ' — ' + m : '')), no = (l, m) => r.push('✗ ' + l + ' — ' + m);
    if (tips && tips.some(x => T(x))) {
      const ts = [['Tipificación 1', ['select[name="category"]', '#s2id_category'], /^tipificacion 1$|^categoria$/], ['Tipificación 2', ['select[name="subcategory"]', '#s2id_subcategory'], /^tipificacion 2$|^subcategoria$/], ['Tipificación 3', ['select[name="item"]', '#s2id_item'], /^tipificacion 3$|^elemento$/]];
      for (let i = 0; i < 3; i++) {
        if (!T(tips[i])) continue;
        const el = buscar(ts[i][1], ts[i][2], 'select, .select2-container');
        if (!el) { no(ts[i][0], 'no encontré la lista'); continue; }
        const diag = [], got = await ponerCombo(el, tips[i], diag);
        got ? ok(ts[i][0], got) : no(ts[i][0], 'no pude elegir "' + T(tips[i]) + '"' + (diag.length ? ' · ' + diag.join(' · ') : ''));
        await esperar(900);
      }
    }
    if (T(o.sol)) {
      const el = buscar(['select[name="requester"]', 'input[name="requester"]', 'input[name="requesterName"]', '#requesterName', '#s2id_requester'], /^solicitante$/, 'input:not([type=hidden]), select, .select2-container');
      if (!el) no('Solicitante', 'no encontré el campo en esta pantalla');
      else { const diag = [], got = await ponerSolicitante(el, o.sol, diag); got ? ok('Solicitante', got) : no('Solicitante', 'no pude elegir "' + T(o.sol) + '"' + (diag.length ? ' · ' + diag.join(' · ') : '') + '; elígelo a mano'); }
    }
    const campos = [
      ['Resumen del caso', 'res', ['textarea[name="udf_mline_6903"]'], /^resumen del caso$/],
      ['Comentario de cierre', 'com', ['textarea[name="udf_mline_6904"]'], /^comentario de cierre/]];
    for (const [l, k, sels, re] of campos) {
      if (!T(o[k])) continue;
      const el = buscar(sels, re);
      if (!el) { no(l, 'no encontré el campo en esta pantalla'); continue; }
      ponerTexto(el, o[k]);
      ok(l);
    }
    const tit = buscar(['input[name="subject"]', 'input[name="title"]'], /^titulo( de la solicitud)?$|^asunto$/, 'input');
    if (tit && !T(tit.value) && T(o.res)) { ponerTexto(tit, o.res); ok('Título', 'se puso el resumen'); }
    if (T(o.des)) { const m = ponerEditor(o.des); m ? ok('Descripción', m) : no('Descripción', 'no encontré el editor'); }
    return r;
  };

  /* ---------- Gestión de ticket (SDP): modelo, datos de la cita, TSJ + Estado Jira ----------
     Funciones nuevas y aparte: no cambian nada de lo que ya usa "Ticket de ronda". */
  const ABRE_EDITAR = 'abre el ticket en Editar (o Nueva solicitud) y vuelve a tocar';
  const gTexto = (r, l, sels, re, val) => {
    const el = buscar(sels, re, 'input:not([type=hidden]), textarea');
    if (!el || !visible(el)) { r.push('✗ ' + l + ' — no encontré el campo; ' + ABRE_EDITAR); return; }
    ponerTexto(el, val);
    try { el.dispatchEvent(new el.ownerDocument.defaultView.Event('blur', { bubbles: true })); } catch (e) {}
    r.push('✓ ' + l + ' — ' + val);
  };
  const gLista = async (r, l, sels, re, val) => {
    const el = buscar(sels, re, 'select, .select2-container');
    if (!el || !visible(el)) { r.push('✗ ' + l + ' — no encontré la lista; ' + ABRE_EDITAR); return; }
    const diag = [], got = await ponerCombo(el, val, diag);
    r.push(got ? '✓ ' + l + ' — ' + got : '✗ ' + l + ' — no pude elegir "' + val + '"' + (diag.length ? ' · ' + diag.join(' · ') : '') + '; elígelo a mano');
    await esperar(500);
  };
  /* Fecha y hora de la cita: calendario de SDP (mismo método que el script de citas que ya funcionaba) */
  const gFecha = async (r, Y, M, G, H, I) => {
    const L = 'Fecha y hora de la cita';
    try {
      let fd = null;
      for (const x of sdpDocs()) { fd = x.querySelector('[id$="udf_date_628_IN_Display"]'); if (fd) break; }
      if (!fd || !visible(fd)) throw Error('no encontré el campo; ' + ABRE_EDITAR);
      const dd = fd.ownerDocument, wi = dd.defaultView, P = fd.id.replace(/_IN_Display$/, '') + '_IN_calendar_parent';
      const cal = dd.getElementById(P);
      if (!cal || cal.getAttribute('aria-expanded') !== 'true') {
        const add = fd.parentElement && fd.parentElement.querySelector('.input-group-addon');
        if (!add) throw Error('no encontré el botón del calendario');
        add.click();
      }
      for (let i = 0; i < 20 && !dd.querySelector('.zdatetimepicker__monthnav'); i++) await esperar(100);
      if (!dd.querySelector('.zdatetimepicker__monthnav')) throw Error('no se abrió el calendario');
      const MS = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
      for (let n = 0; n < 120; n++) {
        const mn = dd.querySelector('.zdatetimepicker__monthnav'), yn = dd.querySelector('.zdatetimepicker__yearnav');
        const cm = MS[NZ(mn.textContent).replace(/[^a-z]/g, '').slice(0, 3)], cy = parseInt(yn.textContent, 10);
        if (!cm || isNaN(cy)) throw Error('no entendí el mes del calendario ("' + T(mn.textContent) + ' ' + T(yn.textContent) + '")');
        const dif = (Y - cy) * 12 + M - cm;
        if (!dif) break;
        const bt = dd.getElementById(P + (dif > 0 ? '-right-month-0' : '-left-month-0'));
        if (!bt) throw Error('no encontré la flecha del calendario');
        bt.click(); await esperar(180);
      }
      /* el calendario muestra días del mes anterior/siguiente: para días altos se toma el último que coincide */
      const cells = [...dd.querySelectorAll('td.zdatetimepicker__date[role=gridcell]')].filter(c => parseInt(T(c.textContent), 10) === G);
      const day = G >= 15 ? cells[cells.length - 1] : cells[0];
      if (!day) throw Error('no encontré el día ' + G);
      clic(day.querySelector('.zdatetimepicker__text') || day); await esperar(300);
      const tc = dd.getElementById(P + '-timeinput'), hi = tc && tc.querySelector('input.zinputfield__textbox');
      if (!hi) throw Error('no encontré los controles de hora');
      const hm = hi.value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!hm) throw Error('hora visible no válida: ' + hi.value);
      let chh = parseInt(hm[1], 10); if (chh === 12) chh = 0;
      const cmm = parseInt(hm[2], 10), th = H % 12, ta = H >= 12 ? 'PM' : 'AM', Q = [];
      const addq = (s, e, cur, tgt, mod) => { let up = tgt - cur; if (up < 0) up += mod; let dn = cur - tgt; if (dn < 0) dn += mod; Q.push([s, e, up <= dn ? 'ArrowUp' : 'ArrowDown', Math.min(up, dn)]); };
      const tecla = (k, s, e) => { const kc = k === 'ArrowUp' ? 38 : k === 'ArrowDown' ? 40 : 9; hi.focus(); if (s != null) hi.setSelectionRange(s, e); ['keydown', 'keyup'].forEach(ev => hi.dispatchEvent(new wi.KeyboardEvent(ev, { bubbles: true, cancelable: true, key: k, code: k, keyCode: kc, which: kc }))); };
      addq(0, 2, chh, th, 12); addq(3, 5, cmm, I, 60);
      for (const q of Q) while (q[3] > 0) { tecla(q[2], q[0], q[1]); q[3]--; await esperar(40); }
      const ampm = () => (hi.value.toUpperCase().match(/\b(AM|PM)\b/) || [])[1];
      if (!ampm()) throw Error('no identifiqué AM/PM en el reloj');
      if (ampm() !== ta) {
        let p = hi.value.toUpperCase().search(/\b(AM|PM)\b/); tecla('ArrowUp', p, p + 2); await esperar(120);
        if (ampm() !== ta) { p = hi.value.toUpperCase().search(/\b(AM|PM)\b/); tecla('ArrowDown', p, p + 2); await esperar(120); }
        if (ampm() !== ta) throw Error('no pude cambiar el reloj a ' + ta);
      }
      ['input', 'change'].forEach(ev => hi.dispatchEvent(new wi.Event(ev, { bubbles: true })));
      tecla('Tab'); hi.blur(); await esperar(2000);
      let okb = dd.querySelector('.OKButton-zdatetimepicker');
      if (!okb) { const tx = [...dd.querySelectorAll('.zbutton__text')].find(x => T(x.textContent) === 'Aceptar'); okb = tx && tx.closest('button'); }
      if (!okb) throw Error('no encontré el botón Aceptar del calendario');
      okb.click(); await esperar(400);
      r.push('✓ ' + L + ' — ' + (T(fd.value) || 'revisa que se vea'));
    } catch (e) { r.push('✗ ' + L + ' — ' + e.message); }
  };
  /* "2026/10/09", "2026-10-09" o "09/10/2026" + "14:30" o "2:30 pm" */
  const leerFecha = s => {
    s = T(s); let m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    const f = m ? [+m[1], +m[2], +m[3]] : (m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)) ? [+m[3], +m[2], +m[1]] : null;
    return f && f[1] >= 1 && f[1] <= 12 && f[2] >= 1 && f[2] <= 31 ? f : null;
  };
  const leerHora = s => {
    const m = T(s).toLowerCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?$/);
    if (!m) return null;
    let H = +m[1]; const I = +m[2];
    if (m[3]) { if (H < 1 || H > 12) return null; H = H % 12 + (m[3] === 'p' ? 12 : 0); }
    return H <= 23 && I <= 59 ? [H, I] : null;
  };
  /* Fila pegada de la hoja (separada por tabulaciones): col 1 ID, col 7 especialidad, col 8 fecha, col 9 hora */
  const leerFila = x => {
    if (!/\t/.test(x || '')) return null;
    const a = x.replace(/\r?\n/g, '').split('\t').map(c => c.replace(/ /g, ' ').trim());
    return { id: (a[0].match(/\d+/) || [''])[0], esp: a[6] || '', fecha: a[7] || '', hora: a[8] || '' };
  };
  const gModelo = async (r, o) => {
    if (T(o.mod)) gTexto(r, 'Modelo Dispositivo', ['input[name="udf_sline_8402"]'], /^modelo( de)? dispositivo$/, T(o.mod));
    if (T(o.ver)) gTexto(r, 'Versión APP', ['input[name="udf_sline_9601"]'], /^version( de)? (la )?app$/, T(o.ver));
  };
  const gCita = async (r, o) => {
    if (T(o.id)) gTexto(r, 'ID de la cita', ['input[name="udf_long_2402"]', 'input[data-field="WorkOrder_Fields_UDF_LONG5"]'], /^id de la cita$/, T(o.id).replace(/\D/g, ''));
    if (T(o.esp)) await gLista(r, 'Especialidad', ['select[name="udf_pick_3902"]', '#s2id_udf_pick_3902'], /^especialidad$/, T(o.esp));
    if (T(o.fecha) || T(o.hora)) {
      const f = leerFecha(o.fecha), hh = leerHora(o.hora);
      if (!f) r.push('✗ Fecha y hora de la cita — la fecha "' + T(o.fecha) + '" no es válida (usa aaaa/mm/dd)');
      else if (!hh) r.push('✗ Fecha y hora de la cita — la hora "' + T(o.hora) + '" no es válida (usa 14:30)');
      else await gFecha(r, f[0], f[1], f[2], hh[0], hh[1]);
    }
    if (o.queja && o.queja !== 'No tocar') await gLista(r, 'Queja Aplica', ['select[name="udf_pick_3003"]', '#s2id_udf_pick_3003'], /^queja aplica$/, o.queja);
  };
  /* Lee las opciones reales de una lista de SDP (p. ej. "Tipo de Error" trae 112) */
  const opcionesDe = (sels, re) => {
    const el = buscar(sels, re, 'select, .select2-container');
    if (!el) return [];
    const sel = el.tagName === 'SELECT' ? el : (el.id && el.id.startsWith('s2id_') ? el.ownerDocument.getElementById(el.id.slice(5)) : null);
    if (!sel || !sel.options) return [];
    return [...sel.options].map(o => T(o.textContent)).filter(x => x && !/^(sin especificar|seleccionar|--)/i.test(x));
  };
  /* Bandeja de seguimiento: Tipo de Error, Queja Aplica, Resumen, y Modelo/Versión si están vacíos */
  const gSeguimiento = async (r, o) => {
    if (T(o.err)) await gLista(r, 'Tipo de Error', ['select[name="udf_pick_8405"]', '#s2id_udf_pick_8405'], /^tipo de error$/, T(o.err));
    if (T(o.queja)) await gLista(r, 'Queja Aplica', ['select[name="udf_pick_3003"]', '#s2id_udf_pick_3003'], /^queja aplica$/, T(o.queja));
    if (T(o.res)) gTexto(r, 'Resumen del caso', ['textarea[name="udf_mline_6903"]'], /^resumen del caso$/, T(o.res));
    const opc = [['Modelo Dispositivo', 'mod', ['input[name="udf_sline_8402"]'], /^modelo( de)? dispositivo$/],
      ['Versión APP', 'ver', ['input[name="udf_sline_9601"]'], /^version( de)? (la )?app$/]];
    for (const [l, k, sels, re] of opc) {
      if (!T(o[k])) continue;
      const el = buscar(sels, re, 'input:not([type=hidden])');
      if (el && visible(el) && T(el.value) && o.soloVacios) { r.push('✓ ' + l + ' — ya tenía "' + T(el.value) + '", no se tocó'); continue; }
      gTexto(r, l, sels, re, T(o[k]));
    }
  };
  const gTsj = async (r, o) => {
    const s = T(o.tsj), n = (s.match(/TSJ-?\s*(\d+)/i) || s.match(/(\d{3,})/) || [])[1];
    if (s && !n) r.push('✗ TSJ — "' + s + '" no trae número');
    if (n) gTexto(r, 'TSJ', ['input[name="udf_long_5708"]', 'input[data-field="WorkOrder_Fields_UDF_LONG4"]'], /^tsj$/, n);
    if (T(o.est)) await gLista(r, 'Estado Jira', ['select[name="udf_pick_6907"]', '#s2id_udf_pick_6907'], /^estado jira$/, T(o.est));
  };

  /* ---------- panel (iframe aislado de WhatsApp) ---------- */
  const dark = document.body.classList.contains('dark');
  const fr = document.createElement('iframe'); fr.id = FID;
  const INST = Math.random().toString(36).slice(2);
  window.__n1kitId = INST;
  let cerrado = false;
  const cerrar = () => { cerrado = true; window.__n1kitId = null; fr.remove(); };
  st.min = !!(REC && REC.activo); // si hay un diagnóstico en curso, abre como barrita; si no, desplegado
  const place = () => {
    const min = !!st.min, ancho = min ? (REC && REC.activo ? 300 : 230) : 380;
    let pos = 'top:70px;right:20px;';
    if (st.pos) {
      const x = Math.max(0, Math.min(st.pos.x, innerWidth - ancho)), y = Math.max(0, Math.min(st.pos.y, innerHeight - 48));
      pos = 'left:' + x + 'px;top:' + y + 'px;';
    }
    fr.style.cssText = 'position:fixed;z-index:2147483647;width:' + ancho + 'px;height:' + (min ? '46px' : 'min(640px,calc(100vh - 100px))') + ';border:1px solid rgba(0,0,0,.18);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.28);background:' + (dark ? '#111b21' : '#fff') + ';' + pos;
  };
  place();
  addEventListener('resize', () => { if (fr.isConnected) place(); });
  document.body.appendChild(fr);
  let d, w; // documento y ventana del panel (se vuelven a tomar si el navegador recarga el panel)

  const CSS = `*{box-sizing:border-box;font-family:"Segoe UI",system-ui,-apple-system,Helvetica,Arial,sans-serif}
html,body{margin:0;height:100%}
:root{--bg:#fff;--fg:#111b21;--mut:#667781;--bd:#e1e5e8;--in:#f5f6f6;--hov:#eef1f2;--ac:#00a884;--warn:#b25000}
:root.dark{--bg:#111b21;--fg:#e9edef;--mut:#8696a0;--bd:#2a3942;--in:#202c33;--hov:#2a3942;--warn:#f7b267}
body{background:var(--bg);color:var(--fg);font-size:13px;display:flex;flex-direction:column}
header{display:flex;align-items:center;gap:4px;padding:10px 10px 10px 12px;border-bottom:1px solid var(--bd);cursor:move;user-select:none;touch-action:none}
header b{flex:1;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.min header{border-bottom:0;padding:9px 8px 9px 12px}
body.min header b{cursor:pointer}
body.min main,body.min .foot,body.min .toast{display:none!important}
.ib{border:0;background:transparent;color:var(--mut);font-size:15px;cursor:pointer;padding:4px 7px;border-radius:6px;line-height:1}
.ib:hover{background:var(--hov);color:var(--fg)}
main{flex:1;overflow:auto;padding:12px}
.hint{font-size:11.5px;color:var(--mut);margin:0 0 10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.act{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--in);color:var(--fg);cursor:pointer;text-align:left;font-size:12.5px;font-weight:600;min-height:62px}
.act:hover{border-color:var(--ac)}
.act span{font-size:17px}
.act.wide{grid-column:1/-1;flex-direction:row;align-items:center;min-height:0;gap:8px;border-color:var(--ac)}
.g3{grid-template-columns:1fr 1fr;margin-top:10px}
.act.sm{min-height:0;padding:9px 10px;font-size:12.5px}
.outs{border-top:1px solid var(--bd);margin-top:14px;padding-top:12px}
.oh{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px}
.oh .l{margin:0}
.cp{border:1px solid var(--ac);background:transparent;color:var(--ac);border-radius:6px;padding:3px 10px;font-size:11.5px;font-weight:600;cursor:pointer}
.cp:hover{background:var(--ac);color:#fff}
.ot{min-height:38px;font-size:12.5px;line-height:1.4}
.ot.big{min-height:150px}
.sdpbox{display:flex;flex-direction:column;gap:6px;margin-top:4px}
.sdpbox .hint{margin:0}
.log{font-size:12px;display:flex;flex-direction:column;gap:3px}
.log .ok{color:var(--ac)}
.log .bad{color:var(--warn)}
.b:disabled{opacity:.6;cursor:wait}
.tabs{display:flex;gap:4px;margin-bottom:10px;border-bottom:1px solid var(--bd)}
.tab{flex:1;border:0;background:transparent;color:var(--mut);padding:7px 4px 8px;font-weight:600;font-size:12.5px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.tab.on{color:var(--fg);border-bottom-color:var(--ac)}
.empty{border:1px dashed var(--bd);border-radius:10px;padding:18px 14px;text-align:center;color:var(--mut)}
.empty b{color:var(--fg)}
.empty p{margin:6px 0 0;font-size:12.5px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e5484d;margin-left:6px;vertical-align:middle;animation:pul 1.4s infinite}
@keyframes pul{50%{opacity:.35}}
.rec{display:flex;flex-direction:column;gap:2px;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--in);margin-bottom:8px;font-size:12.5px}
.rec .on{color:#e5484d}
.rec span{color:var(--mut)}
.warnt{color:var(--warn)!important}
.recacc{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.ayuda{border:1px solid var(--bd);border-radius:10px;padding:8px 10px;margin-bottom:10px;font-size:12.5px}
.ayuda summary{cursor:pointer;font-weight:600}
.ayuda ol{margin:8px 0;padding-left:18px;display:flex;flex-direction:column;gap:3px}
.ayuda input[type=file]{font-size:11.5px;width:100%;margin-bottom:4px}
.ayuda textarea{min-height:44px;font-size:11.5px}
.ayuda li.sub{list-style:none;margin-left:-4px;color:var(--mut)}
.ayuda .b{width:100%;margin-top:6px}
.sec{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.sec .l{margin:0}
.stop{color:#e5484d!important;font-size:13px}
.hall{margin:4px 0 10px;padding-left:18px;display:flex;flex-direction:column;gap:5px;font-size:12.5px}
.hall li.ok{color:var(--ac)}
body.min header b{font-variant-numeric:tabular-nums}
.last{margin-top:12px;font-size:12px;color:var(--mut);white-space:pre-wrap}
.last:not(:empty)::before{content:'Último: ';font-weight:600}
.q{display:flex;flex-direction:column;gap:6px}
.q .act{min-height:0;font-weight:500}
.f{margin-bottom:10px}
.l{display:block;font-size:11.5px;color:var(--mut);margin-bottom:4px;font-weight:600}
input[type=text],select,textarea{width:100%;padding:7px 9px;border:1px solid var(--bd);border-radius:8px;background:var(--in);color:var(--fg);font-size:13px;outline:none}
input:focus,select:focus,textarea:focus{border-color:var(--ac)}
textarea{resize:vertical;min-height:52px}
.row{display:flex;gap:6px;margin-bottom:6px}
.row input{flex:1;min-width:0}
.chk{display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer}
.chks{display:flex;flex-wrap:wrap;gap:6px}
.pill{display:flex;align-items:center;gap:4px;padding:4px 9px;border:1px solid var(--bd);border-radius:999px;font-size:12px;cursor:pointer}
.add{border:1px dashed var(--bd);background:transparent;color:var(--ac);border-radius:8px;padding:6px;width:100%;cursor:pointer;font-weight:600}
.foot{border-top:1px solid var(--bd);padding:10px 12px;display:flex;flex-direction:column;gap:7px}
.pv{min-height:96px;max-height:170px;font-size:12.5px;line-height:1.4}
.warn{color:var(--warn);font-size:11.5px}
.warn:empty{display:none}
.btns{display:flex;gap:6px}
.b{flex:1;border:1px solid var(--bd);background:var(--in);color:var(--fg);padding:8px 6px;border-radius:8px;cursor:pointer;font-weight:600;font-size:12.5px}
.b:hover{border-color:var(--ac)}
.b.p{background:var(--ac);border-color:var(--ac);color:#fff;flex:1.7}
.toast{position:fixed;left:50%;top:52px;transform:translateX(-50%);background:#111b21;color:#fff;padding:6px 12px;border-radius:999px;font-size:12px;opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap}
:root.dark .toast{background:#e9edef;color:#111b21}
.toast.on{opacity:1}
.card{border:1px solid var(--bd);border-radius:10px;padding:10px 10px 4px;margin-bottom:10px}
.card h4{margin:0 0 8px;font-size:12.5px;display:flex;align-items:center;justify-content:space-between;gap:6px}
.card .f{margin-bottom:8px}
.r2{display:flex;gap:6px}.r2>*{flex:1;min-width:0}
.card .b{width:100%;margin-bottom:6px}
.aviso{border:1px solid var(--warn);border-radius:10px;padding:10px;margin-bottom:10px;font-size:12.5px}
.aviso b{color:var(--warn)}
.aviso p{margin:4px 0 0;color:var(--mut)}`;

  /* reemplaza el contenido ignorando null/false (antes salía la palabra "null" junto a los botones) */
  const rc = (el, ...k) => el.replaceChildren(...k.flat(2).filter(x => x != null && x !== false));
  const h = (t, a, ...k) => {
    const e = d.createElement(t);
    if (a) for (const x in a) {
      const v = a[x];
      if (x === 'on') { for (const ev in v) e.addEventListener(ev, v[ev]); }
      else if (x === 'cls') e.className = v;
      else if (x in e) e[x] = v;
      else e.setAttribute(x, v);
    }
    k.flat(2).forEach(c => { if (c == null || c === false) return; e.append(c.nodeType ? c : d.createTextNode(String(c))); });
    return e;
  };

  let hdr, main, foot, toastEl;
  let tt;
  const toast = m => { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2200); };
  const out = async (t, m) => {
    t = t.trim(); if (!t) return;
    const msg = [];
    if (m & 1) msg.push(await copyText(t) ? 'Copiado' : 'No se pudo copiar');
    if (m & 2) msg.push(await writeText(t) ? 'Escrito en el chat' : 'Abre un chat para escribir');
    toast(msg.join(' · '));
  };

  /* Encabezado: se arrastra para mover el panel; – lo oculta sin cerrarlo */
  let hT = 'Atajos N1', hB = false, arrastre = false;
  const minimizar = () => { st.min = !st.min; save(); d.body.classList.toggle('min', st.min); place(); header(hT, hB); };
  const recCuenta = () => { const ev = (REC && REC.ev) || [], rq = ev.filter(esReq); return { rq: rq.length, mal: rq.filter(fallo).length + ev.filter(e => e.tipo === 'error' || (e.tipo === 'console' && e.nivel === 'error')).length }; };
  const header = (title, back) => {
    hT = title; hB = back;
    const diag = st.min && REC && REC.activo, c = diag ? recCuenta() : null;
    rc(hdr, 
      back && !st.min ? h('button', { cls: 'ib', title: 'Volver', on: { click: home } }, '←') : null,
      h('b', { title: st.min ? 'Mostrar el panel' : 'Arrastra para mover', on: { click: () => { if (st.min && !arrastre) minimizar(); } } },
        diag ? h('i', { cls: 'dot' }) : null,
        diag ? ' ' + mmss(Date.now() - REC.inicio).slice(0, 5) + ' · ' + c.rq + ' req · ' + c.mal + ' ⚠' : st.min ? '⚡ Atajos N1' : title,
        !diag && REC && REC.activo ? h('i', { cls: 'dot', title: 'Grabando red y consola' }) : null),
      diag ? h('button', { cls: 'ib stop', title: 'Terminar y descargar el diagnóstico', on: { click: terminarDiag } }, '■') : null,
      h('button', { cls: 'ib', title: st.min ? 'Mostrar' : 'Ocultar (sin cerrar)', on: { click: minimizar } }, st.min ? '▢' : '–'),
      h('button', { cls: 'ib', title: 'Cerrar', on: { click: () => cerrar() } }, '✕'));
  };
  /* Diagnóstico rápido: un clic empieza, el panel queda como barrita, ■ termina y descarga el .md */
  const diagRapido = () => {
    if (!REC || !REC.activo) recIniciar(st.filtroRed || '');
    if (!st.min) minimizar(); else header(hT, hB);
    toast('Diagnosticando');
  };
  function terminarDiag() {
    if (!REC) return;
    recDetener();
    const md = generarMD(REC);
    descargar('diagnostico-' + (REC.host || 'pagina').replace(/[^\w.-]/g, '_') + '-' + sello() + '.md', md);
    if (st.min) { st.min = false; save(); d.body.classList.remove('min'); place(); }
    resultadoView(md);
  }
  function resultadoView(md) {
    header('Diagnóstico', 1);
    foot.style.display = 'none';
    const c = recCuenta();
    const sec = (md.split('## Análisis automático')[1] || '').split('\n## ')[0];
    const hall = sec.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).replace(/\*\*/g, '').replace(/`/g, ''));
    rc(main, 
      h('div', { cls: 'rec' }, h('b', null, '✓ Diagnóstico descargado (.md)'), h('span', null, c.rq + ' solicitudes · ' + mmss((REC.fin || Date.now()) - REC.inicio) + ' de grabación')),
      h('label', { cls: 'l' }, 'Lo que encontró'),
      h('ul', { cls: 'hall' }, hall.map(x => h('li', { cls: /^No se encontraron/.test(x) ? 'ok' : '' }, x))),
      h('div', { cls: 'btns' },
        h('button', { cls: 'b', on: { click: () => { descargar('diagnostico-' + (REC.host || 'pagina').replace(/[^\w.-]/g, '_') + '-' + sello() + '.md', md); toast('Descargado'); } } }, 'Descargar otra vez'),
        h('button', { cls: 'b p', on: { click: () => { recBorrar(); diagRapido(); } } }, 'Nuevo diagnóstico')),
      h('p', { cls: 'hint' }, 'El .md trae el detalle de cada solicitud (headers, payload y respuesta), los endpoints por pantalla y la consola.'));
    main.scrollTop = 0;
  }
  const ivBarra = setInterval(() => { if (window.__n1kitId !== INST) { clearInterval(ivBarra); return; } if (fr.isConnected && hdr && st.min && REC && REC.activo) header(hT, hB); }, 1000);
  const arrastrar = e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    e.preventDefault();
    const r = fr.getBoundingClientRect(), sx = e.screenX, sy = e.screenY;
    arrastre = false;
    const mv = ev => {
      if (Math.abs(ev.screenX - sx) + Math.abs(ev.screenY - sy) > 4) arrastre = true;
      if (!arrastre) return;
      st.pos = { x: r.left + ev.screenX - sx, y: r.top + ev.screenY - sy }; place();
    };
    const up = () => { [w, window].forEach(x => { x.removeEventListener('pointermove', mv); x.removeEventListener('pointerup', up); }); if (arrastre) save(); setTimeout(() => { arrastre = false; }, 0); };
    [w, window].forEach(x => { x.addEventListener('pointermove', mv); x.addEventListener('pointerup', up); });
    try { hdr.setPointerCapture(e.pointerId); } catch (_) {}
  };

  /* Pestañas: N1 (mensajes y tickets), N2 (próximamente) y Herramientas */
  const HERR = [{ n: 'Diagnóstico rápido', ic: '⚡', wide: 1, view: () => diagRapido() }, { n: 'Exportar ticket a .md', ic: '📄', wide: 1, view: () => exportarView() }, { n: 'Mapear campos de esta página', ic: '🗺️', wide: 1, view: () => mapearView() }, { n: 'Grabar red y consola (opciones)', ic: '🛰️', wide: 1, view: () => redView() }];
  const N2 = [{ n: 'Bandeja de seguimiento (prueba)', ic: '🧪', wide: 1, view: () => seguimientoView() }];
  const TABS = [['n1', 'N1', A], ['n2', 'N2', N2], ['her', 'Herramientas', HERR]];
  const abrir = a => (a.view ? a.view(a) : a.groups ? groups(a) : a.quick ? quick(a) : form(a));
  function home() {
    header('Atajos N1');
    foot.style.display = 'none';
    const tab = TABS.find(x => x[0] === st.tab) || TABS[0], lista = tab[2];
    rc(main, 
      h('div', { cls: 'tabs' }, TABS.map(([k, l]) => h('button', { cls: 'tab' + (k === tab[0] ? ' on' : ''), on: { click: () => { st.tab = k; save(); home(); } } }, l))),
      lista.length
        ? h('div', { cls: 'grid' }, lista.map(a => h('button', { cls: 'act' + (a.wide ? ' wide' : ''), on: { click: () => abrir(a) } }, h('span', null, a.ic), a.n)))
        : h('div', { cls: 'empty' }, h('b', null, 'Apartados de N2'), h('p', null, 'Próximamente. Aquí van a ir las acciones de N2 cuando estén definidas.')),
      tab[0] === 'n1' ? h('p', { cls: 'hint' }, 'Arrastra la barra de arriba para mover el panel; – lo oculta sin cerrarlo.') : null,
      tab[0] === 'her' ? h('p', { cls: 'hint' }, 'Diagnóstico rápido: un clic empieza a grabar y el panel queda como barrita. Reproduce el fallo y toca ■ para terminar: se descarga el .md con lo que falló. Si la página se recarga, toca el marcador y sigue.') : null);
    main.scrollTop = 0;
  }

  /* Vista: grabar red y consola */
  /* Mapear campos: lista los campos del formulario abierto (etiqueta, nombre interno, tipo, opciones) en un .json */
  const mapearPagina = (conValores, max) => {
    const RUIDO = /^(searchText|subheader_search_box|conv-filter-chkb|profilepic|userOnOffStatus|navigation_menu|pro-font|cust_box|req_chat_title|files|filter)$|^qc_|^s2id_/;
    const lim = x => T(x).replace(/^\*\s*/, '').replace(/\s*[*:]\s*$/, '').replace(/\s*\*\s*$/, '').slice(0, 80);
    const val = x => conValores ? T(x).slice(0, max || 150) : (T(x) ? '(con texto)' : '');
    const seccion = el => { let sc = ''; el.ownerDocument.querySelectorAll('h1, h2, h3, h4, legend, [class*="sectionhead" i], [class*="section-title" i], [class*="sectiontitle" i], [class*="section-header" i]').forEach(hh => { const t = T(hh.textContent); if (t && t.length < 70 && (hh.compareDocumentPosition(el) & 4)) sc = t; }); return sc; };
    const campos = [], editores = [], grupos = {};
    sdpDocs().forEach((dd, n) => {
      if (n > 0 && (dd.designMode === 'on' || (dd.body && dd.body.isContentEditable))) {
        const f = dd.defaultView.frameElement;
        editores.push({ ventana: n, tipo: 'editor (iframe)', iframe: f ? (f.id || f.name || '') : '', etiqueta: f ? lim(etiquetaDe(f)) : '', texto: val(dd.body && dd.body.textContent) });
        return;
      }
      dd.querySelectorAll('[contenteditable="true"]').forEach(el => {
        if (el.parentElement && el.parentElement.closest('[contenteditable="true"]')) return;
        editores.push({ ventana: n, tipo: 'editor (contenteditable)', id: el.id, etiqueta: lim(etiquetaDe(el)), texto: val(el.textContent) });
      });
      dd.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'hidden' || el.type === 'file' || RUIDO.test(el.name) || RUIDO.test(el.id)) return;
        const df = el.dataset.field || '';
        if (!el.name && !el.id && !df) return;
        const vis = visible(el);
        if (!vis && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA' && !/udf/i.test(el.name + el.id)) return;
        const raw = etiquetaDe(el);
        const base = { ventana: n, seccion: seccion(el), etiqueta: lim(raw), obligatorio: /\*/.test(raw) || el.required ? 'sí' : '', name: el.name, id: el.id, 'data-field': df, visible: vis ? 'sí' : 'no' };
        if (el.type === 'radio' || el.type === 'checkbox') {
          const lb = [...dd.querySelectorAll('label[for]')].find(x => x.htmlFor === el.id);
          const op = lim((lb || el.parentElement).textContent) || el.value;
          const g = grupos[n + '|' + el.name];
          if (g) { g.opciones.push(op); if (el.checked) g.valor = op; return; }
          const f = Object.assign(base, { tipo: el.type === 'radio' ? 'opción única' : 'casilla', valor: el.checked ? op : '', opciones: [op] });
          grupos[n + '|' + el.name] = f; campos.push(f); return;
        }
        if (el.tagName === 'SELECT') {
          const ops = [...el.options].map(o => T(o.textContent)).filter(Boolean);
          const c = s2cont(el), ch = c && c.querySelector('.select2-chosen, .select2-selection__rendered');
          campos.push(Object.assign(base, { tipo: el.multiple ? 'lista múltiple' : (c ? 'lista con buscador' : 'lista'), valor: T(ch ? ch.textContent : [...el.selectedOptions].map(o => o.textContent).join(', ')), opciones: ops.length <= 80 ? ops : ops.slice(0, 30).concat('… (' + ops.length + ' en total)') }));
          return;
        }
        const tipo = el.tagName === 'TEXTAREA' ? 'texto largo' : /_IN_Display$/.test(el.id) ? 'fecha (calendario)' : /^udf_pick_/.test(el.name) ? 'buscador' : 'texto';
        campos.push(Object.assign(base, { tipo, valor: val(el.value) }));
      });
    });
    const botones = [], vistos = new Set();
    sdpDocs().forEach((dd, n) => dd.querySelectorAll('button, input[type=submit], input[type=button], a.btn, [role=button]').forEach(b => {
      const t = T(b.textContent || b.value || b.title);
      if (!t || t.length > 40 || !visible(b) || vistos.has(n + t)) return;
      vistos.add(n + t); botones.push({ ventana: n, texto: t, id: b.id, name: b.name || '' });
    }));
    const q = new URLSearchParams(location.search);
    return { pagina: { titulo: document.title, ruta: location.pathname, modo: q.get('woMode') || '', fecha: new Date().toString(), conValores: !!conValores }, campos, editores, botones: botones.slice(0, 80) };
  };
  /* Exportar el ticket abierto a un .md, para trabajarlo con la IA sin copiar a mano */
  const VACIO = /^(sin especificar|seleccionar|--+|-|:|0|no aplica|no asignado|n\/a|null|n\/d|no esta asociado a ningun sitio)$/i;
  const SALTOS = s => String(s || '').replace(/\r/g, '').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  const LARGOS = ['resumen del caso', 'descripcion', 'comentario de cierre del ticket'];
  const TXT = el => SALTOS(el ? (el.innerText != null ? el.innerText : el.textContent) : '');
  const ESC = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const HUECO = v => !T(v) || VACIO.test(NZ(v));
  /* Campos que se exportan en el modo normal. El resto solo con "Incluir todos los campos",
     porque a la IA le estorba el contexto de más. Los vacíos nunca salen. */
  const BASICO = ['Estado', 'Técnico', 'Tipificacion 1', 'Tipificacion 2', 'Tipificacion 3',
    'TSJ', 'Estado Jira', 'ID de la Cita', 'Especialidad', 'Fecha y hora de la cita',
    'Nombre completo del medico', 'Codigo del medico', 'Modelo Dispositivo', 'Version APP', 'Tipo de Error',
    'Orden de estudio', 'ID de la receta'];
  /* datos del usuario: se toma el del paciente y, si no hay, el del solicitante */
  const USUARIO = [['Nombre del usuario', ['Nombre del paciente', 'Nombre del solicitante']],
    ['Teléfono', ['Telefono de contacto del paciente', 'Telefono del solicitante', 'Telefono origen']],
    ['Documento (DUI)', ['Numero de documento del paciente', 'Numero de documento del solicitante']]];
  const ETQ_VISTA = ['Estado', 'Prioridad', 'Técnico', 'Grupo', 'Nivel', 'Fuente', 'Modo', 'Sitio', 'Departamento',
    'Tipificacion 1', 'Tipificacion 2', 'Tipificacion 3', 'Categoría', 'Subcategoría',
    'Solicitante', 'Tipo de solicitante', 'Nombre del solicitante', 'Numero de documento del solicitante',
    'Telefono del solicitante', 'Fecha de nacimiento del solicitante', 'ID de la interaccion', 'Canal de origen', 'Agente ATU',
    'Nombre del paciente', 'Edad del paciente', 'Numero de documento del paciente', 'Tipo de documento del paciente',
    'Telefono de contacto del paciente', 'Telefono origen', 'Sexo',
    'Resumen del caso', 'Comentario de cierre del ticket', 'TSJ', 'Estado Jira',
    'Modelo Dispositivo', 'Version APP', 'Tipo de Error', 'Proveedor ISP', 'EMBRACE ID',
    'ID de la Cita', 'Especialidad', 'Fecha y hora de la cita', 'Fecha de solicitud de la cita', 'Queja Aplica',
    'Orden de estudio', 'ID de la receta', 'Nombre completo del medico', 'Codigo del medico', 'Medico Gestor',
    '¿Se resolvio en llamada?', 'Relacionado a programa cronico', 'Derivación a especialidad',
    'Fecha de creación', 'Fecha de vencimiento'];
  const TITULOS = ['Descripción', 'Descripcion', 'Description', 'Conversaciones', 'Conversación', 'Notas'];
  const esEtq = t => ETQ_VISTA.some(x => NZ(x) === NZ(t).replace(/\s*[:*]+\s*$/, ''));
  /* Un solo recorrido de la página para ubicar todas las etiquetas. Antes se recorría
     una vez por etiqueta y en un ticket real eso dejaba el panel pegado. */
  const indexar = () => {
    const quiero = new Set(ETQ_VISTA.concat(TITULOS).map(x => NZ(x)));
    const mapa = {};
    for (const d of sdpDocs()) {
      for (const e of d.querySelectorAll('h1,h2,h3,h4,h5,h6,label,legend,b,strong,span,div,td,th,a,p')) {
        if (e.children.length > 1) continue;
        const t = NZ(e.textContent).replace(/\s*[:*]+\s*$/, '');
        if (!t || t.length > 60 || !quiero.has(t)) continue;
        (mapa[t] = mapa[t] || []).length < 4 && mapa[t].push(e);
      }
    }
    return mapa;
  };
  const deMapa = (mapa, nombres) => {
    for (const n of nombres) {
      const c = mapa[NZ(n).replace(/\s*[:*]+\s*$/, '')];
      if (c) { const e = c.find(visible) || c[0]; if (e) return e; }
    }
    return null;
  };
  const valorJunto = el => {
    const bueno = x => {
      const t = TXT(x);
      if (!t || t.length >= 300 || /^(editar|asignar|acciones|respuesta)$/i.test(t)) return '';
      return esEtq(t.split('\n')[0]) ? '' : t;   /* se brincó a la fila de abajo: el campo estaba vacío */
    };
    let n = el.nextElementSibling;
    while (n) { const t = bueno(n); if (t) return t; n = n.nextElementSibling; }
    let p = el.parentElement;
    for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
      let m = p.nextElementSibling;
      while (m) { const t = bueno(m); if (t) return t; m = m.nextElementSibling; }
      const propio = TXT(p).replace(new RegExp('^\\s*' + ESC(T(el.textContent)) + '\\s*[:*]*\\s*'), '');
      if (propio && propio !== TXT(p) && propio.length < 300 && !esEtq(propio.split('\n')[0])) return propio;
    }
    return '';
  };
  const bloqueTras = (el, fines, tope, min, limpiar) => {
    if (!el) return '';
    const cab = T(el.textContent);
    let p = el;
    for (let i = 0; i < 8 && p.parentElement; i++) {
      p = p.parentElement;
      let txt = TXT(p);
      if (txt.length < cab.length + 25) continue;
      txt = txt.replace(new RegExp('^[\\s\\S]{0,80}?' + ESC(cab) + '\\s*'), '');
      for (const f of fines) {
        const m = txt.search(new RegExp('(^|\\n)[ \\t]*' + ESC(f), 'i'));
        if (m > 0) txt = txt.slice(0, m);
      }
      txt = SALTOS(limpiar ? limpiar(txt) : txt);
      if (txt.length >= (min || 1)) return txt.length > (tope || 6000) ? txt.slice(0, tope || 6000) + '\n\n…(recortado)' : txt;
    }
    return '';
  };
  /* PASO 1: leer el ticket una sola vez (esto es lo lento) */
  const leerTicket = () => {
    const q = new URLSearchParams(location.search);
    const num = q.get('woID') || leerSDP().sdp || '';
    const campos = [], puestas = {};
    const add = (et, v) => { if (puestas[NZ(et)]) return; puestas[NZ(et)] = 1; campos.push([et, T(v)]); };
    /* campos de formulario (Editar / Nueva solicitud) */
    const r = mapearPagina(1, 4000);
    r.campos.forEach(c => {
      const et = T(c.etiqueta);
      if (et && et.length <= 70 && !/^(subject|title)$/.test(c.name)) add(et, c.valor);
    });
    const deForm = campos.filter(x => !HUECO(x[1])).length;
    const mapa = indexar();
    /* vista del ticket: los datos son texto, se leen por su etiqueta */
    if (deForm < 5) ETQ_VISTA.forEach(et => { const e = deMapa(mapa, [et]); if (e) add(et, valorJunto(e)); });
    /* descripción: el editor si se está editando; si no, el bloque de la vista */
    let desc = '';
    sdpDocs().forEach(dd => {
      if (dd === document || desc) return;
      if (dd.designMode === 'on' || (dd.body && dd.body.isContentEditable)) {
        const fr = dd.defaultView.frameElement;
        if (fr && visible(fr)) desc = TXT(dd.body);
      }
    });
    if (!desc) sdpDocs().forEach(dd => dd.querySelectorAll('[contenteditable="true"]').forEach(el => {
      if (desc || !visible(el) || (el.parentElement && el.parentElement.closest('[contenteditable="true"]'))) return;
      desc = TXT(el);
    }));
    if (!desc) desc = bloqueTras(deMapa(mapa, ['Descripción', 'Descripcion', 'Description']),
      ['Archivos adjuntos', 'Examinar archivos', 'Responder a todos', 'Conversaciones', 'Agregar notas'], 8000, 25);
    /* la barra de "Conversaciones" trae las casillas pegadas, en una línea o en varias */
    const sinChecks = x => x
      .replace(/Correo electr[oó]nico\s*Notificaciones del sistema\s*Notas\s*(?:Agregar notas)?/gi, '')
      .replace(/^[ \t]*(Correo electr[oó]nico|Notificaciones del sistema|Notas|Agregar notas|Respuesta|Reenviar|Responder a todos)[ \t]*$/gim, '');
    const notas = bloqueTras(deMapa(mapa, ['Conversaciones', 'Conversación', 'Notas']),
      ['Examinar archivos', 'Arrastre los archivos'], 12000, 40, sinChecks);
    /* asunto */
    let asunto = '';
    const ti = buscar(['input[name="subject"]', 'input[name="title"]'], /^titulo( de la solicitud)?$|^asunto$/, 'input');
    if (ti && T(ti.value)) asunto = T(ti.value);
    if (!asunto && num) {
      for (const d of sdpDocs()) {
        const e = [...d.querySelectorAll('h1,h2,h3,h4,span,a')].find(x => x.children.length <= 1 && visible(x)
          && new RegExp('^#?\\s*' + num + '\\b').test(T(x.textContent)) && T(x.textContent).length > String(num).length + 4);
        if (e) { asunto = T(e.textContent); break; }
      }
    }
    if (!asunto) asunto = T(document.title);
    /* el encabezado del ticket trae pegados otros datos: se corta en el primero que aparezca */
    asunto = SALTOS(asunto).split('\n')[0]
      .replace(new RegExp('^#?\\s*' + (num || '\\d{6,}') + '[\\s:–-]*'), '')
      .split(/\s*(?:Fecha de vencimiento|Vencimiento antes|Solicitante\s*:|Due by|Requester\s*:)\s*/)[0]
      .replace(/\s*[|·-]\s*ServiceDesk.*$/i, '').trim();
    return { num, asunto, campos, desc, notas, total: r.campos.length, vista: deForm < 5 };
  };
  /* PASO 2: armar el .md (esto es instantáneo, se puede repetir al cambiar las casillas) */
  const armarMD = (t, todos, sinDatos) => {
    const PERS = /^(nombre|tel[eé]fono|documento|numero de documento|correo|direcci|fecha de nacimiento)/i;
    const val = et => { const f = t.campos.find(x => NZ(x[0]) === NZ(et)); return f ? f[1] : ''; };
    const linea = (et, v) => '- **' + et + ':** ' + (sinDatos && PERS.test(et) ? '(oculto)' : v);
    const cuerpo = [], largos = [];
    const usados = {};
    if (todos) {
      t.campos.forEach(([et, v]) => {
        if (HUECO(v)) return;
        if (LARGOS.includes(NZ(et))) { largos.push([et, v]); return; }
        cuerpo.push(linea(et, v));
      });
    } else {
      BASICO.forEach(et => { const v = val(et); if (!HUECO(v)) { usados[NZ(et)] = 1; cuerpo.push(linea(et, v)); } });
      USUARIO.forEach(([et, opts]) => {
        const o = opts.find(x => !HUECO(val(x)));
        if (o) cuerpo.push(linea(et, val(o)));
      });
      ['Resumen del caso', 'Comentario de cierre del ticket'].forEach(et => { const v = val(et); if (!HUECO(v)) largos.push([et, v]); });
    }
    const out = ['# Ticket SDP' + (t.num ? ' #' + t.num : ''), ''];
    if (t.asunto) out.push('**Asunto:** ' + t.asunto, '');
    out.push('> Exportado el ' + fecha() + ' ' + slotNow() + ' desde ' + location.hostname
      + (t.num ? ' · ' + location.origin + location.pathname + '?woMode=viewWO&woID=' + t.num : ''), '');
    if (cuerpo.length) out.push('## Datos del caso', '', ...cuerpo, '');
    const orden = e => { const i = LARGOS.indexOf(NZ(e)); return i < 0 ? 99 : i; };
    largos.sort((a, b) => orden(a[0]) - orden(b[0])).forEach(([et, v]) => out.push('## ' + et, '', SALTOS(v), ''));
    if (t.desc) out.push('## Descripción', '', t.desc, '');
    if (t.notas) out.push('## Notas y conversaciones', '', t.notas, '');
    return { md: out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n', puestos: cuerpo.length + largos.length };
  };
  function exportarView() {
    header('Exportar ticket', 1);
    foot.style.display = 'none';
    const todos = h('input', { type: 'checkbox' });
    const sinDatos = h('input', { type: 'checkbox' });
    const pv = h('textarea', { cls: 'ot big', spellcheck: false, readonly: true });
    const log = h('div', { cls: 'log' });
    let datos = null;
    const pintar = () => {
      if (!datos) return;
      const r = armarMD(datos, todos.checked, sinDatos.checked);
      pv.value = r.md;
      rc(log, h('div', { cls: r.puestos || datos.desc ? 'ok' : 'bad' },
        (r.puestos || datos.desc ? '✓ ' : '✗ ') + [r.puestos + ' campos', datos.desc ? 'descripción' : '', datos.notas ? 'notas' : ''].filter(Boolean).join(' · ')
        + (datos.vista ? ' (leído de la vista del ticket)' : '')),
        !datos.desc ? h('div', { cls: 'bad' }, 'No encontré la descripción. Abre la pestaña Detalles del ticket y vuelve a tocar Leer.') : null);
    };
    const leer = () => {
      rc(log, h('div', null, 'Leyendo…'));
      try { datos = leerTicket(); pintar(); }
      catch (e) { datos = null; pv.value = ''; rc(log, h('div', { cls: 'bad' }, 'No se pudo leer el ticket: ' + e.message)); }
    };
    rc(main,
      h('p', { cls: 'hint' }, 'Abre el ticket en SDP y toca Leer. Trae lo necesario para trabajarlo con la IA: estado, técnico, tipificaciones, datos del usuario, la descripción y las notas.'),
      h('label', { cls: 'chk' }, todos, 'Incluir todos los campos del ticket'),
      h('label', { cls: 'chk' }, sinDatos, 'Ocultar datos personales (nombre, DUI, teléfono)'),
      h('div', { cls: 'btns' },
        h('button', { cls: 'b p', on: { click: leer } }, 'Leer el ticket'),
        h('button', { cls: 'b', on: { click: () => datos ? out(pv.value, 1) : toast('Primero toca Leer') } }, 'Copiar'),
        h('button', { cls: 'b', on: { click: () => { if (!datos) return toast('Primero toca Leer'); descargar('ticket-' + (datos.num || 'sdp') + '-' + sello() + '.md', pv.value, 'text/markdown'); toast('Descargado'); } } }, 'Descargar .md')),
      log, pv);
    /* al cambiar una casilla solo se vuelve a armar el texto, no se relee la página */
    [todos, sinDatos].forEach(x => x.addEventListener('change', pintar));
    main.scrollTop = 0;
  }
  function mapearView() {
    header('Mapear campos', 1);
    foot.style.display = 'none';
    const conVal = h('input', { type: 'checkbox' });
    const log = h('div', { cls: 'log' });
    rc(main,
      h('p', { cls: 'hint' }, 'Abre el formulario (ej. Nueva solicitud en SDP), elige la tipificación como siempre para que aparezcan todos sus campos y toca Mapear. Se descarga un .json con cada campo: etiqueta, nombre interno, tipo y opciones.'),
      h('label', { cls: 'chk' }, conVal, 'Incluir lo escrito en los campos (solo si no hay datos de pacientes)'),
      h('button', { cls: 'b p', on: { click: () => {
        try {
          const r = mapearPagina(conVal.checked);
          descargar('campos-' + (location.hostname.split('.')[0] || 'pagina') + '-' + (r.pagina.modo || 'form') + '-' + sello() + '.json', jsonStr(r, null, 2), 'application/json');
          rc(log, h('div', { cls: 'ok' }, '✓ ' + r.campos.length + ' campos (' + r.campos.filter(c => c.etiqueta).length + ' con etiqueta), ' + r.editores.length + ' editores y ' + r.botones.length + ' botones. Se descargó el .json.'));
          toast('Campos mapeados');
        } catch (e) { rc(log, h('div', { cls: 'bad' }, 'No se pudo mapear: ' + e.message)); }
      } } }, 'Mapear y descargar .json'),
      log);
    main.scrollTop = 0;
  }
  /* Vista N2: bandeja de seguimiento, por ahora solo con datos de prueba */
  const PRUEBA = {
    res: 'PRUEBA DEL SCRIPT - no es un caso real. Este texto es solo para comprobar que el llenado automatico funciona; debe cambiarse por el resumen real antes de guardar el ticket.',
    mod: 'PRUEBA-SM-A057M',
    ver: '0.0.0-PRUEBA' };
  function seguimientoView() {
    header('Bandeja de seguimiento', 1);
    foot.style.display = 'none';
    const errOps = opcionesDe(['select[name="udf_pick_8405"]', '#s2id_udf_pick_8405'], /^tipo de error$/);
    const qOps = opcionesDe(['select[name="udf_pick_3003"]', '#s2id_udf_pick_3003'], /^queja aplica$/);
    const lista = (ops, def) => h('select', null, ops.map(x => h('option', { value: x, selected: x === def }, x)));
    const err = errOps.length ? lista(errOps, errOps[0]) : h('input', { type: 'text', placeholder: 'Escríbelo igual que en la lista de SDP' });
    const queja = qOps.length ? lista(qOps, qOps.find(x => /^no$/i.test(x)) || qOps[0]) : h('input', { type: 'text', value: 'No' });
    const res = h('textarea', { cls: 'ot big', value: PRUEBA.res, spellcheck: false });
    const mod = h('input', { type: 'text', value: PRUEBA.mod }), ver = h('input', { type: 'text', value: PRUEBA.ver });
    const vac = h('input', { type: 'checkbox', checked: true });
    const campo = (l, el) => h('div', { cls: 'f' }, h('label', { cls: 'l' }, l), el);
    const log = h('div', { cls: 'log' });
    const btn = h('button', { cls: 'b p', on: { click: async () => {
      btn.disabled = true; rc(log, h('div', null, 'Llenando…'));
      const r = [];
      try {
        await gSeguimiento(r, { err: err.value, queja: queja.value, res: res.value, mod: mod.value, ver: ver.value, soloVacios: vac.checked });
      } catch (e) { r.push('✗ Error: ' + e.message); }
      if (!r.length) r.push('✗ No hay datos para llenar');
      rc(log, r.map(x => h('div', { cls: x[0] === '✓' ? 'ok' : 'bad' }, x)));
      toast(r.some(x => x[0] === '✗') ? 'Llenado con avisos' : 'Listo, revisa y cambia los datos');
      btn.disabled = false;
    } } }, 'Llenar con datos de prueba');
    rc(main,
      h('div', { cls: 'aviso' }, h('b', null, '⚠️ Solo datos de prueba'),
        h('p', null, 'Este apartado está para comprobar que el script llena bien los campos de la bandeja de seguimiento. Lo que escribe lleva la palabra PRUEBA a propósito: cámbialo por los datos reales antes de guardar el ticket. No guarda nada por sí solo.')),
      h('p', { cls: 'hint' }, 'Abre el ticket de seguimiento en Editar y toca el botón.'
        + (errOps.length ? ' Las opciones de Tipo de Error y Queja Aplica se leyeron de este ticket.' : ' No pude leer las listas de este ticket: escribe el Tipo de Error igual que aparece en SDP.')),
      campo('Tipo de Error', err),
      campo('Queja Aplica', queja),
      campo('Resumen del caso', res),
      h('div', { cls: 'r2' }, campo('Modelo Dispositivo', mod), campo('Versión APP', ver)),
      h('label', { cls: 'chk' }, vac, 'Modelo y versión solo si están vacíos'),
      h('div', { cls: 'f sdpbox' }, btn, log));
    main.scrollTop = 0;
  }

  /* Vista: Gestión de ticket (SDP) — 3 bloques independientes + "Llenar todo" */
  function gestionView() {
    header('Gestión de ticket', 1);
    foot.style.display = 'none';
    const inp = (ph, val) => h('input', { type: 'text', placeholder: ph || '', value: val || '' });
    const campo = (l, el) => h('div', { cls: 'f' }, h('label', { cls: 'l' }, l), el);
    const mod = inp('Ej. SM-A057M'), ver = inp('Ej. 2.4.1');
    const fila = h('textarea', { cls: 'ot', placeholder: 'Pega aquí la fila de la hoja y se llenan los datos de abajo (opcional)' });
    const idc = inp('Ej. 8852831'), esp = inp('Ej. Medicina General'), fec = inp('aaaa/mm/dd'), hor = inp('14:30');
    const queja = h('select', { on: { change: () => { st.gQueja = queja.value; save(); } } },
      ['Sí', 'No', 'No tocar'].map(x => h('option', { value: x, selected: x === (st.gQueja || 'Sí') }, x)));
    const tsj = inp('Ej. TSJ-13790 o 13790'), est = inp('', 'En curso proveedor');
    fila.addEventListener('input', () => {
      const p = leerFila(fila.value);
      if (!p) return;
      idc.value = p.id; esp.value = p.esp; fec.value = p.fecha; hor.value = p.hora;
      toast('Datos tomados de la fila');
    });
    const log = h('div', { cls: 'log' });
    const botones = [];
    const correr = async tareas => {
      botones.forEach(b => { b.disabled = true; });
      rc(log, h('div', null, 'Llenando…'));
      const r = [];
      try { for (const t of tareas) await t(r); } catch (e) { r.push('✗ Error: ' + e.message); }
      if (!r.length) r.push('✗ No hay datos para llenar');
      rc(log, r.map(x => h('div', { cls: x[0] === '✓' ? 'ok' : 'bad' }, x)));
      toast(r.some(x => x[0] === '✗') ? 'Llenado con avisos' : 'Listo, revisa y guarda');
      botones.forEach(b => { b.disabled = false; });
      try { log.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    };
    const tMod = r => gModelo(r, { mod: mod.value, ver: ver.value });
    const tCita = r => gCita(r, { id: idc.value, esp: esp.value, fecha: fec.value, hora: hor.value, queja: queja.value });
    const tTsj = r => gTsj(r, { tsj: tsj.value, est: est.value });
    const boton = (txt, fn, p) => { const b = h('button', { cls: 'b' + (p ? ' p' : ''), on: { click: fn } }, txt); botones.push(b); return b; };
    rc(main,
      h('p', { cls: 'hint' }, 'Abre el ticket en Editar (o Nueva solicitud). Cada bloque tiene su botón; "Llenar todo" llena solo los bloques con datos. No guarda: revisa y guarda tú.'),
      h('div', { cls: 'card' }, h('h4', null, '📱 Modelo'),
        h('div', { cls: 'r2' }, campo('Modelo Dispositivo', mod), campo('Versión APP', ver)),
        boton('Llenar modelo', () => correr([tMod]))),
      h('div', { cls: 'card' }, h('h4', null, '📅 Datos de la cita'),
        campo('Fila de la hoja', fila),
        h('div', { cls: 'r2' }, campo('ID de la cita', idc), campo('Especialidad', esp)),
        h('div', { cls: 'r2' }, campo('Fecha', fec), campo('Hora (24 h)', hor), campo('Queja Aplica', queja)),
        boton('Llenar cita', () => correr([tCita]))),
      h('div', { cls: 'card' }, h('h4', null, '🔗 TSJ y Estado Jira'),
        h('div', { cls: 'r2' }, campo('TSJ', tsj), campo('Estado Jira', est)),
        boton('Poner TSJ y estado', () => correr([tTsj]))),
      h('div', { cls: 'btns' }, boton('Llenar todo', () => correr([
        r => (T(mod.value) || T(ver.value) ? tMod(r) : null),
        r => (T(idc.value) || T(esp.value) || T(fec.value) ? tCita(r) : null),
        r => (T(tsj.value) ? tTsj(r) : null)]), 1)),
      h('div', { cls: 'f sdpbox' }, log));
    main.scrollTop = 0;
  }
  function redView() {
    header('Grabar red y consola', 1);
    foot.style.display = 'none';
    const estado = h('div', { cls: 'rec' }), acc = h('div', { cls: 'recacc' }), logB = h('div', { cls: 'log' }), logH = h('div', { cls: 'log' });
    const cuenta = () => { const ev = (REC && REC.ev) || []; const rq = ev.filter(esReq); return { rq: rq.length, mal: rq.filter(fallo).length, cons: ev.filter(e => e.tipo === 'console' || e.tipo === 'error').length, ev: ev.length }; };
    const pintarEstado = () => {
      const c = cuenta();
      if (REC && REC.activo) rc(estado, ...[h('b', { cls: 'on' }, '● Grabando · ' + mmss(Date.now() - REC.inicio)), h('span', null, c.rq + ' solicitudes · ' + c.mal + ' con error · ' + c.cons + ' de consola'), REC.filtro ? h('span', null, 'Siguiendo solo: ' + REC.filtro) : null, h('span', null, 'Pantalla actual: ' + rutaActual()), REC.host !== location.host ? h('span', { cls: 'warnt' }, 'Se inició en ' + REC.host + '; aquí solo se agrega lo de esta página.') : null].filter(Boolean));
      else if (REC) rc(estado, h('b', null, 'Grabación detenida'), h('span', null, c.ev + ' eventos · ' + c.rq + ' solicitudes · ' + c.mal + ' con error'));
      else rc(estado, h('b', null, 'Sin grabación'), h('span', null, 'Funciona en cualquier página: graba sus solicitudes (headers, payload y respuesta), WebSocket, consola y errores.'));
    };
    const bajarMD = () => { descargar('red-' + ((REC && REC.host) || 'pagina').replace(/[^\w.-]/g, '_') + '-' + sello() + '.md', generarMD(REC)); toast('Descargado .md'); };
    const pintar = () => {
      pintarEstado();
      if (REC && REC.activo) {
        const nota = h('input', { type: 'text', placeholder: 'Ej. inicia traslado, entra llamada…' });
        const marcar = () => { recMarcar(nota.value); nota.value = ''; toast('Paso marcado'); pintarEstado(); };
        nota.addEventListener('keydown', e => { if (e.key === 'Enter') marcar(); });
        rc(acc, 
          h('div', { cls: 'row' }, nota, h('button', { cls: 'cp', on: { click: marcar } }, 'Marcar paso')),
          h('button', { cls: 'b p', on: { click: () => { recDetener(); bajarMD(); pintar(); header('Grabar red y consola', 1); } } }, 'Detener y descargar .md'));
      } else if (REC) {
        rc(acc, h('div', { cls: 'btns' },
          h('button', { cls: 'b p', on: { click: bajarMD } }, 'Descargar .md'),
          h('button', { cls: 'b', on: { click: () => { recBorrar(); pintar(); } } }, 'Nueva'),
          h('button', { cls: 'b', on: { click: () => { recBorrar(); pintar(); } } }, 'Borrar')),
          h('p', { cls: 'hint' }, 'Nueva y Borrar descartan esta grabación; descárgala antes si la necesitas.'));
      } else {
        const filtro = h('input', { type: 'text', value: st.filtroRed || '', placeholder: 'Ej. /api/  o  api.misitio.com  (vacío = todo)' });
        rc(acc, 
          h('div', { cls: 'f' }, h('label', { cls: 'l' }, 'Seguir solo URLs que contengan (opcional)'), filtro),
          h('button', { cls: 'b p', on: { click: () => { st.filtroRed = rT(filtro.value); save(); recIniciar(filtro.value); pintar(); header('Grabar red y consola', 1); toast('Grabando'); } } }, 'Iniciar grabación'));
      }
    };
    let confirmar = false;
    const bBorrar = h('button', { cls: 'b', on: { click: async () => {
      if (!confirmar) { confirmar = true; bBorrar.textContent = '¿Seguro? Cerrará tu sesión. Toca otra vez'; setTimeout(() => { confirmar = false; bBorrar.textContent = 'Borrar cookies y datos de este sitio'; }, 5000); return; }
      confirmar = false; bBorrar.textContent = 'Borrar cookies y datos de este sitio';
      const r = await borrarDatosSitio();
      rc(logB, ...r.map(x => h('div', { cls: 'ok' }, '✓ ' + x)), h('div', { cls: 'bad' }, 'Las cookies protegidas (HttpOnly) no se pueden borrar desde aquí. Para dejarlo todo limpio: F12 → Application → Storage → Clear site data.'));
      pintarEstado();
    } } }, 'Borrar cookies y datos de este sitio');
    const fHar = h('input', { type: 'file', accept: '.har,application/json' }), fCon = h('input', { type: 'file', accept: '.log,.txt,text/plain' });
    const tHar = h('textarea', { placeholder: 'O pega aquí el HAR (Copy all as HAR)', spellcheck: false }), tCon = h('textarea', { placeholder: 'O pega aquí el texto de la consola', spellcheck: false });
    const soloApi = h('input', { type: 'checkbox', checked: true });
    const bHar = h('button', { cls: 'b p', on: { click: async () => {
      const f = fHar.files && fHar.files[0];
      const txt = f ? await f.text() : tHar.value.trim();
      if (!txt) { rc(logH, h('div', { cls: 'bad' }, 'Carga el archivo .har o pega el HAR en el cuadro.')); return; }
      try {
        logH.textContent = 'Leyendo…';
        const ev = harAEventos(JSON.parse(txt), soloApi.checked);
        const ts = ev.map(e => e.t0).filter(x => x > 0);
        let host = ''; try { host = new URL((ev.find(e => e.url && /^http/.test(e.url)) || {}).url).host; } catch (_) {}
        const c = fCon.files && fCon.files[0], ctx = c ? await c.text() : tCon.value.trim();
        const extra = ctx ? '## Consola (exportada de DevTools)\n\n' + cerco(corta(enmascarar(ctx), 200000)) : '';
        const R = { origen: 'DevTools (' + (f ? f.name : 'HAR pegado') + ')', host, inicio: Math.min(...ts), fin: Math.max(...ts), ev };
        descargar('red-' + (host || 'har').replace(/[^\w.-]/g, '_') + '-' + sello() + '.md', generarMD(R, extra));
        rc(logH, h('div', { cls: 'ok' }, '✓ Listo: ' + ev.filter(esReq).length + ' solicitudes (' + ev.filter(fallo).length + ' con error). Se descargó el .md.'));
      } catch (e) { rc(logH, h('div', { cls: 'bad' }, 'No se pudo leer: ' + e.message + '. Revisa que sea un HAR completo.')); }
    } } }, 'Convertir a .md');
    rc(main, 
      estado, acc,
      h('details', { cls: 'ayuda', open: !REC },
        h('summary', null, 'Cómo grabar (cualquier página)'),
        h('ol', null,
          h('li', null, 'Abre la página que quieres analizar y este panel.'),
          h('li', null, 'Opcional: escribe una parte de la URL para seguir solo esas solicitudes (ej. /api/).'),
          h('li', null, 'Si hay que empezar limpio, usa "Borrar cookies y datos" de abajo (cierra la sesión) y luego Iniciar grabación.'),
          h('li', null, 'Navega normal. Cada cambio de pantalla queda anotado con sus endpoints.'),
          h('li', null, 'Si la página se recarga (p. ej. al iniciar sesión), toca el marcador otra vez: la grabación sigue.'),
          h('li', null, 'Usa Marcar paso para anotar qué estás haciendo. Al final, Detener y descargar .md.')),
        h('p', { cls: 'hint' }, 'Desde la página no se ven las cookies ni los encabezados que agrega el navegador, ni lo que pasa durante una recarga. Para eso usa DevTools (abajo).')),
      h('div', { cls: 'sec' }, h('label', { cls: 'l' }, 'Empezar desde cero'), bBorrar, logB),
      h('details', { cls: 'ayuda' },
        h('summary', null, 'Desde DevTools: más completo (todos los headers, cookies y el login)'),
        h('ol', null,
          h('li', null, 'Abre DevTools con F12 y entra a la pestaña Network (Red).'),
          h('li', null, 'Marca "Preserve log" (Conservar registro) para que no se borre al recargar.'),
          h('li', null, 'Haz el proceso: iniciar sesión, navegar, llamada, traslado…'),
          h('li', null, 'Saca el HAR de una de estas formas:'),
          h('li', { cls: 'sub' }, 'a) Botón ⤓ "Export HAR" en la barra de arriba de Network: se descarga un archivo .har.'),
          h('li', { cls: 'sub' }, 'b) Clic derecho en cualquier fila de la lista → Copy → "Copy all as HAR", y pégalo abajo.'),
          h('li', null, 'Consola (opcional): clic derecho dentro de Console → "Save as…" guarda un .log; cárgalo abajo. También puedes copiar el texto y pegarlo.')),
        h('div', { cls: 'f' }, h('label', { cls: 'l' }, 'HAR'), fHar, tHar),
        h('div', { cls: 'f' }, h('label', { cls: 'l' }, 'Consola (opcional)'), fCon, tCon),
        h('label', { cls: 'chk' }, soloApi, 'Solo API, documentos, WebSocket y errores (sin imágenes ni estilos)'),
        bHar, logH));
    pintar();
    const iv = setInterval(() => { if (!estado.isConnected) { clearInterval(iv); return; } pintarEstado(); }, 1000);
    main.scrollTop = 0;
  }

  const last = {};
  function groups(a) {
    header(a.n, 1);
    foot.style.display = 'none';
    let sal = st.salMed !== false;
    const shown = h('div', { cls: 'last' });
    const pick = g => {
      const l = g[2]; let i;
      do { i = Math.floor(Math.random() * l.length); } while (l.length > 1 && i === last[g[0]]);
      last[g[0]] = i;
      const t = g[1] && sal ? greet() + ', ' + l[i] : cap(l[i]);
      shown.textContent = t;
      out(t, 3);
    };
    rc(main, 
      h('p', { cls: 'hint' }, 'Un clic escribe la respuesta en el chat y la copia.'),
      a.groups.some(g => g[1]) && h('label', { cls: 'chk' }, h('input', { type: 'checkbox', checked: sal, on: { change: e => { sal = st.salMed = e.target.checked; save(); } } }), 'Saludo en "Enseguida" (' + greet() + ')'),
      h('div', { cls: 'grid g3' }, a.groups.map(g => h('button', { cls: 'act sm', title: g[2].map(cap).join('\n'), on: { click: () => pick(g) } }, g[0]))),
      shown);
  }

  function quick(a) {
    header(a.n, 1);
    foot.style.display = 'none';
    rc(main, 
      h('p', { cls: 'hint' }, 'Un clic escribe la respuesta en el chat abierto y la copia.'),
      h('div', { cls: 'q' }, a.quick.map(t => h('button', { cls: 'act', on: { click: () => out(t, 3) } }, t))));
  }

  const empty = x => Array.isArray(x) ? !x.some(p => Array.isArray(p) ? p.some(s => T(s)) : T(p)) : !T(String(x == null ? '' : x));

  function form(a) {
    header(a.n, 1);
    const v = { _i: {} }, picks = {};
    v._pick = (key, list) => {
      if (picks[key] == null) {
        /* recorre todas las redacciones antes de repetir y nunca repite la última */
        const lv = st.lv = st.lv || {};
        let used = (Array.isArray(lv[key]) ? lv[key] : []).filter(n => n < list.length);
        if (used.length >= list.length) used = used.slice(-1);
        const pool = list.map((_, n) => n).filter(n => !used.includes(n));
        const i = pool[Math.floor(Math.random() * pool.length)];
        picks[key] = i; used.push(i); lv[key] = used; save();
      }
      return list[picks[key] % list.length];
    };
    a.f.forEach(f => {
      let x = typeof f.d === 'function' ? f.d() : f.d;
      if (f.t === 'sel') x = x != null ? x : f.o[0];
      else if (f.t === 'loc') { const lo = f.o || LOCS; x = lo.includes(st.loc) ? st.loc : lo[0]; }
      else if (f.t === 'chk') x = !!x;
      else if (f.t === 'chks') x = (x || []).slice();
      else if (f.t === 'pairs') x = [['', '', '']];
      else x = x || '';
      if (f.mem && st['m_' + f.k] != null) x = st['m_' + f.k];
      v[f.k] = x;
    });
    let sal = !!a.sal;
    const wraps = [];
    const pv = h('textarea', { cls: 'pv', spellcheck: false });
    const warn = h('div', { cls: 'warn' });
    const vis = f => !f.show || f.show(v);
    const oth = {};
    const upd = () => {
      a.f.forEach(f => { if (f.t === 'sel') v._i[f.k] = f.o.indexOf(v[f.k]); });
      wraps.forEach(([f, el]) => {
        el.style.display = vis(f) ? '' : 'none';
        if (f.p3) el.querySelectorAll('.p3').forEach(x => { x.style.display = !f.show3 || f.show3(v) ? '' : 'none'; });
      });
      const miss = a.f.filter(f => vis(f) && (f.req || (f.reqIf && f.reqIf(v))) && empty(v[f.k])).map(f => f.l.replace(/ \(.*\)$/, ''));
      warn.textContent = miss.length ? 'Falta: ' + miss.join(', ') : '';
      let t;
      try { t = a.g(v); } catch (e) { t = '(error al generar: ' + e.message + ')'; }
      if (a.outs) { a.outs.forEach(([k]) => { oth[k].value = typeof t === 'object' ? t[k] : t; }); return; }
      if (sal) t = greet() + ', ' + lf(t);
      pv.value = t;
    };
    /* permite que un campo (p. ej. el correo pegado) rellene a los demás y se vea en pantalla */
    const els = {};
    const poner = (k, val) => {
      const ff = a.f.find(x => x.k === k);
      if (!ff || val == null || val === '') return;
      v[k] = val;
      const el = els[k];
      if (!el) return;
      if (ff.t === 'chk') el.checked = !!val;
      else if (ff.t === 'chks') el.querySelectorAll('input').forEach((x, i) => { x.checked = val.includes(ff.o[i]); });
      else if (ff.t === 'pairs') { if (redraw[k]) redraw[k](); }
      else el.value = val;
    };
    const redraw = {};
    const fld = f => {
      let inp;
      const on = val => { v[f.k] = val; if (f.t === 'loc') { st.loc = val; save(); } if (f.mem) { st['m_' + f.k] = val; save(); } upd(); };
      switch (f.t) {
        case 'txt': inp = h('input', { type: 'text', value: v[f.k], placeholder: f.ph || '', on: { input: e => { on(e.target.value); if (f.auto) { f.auto(e.target.value, poner, v); upd(); } } } }); break;
        case 'area': inp = h('textarea', { value: v[f.k], placeholder: f.ph || '', on: { input: e => { on(e.target.value); if (f.auto) { f.auto(e.target.value, poner, v); upd(); } } } }); break;
        case 'sel': case 'loc': {
          const o = f.t === 'loc' ? (f.o || LOCS) : f.o;
          inp = h('select', { on: { change: e => { on(e.target.value); if (f.auto) { f.auto(e.target.value, poner, v); upd(); } } } }, o.map(x => h('option', { value: x, selected: x === v[f.k] }, x)));
          break;
        }
        case 'chk': {
          const cb = h('input', { type: 'checkbox', checked: v[f.k], on: { change: e => on(e.target.checked) } });
          els[f.k] = cb;
          return h('div', { cls: 'f' }, h('label', { cls: 'chk' }, cb, f.l));
        }
        case 'chks':
          inp = h('div', { cls: 'chks' }, f.o.map(x => h('label', { cls: 'pill' },
            h('input', { type: 'checkbox', checked: v[f.k].includes(x), on: { change: e => { const s = new Set(v[f.k]); e.target.checked ? s.add(x) : s.delete(x); on(f.o.filter(y => s.has(y))); } } }), x)));
          break;
        case 'pairs': {
          const box = h('div');
          const draw = () => rc(box,
            ...v[f.k].map((p, i) => h('div', { cls: 'row' },
              h('input', { type: 'text', placeholder: f.p1 || 'Nombre completo', value: p[0], on: { input: e => { p[0] = e.target.value; upd(); } } }),
              h('input', { type: 'text', placeholder: f.p2 || ('usuario' + DOM), value: p[1], on: { input: e => { p[1] = e.target.value; upd(); } } }),
              f.p3 ? h('input', { cls: 'p3', type: 'text', placeholder: f.p3, value: p[2] || '', on: { input: e => { p[2] = e.target.value; upd(); } } }) : null,
              v[f.k].length > 1 ? h('button', { cls: 'ib', title: 'Quitar', on: { click: () => { v[f.k].splice(i, 1); draw(); upd(); } } }, '✕') : null)),
            h('button', { cls: 'add', on: { click: () => { v[f.k].push(['', '', '']); draw(); upd(); } } }, f.mas || '+ Agregar otro médico'));
          redraw[f.k] = draw; draw(); inp = box; break;
        }
      }
      els[f.k] = inp;
      return h('div', { cls: 'f' }, h('label', { cls: 'l' }, f.l + (f.req ? ' *' : '')), inp);
    };
    rc(main, ...a.f.map(f => { const el = fld(f); wraps.push([f, el]); return el; }));
    main.scrollTop = 0;
    if (a.outs) {
      foot.style.display = 'none';
      main.append(h('div', { cls: 'outs' },
        h('p', { cls: 'hint' }, 'Campos del ticket: copia cada uno y pégalo en SDP. Puedes editarlos aquí antes de copiar.'), warn,
        a.outs.map(([k, l]) => {
          oth[k] = h('textarea', { cls: 'ot' + (k === 'des' ? ' big' : ''), spellcheck: false });
          return h('div', { cls: 'f' }, h('div', { cls: 'oh' }, h('label', { cls: 'l' }, l), h('button', { cls: 'cp', on: { click: () => out(oth[k].value, 1) } }, 'Copiar')), oth[k]);
        }),
        a.sdp && (() => {
          const log = h('div', { cls: 'log' });
          const btn = h('button', { cls: 'b p', on: { click: async () => {
            btn.disabled = true; log.textContent = 'Llenando…';
            try {
              const o = {}; a.outs.forEach(([k]) => { o[k] = oth[k].value; });
              const tm = (v.locs.find(x => /^TM\d/.test(x)) || '').replace('TM', 'Telemedicina ');
              const r = await llenarSDP(o, v.llt2 ? [v.t1, v.t2, T(v.t3) || tm] : []);
              rc(log, ...r.map(x => h('div', { cls: x[0] === '✓' ? 'ok' : 'bad' }, x)));
              toast(r.some(x => x[0] === '✗') ? 'Llenado con avisos' : 'Campos llenados en SDP');
            } catch (e) { log.textContent = 'Error: ' + e.message; }
            btn.disabled = false;
          } } }, 'Llenar en SDP');
          return h('div', { cls: 'f sdpbox' }, btn, h('p', { cls: 'hint' }, 'Abre el ticket en SDP y toca el botón. No guarda ni cierra: revisa y guarda tú.'), log);
        })()));
      upd();
      const first = main.querySelector('input[type=text]');
      if (first && !first.value) first.focus();
      return;
    }
    foot.style.display = '';
    rc(foot, 
      h('label', { cls: 'chk' }, h('input', { type: 'checkbox', checked: sal, on: { change: e => { sal = e.target.checked; upd(); } } }), 'Incluir saludo (' + greet() + ')'),
      pv, warn,
      a.vary && h('button', { cls: 'add', on: { click: () => { for (const k in picks) delete picks[k]; upd(); } } }, '↻ Otra redacción'),
      h('div', { cls: 'btns' },
        h('button', { cls: 'b p', on: { click: () => out(pv.value, 3) } }, 'Escribir + copiar'),
        h('button', { cls: 'b', on: { click: () => out(pv.value, 1) } }, 'Copiar'),
        h('button', { cls: 'b', on: { click: () => out(pv.value, 2) } }, 'Escribir')));
    upd();
    const first = main.querySelector('input[type=text],textarea');
    if (first) first.focus();
  }

  /* Arma el panel dentro del iframe. Si el navegador lo recarga (queda en blanco) o la página lo quita, se vuelve a armar. */
  const montar = () => {
    d = fr.contentDocument; w = fr.contentWindow;
    if (!d || !d.body) return;
    if (dark) d.documentElement.className = 'dark';
    try { const sh = new w.CSSStyleSheet(); sh.replaceSync(CSS); d.adoptedStyleSheets = [sh]; }
    catch (e) { const s = d.createElement('style'); s.textContent = CSS; d.head.appendChild(s); }
    hdr = h('header'); main = h('main'); foot = h('div', { cls: 'foot' }); toastEl = h('div', { cls: 'toast' });
    d.body.append(hdr, main, foot, toastEl);
    hdr.addEventListener('pointerdown', arrastrar);
    d.body.classList.toggle('min', !!st.min);
    home();
  };
  fr.addEventListener('load', () => { if (!cerrado && fr.contentDocument && fr.contentDocument !== d) montar(); });
  montar();
  const vigia = setInterval(() => {
    if (cerrado || window.__n1kitId !== INST) { clearInterval(vigia); return; }
    if (!fr.isConnected) { place(); document.body.appendChild(fr); return; }
    if (fr.contentDocument !== d || !(d.body && d.body.firstChild)) montar();
  }, 1500);
})();
