// prim_listesi.js - YENİ GİDER SİSTEMİ - GÜNCELLENMIŞ
console.log('Prim Listesi JS yüklendi');

let currentPage = 1;
let totalPages = 1;
let currentPrimId = null;
let filters = {};

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    setupEventListeners();
    loadBranches();
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const filterBitis = document.getElementById('filterBitis');
    const filterBaslangic = document.getElementById('filterBaslangic');
    
    if (filterBitis) filterBitis.value = today.toISOString().split('T')[0];
    if (filterBaslangic) filterBaslangic.value = thirtyDaysAgo.toISOString().split('T')[0];
    
    loadPrimList();
}

function setupEventListeners() {
    const filterSube = document.getElementById('filterSube');
    if (filterSube) {
        filterSube.addEventListener('change', function() {
            loadDoctorsByBranch(this.value);
        });
    }

    const filterForm = document.getElementById('filterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            currentPage = 1;
            loadPrimList();
        });
    }

    const silmeOnay = document.getElementById('silmeOnay');
    if (silmeOnay) silmeOnay.addEventListener('change', updateSilBtn);
    
    const adminSifresi = document.getElementById('adminSifresi');
    if (adminSifresi) {
        adminSifresi.addEventListener('input', updateSilBtn);
        adminSifresi.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const onayCheckbox = document.getElementById('silmeOnay');
                if (this.value.trim() && onayCheckbox && onayCheckbox.checked) {
                    confirmDelete();
                }
            }
        });
    }
    
    const kesinSilBtn = document.getElementById('kesinSilBtn');
    if (kesinSilBtn) kesinSilBtn.addEventListener('click', confirmDelete);
}

function loadBranches() {
    fetch('/api/branches')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('filterSube');
            if (!select) return;
            
            select.innerHTML = '<option value="">Tüm Şubeler</option>';
            data.forEach(branch => {
                const option = document.createElement('option');
                option.value = branch.id;
                option.textContent = branch.name;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Şube yükleme hatası:', error));
}

function loadDoctorsByBranch(subeId) {
    const dokterSelect = document.getElementById('filterDoktor');
    if (!dokterSelect) return;
    
    if (!subeId) {
        dokterSelect.innerHTML = '<option value="">Tüm Hekimler</option>';
        dokterSelect.disabled = false;
        return;
    }
    
    dokterSelect.innerHTML = '<option value="">Yükleniyor...</option>';
    dokterSelect.disabled = true;
    
    fetch(`/api/doctors?sube_id=${subeId}`)
        .then(response => response.json())
        .then(data => {
            dokterSelect.innerHTML = '<option value="">Tüm Hekimler</option>';
            data.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = doctor.name;
                dokterSelect.appendChild(option);
            });
            dokterSelect.disabled = false;
        })
        .catch(error => {
            console.error('Doktor yükleme hatası:', error);
            dokterSelect.innerHTML = '<option value="">Hata oluştu</option>';
        });
}

