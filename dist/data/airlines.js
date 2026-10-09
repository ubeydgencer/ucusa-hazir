// Her havayolu, doğrulama tarihi ve resmi kaynakları olan ayrı bir sağlayıcıdır.
export const airlines = {
  TK: {
    name: 'Türk Hava Yolları', shortName: 'THY', verifiedAt: '2026-10-10',
    packages: ['EcoFly', 'ExtraFly', 'FlexFly', 'PrimeFly', 'Business', 'Bilmiyorum'],
    sources: {
      baggage: ['Uçak altı bagaj', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/ucak-alti-bagaj/'],
      cabin: ['Kabin bagajı', 'https://www.turkishairlines.com/tr-us/bilgi-edin/kabin-bagaji/'],
      checkin: ['Check-in', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/check-in/'],
      documents: ['Seyahat belgeleri', 'https://www.turkishairlines.com/en-int/any-questions/visa-and-travel-requirements/'],
      transfer: ['Transfer ve transit', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/transfer-ve-transit-yolcular/'],
      restrictions: ['Bagaj kısıtlamaları', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/kisitlamalar/'],
      child: ['Bebek ve çocuk yolcular', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/bebek-ve-cocuk-yolcular/'],
      assistance: ['Hasta ve engelli yolcular', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/hasta-ve-engelli-yolcular/'],
      meal: ['Özel yemek servisi', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/ozel-yemek-servisi/'],
      pet: ['Evcil hayvanlarla yolculuk', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/evcil-hayvanlarla-yolculuk/kurallar-ve-kosullar/'],
      sports: ['Spor ekipmanları', 'https://www.turkishairlines.com/tr-tr/bilgi-edin/spor-ekipmanlari/']
    },
    rules: {
      onlineCheckin: 'Kalkıştan 24 saat önce açılır, 90 dakika önce kapanır. Havalimanının online check-in hizmetini kontrol et.',
      domesticArrivalHours: 2, internationalArrivalHours: 3,
      cabinEconomy: '1 adet, en fazla 8 kg; 55 × 40 × 23 cm.',
      cabinBusiness: '2 adet, her biri en fazla 8 kg; 55 × 40 × 23 cm. ABD çıkışında yolcu yanında 1 kabin çantası kabul edilir; Business’ın ikinci kabin çantası kontuarda ücretsiz uçak altına teslim edilir.',
      personalItem: '1 adet kişisel eşya: en fazla 4 kg; 40 × 30 × 15 cm.',
      baggageDimensions: 'Standart valizin üç kenar toplamı en fazla 158 cm olmalı. Tek valiz 32 kg’ı geçemez; ücretsiz hakkın biletinde yazan sınıra bağlıdır.',
      assistance: 'Tekerlekli sandalye talebini en az 48 saat önce ilet ve rezervasyonda onaylandığını kontrol et. Kendi cihazın varsa batarya ve kabul koşullarını da doğrula.',
      meal: 'Özel yemek talebini en geç 24 saat önce ilet ve uçuşuna işlendiğini kontrol et.',
      powerbank: 'Yalnız kabinde: kişi başı en fazla 2 adet; lityum iyon en fazla 100 Wh, lityum metal içeriği en fazla 2 g. Kısa devreye karşı koru; koltuk altında veya koltuk cebinde tut. Baş üstü dolabına koyma. Uçuş boyunca şarj etme veya cihaz şarj etmek için kullanma.'
    }
  },
  OTHER: {
    name: 'Diğer havayolu', shortName: 'Diğer havayolu', verifiedAt: null,
    packages: ['Economy', 'Business', 'Diğer / bilmiyorum'], sources: {}, rules: {}
  }
};
