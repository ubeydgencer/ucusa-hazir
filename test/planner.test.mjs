import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, normalizeTrip, itemSignature, reconcileCompleted } from '../dist/lib/planner.js';
const trip = (changes = {}) => ({origin:'IST',destination:'LHR',date:'2026-11-10',time:'10:30',routeType:'auto',airline:'TK',cabin:'economy',fare:'EcoFly',baggageType:'unknown',needs:{},...changes});
const find = (plan,id) => plan.items.find(item => item.id === id);

test('Eksik hak sıfır bagaj olarak yorumlanmaz; paket kendi başına hak üretmez',() => {
  const plan = buildPlan(trip({fare:'PrimeFly'}));
  assert.equal(plan.trip.allowance,null);
  assert.equal(find(plan,'baggage-right').important,true);
  assert.match(find(plan,'baggage-right').title,/öğren/);
});
test('Kilo hakkı aşımı ek kontrol üretir; ücret uydurmaz',() => {
  const plan = buildPlan(trip({baggageType:'weight',allowance:'20',plannedWeight:'25'}));
  assert.ok(find(plan,'baggage-extra'));
  assert.match(find(plan,'baggage-extra').detail,/ücret hesaplamaz/);
});
test('Parça sisteminde hem adet hem tek parça ağırlığı ayrı kontrol edilir',() => {
  assert.ok(find(buildPlan(trip({baggageType:'piece',pieces:1,perPiece:23,plannedWeight:30,plannedPieces:1})),'baggage-extra'));
  assert.ok(find(buildPlan(trip({baggageType:'piece',pieces:1,perPiece:23,plannedWeight:20,plannedPieces:2})),'baggage-extra'));
  assert.equal(find(buildPlan(trip({baggageType:'piece',pieces:2,perPiece:23,plannedWeight:20,plannedPieces:2})),'baggage-extra'),undefined);
});
test('Bagajsız bilet ve hazır valiz satın alma/teyit maddesi üretir',() => {
  assert.ok(find(buildPlan(trip({baggageType:'none',plannedWeight:10})),'baggage-extra'));
  assert.equal(find(buildPlan(trip({baggageType:'none',plannedWeight:0})),'baggage-extra'),undefined);
});
test('Aynı bilet aktarması bagaj aktarımını otomatik onaylamaz',() => {
  const plan = buildPlan(trip({hasConnection:true,via:'FRA',separateTickets:false}));
  assert.equal(plan.trip.throughBag,'unknown');
  assert.equal(find(plan,'transfer-bag').important,true);
  assert.match(find(plan,'transfer-bag').detail,/her durumda otomatik/);
});
test('Ayrı bilet ve havalimanı değişimi giriş/ulaşım/yeniden check-in maddesi üretir',() => {
  const plan = buildPlan(trip({hasConnection:true,via:'FRA',separateTickets:true,airportChange:true}));
  assert.match(find(plan,'self-transfer').detail,/ulaşımını/);
  assert.match(find(plan,'self-transfer').detail,/yeniden check-in/);
});
test('Son varış etiketli bagajda gümrük alma istisnası korunur',() => {
  const plan = buildPlan(trip({hasConnection:true,via:'JFK',destination:'LAX',throughBag:'yes'}));
  assert.match(find(plan,'transfer-bag').detail,/ilk girişte alınır/);
});
test('Başka taşıyıcı veya karma operatör THY sayılarını ve kaynak etiketini almaz',() => {
  for (const changes of [{airline:'OTHER'}, {mixedOperator:true}]) {
    const plan = buildPlan(trip({...changes,needs:{powerbank:true,assistance:true}}));
    assert.equal(plan.specific,false);
    assert.ok(find(plan,'operator'));
    assert.equal(find(plan,'cabin').source,null);
    assert.doesNotMatch(find(plan,'cabin').detail,/8 kg/);
    assert.doesNotMatch(find(plan,'assistance').detail,/48/);
    assert.doesNotMatch(find(plan,'checkin').detail,/90/);
  }
});
test('Dış hat Türkiye içi iki nokta arasında yabancı aktarmayı da kapsar',() => {
  assert.equal(buildPlan(trip({origin:'ESB',destination:'IST',hasConnection:true,via:'FRA'})).trip.international,true);
  assert.equal(buildPlan(trip({origin:'ESB',destination:'IST'})).trip.international,false);
});
test('Listede olmayan geçerli IATA kodu açık hat türü ister',() => {
  assert.throws(() => buildPlan(trip({destination:'ABC'})),/iç hat/);
  assert.equal(buildPlan(trip({destination:'ABC',routeType:'international'})).trip.destination,'ABC');
});
test('Bilinen dış hat noktaları yanlış iç hat beyanıyla belgelerden çıkarılamaz',() => {
  assert.throws(() => buildPlan(trip({routeType:'domestic'})),/dış hat içeriyor/);
  assert.throws(() => buildPlan(trip({destination:'ESB',hasConnection:true,via:'FRA',routeType:'domestic'})),/dış hat içeriyor/);
});
test('Business kabin bilgisi ABD çıkış istisnasını içerir',() => {
  assert.match(find(buildPlan(trip({origin:'JFK',destination:'IST',cabin:'business'})),'cabin').detail,/ABD çıkışında/);
});
test('Özel ihtiyaçlar onay maddesi ve doğrulanmış THY süresi üretir',() => {
  const plan = buildPlan(trip({needs:{assistance:true,meal:true,pet:true,child:true,sports:true,powerbank:true}}));
  assert.match(find(plan,'assistance').timing,/48/);
  assert.match(find(plan,'meal').timing,/24/);
  assert.match(find(plan,'pet').detail,/onayını al/);
  assert.match(find(plan,'powerbank').detail,/100 Wh/);
});
test('Bagaj değişirse ilgili onay açılır, belge ve yemek onayları korunur',() => {
  const old = buildPlan(trip({baggageType:'weight',allowance:20,plannedWeight:18,needs:{meal:true}}));
  const done = Object.fromEntries(['weigh','documents','meal'].map(id => [id,itemSignature(find(old,id),old.trip)]));
  const next = buildPlan(trip({baggageType:'weight',allowance:25,plannedWeight:18,needs:{meal:true}}));
  const reconciled = reconcileCompleted(next,done);
  assert.equal(reconciled.weigh,undefined);
  assert.ok(reconciled.documents);
  assert.ok(reconciled.meal);
});
test('Tarih değişikliği ve güncellenen kural önceki onayı geçersiz kılar',() => {
  const old = buildPlan(trip());
  const done = Object.fromEntries(old.items.map(item => [item.id,itemSignature(item,old.trip)]));
  assert.deepEqual(reconcileCompleted(buildPlan(trip({date:'2026-11-11'})),done),{});
  const next = buildPlan(trip()); next.items.find(i => i.id === 'cabin').detail += ' Güncelleme.';
  assert.equal(reconcileCompleted(next,done).cabin,undefined);
});
test('İç hat aktarması eklemek havalimanı kontrollerini yeniden açar',() => {
  const old = buildPlan(trip({destination:'ESB'}));
  const done = Object.fromEntries(old.items.map(item => [item.id,itemSignature(item,old.trip)]));
  const next = buildPlan(trip({destination:'ESB',hasConnection:true,via:'AYT'}));
  const kept = reconcileCompleted(next,done);
  for (const id of ['checkin','airport','gate']) assert.equal(kept[id],undefined);
});
test('Kötü kayıt/girdi, geçersiz tarih ve parça sayısı reddedilir',() => {
  for (const changes of [{origin:'I'}, {origin:'LHR'}, {date:'2026-02-30'}, {date:'2026-99-10'}, {airline:'BAD'}, {baggageType:'weight',allowance:''}, {baggageType:'piece',pieces:1.5,perPiece:23}, {plannedWeight:-1}]) assert.throws(() => normalizeTrip(trip(changes)));
});
test('Tarih/saat sivil değer olarak saklanır; saat diliminden süre veya aktarma uygunluğu türetilmez',() => {
  const plan = buildPlan(trip({date:'2026-10-25',time:'23:45',hasConnection:true,via:'FRA'}));
  assert.equal(plan.trip.date,'2026-10-25'); assert.equal(plan.trip.time,'23:45');
  assert.match(find(plan,'transfer-gates').detail,/uygunluk kararı verilmez/);
});
