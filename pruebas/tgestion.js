const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const s2=(l,id,name)=>`<div><label class=l>${l}</label><div class="select2-container" id="s2id_${id}"><a class="select2-choice"><span class="select2-chosen">Sin especificar</span></a></div><select id=${id} name="${name}" style=display:none></select></div>`;
const html=`
<div><label class=l>Modelo Dispositivo</label><input name=udf_sline_8402></div>
<div><label class=l>Version APP</label><input name=udf_sline_9601></div>
<div><label class=l>TSJ</label><input name=udf_long_5708></div>
${s2('Estado Jira','udf_pick_6907','udf_pick_6907')}
<div><label class=l>Derivación a especialidad</label><div class="select2-container select2-container-multi" id="s2id_deriv"><ul class="select2-choices"><li class="select2-search-field"><input class="select2-input"></li></ul></div><select id=deriv name="udf_multiselect_10201" multiple style=display:none></select></div>
<div><label class=l>Fecha y hora de la cita</label><div class="input-group"><input id="udf_date_628_IN_Display" readonly><span class="input-group-addon">cal</span></div></div>
<div><label class=l>ID de la Cita</label><input name=udf_long_2402></div>
${s2('Especialidad','udf_pick_3902','udf_pick_3902')}
${s2('Queja Aplica','udf_pick_3003','udf_pick_3003')}
<div class="select2-drop select2-display-none" id="select2-drop"><div class="select2-search"><input class="select2-input" type=text></div><ul class="select2-results"></ul></div>`;
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=editWO&woID=2772187',pretendToBeVisual:true});const W=dom.window;
W.Element.prototype.getBoundingClientRect=function(){const h=this.closest&&this.closest('[style*="none"]');return h?{width:0,height:0,top:0,left:0,right:0,bottom:0}:{width:10,height:10,top:0,left:0,right:10,bottom:10}};
W.Element.prototype.getClientRects=function(){const r=this.getBoundingClientRect();return r.width?[r]:[]};
W.Element.prototype.scrollIntoView=function(){};
W.CSS={escape:s=>s};const D=W.document;
// ---- select2 v3 simulado
const drop=D.getElementById('select2-drop'),dinp=drop.querySelector('.select2-input'),dul=drop.querySelector('.select2-results');
const data={udf_pick_6907:['Sin especificar','Pendiente','En curso Proveedor','Resuelto','Cerrado'],udf_pick_3902:['Sin especificar','Medicina General','Pediatría','Ginecología','Psicología','Nutrición','Medicina Interna','Dermatología'],udf_pick_3003:['Sin especificar','Sí','No']};
let activo=null;const aperturas={};
const abrir=id=>{aperturas[id]=(aperturas[id]||0)+1;activo=id;drop.classList.remove('select2-display-none');drop.classList.add('select2-drop-active');dinp.value='';render('')};
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const render=q=>{dul.innerHTML='';(data[activo]||[]).filter(n=>norm(n).includes(norm(q))).forEach(n=>{const li=D.createElement('li');li.className='select2-result';const lb=D.createElement('div');lb.className='select2-result-label';lb.textContent=n;li.append(lb);
  li.addEventListener('mouseup',()=>{D.querySelector('#s2id_'+activo+' .select2-chosen').textContent=n;drop.classList.add('select2-display-none');drop.classList.remove('select2-drop-active')});dul.append(li)})};
