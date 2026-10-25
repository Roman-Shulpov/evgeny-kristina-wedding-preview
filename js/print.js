'use strict';
const $=s=>document.querySelector(s),token=new URLSearchParams(location.search).get('invite');
$('#print-button').disabled=true;
$('#print-button').addEventListener('click',()=>window.print());
(async()=>{try{
 const response=await fetch('./preview-data.json');
 const data=await response.json();if(!response.ok)throw new Error(data.error||'Не удалось загрузить приглашение.');
 const s=data.settings;
 const deadline=$('#print-deadline');deadline.hidden=!s.rsvp_deadline;if(s.rsvp_deadline)deadline.textContent='Пожалуйста, ответьте до '+new Date(s.rsvp_deadline+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'})+'.';
 $('#print-greeting').textContent=data.invitation?.title||'Дорогие наши!';
 await document.fonts.ready;
 const greeting=$('#print-greeting');
 for(let size=37;size>=21 && greeting.getBoundingClientRect().height>150;size--)greeting.style.fontSize=size+'px';$('#print-intro').textContent=s.intro;
 $('#print-venue').textContent=[s.time?`Сбор гостей в ${s.time}`:'',s.venue,s.address].filter(Boolean).join('\n')||'Место и время сообщим дополнительно.';
 $('#print-dress').textContent='Дресс-код: '+s.dress_code.replace(/Примеры образов[^.]*\.?/g,'').trim();
 $('#print-contact').textContent=s.contact;$('#print-wishes').textContent=s.wishes||'';
 $('#print-schedule').textContent=s.schedule.split('\n').filter(Boolean).map(line=>line.replace('|','—')).join('\n');
 if(s.schedule.split('\n').filter(Boolean).length>3)document.body.classList.add('compact-print');
 if(!token){$('#print-warning').textContent='Выберите гостя в студии → «Ссылка и QR» → «Персональная открытка». Этот макет без персонального QR.';}
 if(false){
   const auth=await fetch('/api/admin/me');
   if(!auth.ok)throw new Error('Для персонального QR войдите в студию организатора.');
   const settingsResponse=await fetch('/api/admin/settings');const settingsData=await settingsResponse.json();const online=!!settingsData.config?.public_url;
   const qr=document.createElement('img');qr.src=`/api/admin/qr?invite=${encodeURIComponent(token)}`;qr.alt='QR-код приглашения';
   $('#print-qr').replaceChildren(qr);
   $('#print-warning').textContent=online?'Персональное приглашение. Проверьте QR на телефоне перед тиражом.':'ЛОКАЛЬНЫЙ QR — только для проверки. Для тиража нужен публичный адрес.';
   if(!online)$('.print-qr-row p').textContent='Откройте приглашение и оставьте ответ. QR пока локальный.';
 }
 await Promise.all([...document.images].map(img=>img.decode()));
 document.documentElement.dataset.printReady='true';$('#print-button').disabled=false;
}catch(error){$('#print-warning').textContent=error.message;$('#print-button').disabled=true;}})();
