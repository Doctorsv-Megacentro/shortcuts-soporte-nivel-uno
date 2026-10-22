/* Prueba del marcador de citas contra un calendario zdatetimepicker simulado.
   modo: cierra | abierto | sinflechas | mesLargo      fila: normal | sintabs | vieja */
const fs=require('fs');const {JSDOM}=require('jsdom');
const src=fs.readFileSync(process.argv[2],'utf8');
const modo=process.argv[3]||'cierra', filaModo=process.argv[4]||'normal';
const ESP=['Sin especificar','MEDICINA GENERAL','PEDIATRIA','GINECOLOGIA','PSICOLOGIA','NUTRICION','MEDICINA INTERNA','DERMATOLOGIA'];
const html=`
<div><label>ID de la Cita</label><input name=udf_long_2402 data-field=WorkOrder_Fields_UDF_LONG5></div>
<div><label>Especialidad</label><div class="select2-container" id="s2id_udf_pick_3902"><a class="select2-choice"><span class="select2-chosen">Sin especificar</span></a></div><select id=udf_pick_3902 name=udf_pick_3902 style=display:none>${ESP.map(o=>`<option>${o}</option>`).join('')}</select></div>
<div><label>Derivación a especialidad</label><div class="select2-container select2-container-multi" id="s2id_deriv"><ul class="select2-choices"><li class="select2-search-field"><input class="select2-input"></li></ul></div><select id=deriv name=udf_multiselect_10201 multiple style=display:none></select></div>
<div><label>Fecha y hora de la cita</label><div class="input-group"><input id="udf_date_628_IN_Display" readonly><span class="input-group-addon">cal</span></div><input type=hidden name="udf_fields.udf_date_628" id="udf_date_628"></div>
<div class="select2-drop select2-display-none" id="select2-drop"><div class="select2-search"><input class="select2-input" type=text></div><ul class="select2-results"></ul></div>`;
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=editWO&woID=286119',pretendToBeVisual:true});
const W=dom.window,D=W.document;
W.Element.prototype.getBoundingClientRect=function(){const h=this.closest&&this.closest('[style*="none"]');return h?{width:0,height:0,top:0,left:0,right:0,bottom:0}:{width:10,height:10,top:0,left:0,right:10,bottom:10}};
W.Element.prototype.getClientRects=function(){const r=this.getBoundingClientRect();return r.width?[r]:[]};
W.CSS={escape:s=>s};
// --- portapapeles
const FILAS={
 normal:['7242043','5840809','No','Videollamada','Nuevo síntoma','000CGL','CARLOS MAURICIO GRANADOS BELLOSO','MEDICINA GENERAL','2026/10/16','11:00','11:30'].join('\t'),
 sintabs:'72420435840809NoVideollamadaNuevo síntoma000CGLCARLOS MAURICIO GRANADOS BELLOSOMEDICINA GENERAL2026/10/1611:0011:30',
 vieja:['7242043','No','Videollamada','000CGL','CARLOS MAURICIO GRANADOS BELLOSO','x','MEDICINA GENERAL','2026/10/16','11:00','11:30'].join('\t')};
let pedidoPrompt=false;
W.prompt=()=>{pedidoPrompt=true;return FILAS[filaModo]};
let alerta='';W.alert=m=>{alerta=m};
// --- select2 v3
const drop=D.getElementById('select2-drop'),dinp=drop.querySelector('.select2-input'),dul=drop.querySelector('.select2-results');
let activo=null;const aperturas={};
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const render=q=>{dul.innerHTML='';[...D.getElementById(activo).options].map(o=>o.textContent).filter(n=>norm(n).includes(norm(q))).forEach(n=>{const li=D.createElement('li');li.className='select2-result';const lb=D.createElement('div');lb.className='select2-result-label';lb.textContent=n;li.append(lb);
 li.addEventListener('mouseup',()=>{D.querySelector('#s2id_'+activo+' .select2-chosen').textContent=n;D.getElementById(activo).value=n;drop.classList.add('select2-display-none');drop.classList.remove('select2-drop-active')});dul.append(li)})};
