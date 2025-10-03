# prim_utils.py - Prim hesaplama yardımcı fonksiyonları
from datetime import datetime
import pandas as pd
from sqlalchemy import create_engine, text
import logging

logger = logging.getLogger(__name__)

def get_hekim_tahsilat_verileri(doktor_id, baslangic_tarihi, bitis_tarihi, mysql_config):
    """
    Belirli hekim için tahsilat verilerini çek
    """
    try:
        engine = create_engine(
            f"mysql+mysqlconnector://{mysql_config['user']}:{mysql_config['password']}@{mysql_config['host']}/{mysql_config['db']}"
        )
        
        query = """
        SELECT
            T1.ROWNO as tahsilat_id,
            T1.TARIH,
            T1.ALACAK AS TUTAR,
            T1.HEDEF_ILGILI_DOKTOR_ID AS DOKTOR_ID,
            CONCAT(IFNULL(DR.ADI,''),' ',IFNULL(DR.SOYADI,'')) AS HEKIM_ADI,
            IFNULL(DR.PRIMYUZDE,0) AS PRIMYUZDE,
            CONCAT(IFNULL(H.ADI,''),' ',IFNULL(H.SOYADI,'')) AS HASTA_ADI,
            H.HASTA_ID,
            LOWER(IFNULL(OS.ADI,'nakit')) AS ODEME_SEKLI,
            IFNULL(SB.UNVANI,'') AS SUBE_ADI,
            DR.SUBE_ID,
            T1.HAREKETTYPE
        FROM carihareket AS T1
        LEFT JOIN kartdoktor AS DR ON T1.HEDEF_ILGILI_DOKTOR_ID = DR.CARI_ID
        LEFT JOIN odeme_sekilleri AS OS ON T1.ISLEM_TIPI_ID = OS.ROWNO
        LEFT JOIN subeler AS SB ON T1.SUBE_ID = SB.CARI_ID
        LEFT JOIN karthasta AS H ON T1.KAYNAK_CARI_ID = H.HASTA_ID
        WHERE T1.SILINDI = 'False'
          AND T1.ALACAK > 0
          AND T1.HAREKETTYPE IN ('T','ST','CT')
          AND T1.TARIH BETWEEN :start_date AND :end_date
          AND T1.HEDEF_ILGILI_DOKTOR_ID = :doktor_id
        ORDER BY T1.TARIH DESC
        """
        
        params = {
            'start_date': baslangic_tarihi,
            'end_date': bitis_tarihi,
            'doktor_id': doktor_id
        }
        
        df = pd.read_sql(text(query), engine, params=params)
        engine.dispose()
        
        return df.to_dict('records') if not df.empty else []
        
    except Exception as e:
        logger.error(f"Tahsilat verileri getirme hatası: {e}")
        raise

def kesinti_hesapla(odeme_sekli, tutar, taksit_sayisi=1, kdv_orani=0,
                    taksit_kesinti_orani=0, fatura_kesildi=False, pos_pesin_orani=2):
    """
    Ödeme şekline göre kesinti hesapla
    """
    kesintiler = {
        'kdv_tutari': 0,
        'pos_komisyon_tutari': 0,
        'taksit_kesinti_tutari': 0,
        'toplam_kesinti': 0,
        'net_tutar': tutar
    }

    odeme_sekli = odeme_sekli.lower().strip()

    # KDV hesaplama (sadece pos ve banka/havale için, fatura kesildiyse de eklenir)
    if fatura_kesildi or odeme_sekli in ['pos', 'banka', 'havale', 'eft']:
        kesintiler['kdv_tutari'] = tutar * (kdv_orani / 100)

    # POS peşin (taksitsiz) için ek %2 komisyon
    if odeme_sekli == 'pos' and taksit_sayisi == 1:
        kesintiler['pos_komisyon_tutari'] = tutar * (pos_pesin_orani / 100)

    # POS taksitli işlem → modalda verilen taksit oranı uygulanır
    if odeme_sekli == 'pos' and taksit_sayisi > 1:
        kalan_tutar = tutar - kesintiler['kdv_tutari']
        kesintiler['taksit_kesinti_tutari'] = kalan_tutar * (taksit_kesinti_orani / 100)

    # Toplam kesinti
    kesintiler['toplam_kesinti'] = (
        kesintiler['kdv_tutari'] +
        kesintiler['pos_komisyon_tutari'] +
        kesintiler['taksit_kesinti_tutari']
    )
    kesintiler['net_tutar'] = tutar - kesintiler['toplam_kesinti']

    return kesintiler