function loadPrimList() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    filters = {
        sube_id: document.getElementById('filterSube').value,
        doktor_id: document.getElementById('filterDoktor').value,
        baslangic: document.getElementById('filterBaslangic').value,
        bitis: document.getElementById('filterBitis').value,
        page: currentPage
    };
    
    const queryString = Object.keys(filters)
        .filter(key => filters[key])
        .map(key => `${key}=${encodeURIComponent(filters[key])}`)
        .join('&');
    
    fetch(`/api/prim/liste?${queryString}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayPrimList(data.data);
                updateSummary(data.summary || {});
                setupPagination(data.pagination || {});
            } else {
                showError(data.error || 'Primler yüklenirken hata oluştu');
            }
        })
        .catch(error => {
            console.error('Prim listesi yükleme hatası:', error);
            showError('Primler yüklenirken hata: ' + error.message);
        })
        .finally(() => {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        });
}

function displayPrimList(primler) {
    const tbody = document.getElementById('primTableBody');
    if (!tbody) return;
    
    if (!primler || primler.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x mb-2"></i><br>
                    <span>Bu kriterlere uygun prim kaydı bulunamadı</span>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    primler.forEach(prim => {
        const tr = document.createElement('tr');
        tr.className = 'align-middle';
        
        const primAmount = parseFloat(prim.hesaplanan_prim);
        if (primAmount > 5000) tr.classList.add('table-success');
        else if (primAmount > 2000) tr.classList.add('table-info');
        else if (primAmount < 500) tr.classList.add('table-warning');
        
        tr.innerHTML = `
            <td>
                <small class="text-muted">${formatDate(prim.olusturma_tarihi)}</small>
                <br><small class="badge bg-light text-dark">#${prim.id}</small>
            </td>
            <td>
                <strong>${prim.doktor_adi}</strong>
                <br><small class="text-muted">ID: ${prim.doktor_id}</small>
            </td>
            <td>
                <span class="badge bg-info rounded-pill">${prim.sube_adi}</span>
            </td>
            <td>
                <small class="text-muted">
                    ${formatDate(prim.donem_baslangic)}<br>
                    ${formatDate(prim.donem_bitis)}
                </small>
            </td>
            <td>
                <span class="text-primary fw-bold">${formatCurrency(prim.brut_tahsilat)}</span>
            </td>
            <td>
                <span class="text-info fw-bold">${formatCurrency(prim.net_tahsilat)}</span>
                <br><small class="text-muted">-${formatCurrency(prim.toplam_kesinti)}</small>
            </td>
            <td>
                <span class="prim-amount fs-5">${formatCurrency(prim.hesaplanan_prim)}</span>
                <br><small class="text-muted">%${prim.prim_orani}</small>
            </td>
            <td>
                <div class="btn-group-vertical" role="group">
                    <button class="btn btn-sm btn-outline-primary mb-1" onclick="viewPrimDetail(${prim.id})">
                        <i class="fas fa-eye"></i> Detay
                    </button>
                    <button class="btn btn-sm btn-outline-secondary mb-1" onclick="printPrimSummary(${prim.id})">
                        <i class="fas fa-print"></i> Yazdır
                    </button>
                    ${prim.can_delete ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="showDeleteModal(${prim.id}, '${escapeHtml(prim.doktor_adi)}')">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-outline-secondary" disabled>
                            <i class="fas fa-lock"></i>
                        </button>
                    `}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateSummary(summary) {
    const toplamKayit = document.getElementById('toplamKayit');
    const toplamTutar = document.getElementById('toplamTutar');
    
    if (toplamKayit) toplamKayit.textContent = `${summary.total_records || 0} kayıt`;
    if (toplamTutar) toplamTutar.textContent = `Toplam: ${formatCurrency(summary.total_amount || 0)}`;
}

function setupPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    const ul = document.getElementById('pagination');
    
    if (!container || !ul) return;
    
    if (!pagination.total_pages || pagination.total_pages <= 1) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    ul.innerHTML = '';
    currentPage = pagination.current_page;
    totalPages = pagination.total_pages;
    
    if (currentPage > 1) {
        ul.appendChild(createPageItem('«', 1));
        ul.appendChild(createPageItem('‹', currentPage - 1));
    }
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        ul.appendChild(createPageItem(i, i, i === currentPage));
    }
    
    if (currentPage < totalPages) {
        ul.appendChild(createPageItem('›', currentPage + 1));
        ul.appendChild(createPageItem('»', totalPages));
    }
}

function createPageItem(text, page, active = false) {
    const li = document.createElement('li');
    li.className = `page-item ${active ? 'active' : ''}`;
    
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.innerHTML = text;
    
    if (page !== null) {
        a.onclick = (e) => {
            e.preventDefault();
            if (page !== currentPage) {
                currentPage = page;
                loadPrimList();
            }
        };
    }
    
    li.appendChild(a);
    return li;
}

function viewPrimDetail(primId) {
    currentPrimId = primId;
    
    const detayContent = document.getElementById('primDetayContent');
    if (detayContent) {
        detayContent.innerHTML = '<div class="text-center py-4"><div class="spinner-border"></div></div>';
    }
    
    const modalElement = document.getElementById('primDetayModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
    
    fetch(`/api/prim/detay/${primId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) displayPrimDetail(data.data);
            else if (detayContent) detayContent.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        })
        .catch(error => {
            console.error('Detay yükleme hatası:', error);
            if (detayContent) detayContent.innerHTML = `<div class="alert alert-danger">Hata: ${error.message}</div>`;
        });
}