const abrir=id=>{aperturas[id]=(aperturas[id]||0)+1;activo=id;drop.classList.remove('select2-display-none');drop.classList.add('select2-drop-active');dinp.value='';render('')};
D.querySelectorAll('.select2-container').forEach(c=>{const ch=c.querySelector('.select2-choice,.select2-choices');if(ch)ch.addEventListener('mousedown',()=>abrir(c.id.slice(5)))});
dinp.addEventListener('input',e=>setTimeout(()=>render(e.target.value),150));
let derivTocada=false;D.querySelector('#s2id_deriv .select2-input').addEventListener('input',()=>derivTocada=true);
// --- calendario: se abre en el mes actual (oct 2026) con la hora actual 12:32 PM
const P='udf_date_628_IN_calendar_parent';
const MES=modo==='mesLargo'?['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
                           :['ene.','feb.','mar.','abr.','may.','jun.','jul.','ago.','sept.','oct.','nov.','dic.'];
let cy=2026,cm=10,dia=null,hh=12,mm=32,pm=true,escrituraManual=0;
const fd=D.getElementById('udf_date_628_IN_Display');
const p2=n=>String(n).padStart(2,'0');
const commit=()=>{fd.value=dia?`${p2(dia)}/${p2(cm)}/${cy} ${p2(hh)}:${p2(mm)} ${pm?'PM':'AM'}`:fd.value};
const cerrar=()=>{const c=D.getElementById(P);if(c){c.setAttribute('aria-expanded','false');c.innerHTML=''}};
const pintar=()=>{
  let c=D.getElementById(P);if(!c){c=D.createElement('div');c.id=P;D.body.append(c)}
  c.setAttribute('aria-expanded','true');
  const dias=new Date(cy,cm,0).getDate(),prev=new Date(cy,cm-1,0).getDate(),ini=new Date(cy,cm-1,1).getDay();
  let celdas='';
  for(let i=ini-1;i>=0;i--)celdas+=`<td class="zdatetimepicker__date zdatetimepicker__date--prev" role=gridcell><span class="zdatetimepicker__text">${prev-i}</span></td>`;
  for(let i=1;i<=dias;i++)celdas+=`<td class="zdatetimepicker__date" role=gridcell data-d=${i}><span class="zdatetimepicker__text">${i}</span></td>`;
  for(let i=1;i<=6;i++)celdas+=`<td class="zdatetimepicker__date zdatetimepicker__date--next" role=gridcell><span class="zdatetimepicker__text">${i}</span></td>`;
  c.innerHTML=`<span class="zdatetimepicker__monthnav">${MES[cm-1]}</span><span class="zdatetimepicker__yearnav">${cy}</span>`
   +`<button id="${P}-left-month-0">&lt;</button><button id="${P}-right-month-0">&gt;</button><table><tr>${celdas}</tr></table>`
   +`<div id="${P}-timeinput"><input class="zinputfield__textbox"></div><button class="OKButton-zdatetimepicker">Aceptar</button>`;
  const hi=c.querySelector('.zinputfield__textbox');
  const fmt=()=>{hi.value=`${p2(hh)}:${p2(mm)} ${pm?'PM':'AM'}`};fmt();
  // escribir a mano en el reloj NO sirve en el widget real: se revierte al perder el foco
  hi.addEventListener('blur',fmt);
  hi.addEventListener('keydown',e=>{
    if(modo==='sinflechas')return;
    const s=hi.selectionStart,d=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;if(!d)return;
    if(s<3){hh=((hh-1+d+12)%12)+1}else if(s<6){mm=(mm+d+60)%60}else{pm=!pm}
    fmt();e.preventDefault()});
  c.querySelector('#'+P+'-left-month-0').onclick=()=>{cm--;if(!cm){cm=12;cy--}pintar()};
  c.querySelector('#'+P+'-right-month-0').onclick=()=>{cm++;if(cm>12){cm=1;cy++}pintar()};
  c.querySelectorAll('td[data-d]').forEach(td=>td.addEventListener('click',()=>{
    dia=+td.dataset.d;
    if(modo==='cierra'||modo==='sinflechas'){commit();cerrar()}        // el clic en el día cierra y confirma
  }));
  c.querySelectorAll('td:not([data-d])').forEach(td=>td.addEventListener('click',()=>{dia='MES-VECINO';commit()}));
  c.querySelector('.OKButton-zdatetimepicker').onclick=()=>{commit();cerrar()};
};
D.querySelector('.input-group-addon').addEventListener('click',pintar);
// el campo es readonly en SDP; si el script lo escribe a mano lo anotamos
Object.defineProperty(fd,'readOnly',{get(){return false},set(){},configurable:true});
fd.addEventListener('input',()=>{escrituraManual++});
// --- correr
W.eval(src);
setTimeout(()=>{
  console.log('--- modo:',modo,'| fila:',filaModo,'---');
  console.log(alerta||'(sin alerta)');
  console.log('> ID en el campo:',D.querySelector('[name=udf_long_2402]').value);
  console.log('> Especialidad:',D.querySelector('#s2id_udf_pick_3902 .select2-chosen').textContent);
  console.log('> Fecha y hora:',fd.value,'| esperado: 16/10/2026 11:00 AM');
  console.log('> OK:',fd.value==='16/10/2026 11:00 AM','| escrituras a mano:',escrituraManual,
    '| oculto:',D.getElementById('udf_date_628').value,'| prompt:',pedidoPrompt,
    '| Derivación tocada:',derivTocada,'| aperturas:',JSON.stringify(aperturas));
  process.exit(0);
},22000);