D.querySelectorAll('.select2-container').forEach(c=>{const ch=c.querySelector('.select2-choice,.select2-choices');if(ch)ch.addEventListener('mousedown',()=>abrir(c.id.slice(5)))});
dinp.addEventListener('input',e=>setTimeout(()=>render(e.target.value),150));
let derivTocada=false;D.querySelector('#s2id_deriv .select2-input').addEventListener('input',()=>derivTocada=true);
// ---- calendario zdatetimepicker simulado (abre en el mes actual: sept 2026)
const P='udf_date_628_IN_calendar_parent',MES=['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sept.','oct.','nov.','dic.'];
let cy=2026,cm=9,dia=null,hora={h:12,m:0,pm:false};
const fd=D.getElementById('udf_date_628_IN_Display');
const pintar=()=>{let c=D.getElementById(P);if(!c){c=D.createElement('div');c.id=P;D.body.append(c)}c.setAttribute('aria-expanded','true');
  const dias=new Date(cy,cm,0).getDate(),prev=new Date(cy,cm-1,0).getDate(),ini=new Date(cy,cm-1,1).getDay();
  let celdas='';for(let i=ini-1;i>=0;i--)celdas+=`<td class="zdatetimepicker__date prev" role=gridcell data-m=prev><span class="zdatetimepicker__text">${prev-i}</span></td>`;
  for(let i=1;i<=dias;i++)celdas+=`<td class="zdatetimepicker__date" role=gridcell data-d=${i}><span class="zdatetimepicker__text">${i}</span></td>`;
  for(let i=1;i<=6;i++)celdas+=`<td class="zdatetimepicker__date next" role=gridcell data-m=next><span class="zdatetimepicker__text">${i}</span></td>`;
  c.innerHTML=`<span class="zdatetimepicker__monthnav">${MES[cm-1]}</span><span class="zdatetimepicker__yearnav">${cy}</span><button id="${P}-left-month-0">&lt;</button><button id="${P}-right-month-0">&gt;</button><table><tr>${celdas}</tr></table><div id="${P}-timeinput"><input class="zinputfield__textbox"></div><button class="OKButton-zdatetimepicker">Aceptar</button>`;
  const hi=c.querySelector('.zinputfield__textbox');const fmt=()=>{hi.value=String(hora.h===0?12:hora.h).padStart(2,'0')+':'+String(hora.m).padStart(2,'0')+' '+(hora.pm?'PM':'AM')};fmt();
  hi.addEventListener('keydown',e=>{const s=hi.selectionStart,d=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;if(!d)return;if(s<3)hora.h=(hora.h+d+12)%12;else if(s<6)hora.m=(hora.m+d+60)%60;else hora.pm=!hora.pm;fmt()});
  c.querySelector('#'+P+'-left-month-0').onclick=()=>{cm--;if(!cm){cm=12;cy--}pintar()};
  c.querySelector('#'+P+'-right-month-0').onclick=()=>{cm++;if(cm>12){cm=1;cy++}pintar()};
  c.querySelectorAll('td').forEach(td=>td.addEventListener('click',()=>{dia=td.dataset.m?'MAL('+td.dataset.m+')':+td.dataset.d}));
  c.querySelector('.OKButton-zdatetimepicker').onclick=()=>{const H=hora.h+(hora.pm?12:0);fd.value=`${dia}/${String(cm).padStart(2,'0')}/${cy} ${String(H).padStart(2,'0')}:${String(hora.m).padStart(2,'0')}`;c.setAttribute('aria-expanded','false');c.innerHTML=''}};
D.querySelector('.input-group-addon').addEventListener('click',pintar);
// ---- correr el panel
W.eval(src);const d=D.getElementById('n1kit-frame').contentDocument;const E=t=>new d.defaultView.Event(t);
[...d.querySelectorAll('.tab')].find(t=>t.textContent==='N1').click();
[...d.querySelectorAll('.act')].find(b=>/Gestión de ticket/.test(b.textContent)).click();
const byPh=ph=>[...d.querySelectorAll('main input[type=text]')].find(i=>i.placeholder.startsWith(ph));
const set=(el,v)=>{el.value=v;el.dispatchEvent(E('input'))};
set(byPh('Ej. SM'),'SM-A057M');set(byPh('Ej. 2.4'),'2.4.1');
const fila=['ID 8852831','x','x','x','x','x','Pediatria','2026/10/30','15:45'].join('\t');
set(d.querySelector('main textarea'),fila);
set(byPh('Ej. TSJ'),'https://telemedicina-sv.atlassian.net/servicedesk/customer/portal/40/TSJ-13790');
console.log('fila → ID',byPh('Ej. 88').value,'| esp',byPh('Ej. Medicina').value,'| fecha',byPh('aaaa').value,'| hora',byPh('14:30').value);
const modo=process.argv[3]||'todo';
const btn=t=>[...d.querySelectorAll('main button')].find(b=>b.textContent===t);
btn(modo==='todo'?'Llenar todo':modo).click();
setTimeout(()=>{console.log('LOG:\n  '+[...d.querySelectorAll('.log div')].map(x=>x.textContent).join('\n  '));
 const v=n=>D.querySelector('[name='+n+']').value,c=id=>D.querySelector('#s2id_'+id+' .select2-chosen').textContent;
 console.log('Modelo',v('udf_sline_8402'),'| Versión',v('udf_sline_9601'),'| ID',v('udf_long_2402'),'| TSJ',v('udf_long_5708'));
 console.log('Especialidad',c('udf_pick_3902'),'| Queja',c('udf_pick_3003'),'| Estado Jira',c('udf_pick_6907'));
 console.log('Fecha y hora:',fd.value);
 console.log('DERIVACIÓN tocada:',derivTocada,'| aperturas:',JSON.stringify(aperturas));process.exit(0)},25000);
