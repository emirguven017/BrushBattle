# Firestore Kurallarını Deploy Etme

"Missing or insufficient permissions" hatası alıyorsanız, Firestore güvenlik kurallarınızın Firebase'e deploy edilmemiş olması muhtemeldir.

## Adımlar

1. **Firebase CLI'yi yükleyin** (yoksa):
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase'e giriş yapın**:
   ```bash
   firebase login
   ```

3. **Projeyi başlatın** (henüz yapmadıysanız):
   ```bash
   firebase init firestore
   ```
   - Mevcut projeyi seçin veya yeni oluşturun
   - `firestore.rules` dosyası zaten var, üzerine yazma sorusunda mevcut dosyayı koruyun

4. **Kuralları deploy edin**:
   ```bash
   firebase deploy --only firestore:rules
   ```

Deploy tamamlandıktan sonra uygulamayı tekrar deneyin. "Fırçalamayı Bitir" artık çalışmalıdır.
