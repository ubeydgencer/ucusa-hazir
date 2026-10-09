# Katkıda bulunma

Hata bildiriminde örnek rotayı, seçimleri ve beklenen davranışı paylaşın. Gerçek PNR, kimlik belgesi veya hesap bilgisi paylaşmayın.

Kural değişikliklerinde resmi havayolu sayfasının doğrudan bağlantısını, kontrol tarihini ve kuralın kapsamını ekleyin. İç/dış hat, işletici, kabin, ülke ve havalimanı istisnalarını belirtin. Belirsiz bilgiyi sayısal hakka dönüştürmeyin.

Yeni havayolu eklerken:

1. `dist/data/airlines.js` içinde ayrı bir kayıt açın. İsim, paketler, resmi kaynaklar ve `verifiedAt` ekleyin.
2. `dist/lib/planner.js` tarafından kullanılan kural alanlarını havayoluna göre doldurun. Süre ve ölçülerin her seçilen kapsamda geçerli olduğunu doğrulayın; farklı davranış gerekiyorsa motoru kapsamlı şekilde genişletin.
3. `dist/index.html` havayolu seçimini güncelleyin. “Diğer havayolu” belirsiz kurallar için genel liste olarak kalmalıdır.
4. Karma operatörlerin tek bir havayolunun sayısal kurallarını miras almadığını ve istisnaların doğru işlendiğini test edin.
5. `npm run check` ve `npm test` çalıştırın; ilgili formu mobil ve masaüstünde kontrol edin.

Kontrol maddesi veya bağımlılığı değişirse `itemSignature` eski onayların geçerliliğini yeniden değerlendirir. Bir kullanıcının farklı uçuş için eski “kontrol ettim” işaretini taşımasını önleyin. İlgisiz onayların korunması da önemlidir.

Uygulama bağımlılıksız statik HTML/CSS/JavaScript kullanır. Yeni altyapı ancak somut bir ihtiyacı karşılıyorsa eklenmelidir. PR açıklamasında sorunu, yeni davranışı ve doğrulamayı kısa şekilde anlatın.
