'use strict';
const $=s=>document.querySelector(s),form=$('#rsvp-form');
let inviteToken=new URLSearchParams(location.search).get('invite')||'';
const sharedAccess=new URLSearchParams(location.search).get('access')||'';
let invitation,current,surveySettings;
function text(el,value){el.textContent=value||'';}
function show(el,visible=true){el.hidden=!visible;}
function field(name){return form.elements.namedItem(name);}
function formatDate(value){return new Date(value+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});}
async function api(path,body){
 const key='ek-wedding-preview-attendance-v3';
 if(body){try{sessionStorage.setItem(key,JSON.stringify(body));}catch{}return {response:body,demo:true};}
 const response=await fetch('./preview-data.json');if(!response.ok)throw Error('Не удалось загрузить демонстрацию');const data=await response.json();try{data.response=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}return data;
}
function applySettings(s){
 surveySettings=s;
 text($('#deadline'),s.rsvp_deadline?'Пожалуйста, ответьте до '+formatDate(s.rsvp_deadline)+'.':'');show($('#deadline'),!!s.rsvp_deadline);
 text($('#intro'),s.intro);text($('#closing-text'),s.closing);
 text($('#venue'),s.venue);text($('#address'),s.address||'Точный адрес сообщим дополнительно.');
 text($('#event-time'),s.time?' · сбор гостей в '+s.time:'');
 text($('#hero-location'),[s.venue,s.time?'Сбор гостей в '+s.time:''].filter(Boolean).join(' · '));
 show($('#venue-pending'),!s.map_url);if(s.map_url){$('#map-link').href=s.map_url;show($('#map-link'));}
 text($('#dress-code'),s.dress_code||'Подробности дресс-кода сообщим дополнительно.');
 text($('#wishes'),s.wishes);show($('#wishes-block'),!!s.wishes);
 text($('#contact'),s.contact);show($('#contact'),!!s.contact);
 const today=new Date();text($('#days'),Math.max(0,Math.round((Date.UTC(2026,11,12)-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000)));
 const schedule=$('#schedule');schedule.replaceChildren();
 for(const line of s.schedule.split('\n').filter(x=>x.trim())){const [time,...rest]=line.split('|');const item=document.createElement('div');item.className='schedule-item';const t=document.createElement('time'),p=document.createElement('p');text(t,time.trim());text(p,rest.join('|').trim());item.append(t,p);schedule.append(item);}
 show($('#schedule-block'),schedule.childElementCount>0);
}
async function initialize(){
 try{
  const data=await api('/api/invitation'+(inviteToken?'?invite='+encodeURIComponent(inviteToken):''));invitation=data.invitation;current=data.response;inviteToken=data.token||inviteToken;
  applySettings(data.settings);text($('#greeting'),invitation.title);show($('#preview-bar'),!!invitation.demo);
  field('respondent').value=current?.respondent||'';field('attending').value=current?.attending||'';field('consent').checked=!!current?.consent;
  field('dress_code_accepted').checked=!!current?.dress_code_accepted;renderDrinks();toggleDress();
  if(current){text($('#welcome-answer'),'Изменить ответ ↗');text($('#form-status'),'Ваш ответ сохранён');text($('#save-button'),'Обновить ответ ↗');}
  const size=invitation.adults+invitation.children;text($('#party-hint'),size>1?'Ответ относится ко всем гостям этого приглашения. Если состав изменится, сообщите организаторам.':'');show($('#party-hint'),size>1);
  show(form);show($('#loading'),false);
 }catch(error){show($('#loading'),false);show($('#load-error'));text($('#load-error'),error.message);}
}
form.addEventListener('input',()=>show($('#saved'),false));
form.addEventListener('submit',async event=>{
 event.preventDefault();show($('#form-error'),false);show($('#saved'),false);const button=$('#save-button');button.disabled=true;text(button,'Сохраняем…');
 try{
  const data=await api('/api/respond',{invite:inviteToken,respondent:field('respondent').value,attending:field('attending').value,consent:field('consent').checked,dress_code_accepted:field('dress_code_accepted').checked,...(surveySettings.drinks_enabled==='1'?{drink_answers:collectDrinks()}: {})});current=data.response;
  text($('#welcome-answer'),'Изменить ответ ↗');
  history.replaceState(null,'',location.pathname+'?invite='+encodeURIComponent(inviteToken)+location.hash);
  text($('#form-status'),'Ваш ответ сохранён');text($('#saved'),data.demo?'Тестовый ответ сохранён только в этом браузере. Организаторам он не отправлен.':current.attending==='yes'?'Спасибо! Будем рады видеть вас 12 декабря в 16:00.':'Спасибо, что сообщили. Ваш ответ сохранён.');show($('#saved'));
 }catch(error){text($('#form-error'),error.message);show($('#form-error'));}
 finally{button.disabled=false;text(button,current?'Обновить ответ ↗':'Отправить ответ ↗');}
});
function toggleDress(){const yes=field('attending').value==='yes';show($('#dress-accept-row'),yes);field('dress_code_accepted').required=yes;field('dress_code_accepted').disabled=!yes;toggleDrinks(yes);}
form.querySelectorAll('[name=attending]').forEach(input=>input.addEventListener('change',toggleDress));

function collectDrinks(){return [...document.querySelectorAll('.drink-person')].map((card,index)=>({name:card.querySelector('.drink-person-name')?card.querySelector('.drink-person-name').value:field('respondent').value,choices:[...card.querySelectorAll('[data-drink-choice]:checked')].map(i=>i.value),abstains:card.querySelector('[data-abstains]').checked}));}
function renderDrinks(){
 const s=surveySettings,container=$('#drinks-people');container.replaceChildren();
 text($('#drinks-title'),s.drinks_title);text($('#drinks-hint'),s.drinks_hint);
 text($('#drinks-mode'),(s.drinks_multiple==='1'?'Можно выбрать несколько вариантов.':'Выберите один вариант.')+(s.drinks_required==='1'?' Ответ обязателен для каждого взрослого.':' Можно пропустить.'));
 const count=invitation.adults||1,options=(s.drinks_options||'').split('\n').filter(Boolean);
 for(let index=0;index<count;index++){
  const prior=current?.drink_answers?.[index]||{},card=document.createElement('fieldset');card.className='drink-person';
  const legend=document.createElement('legend');text(legend,count>1?'Гость '+(index+1):'Ваш выбор');card.append(legend);
  if(count>1){const label=document.createElement('label');label.className='field';const caption=document.createElement('span');text(caption,'Имя гостя');const name=document.createElement('input');name.type='text';name.maxLength=120;name.className='drink-person-name';name.autocomplete='off';name.value=prior.name||'';label.append(caption,name);card.append(label);}
  const group=document.createElement('div');group.className='drink-tiles';
  const labels=[...options,...(prior.choices||[]).filter(v=>!options.includes(v))];
  for(const [n,value]of labels.entries()){
   const label=document.createElement('label');label.className='drink-tile';const input=document.createElement('input');input.type=s.drinks_multiple==='1'?'checkbox':'radio';input.name='drink-'+index;input.value=value;input.dataset.drinkChoice='1';input.checked=(prior.choices||[]).includes(value);const copy=document.createElement('span');text(copy,value);if(!options.includes(value)){const old=document.createElement('small');text(old,'Ранее выбранный вариант');copy.append(old)}label.append(input,copy);group.append(label);
  }
  const none=document.createElement('label');none.className='drink-tile drink-none';const input=document.createElement('input');input.type='checkbox';input.dataset.abstains='1';input.checked=!!prior.abstains;const label=document.createElement('span');text(label,s.drinks_none_label);none.append(input,label);group.append(none);card.append(group);container.append(card);
  card.addEventListener('change',event=>{if(event.target===input&&input.checked)card.querySelectorAll('[data-drink-choice]').forEach(i=>i.checked=false);else if(event.target.matches('[data-drink-choice]')&&event.target.checked)input.checked=false;updateDrinkRequirements(card)});
  updateDrinkRequirements(card);
 }
}
function updateDrinkRequirements(card){
 const enabled=field('attending').value==='yes'&&surveySettings?.drinks_enabled==='1',required=enabled&&surveySettings.drinks_required==='1';
 const inputs=[...card.querySelectorAll('[data-drink-choice],[data-abstains]')],answered=inputs.some(i=>i.checked),first=inputs[0];
 if(first)first.setCustomValidity(required&&!answered?'Выберите напиток или вариант без алкоголя.':'');
 const name=card.querySelector('.drink-person-name');if(name)name.required=enabled&&(required||answered);
}
function toggleDrinks(yes){const enabled=yes&&surveySettings?.drinks_enabled==='1';show($('#drinks-survey'),enabled);$('#drinks-survey').querySelectorAll('input').forEach(i=>i.disabled=!enabled);document.querySelectorAll('.drink-person').forEach(updateDrinkRequirements);}
initialize();