def prim_hesapla(tahsilat_listesi, giderler_listesi, prim_orani):
    """
    Toplam prim hesaplama
    """
    hesaplama = {
        'brut_tahsilat': 0,
        'toplam_kesinti': 0,
        'net_tahsilat': 0,
        'toplam_gider': 0,
        'prim_matrah': 0,
        'hesaplanan_prim': 0
    }
    
    # Tahsilat hesaplamaları
    for tahsilat in tahsilat_listesi:
        hesaplama['brut_tahsilat'] += tahsilat['brut_tutar']
        hesaplama['toplam_kesinti'] += (
            tahsilat.get('kdv_tutari', 0) + 
            tahsilat.get('pos_komisyon_tutari', 0) + 
            tahsilat.get('taksit_kesinti_tutari', 0)
        )
        hesaplama['net_tahsilat'] += tahsilat['net_tutar']
    
    # Gider hesaplamaları
    for gider in giderler_listesi:
        hesaplama['toplam_gider'] += gider['tutar']
    
    # Prim matrahı
    hesaplama['prim_matrah'] = hesaplama['net_tahsilat'] - hesaplama['toplam_gider']
    
    # Prim hesaplama
    if hesaplama['prim_matrah'] > 0:
        hesaplama['hesaplanan_prim'] = hesaplama['prim_matrah'] * (prim_orani / 100)
    else:
        hesaplama['hesaplanan_prim'] = 0
    
    return hesaplama

def odeme_sekli_analiz(odeme_sekli):
    """
    Ödeme şeklini analiz et ve varsayılan ayarları getir
    """
    odeme_sekli = odeme_sekli.lower().strip()
    
    ayarlar = {
        'otomatik_kdv': False,
        'taksit_manuel_ayar': False,  # Tüm işlemler için manuel taksit ayarı
        'fatura_manuel_ayar': False,  # Manuel fatura ayarı
        'varsayilan_kdv_orani': 0,
        'varsayilan_fatura_durumu': False,
        'varsayilan_taksit_sayisi': 1,
        'varsayilan_taksit_kesinti_orani': 0,
        'varsayilan_pos_komisyon_orani': 0
    }
    
    if odeme_sekli in ['pos']:
        ayarlar['otomatik_kdv'] = True
        ayarlar['taksit_manuel_ayar'] = True  # POS için taksit manuel ayarlanabilir
        ayarlar['varsayilan_kdv_orani'] = 10
        ayarlar['varsayilan_fatura_durumu'] = True
        ayarlar['varsayilan_taksit_sayisi'] = 1  # Varsayılan peşin
        ayarlar['varsayilan_taksit_kesinti_orani'] = 0
        ayarlar['varsayilan_pos_komisyon_orani'] = 2  # Peşin POS komisyonu %2
        
    elif odeme_sekli in ['banka', 'havale', 'eft']:
        ayarlar['otomatik_kdv'] = True
        ayarlar['varsayilan_kdv_orani'] = 10
        ayarlar['varsayilan_fatura_durumu'] = True
        ayarlar['varsayilan_taksit_sayisi'] = 1
        ayarlar['varsayilan_taksit_kesinti_orani'] = 0
        
    elif odeme_sekli in ['nakit', 'çek', 'senet']:
        # Nakit, çek, senet için varsayılan: fatura kesilmedi
        ayarlar['fatura_manuel_ayar'] = True  # Manuel fatura ayarı yapılabilir
        ayarlar['otomatik_kdv'] = False
        ayarlar['varsayilan_kdv_orani'] = 0
        ayarlar['varsayilan_fatura_durumu'] = False
        ayarlar['varsayilan_taksit_sayisi'] = 1
        ayarlar['varsayilan_taksit_kesinti_orani'] = 0
        
    return ayarlar
def prim_hesapla(tahsilat_listesi, giderler_listesi, prim_orani, 
                 net_ciro_eklemeleri=None, hakedis_eklemeleri=None):
    """
    Toplam prim hesaplama - GÜNCELLENMİŞ
    """
    hesaplama = {
        'brut_tahsilat': 0,
        'toplam_kesinti': 0,
        'net_tahsilat': 0,
        'net_ciro_ek': 0,  # YENİ
        'toplam_gider': 0,
        'prim_matrah': 0,
        'hesaplanan_prim': 0,
        'hakedis_ek': 0  # YENİ
    }
    
    # Tahsilat hesaplamaları
    for tahsilat in tahsilat_listesi:
        hesaplama['brut_tahsilat'] += tahsilat['brut_tutar']
        hesaplama['toplam_kesinti'] += (
            tahsilat.get('kdv_tutari', 0) + 
            tahsilat.get('pos_komisyon_tutari', 0) + 
            tahsilat.get('taksit_kesinti_tutari', 0)
        )
        hesaplama['net_tahsilat'] += tahsilat['net_tutar']
    
    # NET CİRO EKLEMELERİ - Doğrudan net ciroya eklenir
    if net_ciro_eklemeleri:
        for ekleme in net_ciro_eklemeleri:
            hesaplama['net_ciro_ek'] += ekleme['tutar']
    
    # Net tahsilatı güncelle
    hesaplama['net_tahsilat'] += hesaplama['net_ciro_ek']
    
    # Gider hesaplamaları
    for gider in giderler_listesi:
        hesaplama['toplam_gider'] += gider['tutar']
    
    # Prim matrahı
    hesaplama['prim_matrah'] = hesaplama['net_tahsilat'] - hesaplama['toplam_gider']
    
    # Prim hesaplama
    if hesaplama['prim_matrah'] > 0:
        hesaplama['hesaplanan_prim'] = hesaplama['prim_matrah'] * (prim_orani / 100)
    else:
        hesaplama['hesaplanan_prim'] = 0
    
    # HAK EDİŞ EKLEMELERİ - Doğrudan hesaplanan prime eklenir
    if hakedis_eklemeleri:
        for ekleme in hakedis_eklemeleri:
            hesaplama['hakedis_ek'] += ekleme['tutar']
    
    # Toplam hak edişi güncelle
    hesaplama['hesaplanan_prim'] += hesaplama['hakedis_ek']
    
    return hesaplama    

