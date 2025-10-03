console.log("Personel Yönetimi JS yüklendi ✅");

let allPersoneller = [];
let currentPersonel = null;

document.addEventListener("DOMContentLoaded", function () {
    loadPersonelList();
});

// ========================
// PERSONEL CRUD İŞLEMLERİ
// ========================

// Personel listesi yükle
function loadPersonelList() {
    const tbody = document.getElementById("personelTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center">
        <i class="fas fa-spinner fa-spin"></i> Yükleniyor...
    </td></tr>`;

    fetch("/api/personel/liste")
        .then((r) => r.json())
        .then((data) => {
            allPersoneller = data.data || [];
            tbody.innerHTML = "";

            if (allPersoneller.length > 0) {
                allPersoneller.forEach((p) => {
                    tbody.appendChild(createPersonelRow(p));
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">
                    Henüz kayıtlı personel bulunmamaktadır.
                </td></tr>`;
            }
        })
        .catch((err) => {
            console.error("Personel listeleme hatası:", err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">
                Liste yüklenemedi.
            </td></tr>`;
        });
}

// Tablo satırı oluştur
function createPersonelRow(p) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>#${p.id}</td>
        <td>${escapeHtml(p.ad)} ${escapeHtml(p.soyad)}</td>
        <td>${escapeHtml(p.pozisyon || "-")}</td>
        <td>${escapeHtml(p.sube_adi || "-")}</td>
        <td>${p.calisma_durumu === "aktif" ? 
            '<span class="badge bg-success">Aktif</span>' : 
            '<span class="badge bg-secondary">Pasif</span>'}</td>
        <td class="text-center">
            <button onclick="editPersonel(${p.id})" class="btn btn-sm btn-outline-primary me-1">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deletePersonel(${p.id}, '${escapeHtml(p.ad)} ${escapeHtml(p.soyad)}')" class="btn btn-sm btn-outline-danger">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    return tr;
}

// Personel ekle/güncelle (örnek)
function savePersonel() {
    const ad = document.getElementById("personelAd").value.trim();
    const soyad = document.getElementById("personelSoyad").value.trim();
    const pozisyon = document.getElementById("personelPozisyon").value.trim();
    const subeId = document.getElementById("personelSube").value;

    if (!ad || !soyad) {
        showAlert("Ad ve Soyad zorunlu", "warning");
        return;
    }

    const data = {
        id: currentPersonel ? currentPersonel.id : null,
        ad: ad,
        soyad: soyad,
        pozisyon: pozisyon,
        sube_id: subeId,
    };

    const url = currentPersonel ? "/api/personel/guncelle" : "/api/personel/ekle";

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
        .then((r) => r.json())
        .then((res) => {
            if (res.success) {
                showAlert("Personel başarıyla kaydedildi", "success");
                loadPersonelList();
                resetPersonelForm();
            } else {
                showAlert("Hata: " + (res.error || "Kaydedilemedi"), "danger");
            }
        })
        .catch((err) => {
            console.error("Personel kayıt hatası:", err);
            showAlert("Sunucu hatası: " + err.message, "danger");
        });
}

// Personel sil
function deletePersonel(personelId, personelAdi) {
    if (!confirm(`${personelAdi} adlı personeli silmek istediğinizden emin misiniz?`)) {
        return;
    }

    const adminSifre = prompt("Admin şifresini giriniz:");
    if (!adminSifre) {
        alert("Şifre girmeden silme işlemi yapılamaz.");
        return;
    }

    fetch("/api/personel/sil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personel_id: personelId, admin_sifre: adminSifre }),
    })
        .then((r) => r.json())
        .then((res) => {
            if (res.success) {
                showAlert("Personel başarıyla silindi", "success");
                loadPersonelList();
            } else {
                showAlert("Silme hatası: " + (res.error || "Başarısız"), "danger");
            }
        })
        .catch((err) => {
            console.error("Silme hatası:", err);
            showAlert("Sunucuya ulaşılamadı.", "danger");
        });
}

// Düzenleme (örnek, detay çekilebilir)
function editPersonel(personelId) {
    const p = allPersoneller.find((x) => x.id === personelId);
    if (!p) return showAlert("Personel bulunamadı", "danger");

    currentPersonel = p;

    document.getElementById("personelAd").value = p.ad;
    document.getElementById("personelSoyad").value = p.soyad;
    document.getElementById("personelPozisyon").value = p.pozisyon || "";
    document.getElementById("personelSube").value = p.sube_id || "";

    showAlert(`${p.ad} ${p.soyad} düzenleme modunda`, "info");
}

// Form resetle
function resetPersonelForm() {
    document.getElementById("personelAd").value = "";
    document.getElementById("personelSoyad").value = "";
    document.getElementById("personelPozisyon").value = "";
    document.getElementById("personelSube").value = "";
    currentPersonel = null;
}

// ========================
// Yardımcı Fonksiyonlar
// ========================

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(message, type = "info") {
    document.querySelectorAll(".custom-alert").forEach((a) => a.remove());

    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
    alertDiv.style.cssText =
        "position:fixed;top:20px;right:20px;z-index:9999;min-width:300px";
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>`;

    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
}
