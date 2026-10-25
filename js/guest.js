'use strict';
const $=s=>document.querySelector(s),form=$('#rsvp-form');
let inviteToken=new URLSearchParams(location.search).get('invite')||'';
const sharedAccess=new URLSearchParams(location.search).get('access')||'';
let invitation,current;
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
  field('dress_code_accepted').checked=!!current?.dress_code_accepted;toggleDress();
  if(current){text($('#welcome-answer'),'Изменить ответ ↗');text($('#form-status'),'Ваш ответ сохранён');text($('#save-button'),'Обновить ответ ↗');}
  const size=invitation.adults+invitation.children;text($('#party-hint'),size>1?'Ответ относится ко всем гостям этого приглашения. Если состав изменится, сообщите организаторам.':'');show($('#party-hint'),size>1);
  show(form);show($('#loading'),false);
 }catch(error){show($('#loading'),false);show($('#load-error'));text($('#load-error'),error.message);}
}
form.addEventListener('input',()=>show($('#saved'),false));
form.addEventListener('submit',async event=>{
 event.preventDefault();show($('#form-error'),false);show($('#saved'),false);const button=$('#save-button');button.disabled=true;text(button,'Сохраняем…');
 try{
  const data=await api('/api/respond',{invite:inviteToken,respondent:field('respondent').value,attending:field('attending').value,consent:field('consent').checked,dress_code_accepted:field('dress_code_accepted').checked});current=data.response;
  text($('#welcome-answer'),'Изменить ответ ↗');
  history.replaceState(null,'',location.pathname+'?invite='+encodeURIComponent(inviteToken)+location.hash);
  text($('#form-status'),'Ваш ответ сохранён');text($('#saved'),data.demo?'Тестовый ответ сохранён только в этом браузере. Организаторам он не отправлен.':current.attending==='yes'?'Спасибо! Будем рады видеть вас 12 декабря в 16:00.':'Спасибо, что сообщили. Ваш ответ сохранён.');show($('#saved'));
 }catch(error){text($('#form-error'),error.message);show($('#form-error'));}
 finally{button.disabled=false;text(button,current?'Обновить ответ ↗':'Отправить ответ ↗');}
});
function toggleDress(){const yes=field('attending').value==='yes';show($('#dress-accept-row'),yes);field('dress_code_accepted').required=yes;field('dress_code_accepted').disabled=!yes;}
form.querySelectorAll('[name=attending]').forEach(input=>input.addEventListener('change',toggleDress));
initialize();
