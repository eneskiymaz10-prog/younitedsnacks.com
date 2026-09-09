
(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const nav=$('.nav'),burger=$('.nav__burger'),links=$('#nav-links');
function closeMenu(restore=false){nav.classList.remove('is-open');burger.setAttribute('aria-expanded','false');burger.setAttribute('aria-label','Open menu');document.body.classList.remove('menu-open');if(restore)burger.focus();}
burger.addEventListener('click',()=>{const open=burger.getAttribute('aria-expanded')!=='true';if(!open)return closeMenu();nav.classList.add('is-open');burger.setAttribute('aria-expanded','true');burger.setAttribute('aria-label','Close menu');document.body.classList.add('menu-open');});
$$('a',links).forEach(a=>a.addEventListener('click',()=>closeMenu()));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('is-open'))closeMenu(true);if(e.key==='Tab'&&nav.classList.contains('is-open')){const stops=[...$$('a',links),burger];const first=stops[0],last=stops[stops.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
matchMedia('(max-width:820px)').addEventListener('change',()=>closeMenu());
const range=$('#range'),families=$$('[data-family]'),tabs=$$('[data-show-family]');
function markFamily(id){tabs.forEach(tab=>{const active=tab.dataset.showFamily===id;tab.classList.toggle('is-active',active);tab.setAttribute('aria-pressed',String(active));});}
function selectFamily(id){
if(range.classList.contains('range-cinematic')){range.dispatchEvent(new CustomEvent('range:select',{detail:{id}}));return;}
families.forEach(panel=>{panel.hidden=panel.dataset.family!==id;});markFamily(id);
range.dispatchEvent(new CustomEvent('range:change',{detail:{id}}));
}
range.addEventListener('range:active',e=>markFamily(e.detail.id));
range.addEventListener('range:layout',e=>{if(e.detail.cinematic)families.forEach(panel=>panel.hidden=false);else selectFamily(tabs.find(tab=>tab.classList.contains('is-active'))?.dataset.showFamily||'bars');});
tabs.forEach(tab=>tab.addEventListener('click',()=>selectFamily(tab.dataset.showFamily)));
function selectProduct(panel,index){const photos=$$('.product-photo',panel);if(!photos[index])return;photos.forEach((photo,i)=>photo.classList.toggle('is-selected',i===index));$$('.flavour',panel).forEach((b,i)=>{b.classList.toggle('is-active',i===index);b.setAttribute('aria-pressed',String(i===index));});$('.product-caption',panel).textContent=$$('.flavour',panel)[index].textContent;}
families.forEach(panel=>$$('.flavour',panel).forEach(button=>button.addEventListener('click',()=>selectProduct(panel,Number(button.dataset.product)))));
$$('[data-select-family]').forEach(a=>a.addEventListener('click',e=>{if(range.classList.contains('range-cinematic'))e.preventDefault();selectFamily(a.dataset.selectFamily);const panel=families.find(f=>f.dataset.family===a.dataset.selectFamily);selectProduct(panel,Number(a.dataset.selectProduct||0));}));
selectFamily('bars');
$$('[data-intent]').forEach(a=>a.addEventListener('click',()=>{const choice=$$('input[name="intent"]').find(input=>input.value===a.dataset.intent);if(choice)choice.checked=true;}));
const form=$('#contact'),status=$('.form__status',form),key=$('input[name="access_key"]',form);
$('button[type="submit"]',form).disabled=false;
const configured=key.value!=='WEB3FORMS_ACCESS_KEY'&&key.value.trim()!=='';
if(configured){$('.form__notice',form).hidden=true;$('button[type="submit"]',form).firstChild.textContent='Send my enquiry ';}
form.addEventListener('submit',async e=>{
e.preventDefault();if(!form.reportValidity())return;if($('input[name="botcheck"]',form).checked)return;
const data=new FormData(form),button=$('button[type="submit"]',form);
if(!configured){
const lines=['YOUNITED — Enquiry brief','',...['intent','name','email','company','country','message'].map(name=>name[0].toUpperCase()+name.slice(1)+': '+(data.get(name)||'')),'','Saved locally. This enquiry has not been sent.'];
const url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
const link=document.createElement('a');link.href=url;link.download='younited-enquiry.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
status.textContent='Your brief has been downloaded. Nothing has been sent; keep it to share when enquiries open.';return;
}
button.disabled=true;status.textContent='Sending your enquiry…';
try{const response=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(data))});const result=await response.json();if(!response.ok||!result.success)throw new Error('Delivery failed');status.textContent='Thank you. Your enquiry has been sent.';form.reset();}
catch{status.textContent='Your enquiry could not be sent. Please try again; your details are still here.';}
finally{button.disabled=false;}
});
const sticky=$('.sticky-cta');let frame=0;
function updateSticky(){const visible=matchMedia('(max-width:560px)').matches&&$('#hero').getBoundingClientRect().bottom<0&&$('#partner').getBoundingClientRect().top>innerHeight;sticky.hidden=!visible;frame=0;}
addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(updateSticky);},{passive:true});addEventListener('resize',updateSticky);updateSticky();
})();
