import { buildPlan, reconcileCompleted, itemSignature } from './planner.js';
export const storageKey = 'ucusa-hazir-v2';
export const legacyKey = 'ucusa-hazir-v1';
export const emptyLibrary = () => ({version:2,activeId:null,entries:[]});
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
const uuid = () => crypto.randomUUID();
export function restoreLibrary(saved, makeId = uuid) {
  if (!saved) return emptyLibrary();
  if (saved.version === 1 && saved.trip) {
    const plan = buildPlan(saved.trip);
    const id = makeId();
    if (!validId(id)) throw Error('Geçersiz yolculuk kimliği.');
    return {version:2,activeId:id,entries:[{id,kind:'trip',returnOf:null,trip:plan.trip,completed:reconcileCompleted(plan,saved.completed || {})}]};
  }
  if (saved.version !== 2 || !Array.isArray(saved.entries) || saved.entries.length > 1000) throw Error('Yolculuk kaydı okunamadı.');
  const ids = new Set();
  const entries = saved.entries.map(entry => {
    if (!entry || !validId(entry.id) || ids.has(entry.id) || !['trip','return'].includes(entry.kind)) throw Error('Geçersiz veya tekrarlanan yolculuk kaydı.');
    if (entry.returnOf !== null && !validId(entry.returnOf)) throw Error('Geçersiz dönüş bağlantısı.');
    ids.add(entry.id);
    const plan = buildPlan(entry.trip);
    return {id:entry.id,kind:entry.kind,returnOf:entry.returnOf,trip:plan.trip,completed:reconcileCompleted(plan,entry.completed || {})};
  });
  return {version:2,activeId:ids.has(saved.activeId)?saved.activeId:entries[0]?.id || null,entries};
}
export function loadLibrary(storage, makeId = uuid) {
  try {
    const v2 = storage.getItem(storageKey);
    if (v2 !== null) {
      const parsed=JSON.parse(v2);
      if(parsed?.version!==2) throw Error('Geçersiz kayıt sürümü.');
      return {library:restoreLibrary(parsed,makeId),migrated:false,blocked:false};
    }
    const legacy = storage.getItem(legacyKey);
    if(legacy!==null && JSON.parse(legacy)?.version!==1) throw Error('Geçersiz eski kayıt.');
    return {library:restoreLibrary(legacy === null ? null : JSON.parse(legacy),makeId),migrated:legacy !== null,blocked:false};
  } catch { return {library:emptyLibrary(),migrated:false,blocked:true}; }
}
export function persistLibrary(storage, library) {
  // Write the complete new record first. Failed writes leave the legacy intact.
  storage.setItem(storageKey,JSON.stringify(library));
  storage.removeItem(legacyKey);
}
export function upsertTrip(library, raw, {id = uuid(),kind = 'trip',returnOf = null} = {}) {
  if (!validId(id) || !['trip','return'].includes(kind) || (returnOf!==null && !validId(returnOf))) throw Error('Geçersiz yolculuk kimliği veya yönü.');
  const plan = buildPlan(raw), previous = library.entries.find(e => e.id === id);
  if(!previous && library.entries.length>=1000) throw Error('En fazla 1000 yolculuk saklanabilir.');
  const entry = {id,kind:previous?.kind || kind,returnOf:previous?.returnOf ?? returnOf,trip:plan.trip,completed:reconcileCompleted(plan,previous?.completed || {})};
  return {version:2,activeId:id,entries:previous?library.entries.map(e=>e.id===id?entry:e):[...library.entries,entry]};
}
export function completeItem(library,id,itemId,checked) {
  const entry = library.entries.find(e=>e.id===id);
  if (!entry) throw Error('Yolculuk bulunamadı.');
  const plan = buildPlan(entry.trip), item = plan.items.find(i=>i.id===itemId);
  if (!item) throw Error('Kontrol maddesi bulunamadı.');
  const completed = reconcileCompleted(plan,entry.completed);
  if (checked) completed[itemId]=itemSignature(item,plan.trip); else delete completed[itemId];
  return {...library,entries:library.entries.map(e=>e.id===id?{...e,completed}:e)};
}
export function removeTrip(library,id) {
  const index=library.entries.findIndex(e=>e.id===id);
  if (index<0) throw Error('Yolculuk bulunamadı.');
  const entries=library.entries.filter(e=>e.id!==id);
  return {...library,entries,activeId:library.activeId===id?(entries[Math.min(index,entries.length-1)]?.id || null):library.activeId};
}
export function returnDraft(entry) {
  // Only the route is proposed. A return ticket has its own date and rights.
  return {origin:entry.trip.destination,destination:entry.trip.origin,date:'',time:'',airline:'OTHER',cabin:'economy',fare:'Bilmiyorum',routeType:'auto',hasConnection:false,mixedOperator:false,baggageType:'unknown',plannedWeight:'',needs:{}};
}
export const tripLabel = entry => `${entry.kind==='return'?'Dönüş':'Yolculuk'} · ${entry.trip.origin} → ${entry.trip.destination} · ${entry.trip.date}`;
export function tripMarkdown(entry) {
  const plan=buildPlan(entry.trip),completed=reconcileCompleted(plan,entry.completed),t=plan.trip;
  return [`# Uçuşa Hazır — ${tripLabel(entry)}`,'',`${t.origin} → ${t.via?t.via+' → ':''}${t.destination} · ${t.date}${t.time?' '+t.time+' (kalkış yerel saati)':''}`,`${plan.airlineName} · ${t.fare}`,'',...plan.items.flatMap(item=>[`- [${completed[item.id]?'x':' '}] ${item.title} — ${item.timing}`,`  ${item.detail}`,...(item.source?[`  Kaynak: ${item.source.url} (kontrol: ${item.source.verifiedAt})`]:[]),'']),'Bu liste uçuşa kabul veya belge uygunluğu kararı vermez. Güncel koşulları biletinden, havayolundan ve resmi makamlardan doğrula.','','Açık kaynak: https://github.com/ubeydgencer/ucusa-hazir'].join('\n');
}
