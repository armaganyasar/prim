console.log("Personel Yönetimi JS yüklendi ✅");

// NOT: personl.html dosyasındaki fonksiyonlar (personelListele, deletePersonel, personelSilOnayli)
// bu dosyadan daha günceldir ve kullanılmaya devam etmelidir. Bu dosya, sadece
// harici olarak yüklenen ve ana sayfada kullanılmayan yardımcı işlevler için tutulmalıdır.

// personl.html dosyasındaki renderPersonelListesi, deletePersonel, personelSilOnayli
// gibi fonksiyonlar, personel.js dosyasındaki eski sürümlerini geçersiz kılacağı için,
// bu dosyayı sadeleştirmek en iyi yaklaşımdır.

let allPersoneller = [];
let currentPersonel = null;

// Sadece form tabanlı bir sayfada kullanılan işlevleri burada tutuyoruz.
// Eğer bu JS başka bir sayfada kullanılıyorsa, burada tutulabilir.
// Mevcut HTML yapısına göre, bu dosyanın içeriği gereksiz veya çakışan kod içeriyor.
// Bu dosya içeriği HTML içinde olduğundan (veya ana işlevler HTML içinde tekrar tanımlandığından), 
// silme işlemini HTML dosyasındaki güncel fonksiyona bırakıyoruz.

// Personel Yönetimi sayfası için harici bir JS dosyası kullanmak yerine, 
// tüm JS kodunu personel.html içine dahil etmek daha temiz bir çözüm olacaktır.
// Eğer bu dosyayı tutmak istiyorsanız, sadece harici olarak yüklenmesi gereken (örneğin utils) 
// kodları bırakın.

// Aşağıdaki kod personel.html dosyasındaki fonksiyonlarla ÇAKIŞTIĞI için bu dosyanın içeriği boşaltılmıştır.
// Ana işlevlerin (personel listeleme, silme) doğru çalışması için personel.html'deki JS kodunu kullanın.

/* Eski içerikten kalan kısım */

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Eski showAlert fonksiyonu da personel.html içinde daha gelişmiş bir versiyonu olduğu için kaldırıldı.

// personl.html içindeki kodun sorunsuz çalışması için bu dosya boş bırakılmıştır.
// Tüm gerekli mantık artık personel.html içinde bulunmaktadır.