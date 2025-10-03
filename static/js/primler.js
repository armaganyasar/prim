// primler.js - GÜNCELLENMIŞ: Net Ciro ve Hak Ediş Eklemeleri ile
console.log('Primler.js yüklendi - Net Ciro ve Hak Ediş Desteği Aktif');

// Global değişkenler
let tahsilatVerileri = [];
let laboratuvarGiderleri = [];
let implantGiderleri = [];
let digerGiderler = [];
let netCiroEklemeleri = []; // YENİ
let hakedisEklemeleri = []; // YENİ
let hekimBilgisi = {};
let currentEditIndex = -1;
let selectedCariId = null;
let cariListesi = [];

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    setupEventListeners();
    loadCariler();
    
    // Tarih filtrelerini mevcut aya ayarla
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0);
    const lastDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    const baslangicInput = document.getElementById('baslangicTarihi');
    const bitisInput = document.getElementById('bitisTarihi');
    
    if (baslangicInput) baslangicInput.value = firstDayString;
    if (bitisInput) bitisInput.value = lastDayString;
    
    setupPrimAyarlariModalListeners();
}

function setupEventListeners() {
    const subeSelect = document.getElementById('subeSelect');
    if (subeSelect) {
        subeSelect.addEventListener('change', function() {
            if (this.value) {
                loadDoctors(this.value);
            } else {
                clearDoctorSelect();
            }
        });
    }
    
    const dokterSelect = document.getElementById('dokterSelect');
    if (dokterSelect) {
        dokterSelect.addEventListener('change', function() {
            if (this.value) {
                loadHekimInfo(this.value);
                showHekimInfo();
                
                const subeId = document.getElementById('subeSelect').value;
                if (subeId) {
                    cariBulHekimSube(this.value, subeId);
                }
            }
        });
    }
    
    const hekimForm = document.getElementById('hekimSecimForm');
    if (hekimForm) {
        hekimForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loadTahsilatData();
        });
    }
    
    const hizliOdemeForm = document.getElementById('hizliOdemeForm');
    if (hizliOdemeForm) {
        hizliOdemeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveHizliOdeme();
        });
    }
}

function setupPrimAyarlariModalListeners() {
    const kdvOnaylaBtn = document.getElementById('kdvOnaylaBtn');
    if (kdvOnaylaBtn) kdvOnaylaBtn.addEventListener('click', kdvDurumKaydet);
    
    const taksitOnaylaBtn = document.getElementById('taksitOnaylaBtn');
    if (taksitOnaylaBtn) taksitOnaylaBtn.addEventListener('click', taksitAyarlarKaydet);
    
    const taksitSayisi = document.getElementById('taksitSayisi');
    if (taksitSayisi) taksitSayisi.addEventListener('change', updateTaksitBilgi);
    
    const ayarlariKaydetBtn = document.getElementById('ayarlariKaydetBtn');
    if (ayarlariKaydetBtn) ayarlariKaydetBtn.addEventListener('click', primAyarlariKaydet);
    
    const yeniTaksitBtn = document.getElementById('yeniTaksitBtn');
    if (yeniTaksitBtn) yeniTaksitBtn.addEventListener('click', yeniTaksitEkle);
    
    const yeniKategoriBtn = document.getElementById('yeniKategoriBtn');
    if (yeniKategoriBtn) yeniKategoriBtn.addEventListener('click', yeniKategoriEkle);
}

// CARİ FONKSİYONLARI
function loadCariler() {
    fetch('/api/cari/liste')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                cariListesi = data.data || [];
                console.log('Cariler yüklendi:', cariListesi.length, 'adet');
            }
        })
        .catch(error => {
            console.error('Cari listesi yükleme hatası:', error);
        });
}

function cariBulHekimSube(doktorId, subeId) {
    fetch('/api/cari/hekim_bul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doktor_id: doktorId, sube_id: subeId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.cari) {
            selectedCariId = data.cari.id;
            showCariInfo(data.cari, true);
        } else {
            selectedCariId = null;
            showCariInfo(null, false);
        }
    })
    .catch(error => {
        console.error('Cari bulma hatası:', error);
        showCariInfo(null, false);
    });
}

function showCariInfo(cari, otomatikBulundu) {
    const cariInfoCard = document.getElementById('cariInfoCard');
    const cariInfoContent = document.getElementById('cariInfoContent');
    
    if (!cariInfoCard || !cariInfoContent) return;
    
    const cariAdi = cari ? cari.cari_adi : 'Tanımlı Değil';
    
    if (cari && otomatikBulundu) {
        cariInfoContent.innerHTML = `
            <div class="alert alert-success mb-0">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-check-circle"></i>
                        <strong>Cari Bulundu:</strong> ${cari.cari_adi}
                        <br><small class="text-muted">Cari Kodu: ${cari.cari_kodu}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="showCariSelectModal()">
                        <i class="fas fa-edit"></i> Değiştir
                    </button>
                </div>
            </div>
        `;
        cariInfoCard.style.display = 'block';
    } else {
        cariInfoContent.innerHTML = `
            <div class="alert alert-${cari ? 'info' : 'warning'} mb-0">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="fas fa-${cari ? 'info' : 'exclamation-triangle'}"></i>
                        <strong>Cari Seçim:</strong> ${cariAdi}
                        <br><small>${cari ? `Cari Kodu: ${cari.cari_kodu}` : 'Lütfen manuel seçin'}</small>
                    </div>
                    <button class="btn btn-sm btn-${cari ? 'outline-primary' : 'warning'}" onclick="showCariSelectModal()">
                        <i class="fas fa-${cari ? 'edit' : 'plus'}"></i> ${cari ? 'Değiştir' : 'Cari Seç'}
                    </button>
                </div>
            </div>
        `;
        cariInfoCard.style.display = 'block';
        selectedCariId = cari ? cari.id : null;
    }
}

function showCariSelectModal() {
    if (cariListesi.length === 0) {
        showAlert('Henüz cari hesap tanımlanmamış. Önce Cari Yönetimi sayfasından cari oluşturun.', 'warning');
        return;
    }
    
    const modalHTML = `
        <div class="modal fade" id="cariSelectModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Cari Hesap Seç</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Cari Hesap</label>
                            <select class="form-select" id="cariSelectDropdown">
                                <option value="">Seçiniz...</option>
                                ${cariListesi.map(c => `
                                    <option value="${c.id}" ${c.id === selectedCariId ? 'selected' : ''}>
                                        ${c.cari_adi} (${c.cari_kodu})
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="cariEslestirCheckbox" checked>
                            <label class="form-check-label" for="cariEslestirCheckbox">
                                Bu eşleştirmeyi kaydet (bir sonraki seferde otomatik bulsun)
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="cariSecimOnayla()">Onayla</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const oldModal = document.getElementById('cariSelectModal');
    if (oldModal) oldModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = new bootstrap.Modal(document.getElementById('cariSelectModal'));
    modal.show();
}