function displayPrimDetail(detay) {
    const container = document.getElementById('primDetayContent');
    if (!container) return;
    
    const primData = detay.prim_data || {};
    const tahsilatDetaylari = detay.tahsilat_detaylari || [];
    const laboratuvarGiderleri = detay.laboratuvar_giderleri || [];
    const implantGiderleri = detay.implant_giderleri || [];
    const digerGiderler = detay.diger_giderler || [];
    
    let html = '<div class="row"><div class="col-md-6"><div class="card"><div class="card-header bg-primary text-white">Genel Bilgiler</div><div class="card-body"><table class="table table-sm">';
    html += `<tr><td>Prim ID:</td><td>#${primData.id}</td></tr>`;
    html += `<tr><td>Hekim:</td><td>${primData.doktor_adi}</td></tr>`;
    html += `<tr><td>Şube:</td><td>${primData.sube_adi}</td></tr>`;
    html += `<tr><td>Dönem:</td><td>${formatDate(primData.donem_baslangic)} - ${formatDate(primData.donem_bitis)}</td></tr>`;
    html += '</table></div></div></div>';
    
    html += '<div class="col-md-6"><div class="card"><div class="card-header bg-success text-white">Finansal Özet</div><div class="card-body"><table class="table table-sm">';
    html += `<tr><td>Brüt Tahsilat:</td><td class="text-primary">${formatCurrency(primData.brut_tahsilat)}</td></tr>`;
    html += `<tr><td>Net Tahsilat:</td><td class="text-info">${formatCurrency(primData.net_tahsilat)}</td></tr>`;
    html += `<tr><td>Toplam Gider:</td><td class="text-danger">${formatCurrency(primData.toplam_gider)}</td></tr>`;
    html += `<tr><td><strong>Hesaplanan Prim:</strong></td><td class="text-success fs-4"><strong>${formatCurrency(primData.hesaplanan_prim)}</strong></td></tr>`;
    html += '</table></div></div></div></div>';
    
    // Tahsilat Detayları
    if (tahsilatDetaylari.length > 0) {
        html += '<div class="card mt-3"><div class="card-header bg-info text-white">Tahsilat Detayları</div><div class="card-body">';
        html += '<table class="table table-sm"><thead><tr><th>Tarih</th><th>Hasta</th><th>Ödeme</th><th class="text-end">Brüt</th><th class="text-end">Net</th></tr></thead><tbody>';
        tahsilatDetaylari.forEach(t => {
            html += `<tr><td>${formatDate(t.tarih)}</td><td>${t.hasta_adi}</td><td>${t.odeme_sekli}</td><td class="text-end">${formatCurrency(t.brut_tutar)}</td><td class="text-end">${formatCurrency(t.net_tutar)}</td></tr>`;
        });
        html += '</tbody></table></div></div>';
    }
    
    // Giderler
    const toplamLab = laboratuvarGiderleri.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);
    const toplamImplant = implantGiderleri.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);
    const toplamDiger = digerGiderler.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);
    const toplamGiderAll = toplamLab + toplamImplant + toplamDiger;
    
    if (toplamGiderAll > 0) {
        html += '<div class="card mt-3"><div class="card-header bg-danger text-white">Giderler Detayı</div><div class="card-body">';
        
        if (laboratuvarGiderleri.length > 0) {
            html += '<h6 class="text-info mt-3"><i class="fas fa-flask"></i> Laboratuvar Giderleri</h6>';
            html += '<table class="table table-sm table-hover"><thead class="table-info"><tr><th>Tarih</th><th>Hasta</th><th>İşlem</th><th class="text-end">Tutar</th></tr></thead><tbody>';
            laboratuvarGiderleri.forEach(g => {
                html += `<tr style="border-left: 4px solid #17a2b8;"><td>${formatDate(g.tarih)}</td><td>${g.hasta_adi}</td><td>${g.islem}</td><td class="text-end text-info fw-bold">${formatCurrency(g.tutar)}</td></tr>`;
            });
            html += `<tfoot class="table-light"><tr><td colspan="3"><strong>Laboratuvar Toplamı</strong></td><td class="text-end text-info fw-bold">${formatCurrency(toplamLab)}</td></tr></tfoot></tbody></table>`;
        }
        
        if (implantGiderleri.length > 0) {
            html += '<h6 class="text-warning mt-3"><i class="fas fa-tooth"></i> İmplant Giderleri</h6>';
            html += '<table class="table table-sm table-hover"><thead class="table-warning"><tr><th>Tarih</th><th>Hasta</th><th>Marka</th><th>Boy/Çap</th><th>Adet</th><th class="text-end">Tutar</th></tr></thead><tbody>';
            implantGiderleri.forEach(g => {
                html += `<tr style="border-left: 4px solid #ffc107;"><td>${formatDate(g.tarih)}</td><td>${g.hasta_adi}</td><td>${g.implant_markasi}</td><td>${g.boy}/${g.cap}</td><td>${g.adet}</td><td class="text-end text-warning fw-bold">${formatCurrency(g.tutar)}</td></tr>`;
            });
            html += `<tfoot class="table-light"><tr><td colspan="5"><strong>İmplant Toplamı</strong></td><td class="text-end text-warning fw-bold">${formatCurrency(toplamImplant)}</td></tr></tfoot></tbody></table>`;
        }
        
        if (digerGiderler.length > 0) {
            html += '<h6 class="text-success mt-3"><i class="fas fa-file-invoice"></i> Diğer Giderler</h6>';
            html += '<table class="table table-sm table-hover"><thead class="table-success"><tr><th>Hasta</th><th>Kategori</th><th class="text-end">Tutar</th></tr></thead><tbody>';
            digerGiderler.forEach(g => {
                html += `<tr style="border-left: 4px solid #28a745;"><td>${g.hasta_adi}</td><td>${g.kategori}</td><td class="text-end text-success fw-bold">${formatCurrency(g.tutar)}</td></tr>`;
            });
            html += `<tfoot class="table-light"><tr><td colspan="2"><strong>Diğer Gider Toplamı</strong></td><td class="text-end text-success fw-bold">${formatCurrency(toplamDiger)}</td></tr></tfoot></tbody></table>`;
        }
        
        html += `<div class="alert alert-danger mt-3 mb-0"><div class="row text-center">`;
        html += `<div class="col-md-3"><strong>Laboratuvar:</strong><br><h5 class="mb-0">${formatCurrency(toplamLab)}</h5></div>`;
        html += `<div class="col-md-3"><strong>İmplant:</strong><br><h5 class="mb-0">${formatCurrency(toplamImplant)}</h5></div>`;
        html += `<div class="col-md-3"><strong>Diğer:</strong><br><h5 class="mb-0">${formatCurrency(toplamDiger)}</h5></div>`;
        html += `<div class="col-md-3"><strong>TOPLAM:</strong><br><h4 class="mb-0">${formatCurrency(toplamGiderAll)}</h4></div>`;
        html += '</div></div></div></div>';
    }
    
    container.innerHTML = html;
}

