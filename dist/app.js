import { airlines } from './data/airlines.js';
import { airports } from './data/airports.js';
import { buildPlan, itemSignature, reconcileCompleted, airportLabel } from './lib/planner.js';

const $ = id => document.getElementById(id);
const form = $('trip-form');
const storageKey = 'ucusa-hazir-v1';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const futureDate = () => { const d = new Date(); d.setDate(d.getDate() + 7); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
let plan = null, completed = {}, filter = 'all', dirty = false, example = false, baseline = '', toastTimer, exampleBackup = null;
let canStore = true;

$('airports').innerHTML = Object.entries(airports).map(([code, a]) => `<option value="${code}">${escape(a.city)} — ${escape(a.name)}</option>`).join('');

function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}
function save() {
  if (example) return;
  try { localStorage.setItem(storageKey, JSON.stringify({ version:1, trip:plan.trip, completed })); }
  catch { if (canStore) toast('Tarayıcı kaydı kullanılamıyor. Listen açık kaldığı sürece kullanılabilir; kapatmadan indirebilirsin.'); canStore = false; }
}
function rawTrip() {
  const data = new FormData(form);
  const raw = Object.fromEntries(data);
  for (const key of ['hasConnection','mixedOperator','separateTickets','airportChange']) raw[key] = data.has(key);
  raw.needs = Object.fromEntries(['child','pet','assistance','meal','sports','powerbank'].map(key => [key,data.has(key)]));
  return raw;
}
function populate(trip) {
  updateFares(trip.airline || 'TK');
  for (const [key, value] of Object.entries(trip)) {
    if (key === 'needs') { for (const [need, selected] of Object.entries(value)) if ($(need)) $(need).checked = selected === true; continue; }
    const element = $(key);
    if (!element) continue;
    if (element.type === 'checkbox') element.checked = value === true;
    else element.value = value ?? '';
  }
  if (!$('fare').value) $('fare').value = airlines[$('airline').value].packages.at(-1);
  syncFields();
}
function updateFares(airline) {
  const previous = $('fare').value;
  $('fare').innerHTML = airlines[airline].packages.map(f => `<option>${escape(f)}</option>`).join('');
  if (airlines[airline].packages.includes(previous)) $('fare').value = previous;
}
function syncFields() {
  const hasConnection = $('hasConnection').checked;
  $('connection-fields').hidden = !hasConnection;
  for (const id of ['via','separateTickets','airportChange','throughBag']) $(id).disabled = !hasConnection;
  $('via').required = hasConnection;
  const type = $('baggageType').value;
  $('weight-fields').hidden = type !== 'weight';
  $('piece-fields').hidden = type !== 'piece';
  $('planned-pieces-field').hidden = type !== 'piece';
  $('allowance').disabled = type !== 'weight'; $('allowance').required = type === 'weight';
  for (const id of ['pieces','perPiece','plannedPieces']) { $(id).disabled = type !== 'piece'; $(id).required = type === 'piece' && id !== 'plannedPieces'; }
  $('planned-weight-label').textContent = type === 'piece' ? 'En ağır valizin (kg)' : 'Hazırladığın toplam bagaj (kg)';
  for (const id of ['origin','destination']) { const code = $(id).value.trim().toUpperCase(); $(id + '-label').textContent = airports[code]?.name || 'Üç harfli havalimanı kodu'; }
}
function setDirty() {
  if (!plan) return;
  dirty = JSON.stringify(rawTrip()) !== baseline;
  $('dirty-note').hidden = !dirty;
  $('download').disabled = dirty; $('print').disabled = dirty;
  document.querySelectorAll('.check-item>input').forEach(input => { input.disabled = dirty; });
}
function render() {
  $('empty-state').hidden = Boolean(plan); $('plan-content').hidden = !plan;
  $('return-trip').hidden = !example;
  $('example').hidden = example;
  $('clear').hidden = example;
  if (!plan) return;
  const t = plan.trip;
  $('plan-airline').textContent = plan.airlineName + (t.mixedOperator ? ' · karma operatör' : '');
  document.querySelector('.boarding-top>span:first-child').textContent = example ? 'ÖRNEK YOLCULUK' : 'YOLCULUK ÖZETİN';
  $('plan-route').innerHTML = `<div class="boarding-airport"><b>${escape(t.origin)}</b><span>${escape(airportLabel(t.origin))}</span></div><div class="boarding-line"><span aria-hidden="true">↗</span></div><div class="boarding-airport"><b>${escape(t.destination)}</b><span>${escape(airportLabel(t.destination))}</span></div>`;
  const dateText = new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(t.date+'T12:00:00'));
  $('plan-details').textContent = [dateText, t.time ? `${t.time} · kalkış yerel saati` : '', t.international ? 'Dış hat' : 'Türkiye iç hat', t.via ? `${t.via} aktarmalı${t.airportChange ? ' · havalimanı değişimi' : ''}` : 'Direkt'].filter(Boolean).join(' · ');
  $('plan-baggage').textContent = t.baggageType === 'unknown' ? 'Bagaj hakkı: teyit gerekiyor' : t.baggageType === 'none' ? 'Kayıtlı bagaj hakkı yok' : t.baggageType === 'weight' ? `Kayıtlı bagaj: ${t.allowance} kg` : `Kayıtlı bagaj: ${t.pieces} × ${t.perPiece} kg`;
  $('plan-fare').textContent = `${t.cabin === 'business' ? 'Business' : 'Economy'} · ${t.fare}`;
  $('source-note').textContent = plan.specific ? 'THY resmi kaynakları kontrol edildi: 10 Ekim 2026. Girdiğin bagaj hakkı bilet beyanındır.' : 'Genel hazırlık listesi. Havayoluna özel sayısal kurallar uygulanmadı; her taşıyıcının güncel koşullarını teyit et.';
  const count = plan.items.filter(item => completed[item.id] === itemSignature(item, t)).length;
  const percent = Math.round(count / plan.items.length * 100);
  $('progress-number').textContent = `${percent}%`;
  $('progress-bar').style.width = `${percent}%`;
  document.querySelector('.progress-track').setAttribute('aria-valuenow', percent);
  $('progress-title').textContent = count === plan.items.length ? 'Kontrol listen tamamlandı' : `${plan.items.length - count} küçük adım kaldı`;
  $('progress-detail').textContent = `${count} / ${plan.items.length} maddeyi kontrol ettin. ${count === plan.items.length ? 'Güncel uçuş ve kabul koşullarını yine de takip et.' : 'İşaretler, senin yaptığın kontrolleri gösterir.'}`;
  const groups = ['Belgeler','Bagaj','Aktarma','İhtiyaçlar','Havalimanı'];
  let visible = 0;
  $('checklist').innerHTML = groups.map(category => {
    const all = plan.items.filter(item => item.category === category);
    const items = all.filter(item => filter !== 'open' || !completed[item.id]);
    visible += items.length;
    if (!items.length) return '';
    const doneCount = all.filter(item => completed[item.id]).length;
    return `<section class="check-group" aria-label="${escape(category)}"><div class="check-group-head"><h4>${escape(category)}</h4><span>${doneCount} / ${all.length} tamamlandı</span></div>${items.map(item => {
      const done = Boolean(completed[item.id]);
      return `<div class="check-item ${done ? 'done' : ''}"><input type="checkbox" id="item-${item.id}" data-item="${item.id}" ${done ? 'checked' : ''} ${dirty ? 'disabled' : ''}><div class="check-body"><div class="check-title"><label for="item-${item.id}">${escape(item.title)}</label>${item.important ? '<span class="priority">Önce kontrol et</span>' : ''}</div><p>${escape(item.detail)}</p><div class="check-meta"><span>${escape(item.timing)}</span>${item.source ? `<a class="source-link" href="${escape(item.source.url)}" target="_blank" rel="noopener noreferrer">THY · ${escape(item.source.title)} ↗</a>` : '<span>Yolculuk kontrolü</span>'}</div></div></div>`;
    }).join('')}</section>`;
  }).join('');
  $('list-empty').hidden = visible > 0;
  document.querySelectorAll('[data-filter]').forEach(button => { const selected = button.dataset.filter === filter; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',selected); });
  $('dirty-note').hidden = !dirty; $('download').disabled = dirty; $('print').disabled = dirty;
}
function generate(isExample = false, moveFocus = true) {
  try {
    const next = buildPlan(rawTrip());
    completed = isExample ? {} : reconcileCompleted(next, completed);
    plan = next; dirty = false; example = isExample;
    baseline = JSON.stringify(rawTrip());
    $('form-error').hidden = true;
    if (!isExample) exampleBackup = null;
    filter = 'all'; save(); render();
    if (moveFocus) { $('progress-title').focus({preventScroll:true}); if (matchMedia('(max-width:760px)').matches) $('results').scrollIntoView({behavior:'smooth',block:'start'}); }
  } catch (error) { $('form-error').textContent = error.message; $('form-error').hidden = false; }
}
form.addEventListener('input',() => { syncFields(); setDirty(); });
form.addEventListener('change', event => {
  if (event.target.id === 'airline') updateFares(event.target.value);
  if (event.target.id === 'baggageType') { $('plannedWeight').value = ''; $('plannedPieces').value = ''; }
  syncFields(); setDirty();
});
form.addEventListener('submit',event => { event.preventDefault(); generate(); });
$('example').addEventListener('click',() => {
  if (!example) exampleBackup = {plan,completed:{...completed},filter,dirty,baseline,raw:rawTrip()};
  form.reset();
  populate({origin:'IST',destination:'LHR',date:futureDate(),time:'10:30',airline:'TK',cabin:'economy',fare:'EcoFly',routeType:'auto',baggageType:'piece',pieces:1,perPiece:23,plannedWeight:20,plannedPieces:1,needs:{powerbank:true}});
  generate(true);
  toast('Örnek yolculuk yüklendi. Kendi biletine göre düzenleyebilirsin.');
});
$('return-trip').addEventListener('click',() => {
  if (!exampleBackup) return;
  const backup = exampleBackup;
  plan = backup.plan; completed = backup.completed; filter = backup.filter; dirty = backup.dirty; baseline = backup.baseline; example = false; exampleBackup = null;
  form.reset(); populate(backup.raw); render();
  toast(plan ? 'Kendi yolculuğuna döndün.' : 'Örnek kapatıldı. Kendi yolculuğunu ekleyebilirsin.');
});
$('checklist').addEventListener('change', event => {
  if (dirty || !plan) return;
  const item = plan.items.find(item => item.id === event.target.dataset.item);
  if (!item) return;
  if (event.target.checked) completed[item.id] = itemSignature(item,plan.trip); else delete completed[item.id];
  save();
  // Yeniden çizimden sonra odak ve ekran konumu korunur.
  const itemId = event.target.id;
  render();
  if ($(itemId)) $(itemId).focus({preventScroll:true}); else document.querySelector('[data-filter="open"]').focus({preventScroll:true});
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => { filter = button.dataset.filter; render(); }));
$('print').addEventListener('click',() => { if (!dirty && plan) { const previousFilter = filter; filter = 'all'; render(); window.print(); filter = previousFilter; render(); } });
$('download').addEventListener('click',() => {
  if (!plan || dirty) return;
  const t = plan.trip;
  const content = [`# Uçuşa Hazır${example ? ' — Örnek yolculuk' : ''}`, '', `${t.origin} → ${t.via ? t.via+' → ' : ''}${t.destination} · ${t.date}${t.time ? ' '+t.time+' (kalkış yerel saati)' : ''}`, `${plan.airlineName} · ${t.fare}`, '', ...plan.items.flatMap(item => [`- [${completed[item.id] ? 'x' : ' '}] ${item.title} — ${item.timing}`, `  ${item.detail}`, ...(item.source ? [`  Kaynak: ${item.source.url} (kontrol: ${item.source.verifiedAt})`] : []), '']), 'Bu liste uçuşa kabul veya belge uygunluğu kararı vermez. Güncel koşulları biletinden, havayolundan ve resmi makamlardan doğrula.', '', 'Açık kaynak: https://github.com/ubeydgencer/ucusa-hazir'].join('\n');
  const url = URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = `ucusa-hazir-${t.origin}-${t.destination}-${t.date}.md`; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('Hazırlık listen indirildi.');
});
$('clear').addEventListener('click',() => {
  try { localStorage.removeItem(storageKey); } catch {}
  plan = null; completed = {}; dirty = false; example = false; baseline = ''; filter = 'all';
  form.reset(); updateFares('TK'); $('origin').value = 'IST'; $('date').value = futureDate(); syncFields(); render();
  $('form-error').hidden = true;
  $('origin').focus({preventScroll:true});
  toast('Bu tarayıcıdaki yolculuk kaydı silindi.');
});

updateFares('TK'); $('origin').value = 'IST'; $('date').value = futureDate(); syncFields();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved?.version === 1 && saved.trip) {
    plan = buildPlan(saved.trip); completed = reconcileCompleted(plan,saved.completed || {}); example = false;
    populate(plan.trip); baseline = JSON.stringify(rawTrip()); render();
  }
} catch { plan = null; completed = {}; }