function cariSecimOnayla() {
    const selectedValue = document.getElementById('cariSelectDropdown').value;
    
    if (!selectedValue) {
        showAlert('Lütfen bir cari hesap seçin', 'warning');
        return;
    }
    
    selectedCariId = parseInt(selectedValue);
    const selectedCari = cariListesi.find(c => c.id === selectedCariId);
    
    if (selectedCari) {
        showCariInfo(selectedCari, false);
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('cariSelectModal'));
    modal.hide();
    
    showAlert('Cari hesap seçildi', 'success');
}

// HEKİM FONKSİYONLARI
function loadDoctors(subeId) {
    fetch('/api/doctors?sube_id=' + subeId)
        .then(response => response.json())
        .then(data => {
            populateDoctorSelect(data);
        })
        .catch(error => {
            console.error('Hekim yükleme hatası:', error);
            showAlert('Hekim listesi yüklenemedi: ' + error.message, 'danger');
        });
}

function populateDoctorSelect(doctors) {
    const dokterSelect = document.getElementById('dokterSelect');
    if (!dokterSelect) return;
    
    dokterSelect.innerHTML = '<option value="">Hekim seçiniz...</option>';
    
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id || doctor.CARI_ID;
        option.textContent = doctor.name || doctor.HEKIM_ADI;
        option.dataset.primyuzde = doctor.PRIMYUZDE || 0;
        dokterSelect.appendChild(option);
    });
    
    dokterSelect.disabled = false;
}

function clearDoctorSelect() {
    const dokterSelect = document.getElementById('dokterSelect');
    if (dokterSelect) {
        dokterSelect.innerHTML = '<option value="">Önce şube seçiniz...</option>';
        dokterSelect.disabled = true;
    }
    
    const primOraniInput = document.getElementById('primOraniInput');
    if (primOraniInput) primOraniInput.value = '';
    
    hideHekimInfo();
    hideCariInfo();
}

function loadHekimInfo(hekimId) {
    const dokterSelect = document.getElementById('dokterSelect');
    const selectedOption = dokterSelect.selectedOptions[0];
    
    if (selectedOption) {
        hekimBilgisi = {
            id: hekimId,
            name: selectedOption.textContent,
            primyuzde: selectedOption.dataset.primyuzde || 0
        };
        
        const primOraniInput = document.getElementById('primOraniInput');
        if (primOraniInput) primOraniInput.value = hekimBilgisi.primyuzde;
    }
}

function showHekimInfo() {
    const hekimBilgiCard = document.getElementById('hekimBilgiCard');
    const hekimBilgileri = document.getElementById('hekimBilgileri');
    
    if (hekimBilgiCard && hekimBilgileri && hekimBilgisi.name) {
        const subeSelect = document.getElementById('subeSelect');
        const subeAdi = subeSelect.selectedOptions[0]?.textContent || 'Bilinmeyen';
        
        hekimBilgileri.innerHTML = `
            <div class="row">
                <div class="col-12">
                    <h6 class="text-primary">${hekimBilgisi.name}</h6>
                    <p class="mb-1"><small class="text-muted">Şube:</small> ${subeAdi}</p>
                    <p class="mb-1"><small class="text-muted">Prim Oranı:</small> 
                        <span class="badge bg-success">%${hekimBilgisi.primyuzde}</span>
                    </p>
                </div>
            </div>
        `;
        
        hekimBilgiCard.style.display = 'block';
    }
}

function hideHekimInfo() {
    const hekimBilgiCard = document.getElementById('hekimBilgiCard');
    if (hekimBilgiCard) hekimBilgiCard.style.display = 'none';
}

function hideCariInfo() {
    const cariInfoCard = document.getElementById('cariInfoCard');
    if (cariInfoCard) cariInfoCard.style.display = 'none';
    selectedCariId = null;
}

// TAHSİLAT FONKSİYONLARI
function loadTahsilatData() {
    const dokterSelectElement = document.getElementById('dokterSelect');
    const baslangicElement = document.getElementById('baslangicTarihi');
    const bitisElement = document.getElementById('bitisTarihi');
    
    if (!dokterSelectElement || !baslangicElement || !bitisElement) {
        showAlert('Form elementleri bulunamadı!', 'danger');
        return;
    }
    
    const hekimId = dokterSelectElement.value;
    const baslangic = baslangicElement.value;
    const bitis = bitisElement.value;
    
    if (!hekimId) {
        showAlert('Lütfen hekim seçin', 'warning');
        return;
    }
    
    if (!baslangic || !bitis) {
        showAlert('Lütfen tarih aralığı seçin', 'warning');
        return;
    }
    
    if (new Date(baslangic) > new Date(bitis)) {
        showAlert('Başlangıç tarihi bitiş tarihinden sonra olamaz!', 'warning');
        return;
    }
    
    checkExistingPrim(hekimId, baslangic, bitis)
        .then(canProceed => {
            if (canProceed) {
                proceedWithTahsilatLoading(hekimId, baslangic, bitis);
            }
        })
        .catch(error => {
            console.error('Prim kontrol hatası:', error);
            showAlert('Prim kontrolü sırasında hata oluştu: ' + error.message, 'danger');
        });
}

function checkExistingPrim(hekimId, baslangicTarihi, bitisTarihi) {
    return new Promise((resolve, reject) => {
        fetch('/api/prim/check_existing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doktor_id: hekimId,
                baslangic_tarihi: baslangicTarihi,
                bitis_tarihi: bitisTarihi
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.exists && data.conflicting_prims && data.conflicting_prims.length > 0) {
                showConflictingPrimAlert(data.conflicting_prims, hekimId, baslangicTarihi, bitisTarihi);
                resolve(false);
            } else {
                resolve(true);
            }
        })
        .catch(error => reject(error));
    });
}

function showConflictingPrimAlert(conflictingPrims, hekimId, baslangic, bitis) {
    const hekimAdi = document.getElementById('dokterSelect').selectedOptions[0]?.textContent || 'Seçilen Hekim';
    
    let alertMessage = `⚠️ DİKKAT: ${hekimAdi} için çakışan prim hesaplaması bulundu!\n\n`;
    alertMessage += `Girilen tarih aralığı: ${formatDateTurkish(baslangic)} - ${formatDateTurkish(bitis)}\n\n`;
    alertMessage += `Mevcut prim hesaplamaları:\n`;
    
    conflictingPrims.forEach((prim, index) => {
        alertMessage += `${index + 1}. ${formatDateTurkish(prim.donem_baslangic)} - ${formatDateTurkish(prim.donem_bitis)} `;
        alertMessage += `(${formatCurrencyTurkish(prim.hesaplanan_prim)})\n`;
    });
    
    alertMessage += `\n💡 Öneriler:\n`;
    alertMessage += `• Farklı bir tarih aralığı seçin\n`;
    alertMessage += `• Mevcut primi silin ve yenisini hesaplayın\n`;
    alertMessage += `• Prim listesi sayfasından mevcut primleri kontrol edin`;
    
    const userChoice = confirm(alertMessage + '\n\nYine de devam etmek istiyor musunuz?\n(Önerilmez - Muhasebe karışıklığına neden olabilir)');
    
    if (userChoice) {
        proceedWithTahsilatLoading(hekimId, baslangic, bitis);
    } else {
        showAlert('İşlem iptal edildi. Lütfen farklı bir tarih aralığı seçin.', 'warning');
    }
}

