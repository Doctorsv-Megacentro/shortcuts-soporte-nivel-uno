const fs=require('fs');const {JSDOM}=require('jsdom');const src=fs.readFileSync(process.argv[2],'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM('<body><div id=main><footer><div contenteditable=true></div></footer></div></body>',{runScripts:'outside-only',url:'https://web.whatsapp.com/',pretendToBeVisual:true});const W=dom.window;
 W.Element.prototype.getBoundingClientRect=function(){return {width:10,height:10,top:0,left:0,right:10,bottom:10}};W.CSS={escape:s=>s};
 W.eval(src);const fr=W.document.getElementById('n1kit-frame');let d=fr.contentDocument;
 const nulls=()=>/null/.test(d.body.textContent);
 // recorrer vistas buscando "null"
 let malo=[];
 const tabs=[...d.querySelectorAll('.tab')].map(t=>t.textContent);
 for(const t of tabs){[...d.querySelectorAll('.tab')].find(x=>x.textContent===t).click(); if(nulls()) malo.push('tab '+t);
   const n=d.querySelectorAll('main .act').length; for(let i=0;i<n;i++){ const b=d.querySelectorAll('main .act')[i]; if(!b) continue; const nom=b.textContent; if(/Diagnóstico/.test(nom)) continue; b.click(); if(nulls()) malo.push(nom); const back=[...d.querySelectorAll('header .ib')].find(x=>x.title==='Volver'); if(back) back.click(); else break; } }
 // minimizar
 [...d.querySelectorAll('header .ib')].find(x=>/Ocultar/.test(x.title)).click(); if(nulls()) malo.push('barrita'); [...d.querySelectorAll('header .ib')].find(x=>x.title==='Mostrar').click();
 console.log('vistas con "null":',malo.length?malo:'ninguna');
 // latencia
 [...d.querySelectorAll('.tab')].find(x=>x.textContent==='N1').click();
 [...d.querySelectorAll('.act')].find(b=>/Latencia/.test(b.textContent)).click();
 const s=d.querySelector('main select');[...s.options].forEach(o=>{}); 
 const ub=d.querySelectorAll('main select')[1];ub.value='TM3';ub.dispatchEvent(new d.defaultView.Event('change'));
 console.log('LATENCIA:\n'+d.querySelector('.pv').value);
 const vis=[...d.querySelectorAll('main .f')].filter(f=>f.style.display!=='none').map(f=>(f.querySelector('.l')||f).textContent.trim());console.log('campos visibles:',vis.join(' | '));
 [...d.querySelectorAll('.add')].find(b=>/Otra/.test(b.textContent)).click();console.log('otra:',d.querySelector('.pv').value.split('\n')[1]);
 // panel quitado por la página
 fr.remove();await sleep(1700);
 const fr2=W.document.getElementById('n1kit-frame');d=fr2&&fr2.contentDocument;
 console.log('re-agregado:',!!fr2,'| contenido:',d&&d.querySelectorAll('.tab').length+' pestañas');
 // en blanco
 d.body.replaceChildren();await sleep(1700);d=W.document.getElementById('n1kit-frame').contentDocument;
 console.log('reconstruido tras quedar en blanco:',d.querySelectorAll('.tab').length+' pestañas');
 // cerrar con ✕ no vuelve
 [...d.querySelectorAll('header .ib')].find(x=>x.title==='Cerrar').click();await sleep(1700);
 console.log('cerrado con ✕ sigue cerrado:',!W.document.getElementById('n1kit-frame'));
 // abrir y cerrar con el marcador
 W.eval(src);await sleep(100);W.eval(src);await sleep(1700);console.log('cerrado con marcador sigue cerrado:',!W.document.getElementById('n1kit-frame'));
 process.exit(0);
})().catch(e=>{console.log('FALLO',e);process.exit(1)});
