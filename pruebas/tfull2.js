const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const html=`
<div><label class=l>Solicitante *</label><div class="select2-container" id="s2id_requester"><a class="select2-choice"><span class="select2-chosen">Seleccionar</span></a></div><input type=hidden name=requester></div>
<div><label class=l>Tipificacion 1</label><div class="select2-container" id="s2id_category"><a class="select2-choice"><span class="select2-chosen">Sin especificar</span></a></div><select id=category name=category style=display:none></select></div>
<div><label class=l>Tipificacion 2</label><div class="select2-container" id="s2id_subcategory"><a class="select2-choice"><span class="select2-chosen">Sin especificar</span></a></div><select id=subcategory name=subcategory style=display:none></select></div>
<div><label class=l>Tipificacion 3</label><div class="select2-container" id="s2id_item"><a class="select2-choice"><span class="select2-chosen">Sin especificar</span></a></div><select id=item name=item style=display:none></select></div>
<div><label class=l>Derivación a especialidad</label><div class="select2-container select2-container-multi" id="s2id_deriv"><ul class="select2-choices"><li class="select2-search-field"><input class="select2-input"></li></ul></div><select id=deriv name="udf_fields.udf_multiselect_10201" multiple style=display:none></select></div>
<div><label class=l>Resumen del caso *</label><textarea name="udf_fields.udf_mline_6903"></textarea></div>
<div><label class=l>Comentario de cierre del ticket</label><textarea name="udf_fields.udf_mline_6904"></textarea></div>
<div><label class=l>Asunto *</label><input name=subject></div>
<div><label class=l>Descripción</label><iframe id=ed></iframe></div>
<div class="select2-drop select2-display-none" id="select2-drop"><div class="select2-search"><input class="select2-input" type=text></div><ul class="select2-results"></ul></div>`;
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=newWO',pretendToBeVisual:true});const W=dom.window;
W.Element.prototype.getBoundingClientRect=function(){const h=this.closest&&this.closest('[style*="none"]');return h?{width:0,height:0,top:0,left:0,right:0,bottom:0}:{width:10,height:10,top:0,left:0,right:10,bottom:10}};
W.Element.prototype.getClientRects=function(){const r=this.getBoundingClientRect();return r.width?[r]:[]};
W.CSS={escape:s=>s};const D=W.document;D.getElementById('ed').contentDocument.designMode='on';
const drop=D.getElementById('select2-drop'),dinp=drop.querySelector('.select2-input'),dul=drop.querySelector('.select2-results');
const data={requester:['ST Josue Adonai Perez Lopez'],category:['Gestiones complementarias de soporte tecnico'],subcategory:[],item:[]};
let activo=null;
const aperturas={};const abrir=id=>{aperturas[id]=(aperturas[id]||0)+1;activo=id;drop.classList.remove('select2-display-none');drop.classList.add('select2-drop-active');dinp.value='';render('')};
const render=q=>{dul.innerHTML='';const base=data[activo]||[];const list=activo==='requester'?(q.length<2?[]:base):base;
 list.filter(n=>n.toLowerCase().includes(q.toLowerCase())).forEach(n=>{const li=D.createElement('li');li.className='select2-result';const lb=D.createElement('div');lb.className='select2-result-label';lb.textContent=n;li.append(lb);
  li.addEventListener('mouseup',()=>{D.querySelector('#s2id_'+activo+' .select2-chosen').textContent=n;const el=D.getElementById(activo)||D.querySelector('[name='+activo+']');if(el)el.value=n;drop.classList.add('select2-display-none');drop.classList.remove('select2-drop-active');
   if(activo==='category'&&n.startsWith('Gestiones'))setTimeout(()=>{data.subcategory=['Ronda de Monitoreo']},300);
   if(activo==='subcategory'&&n.startsWith('Ronda'))setTimeout(()=>{data.item=['Telemedicina 1','Telemedicina 2','Telemedicina 3']},300)});dul.append(li)})};
D.querySelectorAll('.select2-container').forEach(c=>{const ch=c.querySelector('.select2-choice,.select2-choices');if(ch)ch.addEventListener('mousedown',()=>abrir(c.id.slice(5)))});
dinp.addEventListener('input',e=>setTimeout(()=>render(e.target.value),180));
let derivTocada=false;D.getElementById('deriv').addEventListener('change',()=>derivTocada=true);
// la Derivación tiene su propia input; si el panel la tocara, lo marcaríamos
D.querySelector('#s2id_deriv .select2-input').addEventListener('input',()=>derivTocada=true);
W.eval(src);const d=D.getElementById('n1kit-frame').contentDocument;const E=t=>new d.defaultView.Event(t);
[...d.querySelectorAll('.tab')].find(t=>t.textContent==='N1').click();
[...d.querySelectorAll('.act')].find(b=>/Ticket de ronda/.test(b.textContent)).click();
const ins=[...d.querySelectorAll('main input[type=text]')];ins[0].value='ST Josue Adonai Perez Lopez';ins[0].dispatchEvent(E('input'));
[...d.querySelectorAll('.b.p')].find(b=>/Llenar/.test(b.textContent)).click();
setTimeout(()=>{console.log('LOG:\n  '+[...d.querySelectorAll('.log div')].map(x=>x.textContent).join('\n  '));
console.log('Solicitante =',D.querySelector('#s2id_requester .select2-chosen').textContent);
console.log('Tipif =',['category','subcategory','item'].map(id=>D.querySelector('#s2id_'+id+' .select2-chosen').textContent).join(' / '));
console.log('Resumen lleno:',!!D.querySelector('[name="udf_fields.udf_mline_6903"]').value,'| Comentario lleno:',!!D.querySelector('[name="udf_fields.udf_mline_6904"]').value);
console.log('Editor:',JSON.stringify(D.getElementById('ed').contentDocument.body.textContent.slice(0,30)));
console.log('DERIVACIÓN tocada:',derivTocada);console.log('veces que se abrió cada combo:',JSON.stringify(aperturas));
process.exit(0)},20000);