function proceedWithTahsilatLoading(hekimId, baslangic, bitis) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    fetch('/api/prim/tahsilat_getir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            doktor_id: hekimId,
            baslangic_tarihi: baslangic,
            bitis_tarihi: bitis
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            tahsilatVerileri = data.data || [];
            
            tahsilatVerileri.forEach((item, index) => {
                item.index = index;
                item.kdv_durumu = getDefaultKdvDurumu(item.ODEME_SEKLI);
                item.taksit_sayisi = getDefaultTaksitSayisi(item.ODEME_SEKLI);
                item.kesinti_orani = getDefaultKesinti(item.ODEME_SEKLI, item.taksit_sayisi);
                item.fatura_kesildi = item.kdv_durumu.fatura_var;
            });
            
            displayTahsilatData();
            showTahsilatPanel();
        } else {
            showAlert('Hata: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .catch(error => {
        console.error('Tahsilat API hatası:', error);
        showAlert('Tahsilat verileri yüklenirken hata: ' + error.message, 'danger');
    })
    .finally(() => {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    });
}

function getDefaultKdvDurumu(odemeSekli) {
    const odeme = odemeSekli.toLowerCase();
    
    if (odeme.includes('nakit') || odeme.includes('çek') || odeme.includes('senet')) {
        return { fatura_var: false, kdv_orani: 0, aciklama: 'Fatura kesilmedi' };
    } else {
        return { fatura_var: true, kdv_orani: 10, aciklama: 'Fatura kesildi - %10 KDV' };
    }
}

function getDefaultTaksitSayisi(odemeSekli) {
    return 1;
}

function getDefaultKesinti(odemeSekli, taksitSayisi) {
    const odeme = odemeSekli.toLowerCase();
    
    if (odeme.includes('nakit')) return 0;
    if (odeme.includes('çek') || odeme.includes('senet')) return 0;
    
    const posKesinti = parseFloat(document.querySelector(`#taksitSayisi option[value="${taksitSayisi}"]`)?.dataset.oran) || 12;
    
    if (odeme.includes('pos') || odeme.includes('kredi')) {
        return posKesinti;
    }
    if (odeme.includes('banka') || odeme.includes('havale')) {
        return 10.0; 
    }
    
    return 0;
}

function displayTahsilatData() {
    const tahsilatListesi = document.getElementById('tahsilatListesi');
    if (!tahsilatListesi) return;
    
    if (tahsilatVerileri.length === 0) {
        tahsilatListesi.innerHTML = '<p class="text-muted">Bu kriterlere uygun tahsilat bulunamadı.</p>';
        return;
    }
    
    let html = '<div class="table-responsive">';
    html += '<table class="table table-sm table-hover">';
    html += '<thead><tr>';
    html += '<th>Tarih</th><th>Hasta</th><th>Ödeme Şekli</th><th class="text-end">Tutar</th>';
    html += '<th>KDV</th><th>Taksit/Kesinti</th><th class="text-center">İşlemler</th>';
    html += '</tr></thead><tbody>';
    
    tahsilatVerileri.forEach((item, index) => {
        const kdvBadge = item.kdv_durumu.fatura_var 
            ? `<span class="badge bg-warning">%${item.kdv_durumu.kdv_orani} KDV</span>`
            : `<span class="badge bg-secondary">Fatura Yok</span>`;
            
        const taksitBadge = item.taksit_sayisi > 1 
            ? `<span class="badge bg-info">${item.taksit_sayisi} Taksit</span>`
            : `<span class="badge bg-success">Peşin</span>`;
            
        const kesintiBadge = item.kesinti_orani > 0 
            ? `<span class="badge bg-danger">%${item.kesinti_orani}</span>`
            : `<span class="badge bg-success">Kesinti Yok</span>`;
        
        html += '<tr>';
        html += '<td>' + formatDateTurkish(item.TARIH) + '</td>';
        html += '<td>' + (item.HASTA_ADI || 'Bilinmeyen') + '</td>';
        html += '<td>' + (item.ODEME_SEKLI || 'Belirtilmemiş') + '</td>';
        html += '<td class="text-end"><strong>' + formatCurrencyTurkish(item.TUTAR) + '</strong></td>';
        html += '<td>' + kdvBadge + '</td>';
        html += '<td>' + taksitBadge + ' ' + kesintiBadge + '</td>';
        html += '<td class="text-center">';
        html += '<button class="btn btn-sm btn-outline-warning me-1" onclick="editKdvDurumu(' + index + ')" title="KDV Durumu Düzenle">';
        html += '<i class="fas fa-receipt"></i></button>';
        
        if (item.ODEME_SEKLI && (item.ODEME_SEKLI.toLowerCase().includes('pos') || item.ODEME_SEKLI.toLowerCase().includes('kredi'))) {
            html += '<button class="btn btn-sm btn-outline-info" onclick="editTaksitAyarlari(' + index + ')" title="Taksit Ayarları">';
            html += '<i class="fas fa-credit-card"></i></button>';
        }
        html += '</td></tr>';
    });
    
    html += '</tbody></table></div>';
    
    const toplamBrut = tahsilatVerileri.reduce((sum, item) => sum + (parseFloat(item.TUTAR) || 0), 0);
    const toplamKesinti = tahsilatVerileri.reduce((sum, item) => {
        const tutar = parseFloat(item.TUTAR) || 0;
        const kesinti = tutar * (item.kesinti_orani / 100); 
        return sum + kesinti;
    }, 0);
    const toplamNet = toplamBrut - toplamKesinti;
    
    html += '<div class="alert alert-info mt-3"><div class="row">';
    html += '<div class="col-md-3"><strong>Toplam Brüt:</strong> ' + formatCurrencyTurkish(toplamBrut) + '</div>';
    html += '<div class="col-md-3"><strong>Toplam Kesinti:</strong> ' + formatCurrencyTurkish(toplamKesinti) + '</div>';
    html += '<div class="col-md-3"><strong>Net Tahsilat:</strong> ' + formatCurrencyTurkish(toplamNet) + '</div>';
    html += '<div class="col-md-3"><strong>İşlem Sayısı:</strong> ' + tahsilatVerileri.length + '</div>';
    html += '</div></div>';
    
    tahsilatListesi.innerHTML = html;
    
    const tahsilatOnaylaBtn = document.getElementById('tahsilatOnaylaBtn');
    if (tahsilatOnaylaBtn) {
        tahsilatOnaylaBtn.disabled = false;
        tahsilatOnaylaBtn.onclick = showGiderPanel;
    }
}

function editKdvDurumu(index) {
    currentEditIndex = index;
    const item = tahsilatVerileri[index];
    
    document.getElementById('kdvModalHastaAdi').textContent = item.HASTA_ADI || 'Bilinmeyen';
    document.getElementById('kdvModalTutar').textContent = item.TUTAR || '0';
    document.getElementById('kdvModalOdemeSekli').textContent = item.ODEME_SEKLI || 'Belirtilmemiş';
    
    if (item.kdv_durumu.fatura_var) {
        document.getElementById('faturaEvet').checked = true;
    } else {
        document.getElementById('faturaHayir').checked = true;
    }
    
    const kdvModal = new bootstrap.Modal(document.getElementById('kdvModal'));
    kdvModal.show();
}