function printPrimSummary(primId) {
    fetch(`/api/prim/detay/${primId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) generatePrintableHTML(data.data);
            else alert('Yazdırma verisi alınamadı');
        })
        .catch(error => {
            console.error('Yazdırma hatası:', error);
            alert('Yazdırma sırasında hata oluştu');
        });
}

function generatePrintableHTML(detay) {
    const primData = detay.prim_data || {};
    const tahsilatDetaylari = detay.tahsilat_detaylari || [];
    const laboratuvarGiderleri = detay.laboratuvar_giderleri || [];
    const implantGiderleri = detay.implant_giderleri || [];
    const digerGiderler = detay.diger_giderler || [];
    
    const toplamLab = laboratuvarGiderleri.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);
    const toplamImplant = implantGiderleri.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);
    const toplamDiger = digerGiderler.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>Prim Özeti #${primData.id}</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                @media print { body { margin: 0; padding: 15px; } .no-print { display: none !important; } @page { margin: 1cm; } }
                body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; }
                .print-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
                .info-box { background: #f8f9fa; border-left: 4px solid #007bff; padding: 10px; margin-bottom: 10px; }
                .summary-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 5px; text-align: center; margin-bottom: 15px; }
                table { font-size: 10px; }
                .section-title { background: #e9ecef; padding: 8px; border-radius: 5px; margin-top: 15px; margin-bottom: 8px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container-fluid">
                <div class="no-print text-end mb-2">
                    <button onclick="window.print()" class="btn btn-sm btn-primary">Yazdır</button>
                    <button onclick="window.close()" class="btn btn-sm btn-secondary">Kapat</button>
                </div>
                
                <div class="print-header">
                    <h4 class="mb-0">PRİM HESAPLAMA ÖZETİ</h4>
                    <small>Detaylı Prim Raporu</small>
                </div>
                
                <div class="info-box">
                    <div class="row">
                        <div class="col-6">
                            <p class="mb-1"><strong>Hekim:</strong> ${primData.doktor_adi}</p>
                            <p class="mb-1"><strong>Şube:</strong> ${primData.sube_adi}</p>
                            <p class="mb-0"><strong>Dönem:</strong> ${formatDate(primData.donem_baslangic)} - ${formatDate(primData.donem_bitis)}</p>
                        </div>
                        <div class="col-6 text-end">
                            <p class="mb-1"><strong>Prim ID:</strong> #${primData.id}</p>
                            <p class="mb-1"><strong>Hesaplama:</strong> ${formatDate(primData.olusturma_tarihi)}</p>
                            <p class="mb-0"><strong>Hesaplayan:</strong> ${primData.olusturan_kullanici}</p>
                        </div>
                    </div>
                </div>
                
                <div class="summary-box">
                    <div class="row">
                        <div class="col-3"><small>Brüt Tahsilat</small><h5>${formatCurrency(primData.brut_tahsilat)}</h5></div>
                        <div class="col-3"><small>Net Tahsilat</small><h5>${formatCurrency(primData.net_tahsilat)}</h5></div>
                        <div class="col-3"><small>Toplam Gider</small><h5>${formatCurrency(primData.toplam_gider)}</h5></div>
                        <div class="col-3"><small>Hesaplanan Prim</small><h4>${formatCurrency(primData.hesaplanan_prim)}</h4></div>
                    </div>
                </div>
                
                ${tahsilatDetaylari.length > 0 ? `
                    <div class="section-title">TAHSİLAT DETAYLARI (${tahsilatDetaylari.length} adet)</div>
                    <table class="table table-sm table-bordered">
                        <thead class="table-dark"><tr><th>Tarih</th><th>Hasta</th><th>Ödeme</th><th class="text-end">Brüt</th><th class="text-end">Net</th></tr></thead>
                        <tbody>${tahsilatDetaylari.map(t => `<tr><td>${formatDate(t.tarih)}</td><td>${t.hasta_adi}</td><td>${t.odeme_sekli}</td><td class="text-end">${formatCurrency(t.brut_tutar)}</td><td class="text-end">${formatCurrency(t.net_tutar)}</td></tr>`).join('')}</tbody>
                    </table>
                ` : ''}
                
                ${(toplamLab + toplamImplant + toplamDiger) > 0 ? `
                    <div class="section-title">GİDERLER DETAYI</div>
                    
                    ${laboratuvarGiderleri.length > 0 ? `
                        <h6 class="text-info">Laboratuvar Giderleri</h6>
                        <table class="table table-sm table-bordered">
                            <thead class="table-info"><tr><th>Tarih</th><th>Hasta</th><th>İşlem</th><th class="text-end">Tutar</th></tr></thead>
                            <tbody>${laboratuvarGiderleri.map(g => `<tr><td>${formatDate(g.tarih)}</td><td>${g.hasta_adi}</td><td>${g.islem}</td><td class="text-end">${formatCurrency(g.tutar)}</td></tr>`).join('')}</tbody>
                            <tfoot class="table-light"><tr><td colspan="3"><strong>Toplam</strong></td><td class="text-end"><strong>${formatCurrency(toplamLab)}</strong></td></tr></tfoot>
                        </table>
                    ` : ''}
                    
                    ${implantGiderleri.length > 0 ? `
                        <h6 class="text-warning">İmplant Giderleri</h6>
                        <table class="table table-sm table-bordered">
                            <thead class="table-warning"><tr><th>Tarih</th><th>Hasta</th><th>Marka</th><th>Adet</th><th class="text-end">Tutar</th></tr></thead>
                            <tbody>${implantGiderleri.map(g => `<tr><td>${formatDate(g.tarih)}</td><td>${g.hasta_adi}</td><td>${g.implant_markasi}</td><td>${g.adet}</td><td class="text-end">${formatCurrency(g.tutar)}</td></tr>`).join('')}</tbody>
                            <tfoot class="table-light"><tr><td colspan="4"><strong>Toplam</strong></td><td class="text
-end"><strong>${formatCurrency(toplamImplant)}</strong></td></tr></tfoot>
                        </table>
                    ` : ''}
                    
                    ${digerGiderler.length > 0 ? `
                        <h6 class="text-success">Diğer Giderler</h6>
                        <table class="table table-sm table-bordered">
                            <thead class="table-success"><tr><th>Hasta</th><th>Kategori</th><th class="text-end">Tutar</th></tr></thead>
                            <tbody>${digerGiderler.map(g => `<tr><td>${g.hasta_adi}</td><td>${g.kategori}</td><td class="text-end">${formatCurrency(g.tutar)}</td></tr>`).join('')}</tbody>
                            <tfoot class="table-light"><tr><td colspan="2"><strong>Toplam</strong></td><td class="text-end"><strong>${formatCurrency(toplamDiger)}</strong></td></tr></tfoot>
                        </table>
                    ` : ''}
                    
                    <div class="alert alert-danger mt-2 mb-0">
                        <div class="row text-center">
                            <div class="col-3"><small>Laboratuvar</small><br><strong>${formatCurrency(toplamLab)}</strong></div>
                            <div class="col-3"><small>İmplant</small><br><strong>${formatCurrency(toplamImplant)}</strong></div>
                            <div class="col-3"><small>Diğer</small><br><strong>${formatCurrency(toplamDiger)}</strong></div>
                            <div class="col-3"><small>TOPLAM</small><br><h5 class="mb-0">${formatCurrency(toplamLab + toplamImplant + toplamDiger)}</h5></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = function() {
        setTimeout(() => printWindow.print(), 250);
    };
}

function printPrimDetay() {
    if (currentPrimId) printPrimSummary(currentPrimId);
}

function showDeleteModal(primId, hekimAdi) {
    currentPrimId = primId;
    
    const silinecekPrimBilgi = document.getElementById('silinecekPrimBilgi');
    if (silinecekPrimBilgi) {
        silinecekPrimBilgi.innerHTML = `<strong>Hekim:</strong> ${hekimAdi}<br><strong>Prim ID:</strong> #${primId}`;
    }
    
    const adminSifresi = document.getElementById('adminSifresi');
    const silmeOnay = document.getElementById('silmeOnay');
    const kesinSilBtn = document.getElementById('kesinSilBtn');
    
    if (adminSifresi) adminSifresi.value = '';
    if (silmeOnay) silmeOnay.checked = false;
    if (kesinSilBtn) kesinSilBtn.disabled = true;
    
    const modalElement = document.getElementById('adminSilModal');
    if (modalElement) new bootstrap.Modal(modalElement).show();
}

function updateSilBtn() {
    const sifre = document.getElementById('adminSifresi');
    const onay = document.getElementById('silmeOnay');
    const btn = document.getElementById('kesinSilBtn');
    if (btn && sifre && onay) btn.disabled = !(sifre.value.trim() && onay.checked);
}

function confirmDelete() {
    const sifre = document.getElementById('adminSifresi').value.trim();
    if (!sifre) return showAlert('Admin şifresi gerekli', 'danger');
    
    const kesinSilBtn = document.getElementById('kesinSilBtn');
    if (kesinSilBtn) {
        kesinSilBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        kesinSilBtn.disabled = true;
    }
    
    fetch('/api/prim/sil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prim_id: currentPrimId, admin_sifre: sifre })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Prim kaydı silindi', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('adminSilModal'));
            if (modal) modal.hide();
            loadPrimList();
        } else {
            showAlert(data.error || 'Silme başarısız', 'danger');
            if (kesinSilBtn) {
                kesinSilBtn.innerHTML = '<i class="fas fa-trash"></i> Kesin Sil';
                kesinSilBtn.disabled = false;
            }
        }
    })
    .catch(error => {
        showAlert('Hata: ' + error.message, 'danger');
        if (kesinSilBtn) {
            kesinSilBtn.innerHTML = '<i class="fas fa-trash"></i> Kesin Sil';
            kesinSilBtn.disabled = false;
        }
    });
}

// YARDIMCI FONKSİYONLAR - GÜNCELLENMİŞ

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    } catch (e) {
        return dateStr;
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch (e) {
        return dateStr;
    }
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0,00 ₺';
    
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const tbody = document.getElementById('primTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4"><i class="fas fa-exclamation-circle fa-2x mb-2"></i><br>${message}</td></tr>`;
    }
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

console.log('Prim Listesi JS tamamen yüklendi');