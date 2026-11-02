# Uçuşa Hazır

**Rotanı, biletini ve ihtiyaçlarını kişisel bir uçuş hazırlık listesine dönüştüren açık kaynak yolcu asistanı.** THY ile başlar; havayolu kuralları ayrı bir veri katmanında tutulur.

[Önizleme](https://ucusa-hazir.mubeyd.chatgpt.site/) · [Kaynak kod](https://github.com/ubeydgencer/ucusa-hazir)

Sites önizlemesi proje sahibine özeldir. Kaynak kod herkese açıktır; statik dosyalar kendi hosting'inizde yayımlanabilir.

## İlk sürüm

- Kalkış/varış IATA kodları, kalkış yerel tarihi ve isteğe bağlı saati.
- Direkt veya tek aktarmalı yolculuk; ayrı bilet, havalimanı değişimi ve bagaj aktarımı bilgisi.
- Economy / Business ve bilet paketi.
- Biletteki kayıtlı bagaj: bilinmiyor, hak yok, toplam kg veya parça × kg.
- Hazırlanan bagajın girilen hakla karşılaştırılması; fazla bagaj için teyit adımı.
- Çocuk/bebek, evcil hayvan, hareket desteği, özel yemek, spor ekipmanı ve powerbank.
- Belgeler, bagaj, aktarma, özel ihtiyaçlar ve havalimanı kontrol listesi.
- Tamamlanma durumu, kalanlar filtresi, yazdırma ve Markdown indirme.
- Kimlikli çoklu yolculuk kaydı, listeler arasında geçiş ve bağımsız dönüş listesi.
- Tarayıcıda kayıt; bilgiler veya kaynaklı kural değişince yalnız ilgili yolculuğun onayları yeniden açılır.
- Mevcut kaydı değiştirmeden deneyebileceğiniz örnek yolculuk.

THY tarafından gerçekleştirilen etaplar için tarihli resmi kaynaklar ve doğrulanmış kurallar kullanılır. “Diğer havayolu” veya karma operatör seçiminde genel hazırlık listesi oluşturulur; THY'nin sayısal kuralları uygulanmaz.

## Çalıştırma

Node.js 22 veya üzeri. Bağımlılık kurulumu veya derleme gerekmez.

```sh
git clone https://github.com/ubeydgencer/ucusa-hazir.git
cd ucusa-hazir
npm run dev
```

Tarayıcıda `http://127.0.0.1:4174/` adresini açın. İstenirse port `PORT` değişkeniyle değiştirilebilir.

```sh
npm run check
npm test
```

İsteğe bağlı DOM entegrasyon testi (Node.js 24; gerçek tarayıcı görsel kontrolünün yerine geçmez):

```sh
npm install --prefix /tmp/ucusa-dom-qa --no-audit --no-fund jsdom@30.1.3
node scripts/qa-app-dom.mjs /tmp/ucusa-dom-qa/node_modules/jsdom/lib/api.js
```

Bu test sentetik v1 kaydıyla taşıma, iki liste arasında geçiş, taslak koruması, örneği düzenleyip geri dönme, seçili indirme/yazdırma ve silme/geri almayı uygulama olayları üzerinden sınar. jsdom yalnız bu isteğe bağlı QA ortamındadır; uygulama bağımlılıksız kalır.

`dist/` klasörü herhangi bir statik web sunucusunda çalışır. `.openai/hosting.json` mevcut Sites projesinin kimliğini taşır; fork'unuz için farklı bir Sites projesi oluşturuyorsanız eski kimliği kullanmayın.

## Verinin anlamı

Bagaj hakkı havayolundan otomatik alınmaz. Kullanıcı biletindeki toplam hakkı girer; paket adına göre kilogram üretilmez. Statü/öğrenci/ek bagaj avantajları tekrar eklenmez. Parça sisteminde “hazırlanan ağırlık” en ağır tek valizi, kilo sisteminde toplam kayıtlı bagajı ifade eder; tür değişiminde bu girdi temizlenir.

Her liste tek yön ve en fazla bir aktarma içindir. “Yeni yolculuk” ile başka bir liste, “Dönüş listesi ekle” ile yalnız kalkış/varışı ters çevrilmiş bağımsız bir taslak açılır. Dönüş tarihi, saati, işletici, paket ve biletteki bagaj hakkı yeniden girilir; gidişteki haklar veya onaylar kopyalanmaz. Dönüş taslağı başlangıçta genel havayolu ve bilinmeyen hak kullanır; gerçek işletici biletinden seçilmelidir. Çoklu yolcu toplam hakkı, izin verilen bagaj birleştirmesi, ücret hesaplama ve otomatik bagaj aktarımı çıkarımı yapılmaz.

Tarih ve saat kalkış havalimanındaki sivil değerler olarak saklanır. Uygulama saat dilimleri arasında süre hesaplamaz, kesin son saat veya aktarma yeterliliği kararı vermez. Check-in pencereleri ve havalimanına geliş önerileri kontrol maddesi olarak sunulur; istasyona özel kapanışlar ayrıca teyit edilir.

Pasaport numarası, PNR, ad/soyad, şifre veya Miles&Smiles hesabı istenmez. Rota, tercihler ve tamamlanan maddeler yalnız `localStorage` içinde tutulur. Bulut hesap/senkronizasyon ve analitik yoktur. “Bu yolculuğu sil” yalnız seçili kaydı siler; diğerleri korunur. Silme, sekme açıkken “Silinen yolculuğu geri al” ile geri alınabilir. Ortak cihazda çıkarken her kaydı ayrı silin veya tarayıcının site verilerini temizleyin; bulut kopyası yoktur. Resmi kaynak bağlantıları ilgili havayolunun sitesini açar.

Bu proje THY'nin resmi ürünü değildir. Kontrol listesini tamamlamak, vize/ülkeye giriş, özel hizmet onayı veya uçuşa kabul garantisi sağlamaz. Belge ve kabul koşullarını havayolu ve yetkili resmi makamlardan doğrulayın.

## Yolculuk kayıtları ve taşıma

`ucusa-hazir-v2` koleksiyonu her yolculuğu ayrı kimlik, yön, bilet bilgileri ve tamamlanma imzalarıyla saklar. Önceki `ucusa-hazir-v1` yolculuğu ve güncel kurallarla geçerli onayları otomatik taşınır. Yeni koleksiyon başarıyla yazılmadan eski kayıt silinmez. Bozuk veya okunamayan mevcut kayıt sessizce boş kayıtla değiştirilmez; saklama kapatılır ve kullanıcı uyarılır. Kota/izin hatasında mevcut veri korunur; sekme kapanmadan listeler indirilebilir.

Bir form değiştirildiyse başka kayda geçiş ve silme, liste güncellenene veya “Değişiklikleri geri al” seçilene kadar kapatılır. Örnek liste ve üzerindeki düzenlemeler koleksiyona yazılmaz; örneği kapatmak önceki gerçek listeyi ve kaydedilmemiş taslağı geri getirir. Taslaklar henüz kayıt değildir; sayfayı kapatınca kaybolabilir.

Yazdırma ve Markdown indirme yalnız seçili listeyi içerir. Silinen kayıt yenilemeden sonra geri alınamaz; son kayıt silindiğinde boş v2 koleksiyonu tutulur ve eski v1 kayıt yeniden canlanmaz. En fazla 1000 liste desteklenir.

## Kaynaklar ve yeni havayolu

Kuralların son kontrolü **10 Ekim 2026**. Kaynaklar `dist/data/airlines.js` içinde her konu için doğrudan resmi URL ve tarih ile tutulur:

- [THY kayıtlı bagaj](https://www.turkishairlines.com/tr-tr/bilgi-edin/ucak-alti-bagaj/)
- [THY kabin bagajı](https://www.turkishairlines.com/tr-us/bilgi-edin/kabin-bagaji/)
- [THY bagaj kısıtlamaları](https://www.turkishairlines.com/tr-tr/bilgi-edin/kisitlamalar/)
- [THY check-in](https://www.turkishairlines.com/tr-tr/bilgi-edin/check-in/)
- [THY transfer ve transit](https://www.turkishairlines.com/tr-tr/bilgi-edin/transfer-ve-transit-yolcular/)
- [THY seyahat belgeleri](https://www.turkishairlines.com/en-int/any-questions/visa-and-travel-requirements/)

Yeni havayolu için `airlines.js` kaydı, resmi kaynaklar ve tarihli kurallar ekleyin; `index.html` havayolu seçeneğini güncelleyin. Motorun beklediği kuralların kapsamını doğrulayın; uygun olmayan THY kuralını yeni havayoluna kopyalamayın. Süre/ölçü/ülke istisnalarını testlerle belgeleyin. Ayrıntılar [CONTRIBUTING.md](CONTRIBUTING.md) dosyasındadır.

## Yapı

```text
dist/
  index.html, styles.css, app.js  # Türkçe ve duyarlı arayüz
  data/airlines.js               # Havayolu kaynakları ve kuralları
  data/airports.js               # Giriş kolaylığı için havalimanı listesi
  lib/planner.js                # Normalizasyon, kural motoru, onay geçerliliği
  lib/trips.js                  # Çoklu kayıt, v1 taşıma, ayrı onaylar ve dışa aktarım
scripts/                        # Yerel sunucu ve kontroller
test/planner.test.mjs            # Belirsizlik ve kapsam testleri
```

MIT lisansı. Katkılar, kaynaklı kural düzeltmeleri ve yeni havayolu sağlayıcıları kabul edilir.

Uçak ikonu [Bootstrap Icons — airplane-fill](https://icons.getbootstrap.com/icons/airplane-fill/) kaynağından alınmıştır. MIT lisans bildirimi `dist/assets/LICENSE-bootstrap-icons.txt` içinde dağıtılır.

### English

Uçuşa Hazır is an open source passenger preparation assistant, starting with Turkish Airlines. It builds a personal checklist from a route, ticket-declared baggage allowance and travel needs. The interface is Turkish. It runs entirely in the browser without accounts or dependencies. Other and mixed operating carriers receive a generic checklist until their own rules are verified. It does not determine visa eligibility, flight acceptance or connection feasibility. Contributions with official airline sources and scoped tests are welcome.
