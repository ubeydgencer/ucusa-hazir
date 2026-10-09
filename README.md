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
- Tarayıcıda kayıt; bilgiler veya kaynaklı kural değişince ilgili onaylar yeniden açılır.
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

`dist/` klasörü herhangi bir statik web sunucusunda çalışır. `.openai/hosting.json` mevcut Sites projesinin kimliğini taşır; fork'unuz için farklı bir Sites projesi oluşturuyorsanız eski kimliği kullanmayın.

## Verinin anlamı

Bagaj hakkı havayolundan otomatik alınmaz. Kullanıcı biletindeki toplam hakkı girer; paket adına göre kilogram üretilmez. Statü/öğrenci/ek bagaj avantajları tekrar eklenmez. Parça sisteminde “hazırlanan ağırlık” en ağır tek valizi, kilo sisteminde toplam kayıtlı bagajı ifade eder; tür değişiminde bu girdi temizlenir.

İlk sürüm tek yolculuk ve bir aktarma içindir. Dönüş veya farklı hakları olan etaplar için ayrı liste hazırlayın. Çoklu yolcu toplam hakkı, izin verilen bagaj birleştirmesi, ücret hesaplama ve otomatik bagaj aktarımı çıkarımı yapılmaz.

Tarih ve saat kalkış havalimanındaki sivil değerler olarak saklanır. Uygulama saat dilimleri arasında süre hesaplamaz, kesin son saat veya aktarma yeterliliği kararı vermez. Check-in pencereleri ve havalimanına geliş önerileri kontrol maddesi olarak sunulur; istasyona özel kapanışlar ayrıca teyit edilir.

Pasaport numarası, PNR, ad/soyad, şifre veya Miles&Smiles hesabı istenmez. Rota, tercihler ve tamamlanan maddeler yalnız `localStorage` içinde tutulur. Bulut hesap/senkronizasyon ve analitik yoktur. Ortak bir cihazda işiniz bittiğinde “Tarayıcı kaydını sil” düğmesini kullanabilirsiniz. Resmi kaynak bağlantıları ilgili havayolunun sitesini açar.

Bu proje THY'nin resmi ürünü değildir. Kontrol listesini tamamlamak, vize/ülkeye giriş, özel hizmet onayı veya uçuşa kabul garantisi sağlamaz. Belge ve kabul koşullarını havayolu ve yetkili resmi makamlardan doğrulayın.

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
scripts/                        # Yerel sunucu ve kontroller
test/planner.test.mjs            # Belirsizlik ve kapsam testleri
```

MIT lisansı. Katkılar, kaynaklı kural düzeltmeleri ve yeni havayolu sağlayıcıları kabul edilir.

### English

Uçuşa Hazır is an open source passenger preparation assistant, starting with Turkish Airlines. It builds a personal checklist from a route, ticket-declared baggage allowance and travel needs. The interface is Turkish. It runs entirely in the browser without accounts or dependencies. Other and mixed operating carriers receive a generic checklist until their own rules are verified. It does not determine visa eligibility, flight acceptance or connection feasibility. Contributions with official airline sources and scoped tests are welcome.
