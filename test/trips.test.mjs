import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan,itemSignature} from '../dist/lib/planner.js';
import {emptyLibrary,restoreLibrary,loadLibrary,persistLibrary,upsertTrip,completeItem,removeTrip,returnDraft,tripMarkdown,storageKey,legacyKey} from '../dist/lib/trips.js';
const outbound={origin:'IST',destination:'LHR',date:'2026-11-10',time:'10:30',routeType:'auto',airline:'TK',cabin:'economy',fare:'EcoFly',baggageType:'weight',allowance:20,plannedWeight:18,needs:{meal:true}};
const storage=initial=>{const values=new Map(Object.entries(initial||{}));return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const makeTwo=()=>upsertTrip(upsertTrip(emptyLibrary(),outbound,{id:'out'}),{...outbound,origin:'LHR',destination:'IST',date:'2026-11-20',airline:'OTHER',fare:'Bilmiyorum',baggageType:'piece',pieces:1,perPiece:23},{id:'back',kind:'return',returnOf:'out'});

test('v1 yolculuk ve bütün geçerli tamamlanma imzaları kayıpsız taşınır',()=>{
  const plan=buildPlan(outbound),completed=Object.fromEntries(plan.items.map(item=>[item.id,itemSignature(item,plan.trip)]));
  const legacy={version:1,trip:plan.trip,completed};
  const saved=storage({[legacyKey]:JSON.stringify(legacy)}),before=JSON.stringify(legacy);
  const result=loadLibrary(saved,()=> 'migrated');
  assert.equal(result.migrated,true);assert.equal(result.blocked,false);
  assert.deepEqual(result.library.entries[0].trip,plan.trip);assert.deepEqual(result.library.entries[0].completed,completed);
  assert.equal(saved.getItem(legacyKey),before); // Reading alone never removes original data.
  persistLibrary(saved,result.library);
  assert.equal(saved.getItem(legacyKey),null);assert.equal(JSON.parse(saved.getItem(storageKey)).activeId,'migrated');
  assert.deepEqual(loadLibrary(saved).library,result.library);
});
test('taşıma yazılamazsa eski kayıt korunur; bozuk v2 üstüne yazma engeli bildirir',()=>{
  const saved=storage({[legacyKey]:JSON.stringify({version:1,trip:outbound,completed:{}})});
  const old=saved.getItem(legacyKey);const result=loadLibrary(saved,()=> 'old');
  saved.setItem=()=>{throw Error('quota');};assert.throws(()=>persistLibrary(saved,result.library));assert.equal(saved.getItem(legacyKey),old);
  for(const bad of ['{','null',JSON.stringify({version:3}),JSON.stringify({version:2,entries:[{id:'x'}]})]){
    const corrupt=storage({[storageKey]:bad,[legacyKey]:old});assert.equal(loadLibrary(corrupt).blocked,true);assert.equal(corrupt.getItem(storageKey),bad);assert.equal(corrupt.getItem(legacyKey),old);
  }
});
test('iki yolculuk, seçilen kimlik ve bağımsız onaylar yeniden açıldığında korunur',()=>{
  let library=makeTwo();library=completeItem(library,'out','baggage-right',true);
  const selected={...library,activeId:'out'},roundTrip=restoreLibrary(JSON.parse(JSON.stringify(selected)));
  assert.equal(roundTrip.activeId,'out');assert.ok(roundTrip.entries[0].completed['baggage-right']);assert.deepEqual(roundTrip.entries[1].completed,{});
  assert.equal(roundTrip.entries[0].trip.allowance,20);assert.equal(roundTrip.entries[1].trip.perPiece,23);assert.equal(roundTrip.entries[1].trip.allowance,null);
  assert.equal(restoreLibrary({...roundTrip,activeId:'missing'}).activeId,'out');
});
test('dönüş taslağı yalnız rotayı ters çevirir; bilet ve tarih bilgileri miras alınmaz',()=>{
  const entry=makeTwo().entries[0],draft=returnDraft(entry);
  assert.equal(draft.origin,'LHR');assert.equal(draft.destination,'IST');assert.equal(draft.date,'');assert.equal(draft.time,'');assert.equal(draft.airline,'OTHER');assert.equal(draft.fare,'Bilmiyorum');assert.equal(draft.baggageType,'unknown');assert.equal(draft.allowance,undefined);assert.deepEqual(draft.needs,{});
  assert.throws(()=>buildPlan(draft),/tarih/);
});
test('bagaj değişikliği yalnız seçilen yolculuğun ilgili onaylarını açar',()=>{
  let library=makeTwo();
  for(const id of ['out','back'])for(const item of buildPlan(library.entries.find(e=>e.id===id).trip).items)library=completeItem(library,id,item.id,true);
  const before=structuredClone(library),other=structuredClone(library.entries[1]);
  const next=upsertTrip(library,{...library.entries[0].trip,allowance:30},{id:'out'});
  assert.deepEqual(library,before);assert.deepEqual(next.entries[1],other);
  assert.equal(next.entries[0].completed['baggage-right'],undefined);assert.ok(next.entries[0].completed.meal);
  const documents=buildPlan(outbound).items.find(i=>i.category==='Belgeler');assert.ok(next.entries[0].completed[documents.id]);
});
test('dönüş tarihi değişince gidiş kaydı etkilenmez ve yeni kimlik onay devralmaz',()=>{
  let library=makeTwo();library=completeItem(library,'out','baggage-right',true);library=completeItem(library,'back','baggage-right',true);
  const next=upsertTrip(library,{...library.entries[1].trip,date:'2026-12-01'},{id:'back'});
  assert.deepEqual(next.entries[0],library.entries[0]);assert.equal(next.entries[1].completed['baggage-right'],undefined);
  const duplicate=upsertTrip(library,outbound,{id:'another'});assert.deepEqual(duplicate.entries[2].completed,{});
});
test('seçili Markdown yalnız o yolculuğun rotasını, yönünü ve onayını içerir',()=>{
  const library=completeItem(makeTwo(),'out','baggage-right',true);
  const text=tripMarkdown(library.entries[1]);assert.match(text,/# Uçuşa Hazır — Dönüş · LHR → IST · 2026-11-20/);assert.doesNotMatch(text,/2026-11-10|EcoFly|\[x\]/);
  assert.match(tripMarkdown(library.entries[0]),/\[x\]/);
});
test('silme yalnız seçili kaydı etkiler; boş v2 eski kaydı diriltmez; geri alma diğer değişikliği ezmez',()=>{
  const two=makeTwo(),deleted=two.entries[1];let next=removeTrip(two,'back');assert.equal(next.activeId,'out');assert.deepEqual(next.entries[0],two.entries[0]);
  next=upsertTrip(next,{...outbound,allowance:25},{id:'out'});const restored=restoreLibrary({...next,entries:[...next.entries,deleted]});assert.equal(restored.entries[0].trip.allowance,25);assert.deepEqual(restored.entries[1],deleted);
  const empty=removeTrip(removeTrip(two,'back'),'out');const saved=storage({[legacyKey]:JSON.stringify({version:1,trip:outbound})});persistLibrary(saved,empty);assert.deepEqual(loadLibrary(saved).library,emptyLibrary());
});
test('geçersiz veya tekrarlanan kimlik sessizce kayıt düşürmez',()=>{
  const library=makeTwo();assert.throws(()=>restoreLibrary({...library,entries:[library.entries[0],library.entries[0]]}));assert.throws(()=>upsertTrip(library,outbound,{id:'<invalid>'}));assert.throws(()=>completeItem(library,'missing','baggage-right',true));
});
