/* Exportar ticket a .md, contra un ticket de SDP simulado con secciones y valores */
const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const campo=(l,n,v,t)=>`<tr><td class="field-label">${l}</td><td><input name="${n}" ${t==='area'?'':'type=text'} value="${v}"></td></tr>`;
const area=(l,n,v)=>`<tr><td class="field-label">${l}</td><td><textarea name="${n}">${v}</textarea></td></tr>`;
const lista=(l,n,v,ops)=>`<tr><td class="field-label">${l}</td><td><select name="${n}">${ops.map(o=>`<option${o===v?' selected':''}>${o}</option>`).join('')}</select></td></tr>`;
const html=`
<h3>Detalles de la solicitud</h3>
<table>
${campo('Nombre del solicitante','udf_sline_1505','ROSA DEL CARMEN RIVERA GONZALEZ')}
${campo('Numero de documento del solicitante','udf_sline_302','05828664-2')}
${campo('Telefono del solicitante','udf_sline_2404','50375653398')}
${campo('ID de la interaccion','udf_sline_601','8852831')}
${lista('Tipificacion 1','category','Incidencias tecnicas',['Sin especificar','Incidencias tecnicas'])}
${lista('Tipificacion 2','subcategory','Problemas con estudios de laboratorio',['Sin especificar','Problemas con estudios de laboratorio'])}
${lista('Tipificacion 3','item','Estado erroneo',['Sin especificar','Estado erroneo'])}
${lista('Estado','status','IT Critico N1',['Sin especificar','IT Critico N1'])}
${lista('Prioridad','priority','Sin especificar',['Sin especificar','Alta'])}
${area('Resumen del caso','udf_mline_6903','Usuaria reporta error de estado en los estudios de laboratorio; aparecen como pendientes aunque ya fueron entregados.')}
${campo('TSJ','udf_long_5708','13790')}
${campo('Modelo Dispositivo','udf_sline_8402','SM-A057M')}
${campo('Version APP','udf_sline_9601','')}
${area('Comentario de cierre del ticket','udf_mline_6904','Se escala a N2 para revision del estado de los estudios.')}
</table>
<h3>Datos del paciente</h3>
<table>
${campo('Nombre del paciente','udf_sline_610','MARIA ESPERANZA MARTINEZ HERNANDEZ')}
${campo('Numero de documento del paciente','udf_sline_611','00974010-2')}
${campo('Telefono de contacto del paciente','udf_long_1203','50375653398')}
${lista('Tipo de documento del paciente','udf_pick_1201','DUI',['DUI','Pasaporte'])}
${campo('Edad del paciente','udf_sline_4504','')}
</table>
<h3>Datos relacionados al servicio</h3>
<table>
${campo('ID de la Cita','udf_long_2402','7242043')}
${lista('Especialidad','udf_pick_3902','MEDICINA GENERAL',['Sin especificar','MEDICINA GENERAL'])}
${lista('Queja Aplica','udf_pick_3003','Sin especificar',['Sin especificar','Si','No'])}
</table>
<div><label>Asunto</label><input name=subject value="Error de estado en estudios de laboratorio"></div>
<div><label>Descripción</label><iframe id=ed></iframe></div>`;
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=viewWO&woID=2772187',pretendToBeVisual:true});
const W=dom.window,D=W.document;
W.Element.prototype.getBoundingClientRect=function(){return{width:10,height:10,top:0,left:0,right:10,bottom:10}};
W.Element.prototype.getClientRects=function(){return[{width:10,height:10}]};
W.CSS={escape:s=>s};
const ed=D.getElementById('ed').contentDocument;ed.designMode='on';
ed.body.innerHTML='<div>Usuaria se comunica reportando que sus estudios aparecen como pendientes.</div><div><br></div><div>Se validan los estudios en la plataforma y efectivamente el estado no corresponde.</div>';
Object.defineProperty(ed.body,'innerText',{get(){return [...ed.body.children].map(x=>x.textContent).join('\n')},configurable:true});
W.URL.createObjectURL=()=>'blob:x';W.URL.revokeObjectURL=()=>{};
W.eval(src);
const d=D.getElementById('n1kit-frame').contentDocument;
const E=t=>new d.defaultView.Event(t);
let bajado=null;
W.HTMLAnchorElement.prototype.click=function(){if(this.download)bajado=this.download};
[...d.querySelectorAll('.tab')].find(t=>t.textContent==='Herramientas').click();
[...d.querySelectorAll('.act')].find(b=>/Exportar ticket/.test(b.textContent)).click();
[...d.querySelectorAll('main .b.p')].find(b=>/Leer/.test(b.textContent)).click();
console.log('LOG:',[...d.querySelectorAll('.log div')].map(x=>x.textContent).join(' | '));
console.log('\n================ .md ================\n'+d.querySelector('main textarea').value);
const chks=[...d.querySelectorAll('main .chk input')];
chks[1].checked=true;chks[1].dispatchEvent(E('change'));
const md2=d.querySelector('main textarea').value;
console.log('================ con datos ocultos ================');
console.log(md2.split('\n').filter(l=>/paciente|solicitante|Telefono|documento/i.test(l)).join('\n'));
[...d.querySelectorAll('main .b')].find(b=>/Descargar/.test(b.textContent)).click();
console.log('\nnombre del archivo:',bajado);
process.exit(0);