def prim_rapor_hazirla(prim_detay):
    """
    Prim raporu için veri hazırla
    """
    prim_data = prim_detay['prim_data']
    tahsilat_detaylari = prim_detay['tahsilat_detaylari']
    giderler = prim_detay['giderler']
    
    rapor = {
        'baslik_bilgileri': {
            'doktor_adi': prim_data['doktor_adi'],
            'sube_adi': prim_data['sube_adi'],
            'donem': f"{prim_data['donem_baslangic']} - {prim_data['donem_bitis']}",
            'rapor_tarihi': datetime.now().strftime('%d.%m.%Y %H:%M')
        },
        'ozet_bilgiler': {
            'brut_tahsilat': prim_data['brut_tahsilat'],
            'toplam_kesinti': prim_data['toplam_kesinti'],
            'net_tahsilat': prim_data['net_tahsilat'],
            'toplam_gider': prim_data['toplam_gider'],
            'prim_matrah': prim_data['prim_matrah'],
            'prim_orani': prim_data['prim_orani'],
            'hesaplanan_prim': prim_data['hesaplanan_prim']
        },
        'tahsilat_detaylari': tahsilat_detaylari,
        'giderler': giderler,
        'odeme_sekli_dagilimi': {},
        'gider_kategori_dagilimi': {}
    }
    
    # Ödeme şekli dağılımı
    odeme_sekilleri = {}
    for tahsilat in tahsilat_detaylari:
        sekil = tahsilat['odeme_sekli']
        if sekil not in odeme_sekilleri:
            odeme_sekilleri[sekil] = {'adet': 0, 'tutar': 0}
        odeme_sekilleri[sekil]['adet'] += 1
        odeme_sekilleri[sekil]['tutar'] += tahsilat['net_tutar']
    rapor['odeme_sekli_dagilimi'] = odeme_sekilleri
    
    # Gider kategori dağılımı
    gider_kategorileri = {}
    for gider in giderler:
        kategori = gider['kategori']
        if kategori not in gider_kategorileri:
            gider_kategorileri[kategori] = {'adet': 0, 'tutar': 0}
        gider_kategorileri[kategori]['adet'] += 1
        gider_kategorileri[kategori]['tutar'] += gider['tutar']
    rapor['gider_kategori_dagilimi'] = gider_kategorileri
    
    return rapor

def validate_prim_data(prim_data, tahsilat_listesi, giderler_listesi):
    """
    Prim verilerini doğrula
    """
    errors = []
    
    # Temel alanları kontrol et
    required_fields = ['doktor_id', 'doktor_adi', 'donem_baslangic', 'donem_bitis']
    for field in required_fields:
        if not prim_data.get(field):
            errors.append(f"{field} alanı gereklidir")
    
    # Tarih kontrolü
    if prim_data.get('donem_baslangic') and prim_data.get('donem_bitis'):
        try:
            baslangic = datetime.strptime(prim_data['donem_baslangic'], '%Y-%m-%d')
            bitis = datetime.strptime(prim_data['donem_bitis'], '%Y-%m-%d')
            if baslangic > bitis:
                errors.append("Başlangıç tarihi bitiş tarihinden büyük olamaz")
        except ValueError:
            errors.append("Tarih formatı hatalı (YYYY-MM-DD olmalı)")
    
    # Tahsilat kontrolü
    if not tahsilat_listesi:
        errors.append("En az bir tahsilat kaydı gereklidir")
    
    # Tutar kontrolü
    for i, tahsilat in enumerate(tahsilat_listesi):
        if tahsilat.get('brut_tutar', 0) <= 0:
            errors.append(f"Tahsilat {i+1} tutarı pozitif olmalıdır")
    
    for i, gider in enumerate(giderler_listesi):
        if gider.get('tutar', 0) <= 0:
            errors.append(f"Gider {i+1} tutarı pozitif olmalıdır")
    
    return errors