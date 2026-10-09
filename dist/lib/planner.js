import { airports } from '../data/airports.js';
import { airlines } from '../data/airlines.js';

const enumValue = (value, values, name) => {
  if (!values.includes(value)) throw new Error(`${name} seçimini kontrol et.`);
  return value;
};
const number = (value, min, max, name, optional = false) => {
  if (optional && (value === '' || value == null)) return null;
  if (value === '' || value == null) throw new Error(`${name} bilgisini gir.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${name}: ${min}–${max} arasında bir değer gir.`);
  return n;
};
const airport = value => {
  const code = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error('Havalimanı için üç harfli IATA kodu gir (ör. IST).');
  return code;
};

export function normalizeTrip(raw) {
  const origin = airport(raw.origin), destination = airport(raw.destination);
  if (origin === destination) throw new Error('Kalkış ve varış havalimanları farklı olmalı.');
  const hasConnection = raw.hasConnection === true;
  const via = hasConnection ? airport(raw.via) : null;
  if (via && (via === origin || via === destination)) throw new Error('Aktarma havalimanı kalkış ve varıştan farklı olmalı.');
  const codes = [origin, ...(via ? [via] : []), destination];
  const routeType = enumValue(raw.routeType || 'auto', ['auto', 'domestic', 'international'], 'Uçuş türü');
  const countries = codes.map(code => airports[code]?.country);
  if (routeType === 'auto' && countries.some(c => !c)) throw new Error('Listede olmayan havalimanı için iç hat / dış hat türünü seç.');
  if (routeType === 'domestic' && countries.some(country => country && country !== 'TR')) throw new Error('Bu rota dış hat içeriyor. Uçuş türünü dış hat veya rotadan belirle olarak seç.');
  const international = routeType === 'auto' ? new Set(countries).size > 1 || countries[0] !== 'TR' : routeType === 'international';
  const date = String(raw.date || '');
  const parsedDate = new Date(date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Geçerli bir uçuş tarihi gir.');
  const time = String(raw.time || '');
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Geçerli bir kalkış saati gir.');
  const airline = enumValue(raw.airline, Object.keys(airlines), 'Havayolu');
  const cabin = enumValue(raw.cabin, ['economy', 'business'], 'Kabin');
  const fare = String(raw.fare || 'Bilmiyorum').trim().slice(0, 60);
  const baggageType = enumValue(raw.baggageType, ['unknown', 'none', 'weight', 'piece'], 'Bagaj hakkı');
  const allowance = baggageType === 'weight' ? number(raw.allowance, 0, 500, 'Toplam bagaj hakkı') : null;
  const pieces = baggageType === 'piece' ? number(raw.pieces, 1, 10, 'Bagaj parçası') : null;
  const perPiece = baggageType === 'piece' ? number(raw.perPiece, 1, 32, 'Parça başı bagaj hakkı') : null;
  const plannedWeight = number(raw.plannedWeight, 0, 500, 'Hazırladığın bagaj ağırlığı', true);
  const plannedPieces = baggageType === 'piece' ? number(raw.plannedPieces, 0, 10, 'Hazırladığın parça sayısı', true) : null;
  if ((pieces !== null && !Number.isInteger(pieces)) || (plannedPieces !== null && !Number.isInteger(plannedPieces))) throw new Error('Bagaj parçası sayısı tam sayı olmalı.');
  const needs = Object.fromEntries(['child', 'pet', 'assistance', 'meal', 'sports', 'powerbank'].map(key => [key, raw.needs?.[key] === true]));
  return {
    origin, destination, via, hasConnection, routeType, international, date, time, airline, cabin, fare,
    mixedOperator: raw.mixedOperator === true,
    separateTickets: hasConnection && raw.separateTickets === true,
    airportChange: hasConnection && raw.airportChange === true,
    throughBag: hasConnection ? enumValue(raw.throughBag || 'unknown', ['unknown', 'yes', 'no'], 'Bagaj aktarımı') : null,
    baggageType, allowance, pieces, perPiece, plannedWeight, plannedPieces, needs
  };
}

export function buildPlan(raw) {
  const trip = normalizeTrip(raw);
  const adapter = airlines[trip.airline];
  const specific = trip.airline !== 'OTHER' && !trip.mixedOperator;
  const items = [];
  const add = (id, category, title, detail, timing, sourceKey, important = false) => {
    const source = specific && adapter.sources[sourceKey] ? { title: adapter.sources[sourceKey][0], url: adapter.sources[sourceKey][1], verifiedAt: adapter.verifiedAt } : null;
    items.push({ id, category, title, detail, timing, important, source });
  };
  add('ticket', 'Belgeler', 'Biletini ve uçuşu gerçekleştiren havayolunu kontrol et', 'Tarih, havalimanı ve biletteki ad bilgilerini kontrol et. Ortak uçuşlarda “operated by / uçuşu gerçekleştiren” satırını esas al.', 'Şimdi', 'checkin');
  add('documents', 'Belgeler', trip.international ? 'Giriş ve transit belgelerini doğrula' : 'Geçerli kimlik belgeni hazırla', trip.international ? 'Pasaportunu, varış ve varsa aktarma ülkesinin giriş/transit koşullarını resmi makamlardan kontrol et. Pasaport geçerliliği ve izinler ülkeye ve yolcuya göre değişir.' : 'Kabul edilen kimlik belgesini ve biletteki adın belgeyle eşleştiğini kontrol et.', 'Seyahatten önce', 'documents', trip.international);
  if (trip.mixedOperator || trip.airline === 'OTHER') add('operator', 'Belgeler', 'Her uçuşun havayolu koşullarını ayrı kontrol et', 'Kabin bagajı, check-in ve özel hizmet koşulları uçuşu gerçekleştiren havayoluna bağlı olabilir. Bu listede havayoluna özel sayısal sınırlar uygulanmadı.', 'Şimdi', null, true);

  if (trip.baggageType === 'unknown') add('baggage-right', 'Bagaj', 'Biletindeki kayıtlı bagaj hakkını öğren', 'Paket adı tek başına yeterli değil. Biletinde “kg” veya “parça × kg” bilgisini bul; bu formu güncelle. Ek bagaj ve statü avantajları toplam hakka zaten dahil olabilir.', 'Şimdi', 'baggage', true);
  else {
    const right = trip.baggageType === 'none' ? 'Kayıtlı bagaj hakkı yok' : trip.baggageType === 'weight' ? `${trip.allowance} kg toplam hak` : `${trip.pieces} parça × ${trip.perPiece} kg`;
    add('baggage-right', 'Bagaj', 'Girdiğin bagaj hakkını biletinle eşleştir', `${right}. Bu bilgi senin bilet girdin; havayolundan otomatik alınmadı. Aktarmalı yolculukta her yönün/etabın koşullarını teyit et.`, 'Şimdi', 'baggage');
  }
  const overweight = trip.baggageType === 'weight' && trip.plannedWeight !== null && trip.plannedWeight > trip.allowance;
  const overPiece = trip.baggageType === 'piece' && ((trip.plannedWeight !== null && trip.plannedWeight > trip.perPiece) || (trip.plannedPieces !== null && trip.plannedPieces > trip.pieces));
  const noRight = trip.baggageType === 'none' && trip.plannedWeight > 0;
  if (overweight || overPiece || noRight) add('baggage-extra', 'Bagaj', 'Bagajın girdiğin ücretsiz hakkı aşıyor', 'Fazla ağırlık/parça veya kayıtlı bagaj satın alma koşullarını kontrol et. Ücret ve kabul sınırları uçuşa göre değişir; bu uygulama ücret hesaplamaz.', 'Havalimanına gitmeden', 'baggage', true);
  if (trip.baggageType !== 'none' || trip.plannedWeight > 0) add('weigh', 'Bagaj', 'Valizini tart ve ölç', specific ? adapter.rules.baggageDimensions : 'Her parça için ölçü ve ağırlık limitlerini uçuşu gerçekleştiren havayolundan kontrol et. Toplam kg hakkı, tek valiz kabul sınırıyla aynı değildir.', 'Valiz hazırlarken', 'baggage');
  add('cabin', 'Bagaj', 'Kabin çantanı ve kişisel eşyanı kontrol et', specific ? `${trip.cabin === 'business' ? adapter.rules.cabinBusiness : adapter.rules.cabinEconomy} ${adapter.rules.personalItem}` : 'Kabin çantası ve kişisel eşyanın adet, ölçü ve ağırlık sınırlarını her taşıyıcı için ayrı kontrol et.', 'Valiz hazırlarken', 'cabin');
  add('liquids', 'Bagaj', 'Sıvılarını ve kısıtlı eşyalarını kontrol et', 'Kabin sıvıları, kesici eşyalar, bataryalar ve diğer kısıtlı eşyalar için resmi listeyi incele. Havalimanı güvenlik kurallarını da kontrol et.', 'Valiz hazırlarken', 'restrictions');
  if (trip.needs.powerbank) add('powerbank', 'Bagaj', 'Powerbank’ini taşıma koşullarına göre yerleştir', specific ? adapter.rules.powerbank : 'Kapasite (Wh), adet, kısa devre koruması, taşınacağı yer ve uçuşta kullanım koşullarını havayolundan doğrula.', 'Valiz hazırlarken', 'restrictions', true);

  if (trip.hasConnection) {
    add('transfer-gates', 'Aktarma', 'Aktarma terminalini ve devam uçuşunu kontrol et', `${trip.via} aktarmasında terminal/kapı ve devam biniş kartını kontrol et. Aktarma süresinin yeterliliğini havayoluna teyit ettir; süreye bakarak uygunluk kararı verilmez.`, 'Seyahatten önce', 'transfer');
    add('transfer-bag', 'Aktarma', 'Bagajının nereye etiketlendiğini teyit et', trip.throughBag === 'yes' ? 'Son varışa etiketlendiğini belirttin. Yine de bagaj etiketi ve gümrükte alma gereğini teyit et; bazı ülkelerde son varışa etiketli bagaj da ilk girişte alınır.' : trip.throughBag === 'no' ? 'Bagajını aktarmada alacağını belirttin. Bagaj bandı, gümrük ve yeniden teslim işlemlerini planla.' : 'Aynı bilet bagajın her durumda otomatik aktarılacağı anlamına gelmez. Kontuarda son varış etiketini ve aktarmada bagaj alma gereğini sor.', 'Bagaj tesliminde', 'transfer', trip.throughBag !== 'yes');
    if (trip.separateTickets || trip.airportChange || trip.throughBag === 'no') add('self-transfer', 'Aktarma', 'Yeniden check-in ve ülkeye giriş için plan yap', `${trip.separateTickets ? 'Ayrı biletlerin var. ' : ''}${trip.airportChange ? 'Havalimanı değişimi var; ulaşımını da planla. ' : ''}Bagaj alma, gümrük, transit alanından çıkış ve yeniden check-in için gereken zaman ve belgeleri teyit et.`, 'Seyahatten önce', 'transfer', true);
  }
  if (trip.needs.child) add('child', 'İhtiyaçlar', 'Çocuk / bebek için belgeleri ve hizmetleri kontrol et', 'Her yolcunun seyahat belgesini, gerekiyorsa izin/muvafakatı ve refakat koşullarını kontrol et. Puset teslim yerini, bebek bagaj hakkını ve gerekli hizmet rezervasyonlarını teyit et.', 'Seyahatten önce', 'child', true);
  if (trip.needs.pet) add('pet', 'İhtiyaçlar', 'Evcil hayvan taşıma onayını al', 'Tür/ırk, taşıma çantası, uçak kontenjanı ve varış/transit ülkesinin belgelerini kontrol et. Havayolunun rezervasyon onayını al; çanta ölçüsünün uygun olması tek başına kabul sağlamaz.', 'Rezervasyon sırasında', 'pet', true);
  if (trip.needs.assistance) add('assistance', 'İhtiyaçlar', 'Havalimanı yardımını talep et ve onayını kontrol et', specific ? adapter.rules.assistance : 'İhtiyacını her uçuşu gerçekleştiren havayoluna ilet; talep süresini ve onayını kontrol et. Kendi hareket cihazın varsa batarya/kabul koşullarını da doğrula.', specific ? 'En az 48 saat önce' : 'Seyahatten önce', 'assistance', true);
  if (trip.needs.meal) add('meal', 'İhtiyaçlar', 'Özel yemek talebini kontrol et', specific ? adapter.rules.meal : 'Menü seçeneklerini, talep süresini ve uçuş için onayını havayolundan kontrol et.', specific ? 'En geç 24 saat önce' : 'Seyahatten önce', 'meal');
  if (trip.needs.sports) add('sports', 'İhtiyaçlar', 'Spor ekipmanını ayrıca teyit et', 'Ekipmanın türü, ölçüsü, ambalajı, ücreti ve rezervasyon/onay ihtiyacını kontrol et. Standart ek bagaj alımı, özel ekipman kabulünü otomatik sağlamaz.', 'Seyahatten önce', 'sports');
  add('checkin', 'Havalimanı', 'Check-in yap ve biniş kartını kaydet', specific ? adapter.rules.onlineCheckin : 'Online check-in açılış/kapanış saatini ve kullanılabilirliğini havayolundan kontrol et. Biniş kartını telefonuna veya kağıda kaydet.', specific ? '24 saat–90 dakika önce' : 'Havayolunun süresinde', 'checkin');
  add('airport', 'Havalimanı', 'Havalimanına ulaşımını planla', specific ? `THY, terminalde ${trip.international ? adapter.rules.internationalArrivalHours : adapter.rules.domesticArrivalHours} saat önce bulunmanı öneriyor. Bu bir geliş önerisi; kontuar, bagaj teslim ve kapı son saatlerini ayrıca kalkış havalimanı için teyit et.` : 'Kontuar, bagaj teslim ve kapı kapanış saatini havayolundan öğren. Ulaşım, güvenlik ve belge kontrolü için zaman ayır.', 'Uçuş günü', 'checkin');
  add('gate', 'Havalimanı', 'Kapıyı ve biniş saatini takip et', 'Biniş kartındaki saati ve havalimanı ekranlarını izle. Kapı değişikliklerini kontrol et; güncel uçuş bilgisini havayolundan takip et.', 'Uçuş günü', 'checkin');
  return { trip, items, airlineName: adapter.name, specific, verifiedAt: specific ? adapter.verifiedAt : null };
}

// Eski onay yalnız aynı koşullar ve kural içeriği için geçerlidir.
export function itemSignature(item, trip) {
  const dependencies = {
    Belgeler: [trip.origin, trip.destination, trip.via, trip.date, trip.airline, trip.mixedOperator, trip.international],
    Bagaj: [trip.airline, trip.mixedOperator, trip.cabin, trip.fare, trip.origin, trip.destination, trip.via, trip.date, trip.time, trip.baggageType, trip.allowance, trip.pieces, trip.perPiece, trip.plannedWeight, trip.plannedPieces],
    Aktarma: [trip.origin, trip.destination, trip.via, trip.date, trip.time, trip.separateTickets, trip.airportChange, trip.throughBag],
    İhtiyaçlar: [trip.airline, trip.mixedOperator, trip.origin, trip.destination, trip.via, trip.date, trip.time, trip.needs],
    Havalimanı: [trip.origin, trip.destination, trip.via, trip.hasConnection, trip.date, trip.time, trip.airline, trip.mixedOperator, trip.international]
  };
  return JSON.stringify([item, dependencies[item.category]]);
}
export function reconcileCompleted(plan, previous = {}) {
  return Object.fromEntries(plan.items.filter(item => previous[item.id] === itemSignature(item, plan.trip)).map(item => [item.id, previous[item.id]]));
}
export function airportLabel(code) { return airports[code]?.city || code; }
