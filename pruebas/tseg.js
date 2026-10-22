const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const ERR=['Sin especificar','App - No carga la agenda','App - Error al iniciar sesion','Web - Falla al conectarse a la cita','Audio - No se escucha al medico'];
const QUE=['Sin especificar','Sí','No'];
const s2=(l,id,ops)=>`<div><label class=l>${l}</label><div class="select2-container" id="s2id_${id}"><a class="select2-choice"><span class="select2-chosen">Sin especificar</span></a></div><select id=${id} name="${id}" style=display:none>${ops.map(o=>`<option>${o}</option>`).join('')}</select></div>`;
const html=`
${s2('Tipo de Error','udf_pick_8405',ERR)}
${s2('Queja Aplica','udf_pick_3003',QUE)}
<div><label class=l>Resumen del caso</label><textarea name=udf_mline_6903></textarea></div>
<div><label class=l>Modelo Dispositivo</label><input name=udf_sline_8402 value="${process.argv[4]||''}"></div>
<div><label class=l>Version APP</label><input name=udf_sline_9601></div>
<div><label class=l>Derivación a especialidad</label><div class="select2-container select2-container-multi" id="s2id_deriv"><ul class="select2-choices"><li class="select2-search-field"><input class="select2-input"></li></ul></div><select id=deriv name="udf_multiselect_10201" multiple style=display:none></select></div>
<div class="select2-drop select2-display-none" id="select2-drop"><div class="select2-search"><input class="select2-input" type=text></div><ul class="select2-results"></ul></div>`;
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=editWO&woID=2772187',pretendToBeVisual:true});const W=dom.window;
W.Element.prototype.getBoundingClientRect=function(){const h=this.closest&&this.closest('[style*="none"]');return h?{width:0,height:0,top:0,left:0,right:0,bottom:0}:{width:10,height:10,top:0,left:0,right:10,bottom:10}};
W.Element.prototype.getClientRects=function(){const r=this.getBoundingClientRect();return r.width?[r]:[]};
W.Element.prototype.scrollIntoView=function(){};W.CSS={escape:s=>s};const D=W.document;
const drop=D.getElementById('select2-drop'),dinp=drop.querySelector('.select2-input'),dul=drop.querySelector('.select2-results');
let activo=null;const aperturas={};
const abrir=id=>{aperturas[id]=(aperturas[id]||0)+1;activo=id;drop.classList.remove('select2-display-none');drop.classList.add('select2-drop-active');dinp.value='';render('')};
const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const render=q=>{dul.innerHTML='';[...D.getElementById(activo).options].map(o=>o.textContent).filter(n=>norm(n).includes(norm(q))).forEach(n=>{const li=D.createElement('li');li.className='select2-result';const lb=D.createElement('div');lb.className='select2-result-label';lb.textContent=n;li.append(lb);
  li.addEventListener('mouseup',()=>{D.querySelector('#s2id_'+activo+' .select2-chosen').textContent=n;D.getElementById(activo).value=n;drop.classList.add('select2-display-none');drop.classList.remove('select2-drop-active')});dul.append(li)})};
D.querySelectorAll('.select2-container').forEach(c=>{const ch=c.querySelector('.select2-choice,.select2-choices');if(ch)ch.addEventListener('mousedown',()=>abrir(c.id.slice(5)))});
dinp.addEventListener('input',e=>setTimeout(()=>render(e.target.value),150));
let derivTocada=false;D.querySelector('#s2id_deriv .select2-input').addEventListener('input',()=>derivTocada=true);
W.eval(src);const d=D.getElementById('n1kit-frame').contentDocument;
[...d.querySelectorAll('.tab')].find(t=>t.textContent==='N2').click();
console.log('N2 muestra:',[...d.querySelectorAll('.act')].map(b=>b.textContent).join(' | '));
[...d.querySelectorAll('.act')].find(b=>/Bandeja de seguimiento/.test(b.textContent)).click();
console.log('aviso:',d.querySelector('.aviso b').textContent);
const sels=[...d.querySelectorAll('main select')];
console.log('Tipo de Error leyó',sels[0]?sels[0].options.length:0,'opciones | Queja por defecto:',sels[1]&&sels[1].value);
if(process.argv[3]==='otro'&&sels[0]){sels[0].value='Audio - No se escucha al medico'}
[...d.querySelectorAll('main .b.p')].find(b=>/Llenar/.test(b.textContent)).click();
setTimeout(()=>{console.log('LOG:\n  '+[...d.querySelectorAll('.log div')].map(x=>x.textContent).join('\n  '));
 const c=id=>D.querySelector('#s2id_'+id+' .select2-chosen').textContent,v=n=>D.querySelector('[name='+n+']').value;
 console.log('Tipo de Error:',c('udf_pick_8405'),'| Queja:',c('udf_pick_3003'));
 console.log('Resumen:',JSON.stringify(v('udf_mline_6903').slice(0,45)));
 console.log('Modelo:',v('udf_sline_8402'),'| Versión:',v('udf_sline_9601'));
 console.log('DERIVACIÓN tocada:',derivTocada,'| aperturas:',JSON.stringify(aperturas));process.exit(0)},18000);
