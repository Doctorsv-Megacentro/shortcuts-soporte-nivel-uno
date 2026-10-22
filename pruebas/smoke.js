const fs=require('fs');const {JSDOM}=require('jsdom');
const src=fs.readFileSync(__dirname+'/../src/n1-atajos.js','utf8');
const dom=new JSDOM('<body><div id="main"><footer><div contenteditable="true"></div></footer></div></body>',{runScripts:'outside-only',pretendToBeVisual:true});
const W=dom.window;W.eval(src);
const fr=W.document.getElementById('n1kit-frame');const d=fr.contentDocument;
const fire=(el,t)=>el.dispatchEvent(new fr.contentWindow.Event(t,{bubbles:true}));
const acts=()=>[...d.querySelectorAll('main .act')];
let errs=0,samples=[];
const n=acts().length;console.log('acciones:',n);
for(let i=0;i<n;i++){
  acts()[i].click();
  const title=d.querySelector('header b').textContent;
  const pv=d.querySelector('.pv');
  if(!pv||d.querySelector('.foot').style.display==='none'){console.log('QUICK',title,acts().length,'botones');d.querySelector('header .ib').click();continue;}
  const check=tag=>{if(/\(error|undefined|NaN|\[object/.test(pv.value)){errs++;console.log('ERR',title,tag,'\n',pv.value);}};
  check('vacío');const empty=pv.value;
  // fill text inputs
  d.querySelectorAll('main input[type=text],main textarea').forEach((x,j)=>{x.value=x.placeholder&&/correo/.test(x.placeholder)?'karla.martinez@doctorsv.gob.sv':(j===0?'Karla Martínez':'Dato '+j);fire(x,'input');});
  check('lleno');
  // add second pair if exists
  const add=d.querySelector('.add');if(add){add.click();const r=d.querySelectorAll('.row')[1];if(r){const [a,b]=r.querySelectorAll('input');a.value='Luis Pérez';fire(a,'input');b.value='luis.perez@doctorsv.gob.sv';fire(b,'input');}check('2 pares');}
  // iterate selects
  const sels=[...d.querySelectorAll('main select')];
  for(const s of sels){for(const o of [...s.options]){s.value=o.value;fire(s,'change');
      // refill newly visible text
      d.querySelectorAll('main input[type=text],main textarea').forEach(x=>{if(!x.value){x.value='Extra';fire(x,'input');}});
      check(o.value);
      // combos with second select
      for(const s2 of sels){if(s2===s)continue;for(const o2 of [...s2.options]){s2.value=o2.value;fire(s2,'change');check(o.value+'+'+o2.value);}}
  }}
  // toggle checkboxes
  d.querySelectorAll('main input[type=checkbox]').forEach(c=>{c.checked=!c.checked;fire(c,'change');check('chk');});
  const sal=d.querySelector('.foot input[type=checkbox]');sal.checked=!sal.checked;fire(sal,'change');check('saludo');
  samples.push('### '+title+'\n[vacío]\n'+empty+'\n[final]\n'+pv.value+'\n[warn] '+d.querySelector('.warn').textContent);
  d.querySelector('header .ib').click();
}
fs.writeFileSync(process.argv[2],samples.join('\n\n'));
// test write into composer
acts()[0].click();
d.querySelector('.b.p').click();
setTimeout(()=>{console.log('composer:',JSON.stringify(W.document.querySelector('[contenteditable]').textContent.slice(0,80)));console.log('errores:',errs);
// toggle close
W.eval(src);console.log('cerrado:',!W.document.getElementById('n1kit-frame'));},400);