function kdvDurumKaydet() {
    if (currentEditIndex >= 0 && currentEditIndex < tahsilatVerileri.length) {
        const faturaKesildi = document.getElementById('faturaEvet').checked;
        
        tahsilatVerileri[currentEditIndex].kdv_durumu = {
            fatura_var: faturaKesildi,
            kdv_orani: faturaKesildi ? 10 : 0,
            aciklama: faturaKesildi ? 'Fatura kesildi - %10 KDV' : 'Fatura kesilmedi'
        };
        
        tahsilatVerileri[currentEditIndex].fatura_kesildi = faturaKesildi;
        
        tahsilatVerileri[currentEditIndex].kesinti_orani = getDefaultKesinti(
            tahsilatVerileri[currentEditIndex].ODEME_SEKLI, 
            tahsilatVerileri[currentEditIndex].taksit_sayisi
        );
        
        displayTahsilatData();
        
        const kdvModal = bootstrap.Modal.getInstance(document.getElementById('kdvModal'));
        kdvModal.hide();
        
        showAlert('KDV durumu güncellendi', 'success');
    }
}

function editTaksitAyarlari(index) {
    currentEditIndex = index;
    const item = tahsilatVerileri[index];
    
    document.getElementById('taksitModalHastaAdi').textContent= item.HASTA_ADI || 'Bilinmeyen';
    document.getElementById('taksitModalTutar').textContent = item.TUTAR || '0';
    
    const taksitSayisi = document.getElementById('taksitSayisi');
    if (taksitSayisi) {
        taksitSayisi.value = item.taksit_sayisi || 1;
        updateTaksitBilgi();
    }
    
    const taksitModal = new bootstrap.Modal(document.getElementById('taksitModal'));
    taksitModal.show();
}

function updateTaksitBilgi() {
    const taksitSayisi = document.getElementById('taksitSayisi');
    const taksitBilgi = document.getElementById('taksitBilgi');
    
    if (taksitSayisi && taksitBilgi) {
        const sayisi = parseInt(taksitSayisi.value);
        const selectedOption = taksitSayisi.selectedOptions[0];
        const kesinti = parseFloat(selectedOption ? selectedOption.dataset.oran : 0);
        
        let bilgiText = '';
        if (sayisi === 1) {
            bilgiText = `<strong>Peşin Ödeme:</strong> %${kesinti} toplam kesinti`;
        } else {
            bilgiText = `<strong>${sayisi} Taksit:</strong> %${kesinti} toplam kesinti`;
        }
        
        taksitBilgi.innerHTML = bilgiText;
    }
}

function taksitAyarlarKaydet() {
    if (currentEditIndex >= 0 && currentEditIndex < tahsilatVerileri.length) {
        const taksitSayisi = parseInt(document.getElementById('taksitSayisi').value);
        const selectedOption = document.getElementById('taksitSayisi').selectedOptions[0];
        const kesinti = parseFloat(selectedOption ? selectedOption.dataset.oran : 12);
        
        tahsilatVerileri[currentEditIndex].taksit_sayisi = taksitSayisi;
        tahsilatVerileri[currentEditIndex].kesinti_orani = kesinti;
        
        displayTahsilatData();
        
        const taksitModal = bootstrap.Modal.getInstance(document.getElementById('taksitModal'));
        taksitModal.hide();
        
        showAlert('Taksit ayarları güncellendi', 'success');
    }
}

function showTahsilatPanel() {
    const tahsilatPanel = document.getElementById('tahsilat-panel');
    const step2 = document.getElementById('step2');
    
    if (tahsilatPanel) tahsilatPanel.style.display = 'block';
    if (step2) step2.classList.add('active');
}

function showGiderPanel() {
    const giderPanel = document.getElementById('gider-panel');
    const step4 = document.getElementById('step4');
    
    if (giderPanel) giderPanel.style.display = 'block';
    if (step4) step4.classList.add('active');
    
    const giderOnaylaBtn = document.getElementById('giderOnaylaBtn');
    if (giderOnaylaBtn) {
        giderOnaylaBtn.onclick = hesaplaPrimler;
    }
}

// GİDER FONKSİYONLARI
function laboratuvarGiderEkle() {
    const tarih = document.getElementById('labTarih').value;
    const hastaAdi = document.getElementById('labHastaAdi').value.trim();
    const islem = document.getElementById('labIslem').value.trim();
    const tutar = parseFloat(document.getElementById('labTutar').value);
    
    if (!tarih || !hastaAdi || !islem || !tutar || tutar <= 0) {
        showAlert('Tüm alanları doldurun', 'warning');
        return;
    }
    
    const gider = {
        id: Date.now(),
        tarih: tarih,
        hasta_adi: hastaAdi,
        islem: islem,
        tutar: tutar
    };
    
    laboratuvarGiderleri.push(gider);
    displayLaboratuvarGiderleri();
    updateGiderOzeti();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('laboratuvarModal'));
    modal.hide();
    
    document.getElementById('laboratuvarForm').reset();
    document.getElementById('laboratuvarBulkInput').value = '';
    
    showAlert('Laboratuvar gideri başarıyla eklendi', 'success');
}

function parseLaboratuvarBulk() {
    const bulkInput = document.getElementById('laboratuvarBulkInput').value;
    if (!bulkInput.trim()) {
        showAlert('Lütfen veri yapıştırın', 'warning');
        return;
    }
    
    const lines = bulkInput.trim().split('\n');
    let addedCount = 0;
    
    lines.forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 4) {
            const tarih = parts[0].trim();
            const hastaAdi = parts[1].trim();
            const islem = parts[2].trim();
            const tutar = parseFloat(parts[3].trim());
            
            if (tarih && hastaAdi && islem && tutar > 0) {
                laboratuvarGiderleri.push({
                    id: Date.now() + addedCount,
                    tarih: tarih,
                    hasta_adi: hastaAdi,
                    islem: islem,
                    tutar: tutar
                });
                addedCount++;
            }
        }
    });
    
    if (addedCount > 0) {
        displayLaboratuvarGiderleri();
        updateGiderOzeti();
        document.getElementById('laboratuvarBulkInput').value = '';
        showAlert(`${addedCount} laboratuvar gideri eklendi`, 'success');
    } else {
        showAlert('Geçerli veri bulunamadı', 'warning');
    }
}

