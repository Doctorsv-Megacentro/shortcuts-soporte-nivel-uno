/* Exportar ticket desde la VISTA (viewWO): los datos son texto, no campos de formulario */
const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const par=(l,v)=>`<tr><td class="lbl">${l}</td><td class="val">${v}</td></tr>`;
const html=`
<div id=cab>
  <h2 class="titulo">#2926775  Incidencias tecnicas || Problemas con datos generales del usuarioFecha de vencimiento  : -Solicitante  : 02482868-2</h2>
  <div>por <a>02482868-2</a> en 22/10/2026 07:46 AM | Vencimiento antes de : N/D</div>
</div>
<ul class=tabs><li>Detalles</li><li>Resolución</li><li>Tareas</li><li>Historial</li></ul>
<div class="descbox">
  <div class="secc"><span class="tit">Descripción</span></div>
  <div class="cuerpo">
    <p>La usuaria se contacta indicando que desea actualizar su número de teléfono porque no puede ingresar en la app. Se verifica en el sistema que no posee el correo electrónico y la usuaria indica que ella ya había mandado el correo electrónico por WhatsApp.</p>
    <p>Se valida en sistema de SDP y se encuentra el ticket de 2920614 que está cerrado debido al intento de llamadas para contactarse con ella y no respondió.</p>
    <p><b>Favor de contactarse con la usuaria al nuevo numero de telefono 50373800870</b></p>
  </div>
  <div class="adj"><span class="tit">Archivos adjuntos</span><div>Screenshot 2026-...</div>
  <div>Examinar archivos o Arrastre los archivos aquí [ Tamaño máx: 25 MB. ]</div></div>
  <div class="acc"><button>Responder a todos</button><button>Respuesta</button><button>Reenviar</button></div>
</div>
<div class="convbox">
  <div class="conv-head"><span class="tit">Conversaciones</span><label>Correo electrónico</label><label>Notificaciones del sistema</label><label>Notas</label><a>Agregar notas</a></div>
  <div class="hilo">
    <div class="autor">ATU DIG Agente grupo 1A 22/10/2026 07:58 AM</div>
    <p>Se recibe validación de identidad de usuaria. Se brinda saludo y se confirman datos.</p>
    <p>Se verifica ticket cerrado #2920614: Incidencias técnicas, problemas con datos generales del usuario y ticket actualmente abierto a nombre de la usuaria.</p>
    <p>Usuaria confirma datos:</p>
    <p>Teléfono<br>73800870</p>
    <p>Correo<br>mplc4889@gmail.com</p>
    <p>Se envía para el área correspondiente para que por favor, apoyen a la usuaria con su situación.</p>
    <p>ID: 9321401<br>Agente: Carmen Villalobos.</p>
  </div>
</div>
<div class="panel"><table>
${par('Estado','IT Critico N1')}
${par('Prioridad','Sin especificar')}
${par('Técnico','ST Josue Adonai Perez Lopez')}
${par('Grupo','SP1')}
${par('Tipificacion 1','Incidencias tecnicas')}
${par('Tipificacion 2','Problemas con datos generales del usuario')}
${par('Nombre del paciente','MARIA PATRICIA LOPEZ CRUZ')}
${par('Numero de documento del paciente','02482868-2')}
${par('Telefono de contacto del paciente','50373800870')}
${par('TSJ','-')}
${par('Prioridad','No asignado')}
${par('Nivel','No asignado')}
${par('Departamento','No está asociado a ningún sitio')}
${par('ID de la Cita','7381675')}
${par('Especialidad','No asignado')}
${par('Fecha y hora de la cita','-')}
${par('Comentario de cierre del ticket','-')}
${par('Nombre del solicitante','MARIA PATRICIA LOPEZ CRUZ')}
${par('Telefono del solicitante','50373800870')}
${par('Fecha de vencimiento',':')}
${par('Modelo Dispositivo','SM-A057M')}
${par('Version APP','Sin especificar')}
${par('Resumen del caso','Usuaria solicita actualizacion de numero de telefono y registro de correo en la app.')}
${par('Fecha de creación','22/10/2026 07:46 AM')}
</table></div>`;
const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=viewWO&woID=2926775',pretendToBeVisual:true});
const W=dom.window,D=W.document;
W.Element.prototype.getBoundingClientRect=function(){return{width:10,height:10,top:0,left:0,right:10,bottom:10}};
W.Element.prototype.getClientRects=function(){return[{width:10,height:10}]};
W.CSS={escape:s=>s};W.URL.createObjectURL=()=>'blob:x';W.URL.revokeObjectURL=()=>{};
/* innerText simulado: los bloques separan con salto de línea, <br> también */
Object.defineProperty(W.HTMLElement.prototype,'innerText',{configurable:true,get(){
  const B=/^(DIV|P|TR|LI|H1|H2|H3|H4|H5|H6|TABLE|UL|OL|SECTION|HEADER|FOOTER|BR|TD)$/;
  const walk=n=>{let s='';n.childNodes.forEach(c=>{
    if(c.nodeType===3)s+=c.textContent.replace(/\s+/g,' ');
    else if(c.nodeType===1){const b=B.test(c.tagName);if(c.tagName==='BR')s+='\n';else{if(b&&s&&!s.endsWith('\n'))s+='\n';s+=walk(c);if(b&&!s.endsWith('\n'))s+='\n'}}});
    return s};
  return walk(this).replace(/[ \t]+/g,' ').replace(/ ?\n ?/g,'\n').trim()}});
W.eval(src);
const d=D.getElementById('n1kit-frame').contentDocument;
[...d.querySelectorAll('.tab')].find(t=>t.textContent==='Herramientas').click();
[...d.querySelectorAll('.act')].find(b=>/Exportar ticket/.test(b.textContent)).click();
[...d.querySelectorAll('main .b.p')].find(b=>/Leer/.test(b.textContent)).click();
console.log('LOG:',[...d.querySelectorAll('.log div')].map(x=>x.textContent).join(' | '));
console.log('\n======== BÁSICO ========\n'+d.querySelector('main textarea').value);
const chks=[...d.querySelectorAll('main .chk input')];
const t0=Date.now();chks[1].checked=true;chks[1].dispatchEvent(new d.defaultView.Event('change'));
console.log('======== ocultar datos (tardó '+(Date.now()-t0)+' ms) ========');
console.log(d.querySelector('main textarea').value.split('\n').filter(l=>/Nombre|Tel|Documento/.test(l)).join('\n'));
chks[1].checked=false;chks[0].checked=true;chks[0].dispatchEvent(new d.defaultView.Event('change'));
console.log('\n======== todos los campos: '+d.querySelector('main textarea').value.split('\n').filter(l=>l.startsWith('- ')).length+' líneas ========');
process.exit(0);
