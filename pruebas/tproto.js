const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only',url:'https://atencion.telesalud.gob.sv/WorkOrder.do?woMode=viewWO&woID=1',pretendToBeVisual:true});const W=dom.window;
 W.Element.prototype.getBoundingClientRect=function(){return {width:10,height:10,top:0,left:0,right:10,bottom:10}};W.CSS={escape:s=>s};W.URL.createObjectURL=()=>'blob:x';W.URL.revokeObjectURL=()=>{};
 // Prototype.js 1.6 (simulado): toJSON en Array y String
 W.eval(`Array.prototype.toJSON=function(){return '['+this.map(function(x){return JSON.stringify(x)}).join(', ')+']'};String.prototype.toJSON=function(){return '"'+this+'"'};`);
 // datos ya guardados mal por la versión anterior
 W.localStorage.setItem('n1kit', JSON.stringify({tab:'n1',m_locs:'["TM2"]',lv:{st0s:'[1, 3]'},m_sol:'ST Josue Adonai Perez Lopez'}));
 W.localStorage.setItem('n1kit-red', JSON.stringify({activo:true,inicio:Date.now()-5000,host:'atencion.telesalud.gob.sv',ev:'[{"tipo": "pagina", "t0": 1}]'}));
 const errs=[];W.addEventListener('error',e=>errs.push(e.message));
 try{W.eval(src);}catch(e){errs.push(e.message)}
 await sleep(1500);
 const d=W.document.getElementById('n1kit-frame').contentDocument;
 console.log('errores:',errs.length?errs:'ninguno','| panel con contenido:',!!d.querySelector('header'),'| barrita:',d.querySelector('header b').textContent);
 d.querySelector('.stop').click();await sleep(100);
 console.log('terminar diag ok:',d.querySelector('header b').textContent);
 // guardar estado con Prototype activo y releer
 [...d.querySelectorAll('header .ib')].find(x=>x.title==='Volver').click();
 [...d.querySelectorAll('.tab')].find(t=>t.textContent==='N1').click();
 [...d.querySelectorAll('.act')].find(b=>/Ticket/.test(b.textContent)).click();
 const pills=[...d.querySelectorAll('.pill input')];pills[2].checked=true;pills[2].dispatchEvent(new d.defaultView.Event('change'));
 const raw=JSON.parse(W.localStorage.getItem('n1kit'));console.log('m_locs guardado como lista:',Array.isArray(raw.m_locs),raw.m_locs);
 process.exit(0);
})().catch(e=>{console.log('FALLO',e);process.exit(1)});
