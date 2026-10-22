const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const html=`<div><label class=l>TSJ</label><input name=udf_long_5708 data-field=WorkOrder_Fields_UDF_LONG4 value="13790"></div>
<div><label class=l>Tipificacion 1</label><div class="select2-container" id="s2id_category"><a class=select2-choice><span class=select2-chosen>Incidencias tecnicas</span></a></div><select id=category name=category style=display:none><option>Incidencias tecnicas</option></select></div>
<div><label class=l>Tipificacion 2</label><div class="select2-container" id="s2id_subcategory"><a class=select2-choice><span class=select2-chosen>Gestion de perfiles</span></a></div><select id=subcategory name=subcategory style=display:none><option>Gestion de perfiles</option></select></div>
<div><label class=l>Tipificacion 3</label><div class="select2-container" id="s2id_item"><a class=select2-choice><span class=select2-chosen>Actualizacion de datos</span></a></div><select id=item name=item style=display:none><option>Actualizacion de datos</option></select></div>`;
const mk=(url)=>{const dom=new JSDOM(html,{runScripts:'outside-only',url,pretendToBeVisual:true});const W=dom.window;
 W.Element.prototype.getBoundingClientRect=function(){const hid=this.closest&&this.closest('[style*="none"]');return hid?{width:0,height:0,top:0,left:0,right:0,bottom:0}:{width:10,height:10,top:0,left:0,right:10,bottom:10}};W.CSS={escape:s=>s};return W;};
for (const [url,quitar] of [['https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=viewWO&woID=2772187',false],['https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=viewWO&woID=2776985',true]]){
 const W=mk(url); if(quitar) W.document.querySelector('[name=udf_long_5708]').value='';
 W.eval(src);const d=W.document.getElementById('n1kit-frame').contentDocument;
 [...d.querySelectorAll('.tab')].find(t=>t.textContent==='N1').click();
 [...d.querySelectorAll('.act')].find(b=>/Gestionando/.test(b.textContent)).click();
 console.log(d.querySelector('.pv').value);
 if(!quitar){const s=d.querySelector('main select');s.value='Gestionando';s.dispatchEvent(new d.defaultView.Event('change'));console.log(d.querySelector('.pv').value);}
}
process.exit(0);
