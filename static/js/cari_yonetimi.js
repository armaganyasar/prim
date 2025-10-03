// cari_yonetimi.js - Cari Hesap Yönetimi Sayfası (SON EKSİKSİZ GÜVENLİ SÜRÜM)
console.log('Cari Yönetimi JS yüklendi - SON GÜVENLİ SÜRÜM');

let currentCari = null;
let allBranches = []; 
let allCariler = []; 
let currentHareketler = []; 

document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
    setupCariEventListeners();
	loadCariGruplar();
	loadCariTurleri(); 
    // Maaş listesini otomatik yükle
    maasListele();
});


function loadInitialData() {
    fetch('/api/branches')
        .then(response => response.json())
        .then(data => {
            allBranches = data;
            loadCariList();
        })
        .catch(error => {
            console.error('Şube yükleme hatası:', error);
            showAlert('Şubeler yüklenemedi.', 'danger');
            loadCariList(); 
        });
}
function loadCariGruplar() {
    fetch('/api/cari/grup_liste')
        .then(r => r.json())
        .then(data => {
            const select = document.getElementById('filterCariGrup');
            select.innerHTML = '<option value="">Cari Grup Seç</option>';
            if (data.success && data.data.length > 0) {
                data.data.forEach(grup => {
                    const opt = document.createElement('option');
                    opt.value = grup.id || grup.grup_kodu; 
                    opt.textContent = grup.ad || grup.grup_adi;
                    select.appendChild(opt);
                });
            }
        })
        .catch(err => console.error("Cari grup listesi yüklenemedi:", err));
}

function setupCariEventListeners() {
    document.getElementById('cariKaydetBtn').addEventListener('click', saveCari);
    document.getElementById('cariTemizleBtn').addEventListener('click', resetCariForm);

    const eslestirmeSube = document.getElementById('eslestirmeSube');
    if (eslestirmeSube) {
        eslestirmeSube.addEventListener('change', function() {
            if (this.value) {
                loadDoctorsForEslestirme(this.value);
            } else {
                document.getElementById('eslestirmeDoktor').innerHTML = '<option value="">Önce şube seçiniz...</option>';
                document.getElementById('eslestirmeDoktor').disabled = true;
            }
        });
    }
    
    document.getElementById('eslestirmeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveHekimEslestirme();
    });

    document.getElementById('odemeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCariHareket();
    });
}

// ========================
// CARİ HESAP İŞLEMLERİ (CRUD)
// ========================