function displayLaboratuvarGiderleri() {
    const container = document.getElementById('laboratuvarListesi');
    if (!container) return;
    
    if (laboratuvarGiderleri.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">Henüz laboratuvar gideri eklenmedi.</p>';
        return;
    }
    
    let html = '<div class="table-responsive">';
    html += '<table class="table table-sm table-hover">';
    html += '<thead><tr><th>Tarih</th><th>Hasta</th><th>İşlem</th><th class="text-end">Tutar</th><th></th></tr></thead>';
    html += '<tbody>';
    
    laboratuvarGiderleri.forEach((gider, index) => {
        html += '<tr class="gider-row gider-row-lab">';
        html += '<td>' + formatDateTurkish(gider.tarih) + '</td>';
        html += '<td>' + gider.hasta_adi + '</td>';
        html += '<td>' + gider.islem + '</td>';
        html += '<td class="text-end fw-bold text-info">' + formatCurrencyTurkish(gider.tutar) + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-danger" onclick="laboratuvarGiderSil(' + index + ')">';
        html += '<i class="fas fa-trash"></i></button></td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function laboratuvarGiderSil(index) {
    if (confirm('Bu laboratuvar giderini silmek istediğinizden emin misiniz?')) {
        laboratuvarGiderleri.splice(index, 1);
        displayLaboratuvarGiderleri();
        updateGiderOzeti();
        showAlert('Laboratuvar gideri silindi', 'info');
    }
}

function implantGiderEkle() {
    const tarih = document.getElementById('impTarih').value;
    const hastaAdi = document.getElementById('impHastaAdi').value.trim();
    const marka = document.getElementById('impMarka').value.trim();
    const boy = document.getElementById('impBoy').value.trim();
    const cap = document.getElementById('impCap').value.trim();
    const birim = document.getElementById('impBirim').value.trim();
    const adet = parseInt(document.getElementById('impAdet').value);
    const tutar = parseFloat(document.getElementById('impTutar').value);
    
    if (!tarih || !hastaAdi || !marka || !boy || !cap || !birim || !adet || !tutar || adet <= 0 || tutar <= 0) {
        showAlert('Tüm alanları doldurun', 'warning');
        return;
    }
    
    const gider = {
        id: Date.now(),
        tarih: tarih,
        hasta_adi: hastaAdi,
        implant_markasi: marka,
        boy: boy,
        cap: cap,
        birim: birim,
        adet: adet,
        tutar: tutar
    };
    
    implantGiderleri.push(gider);
    displayImplantGiderleri();
    updateGiderOzeti();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('implantModal'));
    modal.hide();
    
    document.getElementById('implantForm').reset();
    document.getElementById('implantBulkInput').value = '';
    
    showAlert('İmplant gideri başarıyla eklendi', 'success');
}

function parseImplantBulk() {
    const bulkInput = document.getElementById('implantBulkInput').value;
    if (!bulkInput.trim()) {
        showAlert('Lütfen veri yapıştırın', 'warning');
        return;
    }
    
    const lines = bulkInput.trim().split('\n');
    let addedCount = 0;
    
    lines.forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 8) {
            const tarih = parts[0].trim();
            const hastaAdi = parts[1].trim();
            const marka = parts[2].trim();
            const boy = parts[3].trim();
            const cap = parts[4].trim();
            const birim = parts[5].trim();
            const adet = parseInt(parts[6].trim());
            const tutar = parseFloat(parts[7].trim());
            
            if (tarih && hastaAdi && marka && boy && cap && birim && adet > 0 && tutar > 0) {
                implantGiderleri.push({
                    id: Date.now() + addedCount,
                    tarih: tarih,
                    hasta_adi: hastaAdi,
                    implant_markasi: marka,
                    boy: boy,
                    cap: cap,
                    birim: birim,
                    adet: adet,
                    tutar: tutar
                });
                addedCount++;
            }
        }
    });
    
    if (addedCount > 0) {
        displayImplantGiderleri();
        updateGiderOzeti();
        document.getElementById('implantBulkInput').value = '';
        showAlert(`${addedCount} implant gideri eklendi`, 'success');
    } else {
        showAlert('Geçerli veri bulunamadı', 'warning');
    }
}

