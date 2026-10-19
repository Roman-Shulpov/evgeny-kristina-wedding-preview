'use strict';
const $ = s => document.querySelector(s);
const form = $('#rsvp-form');
const params = new URLSearchParams(location.search);
const tg = window.Telegram?.WebApp;
const inviteToken = params.get('invite') || tg?.initDataUnsafe?.start_param || 'demo';
let invitation, current, drinks = [], personDrafts = [];

function text(el, value) { el.textContent = value || ''; }
function show(el, visible = true) { el.hidden = !visible; }
function field(name) { return form.elements.namedItem(name); }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', {day:'numeric',month:'long'}); }
async function api(path, body) {
 const key='ek-wedding-public-preview-v1';
 if(body){try{sessionStorage.setItem(key,JSON.stringify(body));}catch{}return {response:body,demo:true};}
 const response=await fetch('./preview-data.json');if(!response.ok)throw Error('Не удалось загрузить демонстрацию');
 const data=await response.json();try{data.response=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}return data;
}
function applySettings(s) {
  text($('#intro'), s.intro); text($('#closing-text'), s.closing);
  text($('#venue'), s.venue || 'Место нашей встречи');
  text($('#address'), s.address || 'Адрес и время мы сообщим здесь чуть позже.');
  text($('#event-time'), s.time ? ` · ${s.time}` : '');
  show($('#venue-pending'), !s.map_url);
  if (s.map_url) { $('#map-link').href = s.map_url; show($('#map-link')); }
  show($('#dress-block'), !!s.dress_code); text($('#dress-code'), s.dress_code);
  show($('#contact'), !!s.contact); text($('#contact'), s.contact);
  if (s.rsvp_deadline) { show($('#deadline')); text($('#deadline'), `Будем благодарны за ответ до ${formatDate(s.rsvp_deadline)}.`); }
  const schedule = $('#schedule'); schedule.replaceChildren();
  for (const line of s.schedule.split('\n').filter(x=>x.trim())) {
    const [time, ...rest] = line.split('|');
    const item = document.createElement('div'); item.className = 'schedule-item';
    const t = document.createElement('time'); text(t,time.trim());
    const p = document.createElement('p'); text(p,rest.join('|').trim());
    item.append(t,p); schedule.append(item);
  }
  show($('#schedule-block'), schedule.childElementCount > 0);
  const localToday = new Date();
  const today = Date.UTC(localToday.getFullYear(),localToday.getMonth(),localToday.getDate());
  text($('#days'), Math.max(0, Math.round((Date.UTC(2026,11,12) - today)/86400000)));
}
function collectPeople() {
  return [...$('#people').children].map(card=>({name:card.querySelector('[data-name]').value,
    drinks:[...card.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value),diet:card.querySelector('[data-diet]').value}));
}
function renderPeople(count, initial) {
  if (!initial) {
    const visible = collectPeople();
    visible.forEach((p,i)=>personDrafts[i]=p);
  } else personDrafts = initial;
  $('#people').replaceChildren();
  for (let i=0;i<count;i++) {
    const person = personDrafts[i] || {name:i===0?field('respondent').value:'',drinks:[],diet:''};
    const card = document.createElement('section'); card.className = 'person-card';
    const heading = document.createElement('div'); heading.className = 'person-label'; text(heading, `ГОСТЬ ${String(i+1).padStart(2,'0')}`);
    const label = document.createElement('label'); label.className='field'; text(label,'Имя и фамилия');
    const name=document.createElement('input');name.dataset.name='';name.maxLength=120;name.required=true;name.value=person.name;name.autocomplete='name';label.append(name);
    const group=document.createElement('fieldset');group.className='drink-group';const legend=document.createElement('legend');text(legend,'Что предпочитаете пить? Можно выбрать несколько вариантов.');group.append(legend);
    const options=document.createElement('div');options.className='drink-options';
    for (const drink of drinks) {
      const chip=document.createElement('label');chip.className='drink-chip';const input=document.createElement('input');input.type='checkbox';input.value=drink;input.checked=person.drinks.includes(drink);
      const caption=document.createElement('span');text(caption,drink);chip.append(input,caption);options.append(chip);
      input.addEventListener('change',()=>{if(input.checked)for(const other of options.querySelectorAll('input'))if(other!==input&&(drink==='Без алкоголя'||other.value==='Без алкоголя'))other.checked=false;});
    }
    group.append(options);
    const dietLabel=document.createElement('label');dietLabel.className='field';text(dietLabel,'Ограничения по питанию и аллергии');
    const diet=document.createElement('input');diet.dataset.diet='';diet.maxLength=300;diet.placeholder='Если есть — напишите здесь';diet.value=person.diet;dietLabel.append(diet);
    card.append(heading,label,group,dietLabel);$('#people').append(card);
  }
  toggleAttendance();
}
function toggleAttendance() {
  const yes = field('attending').value === 'yes';
  show($('#yes-fields'), yes);
  for(const control of $('#yes-fields').querySelectorAll('input,select')) control.disabled = !yes;
  toggleChildren();
}
function toggleChildren() {
  const visible=field('attending').value==='yes' && Number($('#child-count').value)>0;
  show($('#children-names-field'), visible);field('children_names').disabled=!visible;
}
function options(select, min, max) {
  select.replaceChildren();
  for(let i=min;i<=max;i++){const option=document.createElement('option');option.value=i;text(option,i);select.append(option);}
}
function fillResponse(response) {
  const r=response||{respondent:'',attending:'',people:[],children:0,children_names:'',transfer:false,comment:'',consent:false};
  field('respondent').value=r.respondent;field('attending').value=r.attending;
  $('#adult-count').value=Math.max(1,r.people.length);$('#child-count').value=r.children;
  field('children_names').value=r.children_names;field('transfer').checked=r.transfer;field('comment').value=r.comment;field('consent').checked=r.consent;
  renderPeople(Number($('#adult-count').value),r.people);
  text($('#form-status'),response?'Ваш ответ сохранён':'С любовью к деталям');
  if(response) $('#save-button').firstChild.textContent='Обновить ответ ';
  toggleAttendance();
}
async function initialize() {
  try {
    if(tg?.initData){tg.ready();tg.expand();tg.setHeaderColor?.('#f4f0e9');tg.setBackgroundColor?.('#f4f0e9');}
    const data=await api(`/api/invitation?invite=${encodeURIComponent(inviteToken)}`);
    invitation=data.invitation;current=data.response;drinks=data.drinks;
    applySettings(data.settings);text($('#greeting'),invitation.title);
    show($('#preview-bar'),!!invitation.demo);
    options($('#adult-count'),1,invitation.adults);options($('#child-count'),0,invitation.children);
    show($('#children-field'),invitation.children>0);
    text($('#party-hint'),`В этом приглашении: взрослых — до ${invitation.adults}${invitation.children?`, детей — до ${invitation.children}`:''}.`);
    fillResponse(current);show(form);show($('#loading'),false);
  } catch(error) {show($('#loading'),false);show($('#load-error'));text($('#load-error'),error.message);}
}
$('#adult-count').addEventListener('change',()=>renderPeople(Number($('#adult-count').value)));
$('#child-count').addEventListener('change',toggleChildren);
for(const radio of form.querySelectorAll('[name=attending]'))radio.addEventListener('change',()=>{toggleAttendance();if(field('attending').value==='yes'&&!$('#people [data-name]').value)$('#people [data-name]').value=field('respondent').value;});
form.addEventListener('input',()=>{show($('#saved'),false);});
form.addEventListener('submit',async event=>{
  event.preventDefault();show($('#form-error'),false);show($('#saved'),false);
  const button=$('#save-button');button.disabled=true;text(button,'Сохраняем…');
  const payload={invite:inviteToken,respondent:field('respondent').value,attending:field('attending').value,
    people:collectPeople(),children:Number($('#child-count').value),children_names:field('children_names').value,
    transfer:field('transfer').checked,comment:field('comment').value,consent:field('consent').checked};
  try {
    const result=await api('/api/respond',payload);current=result.response;
    text($('#form-status'),'Ваш ответ сохранён');show($('#saved'));
    text($('#saved'),result.demo?'Тестовый ответ сохранён только в этом браузере. Организаторам он не отправлен.':current.attending==='yes'?'Спасибо! Ваш ответ сохранён. Будем счастливы видеть вас 12 декабря.':'Спасибо, что сообщили. Ваш ответ сохранён.');
    tg?.HapticFeedback?.notificationOccurred('success');
  }catch(error){show($('#form-error'));text($('#form-error'),error.message);}
  finally {button.disabled=false;text(button,current?'Обновить ответ ↗':'Отправить ответ ↗');}
});
initialize();
