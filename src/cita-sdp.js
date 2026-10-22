/* Cita SDP — copia la fila de la agenda, toca el marcador y llena el ticket.
   Llena: ID de la Cita (udf_long_2402), Especialidad (udf_pick_3902) y
   Fecha y hora de la cita (udf_date_628) con la HORA DE INICIO.
   Sin ventanas ni formularios: la fila se lee del portapapeles. */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const T = s => (s == null ? '' : String(s)).replace(/\s+/g, ' ').trim();
  const N = s => T(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const V = e => !!e && e.getClientRects().length > 0;
  const P2 = n => String(n).padStart(2, '0');

  const docs = [];
  (function walk(d) {
    try {
      docs.push(d);
      d.querySelectorAll('iframe').forEach(f => { try { if (f.contentDocument) walk(f.contentDocument); } catch (e) {} });
    } catch (e) {}
  })(document);
  const Q = sel => { for (const d of docs) { try { const e = d.querySelector(sel); if (e) return e; } catch (x) {} } return null; };
  const QV = sel => { for (const d of docs) { try { const e = [...d.querySelectorAll(sel)].find(V); if (e) return e; } catch (x) {} } return null; };

  /* escribe en un input como lo haría una persona */
  const S = (el, val) => {
    const w = el.ownerDocument.defaultView;
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    el.focus();
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
    ['input', 'change'].forEach(t => el.dispatchEvent(new w.Event(t, { bubbles: true })));
    el.dispatchEvent(new w.KeyboardEvent('keyup', { bubbles: true, key: 'a', code: 'KeyA', keyCode: 65, which: 65 }));
    try { if (w.jQuery) w.jQuery(el).trigger('change'); } catch (e) {}
  };
  const C = el => {
    if (!el) return;
    const w = el.ownerDocument.defaultView;
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(t => {
      const K = t.startsWith('pointer') && w.PointerEvent ? w.PointerEvent : w.MouseEvent;
      el.dispatchEvent(new K(t, { bubbles: true, cancelable: true, view: w, button: 0 }));
    });
  };
  const tecla = (el, k, a, b) => {
    const w = el.ownerDocument.defaultView, kc = k === 'ArrowUp' ? 38 : k === 'ArrowDown' ? 40 : k === 'Tab' ? 9 : 13;
    el.focus();
    if (a != null) { try { el.setSelectionRange(a, b); } catch (x) {} }
    ['keydown', 'keyup'].forEach(t => el.dispatchEvent(new w.KeyboardEvent(t, { bubbles: true, cancelable: true, key: k, code: k, keyCode: kc, which: kc })));
  };

  const DR = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/;          /* 2026/10/16 */
  const DR2 = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;          /* 16/10/2026 */
  const HR = /^(\d{1,2}):(\d{2})/;
  const fechaDe = c => { let m = c.match(DR); if (m) return [+m[1], +m[2], +m[3]]; m = c.match(DR2); return m ? [+m[3], +m[2], +m[1]] : null; };

  /* La tabla cambia de columnas (Id Cupo, Tipo de consulta...), así que no se usan
     posiciones fijas: se busca la fecha, la especialidad es la celda de antes y la
     hora de inicio es la primera hora que aparece después. */
  const partir = (txt, lista) => {
    const lineas = txt.split(/\r?\n/).filter(l => T(l));
    const fila = lineas.reverse().find(l => /\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/.test(l)) || lineas[0] || '';
    let celdas = fila.split('\t').map(c => T(c.replace(/ /g, ' ')));
    if (celdas.filter(c => c).length < 3) celdas = fila.split(/\s{2,}|\t/).map(c => T(c.replace(/ /g, ' ')));
    const llenas = celdas.filter(c => c);
    const i = celdas.findIndex(c => fechaDe(c));
    const r = { id: '', esp: '', f: null, h: null, cols: llenas.length, crudo: T(fila).slice(0, 160) };
    if (i >= 0) {
      r.f = fechaDe(celdas[i]);
      for (let k = i - 1; k >= 0; k--) if (celdas[k]) { r.esp = celdas[k]; break; }
      for (let k = i + 1; k < celdas.length; k++) { const m = celdas[k].match(HR); if (m) { r.h = [+m[1], +m[2]]; break; } }
      r.id = ((llenas[0] || '').match(/\d+/) || [''])[0];
      return r;
    }
    /* Sin columnas: el cuadro del navegador borra los tabuladores y el texto llega pegado
       ("72420435840809NoVideollamada..."). Se rescata lo que se puede reconocer solo:
       la fecha y la hora por su forma, y la especialidad comparándola con la lista del ticket.
       El ID no siempre se puede separar del de al lado, y eso se avisa en vez de inventarlo. */
    const b = T(fila);
    const mf = b.match(/(\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\s*(\d{1,2}:\d{2})?/);
    if (!mf) return r;
    r.pegado = true;
    r.f = fechaDe(mf[1]);
    if (mf[2]) { const m = mf[2].match(HR); r.h = [+m[1], +m[2]]; }
    const antes = b.slice(0, b.indexOf(mf[1]));
    const nA = N(antes);
    /* la especialidad es la opción de la lista del ticket con la que termina el texto */
    const cand = (lista || []).filter(o => N(o) && nA.endsWith(N(o))).sort((a, b2) => N(b2).length - N(a).length)[0];
    if (cand) r.esp = cand;
    const dig = (antes.match(/^\D*(\d+)/) || [])[1] || '';
    if (dig && dig.length <= 8) r.id = dig; else if (dig) r.idPegado = dig;
    return r;
  };

  /* ---------- 2. listas con buscador (select2 de SDP) ---------- */
  const abierta = d => [...d.querySelectorAll('.select2-drop-active, .select2-container--open .select2-dropdown')]
    .find(x => x.getClientRects().length && !x.classList.contains('select2-display-none'));
  const ponerLista = async (cont, texto) => {
    const d = cont.ownerDocument, w = d.defaultView, t = N(texto);
    const orig = cont.id && cont.id.startsWith('s2id_') ? d.getElementById(cont.id.slice(5)) : null;
    if (orig && orig.tagName === 'SELECT' && orig.options.length) {
      const op = [...orig.options].find(o => N(o.textContent) === t) || [...orig.options].find(o => N(o.textContent).includes(t));
      if (op) {
        orig.value = op.value;
        try { if (w.jQuery) w.jQuery(orig).val(op.value).trigger('change'); else orig.dispatchEvent(new w.Event('change', { bubbles: true })); }
        catch (e) { orig.dispatchEvent(new w.Event('change', { bubbles: true })); }
        const ch0 = cont.querySelector('.select2-chosen, .select2-selection__rendered');
        if (ch0 && N(ch0.textContent).includes(t)) return T(ch0.textContent);
      }
    }
    let ok = false;
    try { if (w.jQuery && orig && w.jQuery(orig).data('select2')) { w.jQuery(orig).select2('open'); ok = true; } } catch (e) {}
    if (!ok) C(cont.querySelector('.select2-choice, .select2-selection, a') || cont);
    await W(450);
    const drop = abierta(d);
    if (!drop) return null;
    /* solo se escribe en el buscador de ESTA lista: nunca en otra caja de la página */
    const bus = [...drop.querySelectorAll('input')].find(x => V(x) && !x.classList.contains('select2-offscreen'));
    if (bus) S(bus, texto);
    for (let i = 0; i < 28; i++) {
      await W(250);
      const res = [...drop.querySelectorAll('.select2-result-label, .select2-results__option, li.select2-result')]
        .filter(x => V(x) && T(x.textContent) && !/^(buscando|searching|cargando|loading|no se encontr|sin resultados)/i.test(N(x.textContent)));
      const m = res.find(x => N(x.textContent) === t) || res.find(x => N(x.textContent).includes(t)) || res.find(x => t.includes(N(x.textContent)) && N(x.textContent).length > 5);
      if (m) {
        const li = m.closest('li, [role="option"]') || m;
        ['mouseover', 'mousemove', 'mousedown', 'mouseup', 'click'].forEach(ev => li.dispatchEvent(new w.MouseEvent(ev, { bubbles: true, cancelable: true, view: w, button: 0 })));
        await W(350);
        const ch = cont.querySelector('.select2-chosen, .select2-selection__rendered');
        return T(ch ? ch.textContent : m.textContent);
      }
    }
    try { if (w.jQuery && orig && w.jQuery(orig).data('select2')) w.jQuery(orig).select2('close'); } catch (e) {}
    return null;
  };

  /* ---------- 3. el reloj del calendario ---------- */
  const leerReloj = hi => {
    const m = (hi.value || '').toUpperCase().match(/(\d{1,2}):(\d{2})(?:\s*([AP])\.?M)?/);
    if (!m) return null;
    const h12 = +m[1], I = +m[2], ap = m[3] || '';
    const H = ap ? (h12 % 12) + (ap === 'P' ? 12 : 0) : h12;
    return { H, I, h12, ap, hay12: !!ap };
  };
  /* gira un segmento del reloj hasta el valor pedido; avisa si las flechas no hacen nada */
  const girar = async (hi, a, b, saca, objetivo, mod, max) => {
    const vistos = new Set();
    for (let i = 0; i < max; i++) {
      const r = leerReloj(hi);
      if (!r) return 'no-leido';
      const cur = saca(r);
      if (cur === objetivo) return 'ok';
      if (vistos.has(hi.value)) return 'no-alcanza';
      vistos.add(hi.value);
      const sube = ((objetivo - cur) % mod + mod) % mod, baja = ((cur - objetivo) % mod + mod) % mod;
      const antes = hi.value;
      tecla(hi, sube <= baja ? 'ArrowUp' : 'ArrowDown', a, b);
      await W(45);
      if (hi.value === antes) return 'sin-efecto';
    }
    const f = leerReloj(hi);
    return f && saca(f) === objetivo ? 'ok' : 'fallo';
  };
  /* El reloj se mueve con las flechas, que es como lo maneja el propio calendario.
     Escribir la hora a mano se ve bien en pantalla pero el calendario no se entera
     (al salir del campo la revierte), así que eso solo se intenta al final y se comprueba. */
  const fijarHora = async (hi, H, I) => {
    const justo = () => { const r = leerReloj(hi); return !!r && r.H === H && r.I === I; };
    if (justo()) return 'ok';
    const h12 = H % 12 === 0 ? 12 : H % 12;
    const r0 = leerReloj(hi);
    if (!r0) return 'no-leido';
    let q = await girar(hi, 0, 2, r => r.hay12 ? r.h12 : r.H, r0.hay12 ? h12 : H, r0.hay12 ? 12 : 24, 26);
    if (q !== 'sin-efecto' && q !== 'no-leido') {
      q = await girar(hi, 3, 5, r => r.I, I, 60, 70);
      const r1 = leerReloj(hi);
      if (q !== 'sin-efecto' && r1 && r1.hay12 && r1.H !== H) {
        const p = hi.value.toUpperCase().search(/\b(?:AM|PM)\b/);
        if (p >= 0) { tecla(hi, 'ArrowUp', p, p + 2); await W(150); }
        if (!justo()) { const p2 = hi.value.toUpperCase().search(/\b(?:AM|PM)\b/); if (p2 >= 0) { tecla(hi, 'ArrowDown', p2, p2 + 2); await W(150); } }
      }
    }
    if (justo()) return 'ok';
    /* las flechas no sirvieron: se escribe y se comprueba que el campo la haya aceptado */
    const txt = r0.hay12 ? P2(h12) + ':' + P2(I) + ' ' + (H >= 12 ? 'PM' : 'AM') : P2(H) + ':' + P2(I);
    try { S(hi, txt); tecla(hi, 'Enter'); await W(200); tecla(hi, 'Tab'); hi.blur(); await W(250); } catch (e) {}
    return justo() ? 'ok' : (q === 'sin-efecto' ? 'el reloj no responde' : 'no llegó a la hora');
  };

  const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  const ponerFecha = async (Y, M, G, H, I, avisos) => {
    const fd = Q('[id$="udf_date_628_IN_Display"]');
    if (!fd) throw Error('No encontré el campo "Fecha y hora de la cita". Abre el ticket en Editar.');
    const dd = fd.ownerDocument, pid = fd.id.replace(/_IN_Display$/, '') + '_IN_calendar_parent';
    const abrirCal = async () => {
      const cal = dd.getElementById(pid);
      if (!cal || cal.getAttribute('aria-expanded') !== 'true' || !dd.querySelector('.zdatetimepicker__monthnav')) {
        const add = fd.parentElement && fd.parentElement.querySelector('.input-group-addon');
        if (!add) throw Error('No encontré el botón del calendario.');
        add.click();
      }
      for (let i = 0; i < 25 && !dd.querySelector('.zdatetimepicker__monthnav'); i++) await W(100);
      if (!dd.querySelector('.zdatetimepicker__monthnav')) throw Error('No se abrió el calendario.');
    };
    const irAlMes = async () => {
      for (let n = 0; n < 130; n++) {
        const mn = dd.querySelector('.zdatetimepicker__monthnav'), yn = dd.querySelector('.zdatetimepicker__yearnav');
        if (!mn || !yn) return;
        /* el mes puede venir como "oct." o "octubre" */
        const cm = MESES[N(mn.textContent).toLowerCase().replace(/[^a-z]/g, '').slice(0, 3)], cy = parseInt(yn.textContent, 10);
        if (!cm || isNaN(cy)) throw Error('No entendí el mes del calendario ("' + T(mn.textContent) + ' ' + T(yn.textContent) + '").');
        const dif = (Y - cy) * 12 + M - cm;
        if (!dif) return;
        const bt = dd.getElementById(pid + (dif > 0 ? '-right-month-0' : '-left-month-0'));
        if (!bt) throw Error('No encontré la flecha del calendario.');
        bt.click();
        await W(180);
      }
    };
    const reloj = () => {
      const tc = dd.getElementById(pid + '-timeinput');
      return tc && tc.querySelector('input.zinputfield__textbox');
    };
    const clicDia = () => {
      let cel = [...dd.querySelectorAll('td.zdatetimepicker__date[role=gridcell]')]
        .filter(c => parseInt(T(c.textContent), 10) === G);
      /* el calendario enseña días del mes anterior y del siguiente: esos no sirven */
      const propios = cel.filter(c => !/prev|next|other|outside|disabled|--off/i.test(c.className));
      if (propios.length) cel = propios; else if (G >= 15) cel = [cel[cel.length - 1]];
      const d = cel[0];
      if (!d) throw Error('No encontré el día ' + G + ' en el calendario.');
      C(d.querySelector('.zdatetimepicker__text') || d);
    };
    const sigueAbierto = () => !!dd.querySelector('.zdatetimepicker__monthnav') && !!reloj();
    const aceptar = async () => {
      let ok = dd.querySelector('.OKButton-zdatetimepicker');
      if (!ok) { const tx = [...dd.querySelectorAll('.zbutton__text')].find(x => T(x.textContent) === 'Aceptar'); ok = tx && tx.closest('button'); }
      if (ok && V(ok)) { ok.click(); await W(400); }
    };
    const puesta = () => {
      const m = T(fd.value).toUpperCase().match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\D+(\d{1,2}):(\d{2})(?:\s*([AP])\.?M)?)?/);
      if (!m) return null;
      const hh = m[4] == null ? null : (m[6] ? (+m[4] % 12) + (m[6] === 'P' ? 12 : 0) : +m[4]);
      return { Y: +m[3], M: +m[2], G: +m[1], H: hh, I: m[5] == null ? null : +m[5] };
    };
    const correcta = () => { const p = puesta(); return !!p && p.Y === Y && p.M === M && p.G === G && p.H === H && p.I === I; };

    /* La hora se pone ANTES del día: en este calendario el clic en el día puede
       cerrar la ventana, y entonces las flechas del reloj ya no hacen nada
       (por eso quedaba la hora actual). Después se revisa y se reintenta. */
    let estado = '';
    for (let intento = 0; intento < 2 && !correcta(); intento++) {
      await abrirCal();
      await irAlMes();
      const hi1 = reloj();
      if (hi1) estado = await fijarHora(hi1, H, I);
      clicDia();
      await W(350);
      if (sigueAbierto()) {
        const hi2 = reloj();
        if (hi2) {
          const q = await fijarHora(hi2, H, I);
          if (q !== 'ok') estado = q; else estado = 'ok';
          hi2.dispatchEvent(new dd.defaultView.Event('input', { bubbles: true }));
          hi2.dispatchEvent(new dd.defaultView.Event('change', { bubbles: true }));
          tecla(hi2, 'Tab');
          hi2.blur();
          await W(600);
        }
        await aceptar();
      }
      await W(300);
    }
    if (!correcta()) {
      /* último recurso: escribir la fecha y la hora directamente en el campo */
      const txt = P2(G) + '/' + P2(M) + '/' + Y + ' ' + P2(H % 12 === 0 ? 12 : H % 12) + ':' + P2(I) + ' ' + (H >= 12 ? 'PM' : 'AM');
      const ro = fd.readOnly; fd.readOnly = false;
      S(fd, txt);
      tecla(fd, 'Tab'); fd.blur();
      fd.readOnly = ro;
      await W(300);
      const oculto = Q('input[name$="udf_date_628"], input[id="udf_date_628"]');
      if (oculto) { try { S(oculto, String(new Date(Y, M - 1, G, H, I, 0).getTime())); } catch (e) {} }
      avisos.push(correcta()
        ? 'La hora se escribió a mano en el campo (el reloj del calendario no respondió' + (estado ? ': ' + estado : '') + '). REVISA la fecha y la hora antes de guardar.'
        : 'No pude dejar la hora en ' + P2(H) + ':' + P2(I) + (estado ? ' (' + estado + ')' : '') + '. Ponla a mano antes de guardar.');
    }
    return T(fd.value);
  };

  /* ---------- flujo ---------- */
  const avisos = [];
  try {
    const cont = QV('#s2id_udf_pick_3902, #s2id_udf_fields\\.udf_pick_3902');
    const sel = Q('select[name="udf_pick_3902"], select[name="udf_fields.udf_pick_3902"], #udf_pick_3902');
    const lista = sel ? [...sel.options].map(o => T(o.textContent)).filter(x => x && !/^(sin especificar|seleccionar|--)/i.test(x)) : [];

    const crudo = prompt('Pegue la data:') || '';
    if (!T(crudo)) return;
    const f = partir(crudo, lista);
    if (!f.f || !f.h || !f.esp) {
      throw Error('No pude leer la fila.\nColumnas: ' + f.cols + '\nID: ' + (f.id || f.idPegado || '-') + ' | Especialidad: ' + (f.esp || '-')
        + '\nFecha: ' + (f.f ? f.f.join('/') : '-') + ' | Hora de inicio: ' + (f.h ? f.h.join(':') : '-')
        + '\n\nSelecciona la fila completa en la agenda y pégala tal cual.\n\nLeí: ' + f.crudo);
    }
    const [Y, M, G] = f.f, [H, I] = f.h;
    if (M < 1 || M > 12 || G < 1 || G > 31 || H > 23 || I > 59) throw Error('La fecha o la hora no son válidas: ' + f.f.join('/') + ' ' + f.h.join(':'));
    if (f.pegado) avisos.push('El cuadro de pegado borró los tabuladores, así que la fila llegó sin columnas; revisa el ID y la especialidad.');

    const idf = Q('input[name="udf_long_2402"], input[name="udf_fields.udf_long_2402"], input[data-field="WorkOrder_Fields_UDF_LONG5"]');
    if (!idf) throw Error('No encontré el campo "ID de la Cita". Abre el ticket en Editar.');
    if (f.id) {
      S(idf, f.id);
      idf.dispatchEvent(new idf.ownerDocument.defaultView.Event('blur', { bubbles: true }));
    } else {
      avisos.push('El ID vino pegado al de al lado ("' + f.idPegado + '") y no sé dónde cortarlo: ponlo a mano.');
    }

    let esp = '';
    if (cont) esp = await ponerLista(cont, f.esp) || '';
    else if (!sel) avisos.push('No encontré la lista "Especialidad".');
    else {
      const op = [...sel.options].find(o => N(o.textContent) === N(f.esp)) || [...sel.options].find(o => N(o.textContent).includes(N(f.esp)));
      if (op) { sel.value = op.value; const w = sel.ownerDocument.defaultView; try { if (w.jQuery) w.jQuery(sel).val(op.value).trigger('change'); else sel.dispatchEvent(new w.Event('change', { bubbles: true })); } catch (e) {} esp = T(op.textContent); }
    }
    if (!esp) avisos.push('No pude elegir la especialidad "' + f.esp + '": ponla a mano.');

    const quedo = await ponerFecha(Y, M, G, H, I, avisos);
    alert('Listo' + (avisos.length ? ' (con avisos)' : '') + ':\n'
      + 'ID de la cita: ' + (f.id || 'sin poner') + '\n'
      + 'Especialidad: ' + (esp || f.esp + ' — no se eligió') + '\n'
      + 'Hora de inicio leída: ' + P2(H) + ':' + P2(I) + '\n'
      + 'Fecha y hora del ticket: ' + quedo
      + (avisos.length ? '\n\n' + avisos.join('\n') : '\n\nRevisa y guarda tú.'));
  } catch (e) {
    alert('Proceso detenido:\n' + e.message + (avisos.length ? '\n\n' + avisos.join('\n') : ''));
  }
})();