function displayImplantGiderleri() {
    const container = document.getElementById('implantListesi');
    if (!container) return;
    
    if (implantGiderleri.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">Henüz implant gideri eklenmedi.</p>';
        return;
    }
    
    let html = '<div class="table-responsive">';
    html += '<table class="table table-sm table-hover">';
    html += '<thead><tr><th>Tarih</th><th>Hasta</th><th>Marka</th><th>Boy</th><th>Çap</th><th>Adet</th><th class="text-end">Tutar</th><th></th></tr></thead>';
    html += '<tbody>';
    
    implantGiderleri.forEach((gider, index) => {
        html += '<tr class="gider-row gider-row-implant">';
        html += '<td>' + formatDateTurkish(gider.tarih) + '</td>';
        html += '<td>' + gider.hasta_adi + '</td>';
        html += '<td>' + gider.implant_markasi + '</td>';
        html += '<td>' + gider.boy + '</td>';
        html += '<td>' + gider.cap + '</td>';
        html += '<td>' + gider.adet + ' ' + gider.birim + '</td>';
        html += '<td class="text-end fw-bold text-warning">' + formatCurrencyTurkish(gider.tutar) + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-danger" onclick="implantGiderSil(' + index + ')">';
        html += '<i class="fas fa-trash"></i></button></td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function implantGiderSil(index) {
    if (confirm('Bu implant giderini silmek istediğinizden emin misiniz?')) {
        implantGiderleri.splice(index, 1);
        displayImplantGiderleri();
        updateGiderOzeti();
        showAlert('İmplant gideri silindi', 'info');
    }
}

function digerGiderEkle() {
    const hastaAdi = document.getElementById('digerHastaAdi').value.trim();
    const kategori = document.getElementById('digerKategorisi').value;
    const tutar = parseFloat(document.getElementById('digerTutar').value);
    const aciklama = document.getElementById('digerAciklama').value.trim();
    
    if (!hastaAdi || !kategori || !tutar || tutar <= 0) {
        showAlert('Hasta adı, kategori ve tutar alanları gereklidir', 'warning');
        return;
    }
    
    const gider = {
        id: Date.now(),
        hasta_adi: hastaAdi,
        kategori: kategori,
        tutar: tutar,
        aciklama: aciklama
    };
    
    digerGiderler.push(gider);
    displayDigerGiderler();
    updateGiderOzeti();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('digerGiderModal'));
    modal.hide();
    
    document.getElementById('digerGiderForm').reset();
    
    showAlert('Diğer gider başarıyla eklendi', 'success');
}

function displayDigerGiderler() {
    const container = document.getElementById('digerGiderListesi');
    if (!container) return;
    
    if (digerGiderler.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">Henüz diğer gider eklenmedi.</p>';
        return;
    }
    
    let html = '<div class="table-responsive">';
    html += '<table class="table table-sm table-hover">';
    html += '<thead><tr><th>Hasta</th><th>Kategori</th><th class="text-end">Tutar</th><th>Açıklama</th><th></th></tr></thead>';
    html += '<tbody>';
    
    digerGiderler.forEach((gider, index) => {
        html += '<tr class="gider-row gider-row-diger">';
        html += '<td>' + gider.hasta_adi + '</td>';
        html += '<td><span class="badge bg-secondary">' + gider.kategori + '</span></td>';
        html += '<td class="text-end fw-bold text-success">' + formatCurrencyTurkish(gider.tutar) + '</td>';
        html += '<td>' + (gider.aciklama || '-') + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-danger" onclick="digerGiderSil(' + index + ')">';
        html += '<i class="fas fa-trash"></i></button></td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function digerGiderSil(index) {
    if (confirm('Bu gideri silmek istediğinizden emin misiniz?')) {
        digerGiderler.splice(index, 1);
        displayDigerGiderler();
        updateGiderOzeti();
        showAlert('Gider silindi', 'info');
    }
}

// YENİ: NET CİRO EKLEMELERİ FONKSİYONLARI
function netCiroEkle() {
    const tarih = document.getElementById('netCiroTarih').value;
    const hastaAdi = document.getElementById('netCiroHastaAdi').value.trim();
    const kategori = document.getElementById('netCiroKategori').value;
    const aciklama = document.getElementById('netCiroAciklama').value.trim();
    const tutar = parseFloat(document.getElementById('netCiroTutar').value);
    
    if (!tarih || !kategori || !aciklama || !tutar || tutar <= 0) {
        showAlert('Tarih, kategori, açıklama ve tutar alanları gereklidir', 'warning');
        return;
    }
    
    const ekleme = {
        id: Date.now(),
        tarih: tarih,
        hasta_adi: hastaAdi || '-',
        kategori: kategori,
        aciklama: aciklama,
        tutar: tutar
    };
    
    netCiroEklemeleri.push(ekleme);
    displayNetCiroEklemeleri();
    updateGiderOzeti();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('netCiroModal'));
    modal.hide();
    
    document.getElementById('netCiroForm').reset();
    
    showAlert('Net ciro eklemesi başarıyla yapıldı', 'success');
}

function displayNetCiroEklemeleri() {
    const container = document.getElementById('netCiroListesi');
    if (!container) return;
    
    if (netCiroEklemeleri.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">Henüz net ciro eklemesi yapılmadı.</p>';
        return;
    }
    
    let html = '<div class="table-responsive">';
    html += '<table class="table table-sm table-hover">';
    html += '<thead><tr><th>Tarih</th><th>Hasta</th><th>Kategori</th><th>Açıklama</th><th class="text-end">Tutar</th><th></th></tr></thead>';
    html += '<tbody>';
    
    netCiroEklemeleri.forEach((ekleme, index) => {
        html += '<tr class="gider-row gider-row-netciro">';
        html += '<td>' + formatDateTurkish(ekleme.tarih) + '</td>';
        html += '<td>' + ekleme.hasta_adi + '</td>';
        html += '<td><span class="badge bg-success">' + getKategoriAdi(ekleme.kategori) + '</span></td>';
        html += '<td>' + ekleme.aciklama + '</td>';
        html += '<td class="text-end fw-bold text-success">+' + formatCurrencyTurkish(ekleme.tutar) + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-danger" onclick="netCiroSil(' + index + ')">';
        html += '<i class="fas fa-trash"></i></button></td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function netCiroSil(index) {
    if (confirm('Bu net ciro eklemesini silmek istediğinizden emin misiniz?')) {
        netCiroEklemeleri.splice(index, 1);
        displayNetCiroEklemeleri();
        updateGiderOzeti();
        showAlert('Net ciro eklemesi silindi', 'info');
    }
}

// YENİ: HAK EDİŞ EKLEMELERİ FONKSİYONLARI
function hakedisEkle() {
    const tarih = document.getElementById('hakedisTarih').value;
    const kategori = document.getElementById('hakedisKategori').value;
    const aciklama = document.getElementById('hakedisAciklama').value.trim();
    const tutar = parseFloat(document.getElementById('hakedisTutar').value);
    
    if (!tarih || !kategori || !aciklama || !tutar || tutar <= 0) {
        showAlert('Tüm alanlar gereklidir', 'warning');
        return;
    }
    
    const ekleme = {
        id: Date.now(),
        tarih: tarih,
        kategori: kategori,
        aciklama: aciklama,
        tutar: tutar
    };
    
    hakedisEklemeleri.push(ekleme);
    displayHakedisEklemeleri();
    updateGiderOzeti();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('hakedisModal'));
    modal.hide();
    
    document.getElementById('hakedisForm').reset();
    
    showAlert('Hak ediş eklemesi başarıyla yapıldı', 'success');
}

function displayHakedisEklemeleri() {
    const container = document.getElementById('hakedisListesi');
    if (!container) return;
    
    if (hakedisEklemeleri.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-3">Henüz hak ediş eklemesi yapılmadı.</p>';
        return;
    }
    
    let html = '<div class="table-responsive">';
    html += '<table class="table table-sm table-hover">';
    html += '<thead><tr><th>Tarih</th><th>Kategori</th><th>Açıklama</th><th class="text-end">Tutar</th><th></th></tr></thead>';
    html += '<tbody>';
    
    hakedisEklemeleri.forEach((ekleme, index) => {
        html += '<tr class="gider-row gider-row-hakedis">';
        html += '<td>' + formatDateTurkish(ekleme.tarih) + '</td>';
        html += '<td><span class="badge bg-warning text-dark">' + getHakedisKategoriAdi(ekleme.kategori) + '</span></td>';
        html += '<td>' + ekleme.aciklama + '</td>';
        html += '<td class="text-end fw-bold text-warning">+' + formatCurrencyTurkish(ekleme.tutar) + '</td>';
        html += '<td><button class="btn btn-sm btn-outline-danger" onclick="hakedisSil(' + index + ')">';
        html += '<i class="fas fa-trash"></i></button></td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function hakedisSil(index) {
    if (confirm('Bu hak ediş eklemesini silmek istediğinizden emin misiniz?')) {
        hakedisEklemeleri.splice(index, 1);
        displayHakedisEklemeleri();
        updateGiderOzeti();
        showAlert('Hak ediş eklemesi silindi', 'info');
    }
}

function getKategoriAdi(kategori) {
    const kategoriler = {
        'tedavi_aktarimi': 'Tedavi Aktarımı',
        'ozel_anlasmali': 'Özel Anlaşmalı',
        'ekstra_hizmet': 'Ekstra Hizmet',
        'diger': 'Diğer'
    };
    return kategoriler[kategori] || kategori;
}

function getHakedisKategoriAdi(kategori) {
    const kategoriler = {
        'performans_bonusu': 'Performans Bonusu',
        'ozel_tesvik': 'Özel Teşvik',
        'donemsel_ikramiye': 'Dönemsel İkramiye',
        'diger': 'Diğer'
    };
    return kategoriler[kategori] || kategori;
}

function updateGiderOzeti() {
    const toplamLab = laboratuvarGiderleri.reduce((sum, g) => sum + g.tutar, 0);
    const toplamImplant = implantGiderleri.reduce((sum, g) => sum + g.tutar, 0);
    const toplamDiger = digerGiderler.reduce((sum, g) => sum + g.tutar, 0);
    const toplamTum = toplamLab + toplamImplant + toplamDiger;
    
    // YENİ: Net Ciro ve Hak Ediş toplamları
    const toplamNetCiro = netCiroEklemeleri.reduce((sum, e) => sum + e.tutar, 0);
    const toplamHakedis = hakedisEklemeleri.reduce((sum, e) => sum + e.tutar, 0);
    
    document.getElementById('toplamLab').textContent = formatCurrencyTurkish(toplamLab);
    document.getElementById('toplamImplant').textContent = formatCurrencyTurkish(toplamImplant);
    document.getElementById('toplamDiger').textContent = formatCurrencyTurkish(toplamDiger);
    document.getElementById('toplamTumGider').textContent = formatCurrencyTurkish(toplamTum);
    document.getElementById('toplamNetCiro').textContent = '+' + formatCurrencyTurkish(toplamNetCiro);
    document.getElementById('toplamHakedis').textContent = '+' + formatCurrencyTurkish(toplamHakedis);
}

// PRİM HESAPLAMA
function hesaplaPrimler() {
    const primOrani = parseFloat(document.getElementById('primOraniInput').value);
    
    if (!primOrani || primOrani <= 0) {
        showAlert('Geçerli bir prim oranı girin', 'warning');
        return;
    }
    
    if (tahsilatVerileri.length === 0) {
        showAlert('Tahsilat verisi yok', 'warning');
        return;
    }
    
    let toplamBrut = 0;
    let toplamKesinti = 0;
    
    tahsilatVerileri.forEach(item => {
        const tutar = parseFloat(item.TUTAR) || 0;
        const kesinti = tutar * (item.kesinti_orani / 100);
        
        toplamBrut += tutar;
        toplamKesinti += kesinti;
    });
    
    let netTahsilat = toplamBrut - toplamKesinti;
    
    // YENİ: Net Ciro Eklemelerini ekle
    const toplamNetCiro = netCiroEklemeleri.reduce((sum, e) => sum + e.tutar, 0);
    netTahsilat += toplamNetCiro;
    
    const toplamGider = 
        laboratuvarGiderleri.reduce((sum, g) => sum + g.tutar, 0) +
        implantGiderleri.reduce((sum, g) => sum + g.tutar, 0) +
        digerGiderler.reduce((sum, g) => sum + g.tutar, 0);
    
    const primMatrahi = netTahsilat - toplamGider;
    let hesaplananPrim = primMatrahi * (primOrani / 100);
    
    // YENİ: Hak Ediş Eklemelerini ekle
    const toplamHakedis = hakedisEklemeleri.reduce((sum, e) => sum + e.tutar, 0);
    hesaplananPrim += toplamHakedis;
    
    const hesaplama = {
        toplam_brut: toplamBrut,
        toplam_kesinti: toplamKesinti,
        net_tahsilat: netTahsilat,
        net_ciro_ek: toplamNetCiro, // YENİ
        toplam_gider: toplamGider,
        prim_matrahi: primMatrahi,
        prim_orani: primOrani,
        hesaplanan_prim: hesaplananPrim,
        hakedis_ek: toplamHakedis // YENİ
    };
    
    displayHesaplamaSonucu(hesaplama);
    showHesaplamaSonucu();
}

function displayHesaplamaSonucu(hesaplama) {
    const hesaplamaSonucu = document.getElementById('hesaplamaSonucu');
    if (!hesaplamaSonucu) return;
    
    hesaplamaSonucu.innerHTML = `
        <div class="row mb-2">
            <div class="col-6 text-center">
                <h6>Brüt Tahsilat</h6>
                <h5 class="text-primary">${formatCurrencyTurkish(hesaplama.toplam_brut)}</h5>
            </div>
            <div class="col-6 text-center">
                <h6>Toplam Kesinti</h6>
                <h5 class="text-warning">${formatCurrencyTurkish(hesaplama.toplam_kesinti)}</h5>
            </div>
        </div>
        ${hesaplama.net_ciro_ek > 0 ? `
        <div class="row mb-2">
            <div class="col-12 text-center">
                <h6>Net Ciro Eklemeleri</h6>
                <h5 class="text-success">+${formatCurrencyTurkish(hesaplama.net_ciro_ek)}</h5>
            </div>
        </div>
        ` : ''}
        <div class="row mb-2">
            <div class="col-6 text-center">
                <h6>Net Tahsilat</h6>
                <h5 class="text-success"">${formatCurrencyTurkish(hesaplama.net_tahsilat)}</h5>
            </div>
            <div class="col-6 text-center">
                <h6>Toplam Gider</h6>
                <h5 class="text-danger">${formatCurrencyTurkish(hesaplama.toplam_gider)}</h5>
            </div>
        </div>
        <div class="row mb-3">
            <div class="col-12 text-center">
                <h6>Prim Matrahı</h6>
                <h4 class="text-info">${formatCurrencyTurkish(hesaplama.prim_matrahi)}</h4>
            </div>
        </div>
        <hr class="border-light">
        <div class="row text-center mb-2">
            <div class="col-12">
                <h5>Hesaplanan Prim (%${hesaplama.prim_orani})</h5>
                <h3 class="text-white">${formatCurrencyTurkish(hesaplama.prim_matrahi * (hesaplama.prim_orani / 100))}</h3>
            </div>
        </div>
        ${hesaplama.hakedis_ek > 0 ? `
        <div class="row text-center">
            <div class="col-12">
                <h6>Hak Ediş Eklemeleri</h6>
                <h4 class="text-warning">+${formatCurrencyTurkish(hesaplama.hakedis_ek)}</h4>
            </div>
        </div>
        <hr class="border-light">
        <div class="row text-center">
            <div class="col-12">
                <h5>TOPLAM HAK EDİŞ</h5>
                <h2 class="text-white">${formatCurrencyTurkish(hesaplama.hesaplanan_prim)}</h2>
            </div>
        </div>
        ` : ''}
    `;
    
    const kaydetBtn = document.getElementById('kaydetBtn');
    if (kaydetBtn) {
        kaydetBtn.disabled = false;
        kaydetBtn.onclick = function() {
            kaydetPrimler(hesaplama);
        };
    }
}

function showHesaplamaSonucu() {
    const hesaplamaSonucCard = document.getElementById('hesaplamaSonucCard');
    const step5 = document.getElementById('step5');
    
    if (hesaplamaSonucCard) hesaplamaSonucCard.style.display = 'block';
    if (step5) step5.classList.add('active');
}

// PRİMİ KAYDET
function kaydetPrimler(hesaplama) {
    if (!selectedCariId) {
        showAlert('Lütfen bir cari hesap seçin', 'warning');
        showCariSelectModal();
        return;
    }
    
    const kaydetBtn = document.getElementById('kaydetBtn');
    const originalText = kaydetBtn ? kaydetBtn.innerHTML : '';
    
    if (kaydetBtn) {
        kaydetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';
        kaydetBtn.disabled = true;
    }
    
    const cariEslestirCheckbox = document.getElementById('cariEslestirCheckbox');
    const cariEslestir = cariEslestirCheckbox ? cariEslestirCheckbox.checked : false;
    
    const requestData = {
        prim_data: {
            doktor_id: hekimBilgisi.id,
            doktor_adi: hekimBilgisi.name,
            sube_id: document.getElementById('subeSelect').value,
            sube_adi: document.getElementById('subeSelect').selectedOptions[0]?.textContent,
            donem_baslangic: document.getElementById('baslangicTarihi').value,
            donem_bitis: document.getElementById('bitisTarihi').value,
            
            brut_tahsilat: hesaplama.toplam_brut,
            toplam_kesinti: hesaplama.toplam_kesinti,
            net_tahsilat: hesaplama.net_tahsilat,
            toplam_gider: hesaplama.toplam_gider,
            prim_matrah: hesaplama.prim_matrahi,
            prim_orani: hesaplama.prim_orani,
            hesaplanan_prim: hesaplama.hesaplanan_prim,
            olusturan_kullanici: sessionStorage.getItem('userRole') || 'admin'
        },
        tahsilat_detaylari: tahsilatVerileri.map(item => ({
            tahsilat_id: item.tahsilat_id || 'auto-' + Date.now(),
            hasta_adi: item.HASTA_ADI,
            hasta_id: item.HASTA_ID,
            tarih: item.TARIH,
            brut_tutar: parseFloat(item.TUTAR),
            odeme_sekli: item.ODEME_SEKLI,
            kdv_orani: item.kdv_durumu.kdv_orani,
            kdv_tutari: parseFloat(item.TUTAR) * (item.kdv_durumu.kdv_orani / 100),
            taksit_sayisi: item.taksit_sayisi || 1,
            taksit_kesinti_orani: item.kesinti_orani || 0,
            taksit_kesinti_tutari: parseFloat(item.TUTAR) * (item.kesinti_orani / 100),
            net_tutar: parseFloat(item.TUTAR) * (1 - item.kesinti_orani / 100)
        })),
        laboratuvar_giderleri: laboratuvarGiderleri.map(g => ({
            tarih: g.tarih,
            hasta_adi: g.hasta_adi,
            hasta_id: g.hasta_id || '',
            islem: g.islem,
            tutar: g.tutar
        })),
        implant_giderleri: implantGiderleri.map(g => ({
            tarih: g.tarih,
            hasta_adi: g.hasta_adi,
            hasta_id: g.hasta_id || '',
            implant_markasi: g.implant_markasi,
            boy: g.boy,
            cap: g.cap,
            birim: g.birim,
            adet: g.adet,
            tutar: g.tutar
        })),
        diger_giderler: digerGiderler.map(g => ({
            hasta_adi: g.hasta_adi,
            hasta_id: g.hasta_id || '',
            kategori: g.kategori,
            tutar: g.tutar,
            aciklama: g.aciklama || ''
        })),
        // YENİ: Net Ciro ve Hak Ediş Eklemeleri
        net_ciro_eklemeleri: netCiroEklemeleri.map(e => ({
            tarih: e.tarih,
            hasta_adi: e.hasta_adi,
            hasta_id: e.hasta_id || '',
            aciklama: e.aciklama,
            tutar: e.tutar,
            kategori: e.kategori
        })),
        hakedis_eklemeleri: hakedisEklemeleri.map(e => ({
            tarih: e.tarih,
            aciklama: e.aciklama,
            tutar: e.tutar,
            kategori: e.kategori
        })),
        cari_id: selectedCariId,
        cari_eslestir: cariEslestir
    };
    
    fetch('/api/prim/kaydet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            showAlert('Prim başarıyla kaydedildi ve cari hesaba işlendi!', 'success');
            
            setTimeout(() => {
                window.location.href = '/prim_listesi';
            }, 1500);
        } else {
            const errorMsg = result.message || result.error || 'Bilinmeyen kaydetme hatası';
            showAlert('Kaydetme hatası: ' + errorMsg, 'danger');
        }
    })
    .catch(error => {
        showAlert('Kaydetme sırasında hata oluştu: ' + error.message, 'danger');
    })
    .finally(() => {
        if (kaydetBtn) {
            kaydetBtn.innerHTML = originalText;
            kaydetBtn.disabled = false;
        }
    });
}

// PRİM AYARLARI
function primAyarlariKaydet() {
    const taksitOranlari = [];
    const taksitRows = document.querySelectorAll('#taksitOranlarList .ayar-item');
    
    taksitRows.forEach(row => {
        const taksitSayisi = parseInt(row.querySelector('.taksit-sayisi').value);
        const kesintiorani = parseFloat(row.querySelector('.kesinti-orani').value);
        
        if (taksitSayisi && kesintiorani >= 0) {
            taksitOranlari.push({
                taksit_sayisi: taksitSayisi,
                kesinti_orani: kesintiorani
            });
        }
    });
    
    const giderKategorileri = [];
    const kategoriRows = document.querySelectorAll('#giderKategorilerList .ayar-item');
    
    kategoriRows.forEach(row => {
        const kategori = row.querySelector('.kategori-adi').value.trim();
        
        if (kategori) {
            giderKategorileri.push({ kategori: kategori });
        }
    });
    
    const requestData = {
        taksit_oranlari: taksitOranlari,
        gider_kategorileri: giderKategorileri
    };
    
    fetch('/api/prim/ayarlar/guncelle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Prim ayarları başarıyla kaydedildi!', 'success');
            
            const ayarlarModal = bootstrap.Modal.getInstance(document.getElementById('ayarlarModal'));
            if (ayarlarModal) ayarlarModal.hide();
            
            setTimeout(() => location.reload(), 1000);
        } else {
            showAlert('Ayarlar kaydedilirken hata: ' + (data.error || 'Bilinmeyen hata'), 'danger');
        }
    })
    .catch(error => {
        showAlert('Bir hata oluştu: ' + error.message, 'danger');
    });
}