function loadCariList() {
    const tbody = document.getElementById('cariTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
    
    fetch('/api/cari/liste')
        .then(response => response.json())
        .then(data => {
            allCariler = data.data || []; 
            tbody.innerHTML = '';
            if (allCariler.length > 0) {
                allCariler.forEach(cari => {
                    tbody.appendChild(createCariRow(cari));
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Henüz kayıtlı aktif cari hesap bulunmamaktadır.</td></tr>';
            }
        })
        .catch(error => {
            console.error('Cari listeleme hatası:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Hata oluştu.</td></tr>';
        });
}

function createCariRow(cari) {
    const tr = document.createElement('tr');
    
    const bakiyeClass = cari.bakiye >= 0 ? 'bakiye-alacak' : 'bakiye-borc';
    const bakiyeText = cari.bakiye >= 0 
        ? `${formatCurrencyTurkish(cari.bakiye)} (Alacak)`
        : `${formatCurrencyTurkish(Math.abs(cari.bakiye))} (Borç)`;

    tr.innerHTML = `
        <td>#${cari.id} / ${escapeHtml(cari.cari_kodu)}</td>
        <td>${escapeHtml(cari.cari_adi)}</td>
        <td class="text-end ${bakiyeClass}">${bakiyeText}</td>
        <td class="text-center">
            <button onclick="editCari(${cari.id})" class="btn btn-sm btn-outline-primary me-1" title="Cari Düzenle">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="showHareketModal(${cari.id}, '${escapeHtml(cari.cari_adi)}')" class="btn btn-sm btn-outline-info me-1" title="Hareketler">
                <i class="fas fa-exchange-alt"></i>
            </button>
            <button onclick="editEslestirme(${cari.id}, '${escapeHtml(cari.cari_adi)}')" class="btn btn-sm btn-outline-warning me-1" title="Hekim Eşleştir">
                <i class="fas fa-link"></i>
            </button>
            <button onclick="deleteCari(${cari.id}, '${escapeHtml(cari.cari_adi)}')" class="btn btn-sm btn-outline-danger" title="Cari Sil">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    return tr;
}


function editCari(cariId) {
    const cari = allCariler.find(c => c.id === cariId);
    
    if (!cari) {
        showAlert('Cari bilgisi bulunamadı.', 'danger');
        return;
    }

    document.getElementById('cariId').value = cari.id;
    document.getElementById('cariKodu').value = cari.cari_kodu;
    document.getElementById('cariAdi').value = cari.cari_adi;
    document.getElementById('cariTelefon').value = cari.telefon || '';
    document.getElementById('cariEmail').value = cari.email || '';
    document.getElementById('cariNotlar').value = cari.notlar || '';

    document.getElementById('cariKaydetBtn').innerHTML = '<i class="fas fa-save"></i> Cari Güncelle';
    document.getElementById('cariTemizleBtn').style.display = 'inline-block';

    showAlert(`Cari: ${cari.cari_adi} düzenleme modunda.`, 'info');
    
    editEslestirme(cari.id, cari.cari_adi);
    
    window.scrollTo(0, 0); 
}


function saveCari() {
    const cariId = document.getElementById('cariId').value;
    const cariKodu = document.getElementById('cariKodu').value.trim();
    const cariAdi = document.getElementById('cariAdi').value.trim();
    const cariTelefon = document.getElementById('cariTelefon').value.trim();
    const cariEmail = document.getElementById('cariEmail').value.trim();
    const cariNotlar = document.getElementById('cariNotlar').value.trim();

    if (!cariKodu || !cariAdi) {
        showAlert('Cari kodu ve adı alanları boş bırakılamaz.', 'warning');
        return;
    }

    const cariData = {
        id: cariId ? parseInt(cariId) : null,
        cari_kodu: cariKodu,
        cari_adi: cariAdi,
        telefon: cariTelefon,
        email: cariEmail,
        notlar: cariNotlar
    };
    
    const isUpdate = !!cariId;
    const url = isUpdate ? `/api/cari/guncelle` : `/api/cari/ekle`;
    
    const kaydetBtn = document.getElementById('cariKaydetBtn');
    kaydetBtn.disabled = true;
    kaydetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> İşleniyor...';

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cariData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(`Cari hesap başarıyla ${isUpdate ? 'güncellendi' : 'kaydedildi'}!`, 'success');
            loadCariList();
            resetCariForm();
        } else {
            showAlert('Cari kaydetme hatası: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .catch(error => {
        showAlert('Sunucu hatası: ' + error.message, 'danger');
    })
    .finally(() => {
        kaydetBtn.disabled = false;
        kaydetBtn.innerHTML = '<i class="fas fa-save"></i> Cari Kaydet / Güncelle';
    });
}


function resetCariForm() {
    document.getElementById('cariId').value = '';
    document.getElementById('cariKodu').value = '';
    document.getElementById('cariAdi').value = '';
    document.getElementById('cariTelefon').value = '';
    document.getElementById('cariEmail').value = '';
    document.getElementById('cariNotlar').value = '';
    
    document.getElementById('cariKaydetBtn').innerHTML = '<i class="fas fa-save"></i> Cari Kaydet / Güncelle';
    document.getElementById('cariTemizleBtn').style.display = 'none';
    
    currentCari = null;
    document.getElementById('eslestirmeCard').style.display = 'none';
    window.scrollTo(0, 0);
}

function deleteCari(cariId, cariAdi) {
    if (!confirm(`${cariAdi} cari hesabını silmek istediğinizden emin misiniz? \n(UYARI: Eğer hareket varsa silinemez.)`)) {
        return;
    }

    fetch('/api/cari/sil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cari_id: cariId })
    })
    .then(response => {
        // HTTP yanıtı 200-299 aralığında değilse bile, yanıtı JSON olarak işlemeye çalış
        if (!response.ok) {
            // Yanıt gövdesini JSON olarak okuyup hatayı fırlat
            return response.json().then(errorData => {
                // Eğer geçerli bir JSON yanıtıysa, hata mesajını al
                throw new Error(errorData.error || `Sunucu tarafından bilinmeyen hata (Durum: ${response.status})`);
            }).catch(e => {
                // JSON okuma başarısız olursa, genel bir hata mesajı fırlat
                if (e.message.includes('JSON')) {
                    throw new Error(`Sunucudan geçerli bir JSON yanıtı alınamadı. ${e.message}`);
                }
                throw e; // Zaten JSON'dan gelen hatayı fırlat
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showAlert('Cari hesap başarıyla silindi.', 'success');
            loadCariList();
        } else {
            // Bu blok, response.ok true olsa bile (olmamalı), success:false durumunu yakalar
            showAlert(`Silme hatası: ${data.error}`, 'danger');
        }
    })
    .catch(error => {
        // Burası fırlatılan Error objesini yakalar
        const errorMessage = error.message.includes('400') 
            ? error.message.replace('Error: ', '') // Sadece temiz mesajı göster (hata mesajı JSON'dan geldi)
            : 'Sunucuya bağlanılamadı veya beklenmeyen bir hata oluştu: ' + error.message;
            
        showAlert(errorMessage, 'danger');
    });
}

// ========================
// HEKİM EŞLEŞTİRME İŞLEMLERİ
// ========================

function editEslestirme(cariId, cariAdi) {
    const eslestirmeCard = document.getElementById('eslestirmeCard');
    if (!eslestirmeCard) return;

    currentCari = { id: cariId, adi: cariAdi };
    
    document.getElementById('eslestirilenCariAdi').textContent = `Seçili Cari: ${cariAdi}`;
    eslestirmeCard.style.display = 'block';
    
    eslestirmeCard.scrollIntoView({ behavior: 'smooth' });
    
    loadEslestirmeler(cariId);
}

function loadDoctorsForEslestirme(subeId) {
    const dokterSelect = document.getElementById('eslestirmeDoktor');
    if (!dokterSelect) return;
    
    const selectedBranch = allBranches.find(b => String(b.id) === subeId);
    
    if (!selectedBranch) {
        dokterSelect.innerHTML = '<option value="">Şube bulunamadı</option>';
        dokterSelect.disabled = true;
        return;
    }
    
    dokterSelect.innerHTML = '<option value="">Yükleniyor...</option>';
    dokterSelect.disabled = true;
    
    fetch(`/api/doctors?sube_id=${subeId}`)
        .then(response => response.json())
        .then(data => {
            dokterSelect.innerHTML = '<option value="">Hekim seçiniz...</option>';
            data.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = doctor.name;
                option.dataset.doktorAdi = doctor.name;
                option.dataset.primYuzde = doctor.PRIMYUZDE || 0; 
                dokterSelect.appendChild(option);
            });
            dokterSelect.disabled = false;
        })
        .catch(error => {
            console.error('Doktor yükleme hatası:', error);
            dokterSelect.innerHTML = '<option value="">Hata oluştu</option>';
        });
}

function saveHekimEslestirme() {
    if (!currentCari) return showAlert('Önce bir cari hesap seçin.', 'warning');
    
    const subeSelect = document.getElementById('eslestirmeSube');
    const doktorSelect = document.getElementById('eslestirmeDoktor');
    
    const subeId = subeSelect.value;
    const doktorId = doktorSelect.value;
    const doktorAdi = doktorSelect.selectedOptions[0]?.dataset.doktorAdi || doktorSelect.selectedOptions[0]?.textContent;
    const subeAdi = subeSelect.selectedOptions[0]?.dataset.subeAdi || subeSelect.selectedOptions[0]?.textContent;

    if (!subeId || !doktorId) {
        showAlert('Lütfen şube ve hekim seçin.', 'warning');
        return;
    }

    const eslestirmeData = {
        cari_id: currentCari.id,
        doktor_id: doktorId,
        doktor_adi: doktorAdi,
        sube_id: subeId,
        sube_adi: subeAdi
    };

    fetch('/api/cari/eslestir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eslestirmeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Eşleştirme başarıyla kaydedildi!', 'success');
            loadEslestirmeler(currentCari.id);
            document.getElementById('eslestirmeForm').reset();
            document.getElementById('eslestirmeDoktor').innerHTML = '<option value="">Önce şube seçiniz...</option>';
            document.getElementById('eslestirmeDoktor').disabled = true;
        } else {
            showAlert('Eşleştirme hatası: ' + (data.error || 'Bu hekim-şube kombinasyonu zaten başka bir cariye bağlı olabilir.'), 'danger');
        }
    })
    .catch(error => {
        showAlert('Sunucu hatası: ' + error.message, 'danger');
    });
}

function loadEslestirmeler(cariId) {
    const liste = document.getElementById('eslestirmelerListesi');
    if (!liste) return;
    liste.innerHTML = '<p class="text-center small text-muted"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</p>';
    
    fetch(`/api/cari/eslestirme_liste/${cariId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                liste.innerHTML = '';
                data.data.forEach(eslestirme => {
                    const div = document.createElement('div');
                    div.className = 'eslestirme-item d-flex justify-content-between align-items-center';
                    div.innerHTML = `
                        <div>
                            <small class="text-info">${escapeHtml(eslestirme.sube_adi)}</small><br>
                            <strong>${escapeHtml(eslestirme.doktor_adi)}</strong>
                        </div>
                        <button onclick="eslestirmeSil(${eslestirme.id})" class="btn btn-sm btn-outline-danger" title="Eşleştirmeyi Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    liste.appendChild(div);
                });
            } else {
                liste.innerHTML = '<p class="text-muted small">Henüz eşleştirme yok.</p>';
            }
        })
        .catch(error => {
            console.error('Eşleştirme listesi yükleme hatası:', error);
            liste.innerHTML = '<p class="text-danger small">Eşleştirmeler yüklenirken hata oluştu.</p>';
        });
}

function eslestirmeSil(eslestirmeId) {
    if (!confirm('Bu hekim-şube eşleştirmesini silmek istediğinizden emin misiniz?')) return;
    
    fetch('/api/cari/eslestirme_sil', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eslestirmeId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Eşleştirme başarıyla silindi.', 'success');
            if (currentCari) loadEslestirmeler(currentCari.id);
        } else {
            showAlert('Eşleştirme silme hatası: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .catch(error => {
        showAlert('Sunucu hatası: ' + error.message, 'danger');
    });
}

// ========================
// CARİ HAREKET İŞLEMLERİ (Ödeme Şekli ve Düzenleme Eklendi)
// ========================

function showHareketModal(cariId, cariAdi) {
    currentCari = { id: cariId, adi: cariAdi };
    document.getElementById('modalCariAdi').textContent = cariAdi;
    document.getElementById('hareketCariId').value = cariId;
    
    // Yeni ödeme formu alanlarını temizle
    document.getElementById('odemeTarih').valueAsDate = new Date();
    document.getElementById('odemeSekli').value = ''; 
    document.getElementById('odemeForm').reset();

    loadHareketler(cariId);
    
    const modalElement = document.getElementById('hareketModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

function loadHareketler(cariId) {
    const tbody = document.getElementById('hareketTableBody');
    const bakiyeBilgi = document.getElementById('mevcutBakiyeBilgi');
    if (!tbody || !bakiyeBilgi) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</td></tr>';
    bakiyeBilgi.textContent = 'Bakiye: Yükleniyor...';

    fetch(`/api/cari/hareket_liste/${cariId}`) 
        .then(response => response.json())
        .then(data => {
            currentHareketler = data.data || []; // Hareketleri kaydet
            tbody.innerHTML = '';
            let sonBakiye = 0;
            
            if (currentHareketler.length > 0) {
                // Listeyi ters çevirip göster (en yeni en üstte)
                currentHareketler.slice().reverse().forEach(hareket => {
                    tbody.appendChild(createHareketRow(hareket));
                });
                
                // Son bakiyeyi listenin en sonundaki kayıttan al (oluşturulma sırasına göre son kayıt)
                sonBakiye = currentHareketler[currentHareketler.length - 1].bakiye;
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Henüz hareket kaydı yok.</td></tr>';
            }
            
            const bakiyeClass = sonBakiye >= 0 ? 'text-success' : 'text-danger';
            const bakiyeText = sonBakiye >= 0 
                ? `${formatCurrencyTurkish(sonBakiye)} (Alacak)`
                : `${formatCurrencyTurkish(Math.abs(sonBakiye))} (Borç)`;
            bakiyeBilgi.innerHTML = `**Mevcut Bakiye:** <span class="${bakiyeClass}">${bakiyeText}</span>`;
            
            loadCariList(); // Ana listeyi güncelle
        })
        .catch(error => {
            console.error('Hareket yükleme hatası:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Hata oluştu.</td></tr>';
            bakiyeBilgi.textContent = 'Bakiye: Hata';
        });
}

function createHareketRow(hareket) {
    const tr = document.createElement('tr');
    
    const alacak = parseFloat(hareket.alacak || 0);
    const borc = parseFloat(hareket.borc || 0);
    const bakiye = parseFloat(hareket.bakiye || 0);

    const tip = hareket.hareket_tipi.includes('prim') ? 'prim' : 'odeme';
    const tipClass = tip === 'prim' ? 'badge bg-success' : 'badge bg-danger';
    const tipText = tip === 'prim' ? 'Prim Alacak' : 'Ödeme Borç';
    const rowClass = tip === 'prim' ? 'table-alacak' : 'table-borc';
    
    const bakiyeClass = bakiye >= 0 ? 'text-success' : 'text-danger'; 
    
    // Düzeltme butonu - Sadece manuel ödemeler düzenlenebilir (prim_id yoksa)
    const canEdit = !hareket.prim_id ? 
        `<button onclick="showDuzeltmeModal(${hareket.id})" class="btn btn-sm btn-outline-dark" title="Düzenle/Sil">
            <i class="fas fa-edit"></i>
        </button>` : `<span class="badge bg-secondary">Kilitli</span>`;

    tr.className = rowClass;
    tr.innerHTML = `
        <td>${formatDateTurkish(hareket.tarih)}</td>
        <td><span class="${tipClass}">${tipText}</span></td>
        <td>${escapeHtml(hareket.aciklama)}</td>
        <td class="text-end text-success">${formatCurrencyTurkish(alacak)}</td>
        <td class="text-end text-danger">${formatCurrencyTurkish(borc)}</td>
        <td class="text-end ${bakiyeClass} fw-bold">${formatCurrencyTurkish(bakiye)}</td>
        <td class="text-center">${canEdit}</td>
    `;
    return tr;
}

function saveCariHareket() {
    const cariId = document.getElementById('hareketCariId').value;
    const tarih = document.getElementById('odemeTarih').value;
    const odemeSekli = document.getElementById('odemeSekli').value; 
    const tutar = parseFloat(document.getElementById('odemeTutar').value);
    const aciklama = document.getElementById('odemeAciklama').value.trim();

    if (!tarih || !tutar || tutar <= 0 || !aciklama || !odemeSekli) {
        showAlert('Tüm alanlar doğru ve pozitif değerde doldurulmalıdır.', 'warning');
        return;
    }
    
    const hareketData = {
        cari_id: parseInt(cariId),
        hareket_tipi: 'odeme_borc',
        tarih: tarih,
        aciklama: `Ödeme (${odemeSekli}): ${aciklama}`, 
        alacak: 0,
        borc: tutar 
    };
    
    const odemeBtn = document.querySelector('#odemeForm button[type="submit"]');
    odemeBtn.disabled = true;
    odemeBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> İşleniyor...';

    fetch('/api/cari/hareket_ekle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hareketData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Ödeme (Borç) başarıyla kaydedildi!', 'success');
            document.getElementById('odemeForm').reset();
            document.getElementById('odemeSekli').value = ''; 
            loadHareketler(cariId); 
        } else {
            showAlert('Ödeme kaydetme hatası: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .catch(error => {
        showAlert('Sunucu hatası: ' + error.message, 'danger');
    })
    .finally(() => {
        odemeBtn.disabled = false;
        odemeBtn.innerHTML = '<i class="fas fa-arrow-alt-circle-down"></i> Ödeme Yap (Borç İşle)';
    });
}


// HIZLI ÖDEME MODALI MANTIKLARI (primler.html ve index.html için)
function saveHizliOdeme() {
    const cariId = document.getElementById('hizliCariSelect').value;
    const tarih = document.getElementById('hizliOdemeTarih').value;
    const odemeSekli = document.getElementById('hizliOdemeSekli').value; 
    const tutar = parseFloat(document.getElementById('hizliOdemeTutar').value);
    const aciklama = document.getElementById('hizliOdemeAciklama').value.trim();

    if (!cariId || !tutar || tutar <= 0 || !odemeSekli || !aciklama) {
        return showAlert('Lütfen tüm ödeme alanlarını doldurun.', 'warning');
    }

    const hareketData = {
        cari_id: parseInt(cariId),
        hareket_tipi: 'odeme_borc',
        tarih: tarih,
        aciklama: `Hızlı Ödeme (${odemeSekli}): ${aciklama}`,
        alacak: 0,
        borc: tutar
    };

    const odemeBtn = document.querySelector('#hizliOdemeForm button[type="submit"]');
    odemeBtn.disabled = true;
    odemeBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> İşleniyor...';

    fetch('/api/cari/hareket_ekle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hareketData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Hızlı Ödeme başarıyla kaydedildi!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('hizliOdemeModal'));
            if (modal) modal.hide();
            loadCariList(); 
        } else {
            showAlert('Ödeme kaydetme hatası: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .catch(error => {
        showAlert('Sunucu hatası: ' + error.message, 'danger');
    })
    .finally(() => {
        odemeBtn.disabled = false;
        odemeBtn.innerHTML = '<i class="fas fa-arrow-alt-circle-down"></i> Ödemeyi Kaydet';
    });
}

// CARİ HAREKET DÜZENLEME/SİLME MANTIKLARI 

function showDuzeltmeModal(hareketId) {
    const hareket = currentHareketler.find(h => h.id === hareketId);
    
    if (!hareket) {
        return showAlert('Hareket detayı bulunamadı.', 'danger');
    }

    if (hareket.prim_id) {
        return showAlert('Bu hareket bir prim kaydından geldiği için düzenlenemez.', 'warning');
    }

    const cari = allCariler.find(c => c.id === hareket.cari_id);

    document.getElementById('duzeltmeId').value = hareket.id;
    document.getElementById('duzeltmeCariId').value = hareket.cari_id;
    
    const tarihStr = hareket.tarih ? hareket.tarih.substring(0, 10) : '';
    document.getElementById('duzeltmeTarih').value = tarihStr;

    document.getElementById('duzeltmeAciklama').value = hareket.aciklama;
    document.getElementById('duzeltmeAlacak').value = (hareket.alacak || 0);
    document.getElementById('duzeltmeBorc').value = (hareket.borc || 0);

    document.getElementById('duzeltmeBilgi').innerHTML = `
        Hareket ID: <strong>#${hareket.id}</strong><br>
        Cari: <strong>${cari ? cari.cari_adi : 'Bilinmeyen'}</strong>
    `;
    
    const modalElement = document.getElementById('duzeltmeModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

function saveDüzeltme() {
    const hareketId = document.getElementById('duzeltmeId').value;
    const cariId = document.getElementById('duzeltmeCariId').value;
    const tarih = document.getElementById('duzeltmeTarih').value;
    const aciklama = document.getElementById('duzeltmeAciklama').value.trim();
    const alacak = parseFloat(document.getElementById('duzeltmeAlacak').value);
    const borc = parseFloat(document.getElementById('duzeltmeBorc').value);

    if (isNaN(alacak) || isNaN(borc) || alacak < 0 || borc < 0 || !tarih) {
        return showAlert('Tarih, Alacak ve Borç alanları geçerli olmalıdır.', 'warning');
    }
    
    // UI Feedback
    const saveBtn = document.querySelector('#duzeltmeModal .btn-warning');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';
    
    fetch('/api/cari/hareket_duzelt', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: parseInt(hareketId),
            cari_id: parseInt(cariId),
            tarih: tarih,
            aciklama: aciklama,
            alacak: alacak,
            borc: borc
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showAlert('Hareket başarıyla düzeltildi.', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('duzeltmeModal'));
            if (modal) modal.hide();
            loadHareketler(cariId); 
        } else {
            showAlert('Düzeltme hatası: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .finally(() => {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Değişiklikleri Kaydet';
    });
}

function deleteHareket() {
    if (!confirm('Bu ödeme hareketini KALICI OLARAK SİLMEK istediğinizden emin misiniz?')) return;
    
    const hareketId = document.getElementById('duzeltmeId').value;
    const cariId = document.getElementById('duzeltmeCariId').value;
    
    // UI Feedback
    const deleteBtn = document.querySelector('#duzeltmeModal .btn-danger');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Siliniyor...';

    fetch('/api/cari/hareket_sil', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(hareketId), cari_id: parseInt(cariId) })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showAlert('Hareket başarıyla silindi.', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('duzeltmeModal'));
            if (modal) modal.hide();
            loadHareketler(cariId); 
        } else {
            showAlert('Silme hatası: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .finally(() => {
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Hareketi Sil';
    });
}

// Cari Ekstre Yazdırma İşlemi
function printCariEkstre() {
    if (!currentCari || !currentCari.id) return;

    const printWindow = window.open(`/api/cari/ekstre_yazdir/${currentCari.id}`, '_blank');
    if (!printWindow) {
        showAlert('Tarayıcınız pop-up pencere açmayı engelliyor. Lütfen izin verin.', 'warning');
    }
}


// ========================
// YARDIMCI FONKSİYONLAR (Aynı Kalacak)
// ========================

function formatDateTurkish(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        }
        return dateString;
    } catch (e) {
        return dateString;
    }
}

function formatCurrencyTurkish(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0,00 ₺';
    
    try {
        const num = parseFloat(amount);
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    } catch (error) {
        return '0,00 ₺';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(message, type = 'info') {
    document.querySelectorAll('.custom-alert').forEach(a => a.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
    alertDiv.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:300px';
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>`;
    
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}
// ========================
// MAAŞ YÖNETİMİ İŞLEMLERİ
// ========================

function maasListele() {
    const yil = document.getElementById('filterYil')?.value || "";
    const ay = document.getElementById('filterAy')?.value || "";
    const cariGrup = document.getElementById('filterCariGrup')?.value || "";
    const cariTuru = document.getElementById("filterCariTuru")?.value || "";
    const altTuru = document.getElementById("filterAltTuru")?.value || "";

    const params = new URLSearchParams();
    if (yil) params.append('donem_yil', yil);
    if (ay) params.append('donem_ay', ay);
    if (cariGrup) params.append('cari_grup', cariGrup);
    if (cariTuru) params.append('cari_turu', cariTuru);
    if (altTuru) params.append('alt_turu', altTuru);

    const container = document.getElementById('maasListesi');
    container.innerHTML = '<p class="text-center"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</p>';

    fetch(`/api/personel/maas/liste?${params.toString()}`)
        .then(r => r.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                renderMaasListesi(data.data);
            } else {
                container.innerHTML = '<p class="text-center text-muted py-4">Bu döneme ait maaş ödemesi bulunamadı</p>';
            }
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<p class="text-center text-danger py-4">Maaşlar yüklenemedi</p>';
        });
}


function renderMaasListesi(maaslar) {
    const container = document.getElementById('maasListesi');

    // Toplamları hesapla
    let toplamOdenecek = 0;
    let toplamOdendi = 0;

    maaslar.forEach(m => {
        toplamOdenecek += parseFloat(m.odenecek_tutar || 0);
        if (m.odeme_durumu === 'odendi') {
            toplamOdendi += parseFloat(m.odenecek_tutar || 0);
        }
    });

    // Toplam kutusu
    let toplamHTML = `
        <div class="alert alert-info d-flex justify-content-between align-items-center mb-3">
            <div><strong>Toplam Ödenecek (Borç):</strong> ${formatCurrency(toplamOdenecek)}</div>
            <div><strong>Toplam Ödenmiş (Alacak):</strong> ${formatCurrency(toplamOdendi)}</div>
            <div><strong>Bekleyen:</strong> ${formatCurrency(toplamOdenecek - toplamOdendi)}</div>
        </div>
    `;

    // Tablo
    let html = '<div class="table-responsive"><table class="table table-hover">';
    html += '<thead class="table-dark"><tr>';
    html += '<th>Personel</th>';
    html += '<th>Dönem</th>';
    html += '<th>Cari Türü</th>';   // 🔹 yeni
    html += '<th>Alt Türü</th>';    // 🔹 yeni
    html += '<th>Net Maaş</th>';
    html += '<th>Ödenecek</th>';
    html += '<th>Durum</th>';
    html += '<th>İşlemler</th>';
    html += '</tr></thead><tbody>';

    maaslar.forEach(m => {
        const durum = m.odeme_durumu || 'beklemede';
        const durumClass = durum === 'odendi' ? 'success' : 'warning';
        const durumText = durum === 'odendi' ? 'Ödendi' : 'Bekliyor';

        html += '<tr>';
        html += `<td>${m.ad} ${m.soyad}</td>`;
        html += `<td>${getAyAdi(m.donem_ay)} ${m.donem_yil}</td>`;
        html += `<td>${m.cari_turu || '-'}</td>`;   // 🔹 yeni
        html += `<td>${m.alt_turu || '-'}</td>`;    // 🔹 yeni
        html += `<td>${formatCurrency(m.net_maas)}</td>`;
        html += `<td><strong>${formatCurrency(m.odenecek_tutar)}</strong></td>`;
        html += `<td><span class="badge bg-${durumClass}">${durumText}</span></td>`;
        html += '<td>';
        html += `<button class="btn btn-sm btn-outline-info me-1" onclick='maasDetay(${JSON.stringify(m)})'>
                    <i class="fas fa-info-circle"></i>
                 </button>`;
        if (durum === 'beklemede' && m.cari_id) {
            html += `<a href="/cari_yonetimi" class="btn btn-sm btn-primary me-1">
                        <i class="fas fa-credit-card"></i>
                     </a>`;
        }
        html += `<button class="btn btn-sm btn-danger" onclick="maasSil(${m.id}, '${m.ad} ${m.soyad}', '${getAyAdi(m.donem_ay)} ${m.donem_yil}')">
                    <i class="fas fa-trash"></i>
                 </button>`;
        html += '</td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    // Hem toplam kutusu hem tabloyu ekle
    container.innerHTML = toplamHTML + html;
}


function loadCariTurleri() {
    fetch("/api/cari/liste")
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let turler = new Set();
                let altTurler = new Set();

                data.data.forEach(cari => {
                    if (cari.cari_turu) turler.add(cari.cari_turu);
                    if (cari.alt_turu) altTurler.add(cari.alt_turu);
                });

                // Cari Türü select doldur
                const turSelect = document.getElementById("filterCariTuru");
                turSelect.innerHTML = `<option value="">Tüm Türler</option>`;
                turler.forEach(tur => {
                    turSelect.innerHTML += `<option value="${tur}">${tur}</option>`;
                });

                // Alt Tür select doldur
                const altTurSelect = document.getElementById("filterAltTuru");
                altTurSelect.innerHTML = `<option value="">Tüm Alt Türler</option>`;
                altTurler.forEach(alt => {
                    altTurSelect.innerHTML += `<option value="${alt}">${alt}</option>`;
                });
            }
        })
        .catch(err => console.error("Cari türleri yükleme hatası:", err));
}

function getAyAdi(ay) {
    const aylar = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return aylar[ay] || ay;
}


console.log('Cari Yönetimi JS tamamen yüklendi');