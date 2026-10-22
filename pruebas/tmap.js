const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const html=`<input name=searchText><h3>Detalles de la solicitud</h3>
<div><label class=l>Solicitante *</label><div class="select2-container" id=s2id_requester><a class=select2-choice><span class=select2-chosen>ST Josue Adonai Perez Lopez</span></a></div><select id=requester name=requester style=display:none><option>ST Josue Adonai Perez Lopez</option></select></div>
<div><label class=l>Nombre del paciente</label><input name=udf_sline_610 value="MARIA PRUEBA"></div>
<div><label class=l>TSJ</label><input name=udf_long_5708 value="13790"></div>
<div><label class=l>Tipificacion 2</label><div class="select2-container" id="s2id_subcategory"><a class=select2-choice><span class=select2-chosen>Gestion de perfiles</span></a></div><select id=subcategory name=subcategory style=display:none><option>Sin especificar</option><option>Gestion de perfiles</option></select></div>
<div><label class=l>Descripción</label><iframe id=ed></iframe></div><button>Agregar solicitud</button>`;
const blobs=[];const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=newWO',pretendToBeVisual:true});const W=dom.window;
W.Element.prototype.getBoundingClientRect=function(){const hid=this.closest&&this.closest('[style*="none"]');return hid?{width:0,height:0,top:0,left:0,right:0,bottom:0}:{width:10,height:10,top:0,left:0,right:10,bottom:10}};W.CSS={escape:s=>s};
W.URL.createObjectURL=b=>{blobs.push(b);return 'blob:x'};W.URL.revokeObjectURL=()=>{};
W.document.getElementById('ed').contentDocument.designMode='on';
W.eval(src);const d=W.document.getElementById('n1kit-frame').contentDocument;
[...d.querySelectorAll('.tab')].find(t=>t.textContent==='Herramientas').click();
[...d.querySelectorAll('.act')].find(b=>/Mapear/.test(b.textContent)).click();
[...d.querySelectorAll('.b.p')].find(b=>/Mapear/.test(b.textContent)).click();
(async()=>{const j=JSON.parse(await blobs[0].text());console.log(d.querySelector('.log').textContent);
j.campos.forEach(c=>console.log(c.seccion,'>',c.etiqueta+(c.obligatorio?' *':''),'['+c.tipo+']',c.name||c.id,'=',JSON.stringify(c.valor)));console.log('editores',JSON.stringify(j.editores),'botones',j.botones.map(b=>b.texto));process.exit(0)})();