function yeniTaksitEkle() {
    const container = document.getElementById('taksitOranlarList');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'ayar-item';
    div.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <input type="number" class="form-control taksit-sayisi" placeholder="Taksit Sayısı" min="1" max="12">
            </div>
            <div class="col-md-4">
                <input type="number" class="form-control kesinti-orani" placeholder="Kesinti Oranı %" step="0.1" min="0">
            </div>
            <div class="col-md-4">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(div);
}

function yeniKategoriEkle() {
    const container = document.getElementById('giderKategorilerList');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'ayar-item';
    div.innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <input type="text" class="form-control kategori-adi" placeholder="Kategori Adı">
            </div>
            <div class="col-md-4">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.parentElement.remove()">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(div);
}

// HIZLI ÖDEME
function showHizliOdemeModal() {
    const select = document.getElementById('hizliCariSelect');
    if (select) {
        select.innerHTML = '<option value="">Cari seçiniz...</option>' + cariListesi.map(c => 
            `<option value="${c.id}">${c.cari_adi} (${formatCurrencyTurkish(c.bakiye)})</option>`
        ).join('');
    }
    document.getElementById('hizliOdemeTarih').valueAsDate = new Date();
    document.getElementById('hizliOdemeForm').reset();
    document.getElementById('hizliOdemeSekli').value = ''; 
    
    const modalElement = document.getElementById('hizliOdemeModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

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
            loadCariler(); 
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

// YARDIMCI FONKSİYONLAR
function formatDateTurkish(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    } catch (error) {
        console.error('Tarih formatlama hatası:', error, 'Değer:', dateString);
        return dateString || '';
    }
}

function formatCurrencyTurkish(amount) {
    if (!amount && amount !== 0) return '0,00 TL';
    
    try {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0,00 TL';
        
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    } catch (error) {
        console.error('Para format hatası:', error, 'Değer:', amount);
        return '0,00 TL';
    }
}

function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.custom-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show custom-alert`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.style.maxWidth = '500px';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

console.log('Primler.js tamamen yüklendi - Net Ciro ve Hak Ediş Desteği Aktif');