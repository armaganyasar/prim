# database.py - Prim veritabanı yönetimi - YENİ GİDER SİSTEMİ
import sqlite3
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PrimDatabase:
    def __init__(self, db_path="data/prim_hesaplamalari.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Veritabanını ve tabloları oluştur"""
        try:
            # data klasörünü oluştur (eğer yoksa)
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Ana prim hesaplaması tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prim_hesaplamalari (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doktor_id TEXT NOT NULL,
                    doktor_adi TEXT NOT NULL,
                    sube_id TEXT NOT NULL,
                    sube_adi TEXT NOT NULL,
                    donem_baslangic DATE NOT NULL,
                    donem_bitis DATE NOT NULL,
                    
                    brut_tahsilat REAL DEFAULT 0,
                    toplam_kesinti REAL DEFAULT 0,
                    net_tahsilat REAL DEFAULT 0,
                    toplam_gider REAL DEFAULT 0,
                    prim_matrah REAL DEFAULT 0,
                    prim_orani REAL DEFAULT 0,
                    hesaplanan_prim REAL DEFAULT 0,
                    
                    olusturan_kullanici TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    durum TEXT DEFAULT 'taslak',
                    notlar TEXT
                )
            ''')
            
            # Tahsilat detayları tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prim_tahsilat_detaylari (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prim_id INTEGER NOT NULL,
                    tahsilat_id TEXT,
                    hasta_adi TEXT NOT NULL,
                    hasta_id TEXT,
                    tarih DATE,
                    brut_tutar REAL NOT NULL,
                    odeme_sekli TEXT,
                    kdv_orani REAL DEFAULT 0,
                    kdv_tutari REAL DEFAULT 0,
                    taksit_sayisi INTEGER DEFAULT 1,
                    taksit_kesinti_orani REAL DEFAULT 0,
                    taksit_kesinti_tutari REAL DEFAULT 0,
                    net_tutar REAL NOT NULL,
                    
                    FOREIGN KEY (prim_id) REFERENCES prim_hesaplamalari(id)
                )
            ''')
            
            # Laboratuvar giderleri tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prim_laboratuvar_giderleri (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prim_id INTEGER NOT NULL,
                    tarih DATE NOT NULL,
                    hasta_adi TEXT NOT NULL,
                    hasta_id TEXT,
                    islem TEXT NOT NULL,
                    tutar REAL NOT NULL,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (prim_id) REFERENCES prim_hesaplamalari(id)
                )
            ''')
            
            # İmplant giderleri tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prim_implant_giderleri (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prim_id INTEGER NOT NULL,
                    tarih DATE NOT NULL,
                    hasta_adi TEXT NOT NULL,
                    hasta_id TEXT,
                    implant_markasi TEXT NOT NULL,
                    boy TEXT NOT NULL,
                    cap TEXT NOT NULL,
                    birim TEXT NOT NULL,
                    adet INTEGER NOT NULL,
                    tutar REAL NOT NULL,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (prim_id) REFERENCES prim_hesaplamalari(id)
                )
            ''')
            
            # Diğer giderler tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prim_giderler (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prim_id INTEGER NOT NULL,
                    hasta_adi TEXT NOT NULL,
                    hasta_id TEXT,
                    kategori TEXT NOT NULL,
                    tutar REAL NOT NULL,
                    aciklama TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (prim_id) REFERENCES prim_hesaplamalari(id)
                )
            ''')
            
            # YENİ TABLOLAR - Net Ciro ve Hak Ediş Eklemeleri
            
            # Doğrudan net ciro eklemeleri için
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prim_net_ciro_eklemeleri (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prim_id INTEGER NOT NULL,
                    tarih DATE NOT NULL,
                    hasta_adi TEXT,
                    hasta_id TEXT,
                    aciklama TEXT NOT NULL,
                    tutar REAL NOT NULL,
                    kategori TEXT DEFAULT 'diger',
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (prim_id) REFERENCES prim_hesaplamalari(id)
                )
            ''')
            
            # Doğrudan hak ediş (prim) eklemeleri için
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS prim_hakedis_eklemeleri (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prim_id INTEGER NOT NULL,
                    tarih DATE NOT NULL,
                    aciklama TEXT NOT NULL,
                    tutar REAL NOT NULL,
                    kategori TEXT DEFAULT 'bonus',
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (prim_id) REFERENCES prim_hesaplamalari(id)
                )
            ''')
            
            # Ayarlar tabloları
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS taksit_oranlari (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    taksit_sayisi INTEGER NOT NULL UNIQUE,
                    kesinti_orani REAL NOT NULL,
                    aktif BOOLEAN DEFAULT 1
                )
            ''')
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS gider_kategorileri (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    kategori TEXT NOT NULL UNIQUE,
                    aktif BOOLEAN DEFAULT 1
                )
            ''')
            
            # İndeksler
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_prim_doktor_tarih ON prim_hesaplamalari(doktor_id, donem_baslangic)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_tahsilat_prim ON prim_tahsilat_detaylari(prim_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_gider_prim ON prim_giderler(prim_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_lab_prim ON prim_laboratuvar_giderleri(prim_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_implant_prim ON prim_implant_giderleri(prim_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_net_ciro_prim ON prim_net_ciro_eklemeleri(prim_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_hakedis_prim ON prim_hakedis_eklemeleri(prim_id)')
            
            # Varsayılan ayarları ekle
            self._init_default_settings(cursor)
            
            conn.commit()
            conn.close()
            logger.info("Prim veritabanı başarıyla oluşturuldu")
            
        except Exception as e:
            logger.error(f"Veritabanı oluşturma hatası: {e}")
            raise
    
    def _init_default_settings(self, cursor):
        """Varsayılan ayarları ekle"""
        try:
            # Varsayılan taksit oranları
            taksit_oranlari = [
                (1, 12.0),  # Tek çekim - %12 (KDV 10% + POS 2%)
                (2, 15.0),
                (3, 18.0),
                (4, 20.0),
                (5, 22.0),
                (6, 25.0),
                (7, 27.0),
                (8, 29.0),
                (9, 31.0),
                (10, 33.0),
                (11, 35.0),
                (12, 37.0),
            ]
            
            cursor.executemany(
                'INSERT OR IGNORE INTO taksit_oranlari (taksit_sayisi, kesinti_orani) VALUES (?, ?)',
                taksit_oranlari
            )
            
            # Varsayılan gider kategorileri
            gider_kategorileri = [
                'Malzeme',
                'Protez',
                'Beyazlatma',
                'Diğer Giderler'
            ]
            
            cursor.executemany(
                'INSERT OR IGNORE INTO gider_kategorileri (kategori) VALUES (?)',
                [(kat,) for kat in gider_kategorileri]
            )
            
        except Exception as e:
            logger.warning(f"Varsayılan ayarlar eklenemedi: {e}")
    
    def prim_hesaplama_kaydet(self, prim_data, tahsilat_detaylari, diger_giderler, 
                              laboratuvar_giderleri=None, implant_giderleri=None,
                              net_ciro_eklemeleri=None, hakedis_eklemeleri=None):
        """Prim hesaplamasını tüm detaylarıyla kaydet - GÜNCELLENMİŞ"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Ana prim kaydını ekle
            cursor.execute('''
                INSERT INTO prim_hesaplamalari 
                (doktor_id, doktor_adi, sube_id, sube_adi, donem_baslangic, donem_bitis,
                 brut_tahsilat, toplam_kesinti, net_tahsilat, toplam_gider, prim_matrah,
                 prim_orani, hesaplanan_prim, olusturan_kullanici, notlar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                prim_data['doktor_id'],
                prim_data['doktor_adi'],
                prim_data['sube_id'],
                prim_data['sube_adi'],
                prim_data['donem_baslangic'],
                prim_data['donem_bitis'],
                prim_data['brut_tahsilat'],
                prim_data['toplam_kesinti'],
                prim_data['net_tahsilat'],
                prim_data['toplam_gider'],
                prim_data['prim_matrah'],
                prim_data['prim_orani'],
                prim_data['hesaplanan_prim'],
                prim_data['olusturan_kullanici'],
                prim_data.get('notlar', '')
            ))
            
            prim_id = cursor.lastrowid
            
            # Tahsilat detaylarını kaydet
            for detay in tahsilat_detaylari:
                cursor.execute('''
                    INSERT INTO prim_tahsilat_detaylari 
                    (prim_id, tahsilat_id, hasta_adi, hasta_id, tarih, brut_tutar, odeme_sekli,
                     kdv_orani, kdv_tutari, taksit_sayisi, taksit_kesinti_orani, 
                     taksit_kesinti_tutari, net_tutar)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    prim_id,
                    detay.get('tahsilat_id'),
                    detay['hasta_adi'],
                    detay.get('hasta_id'),
                    detay.get('tarih'),
                    detay['brut_tutar'],
                    detay['odeme_sekli'],
                    detay['kdv_orani'],
                    detay['kdv_tutari'],
                    detay['taksit_sayisi'],
                    detay['taksit_kesinti_orani'],
                    detay['taksit_kesinti_tutari'],
                    detay['net_tutar']
                ))
            
            # Diğer giderleri kaydet
            if diger_giderler:
                for gider in diger_giderler:
                    cursor.execute('''
                        INSERT INTO prim_giderler 
                        (prim_id, hasta_adi, hasta_id, kategori, tutar, aciklama)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        prim_id,
                        gider['hasta_adi'],
                        gider.get('hasta_id', ''),
                        gider['kategori'],
                        gider['tutar'],
                        gider.get('aciklama', '')
                    ))
            
            # Laboratuvar giderlerini kaydet
            if laboratuvar_giderleri:
                for gider in laboratuvar_giderleri:
                    cursor.execute('''
                        INSERT INTO prim_laboratuvar_giderleri 
                        (prim_id, tarih, hasta_adi, hasta_id, islem, tutar)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        prim_id,
                        gider['tarih'],
                        gider['hasta_adi'],
                        gider.get('hasta_id', ''),
                        gider['islem'],
                        gider['tutar']
                    ))
            
            # İmplant giderlerini kaydet
            if implant_giderleri:
                for gider in implant_giderleri:
                    cursor.execute('''
                        INSERT INTO prim_implant_giderleri 
                        (prim_id, tarih, hasta_adi, hasta_id, implant_markasi, boy, cap, birim, adet, tutar)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        prim_id,
                        gider['tarih'],
                        gider['hasta_adi'],
                        gider.get('hasta_id', ''),
                        gider['implant_markasi'],
                        gider['boy'],
                        gider['cap'],
                        gider['birim'],
                        gider['adet'],
                        gider['tutar']
                    ))
            
            # YENİ: Net Ciro Eklemelerini kaydet
            if net_ciro_eklemeleri:
                for ekleme in net_ciro_eklemeleri:
                    cursor.execute('''
                        INSERT INTO prim_net_ciro_eklemeleri 
                        (prim_id, tarih, hasta_adi, hasta_id, aciklama, tutar, kategori)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        prim_id,
                        ekleme['tarih'],
                        ekleme.get('hasta_adi', ''),
                        ekleme.get('hasta_id', ''),
                        ekleme['aciklama'],
                        ekleme['tutar'],
                        ekleme['kategori']
                    ))
            
            # YENİ: Hak Ediş Eklemelerini kaydet
            if hakedis_eklemeleri:
                for ekleme in hakedis_eklemeleri:
                    cursor.execute('''
                        INSERT INTO prim_hakedis_eklemeleri 
                        (prim_id, tarih, aciklama, tutar, kategori)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (
                        prim_id,
                        ekleme['tarih'],
                        ekleme['aciklama'],
                        ekleme['tutar'],
                        ekleme['kategori']
                    ))
            
            conn.commit()
            logger.info(f"Prim hesaplaması kaydedildi: ID {prim_id}")
            return prim_id
            
        except Exception as e:
            logger.error(f"Prim kaydetme hatası: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def prim_listele(self, doktor_id=None, baslangic=None, bitis=None):
        """Prim hesaplamalarını listele"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = "SELECT * FROM prim_hesaplamalari WHERE 1=1"
            params = []
            
            if doktor_id:
                query += " AND doktor_id = ?"
                params.append(doktor_id)
                
            if baslangic:
                query += " AND donem_baslangic >= ?"
                params.append(baslangic)
                
            if bitis:
                query += " AND donem_bitis <= ?"
                params.append(bitis)
            
            query += " ORDER BY olusturma_tarihi DESC"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Prim listeleme hatası: {e}")
            raise
    
    def prim_detay_getir(self, prim_id):
        """Prim hesaplama detayını getir - GÜNCELLENMİŞ"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Ana prim bilgisi
            cursor.execute("SELECT * FROM prim_hesaplamalari WHERE id = ?", (prim_id,))
            prim_data = cursor.fetchone()
            
            if not prim_data:
                conn.close()
                return None
            
            # Tahsilat detayları
            cursor.execute("SELECT * FROM prim_tahsilat_detaylari WHERE prim_id = ?", (prim_id,))
            tahsilat_detaylari = cursor.fetchall()
            
            # Diğer giderler
            cursor.execute("SELECT * FROM prim_giderler WHERE prim_id = ?", (prim_id,))
            diger_giderler = cursor.fetchall()
            
            # Laboratuvar giderleri
            cursor.execute("SELECT * FROM prim_laboratuvar_giderleri WHERE prim_id = ?", (prim_id,))
            laboratuvar_giderleri = cursor.fetchall()
            
            # İmplant giderleri
            cursor.execute("SELECT * FROM prim_implant_giderleri WHERE prim_id = ?", (prim_id,))
            implant_giderleri = cursor.fetchall()
            
            # YENİ: Net Ciro Eklemeleri
            cursor.execute("SELECT * FROM prim_net_ciro_eklemeleri WHERE prim_id = ?", (prim_id,))
            net_ciro_eklemeleri = cursor.fetchall()
            
            # YENİ: Hak Ediş Eklemeleri
            cursor.execute("SELECT * FROM prim_hakedis_eklemeleri WHERE prim_id = ?", (prim_id,))
            hakedis_eklemeleri = cursor.fetchall()
            
            conn.close()
            
            return {
                'prim_data': dict(prim_data),
                'tahsilat_detaylari': [dict(row) for row in tahsilat_detaylari],
                'diger_giderler': [dict(row) for row in diger_giderler],
                'laboratuvar_giderleri': [dict(row) for row in laboratuvar_giderleri],
                'implant_giderleri': [dict(row) for row in implant_giderleri],
                'net_ciro_eklemeleri': [dict(row) for row in net_ciro_eklemeleri],  # YENİ
                'hakedis_eklemeleri': [dict(row) for row in hakedis_eklemeleri]    # YENİ
            }
            
        except Exception as e:
            logger.error(f"Prim detay getirme hatası: {e}")
            raise    
    def ayarlar_getir(self):
        """Taksit oranları ve gider kategorilerini getir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM taksit_oranlari WHERE aktif = 1 ORDER BY taksit_sayisi")
            taksit_oranlari = cursor.fetchall()
            
            cursor.execute("SELECT * FROM gider_kategorileri WHERE aktif = 1 ORDER BY kategori")
            gider_kategorileri = cursor.fetchall()
            
            conn.close()
            
            return {
                'taksit_oranlari': [dict(row) for row in taksit_oranlari],
                'gider_kategorileri': [dict(row) for row in gider_kategorileri]
            }
            
        except Exception as e:
            logger.error(f"Ayarlar getirme hatası: {e}")
            raise
    
    def ayarlar_guncelle(self, taksit_oranlari, gider_kategorileri):
        """Taksit oranları ve gider kategorilerini güncelle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM taksit_oranlari")
            for taksit in taksit_oranlari:
                cursor.execute(
                    "INSERT INTO taksit_oranlari (taksit_sayisi, kesinti_orani, aktif) VALUES (?, ?, ?)",
                    (taksit['taksit_sayisi'], taksit['kesinti_orani'], 1)
                )
            
            cursor.execute("DELETE FROM gider_kategorileri")
            for kategori in gider_kategorileri:
                cursor.execute(
                    "INSERT INTO gider_kategorileri (kategori, aktif) VALUES (?, ?)",
                    (kategori['kategori'], 1)
                )
            
            conn.commit()
            conn.close()
            
            logger.info("Prim ayarları başarıyla güncellendi")
            return True
            
        except Exception as e:
            logger.error(f"Ayar güncelleme hatası: {e}")
            return False
# database.py dosyasının sonuna ekleyin

class CariDatabase:
    def __init__(self, db_path="data/prim_hesaplamalari.db"):
        self.db_path = db_path
        self.init_cari_tables()
    def cari_sil_gelismis(self, cari_id):
        """
        Gelişmiş cari silme - İlişkili tüm kayıtları kontrol eder ve detaylı bilgi verir
        """
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. Cari bilgisini al
            cursor.execute("SELECT cari_kodu, cari_adi, cari_turu FROM cari_hesaplar WHERE id = ?", (cari_id,))
            cari = cursor.fetchone()
            
            if not cari:
                return False, "Cari hesap bulunamadı"
            
            cari_kodu, cari_adi, cari_turu = cari
            
            # 2. Cari hareketlerini kontrol et
            cursor.execute("""
                SELECT id, hareket_tipi, tarih, aciklama, alacak, borc 
                FROM cari_hareketler 
                WHERE cari_id = ?
                ORDER BY tarih DESC
            """, (cari_id,))
            hareketler = cursor.fetchall()
            
            if hareketler:
                hareket_detay = "\n".join([
                    f"  • {h[2]} - {h[3]} (Alacak: {h[4]:.2f} ₺, Borç: {h[5]:.2f} ₺)"
                    for h in hareketler[:5]  # İlk 5 hareket
                ])
                
                if len(hareketler) > 5:
                    hareket_detay += f"\n  ... ve {len(hareketler) - 5} hareket daha"
                
                return False, f"""Bu cari hesaba ait {len(hareketler)} adet hareket bulunmaktadır:

    {hareket_detay}

    ÇÖZÜM ADIMLARI:
    1. Cari Yönetimi sayfasında '{cari_adi}' hesabını bulun
    2. "Hareketler" butonuna tıklayın
    3. Tüm hareketleri tek tek silin
    4. Sonra cariyi silebilirsiniz

    NOT: Eğer bu hareketler maaş ödemelerinden kaynaklanıyorsa, önce Maaş Yönetimi'nden ilgili maaş kayıtlarını silmelisiniz."""
            
            # 3. Hekim eşleştirmelerini kontrol et
            cursor.execute("SELECT COUNT(*) FROM hekim_cari_eslestirme WHERE cari_id = ? AND aktif = 1", (cari_id,))
            eslestirme_count = cursor.fetchone()[0]
            
            # 4. Personel bağlantısını kontrol et (eğer personel carisi ise)
            personel_id = None
            if cari_turu == 'personel':
                cursor.execute("SELECT id, ad, soyad FROM personel WHERE cari_id = ?", (cari_id,))
                personel = cursor.fetchone()
                if personel:
                    personel_id = personel[0]
                    return False, f"""Bu cari hesap '{personel[1]} {personel[2]}' adlı personele aittir.

    Personeli silmek için:
    1. Personel Yönetimi sayfasına gidin
    2. '{personel[1]} {personel[2]}' personelini bulun
    3. "Sil" butonuna tıklayın (Bu işlem cariyi de otomatik siler)"""
            
            # 5. Tüm kontroller geçtiyse sil
            # Eşleştirmeleri sil
            cursor.execute("DELETE FROM hekim_cari_eslestirme WHERE cari_id = ?", (cari_id,))
            
            # Cariyi sil
            cursor.execute("DELETE FROM cari_hesaplar WHERE id = ?", (cari_id,))
            
            conn.commit()
            logger.info(f"Cari silindi: {cari_kodu} - {cari_adi}")
            return True, "Cari hesap başarıyla silindi"
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Gelişmiş cari silme hatası: {e}")
            return False, f"Silme işlemi başarısız: {str(e)}"
        finally:
            if conn:
                conn.close()    

    def hekim_cari_eslestir(self, cari_id, doktor_id, doktor_adi, sube_id, sube_adi):
        """Hekim-şube kombinasyonunu cariye bağla"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Önce aynı hekim-şube kombinasyonu başka bir cariye bağlı mı kontrol et
            cursor.execute('''
                SELECT cari_id FROM hekim_cari_eslestirme 
                WHERE doktor_id = ? AND sube_id = ? AND aktif = 1
            ''', (doktor_id, sube_id))
            
            existing = cursor.fetchone()
            if existing and existing[0] != cari_id:
                conn.close()
                return False, "Bu hekim-şube kombinasyonu başka bir cariye bağlı"
            
            # Eşleştirmeyi ekle veya güncelle (INSERT OR REPLACE kullanılır)
            # DÜZELTME: Sorguda 5 yerine 6 parametre bekleniyor (cari_id, doktor_id, doktor_adi, sube_id, sube_adi, aktif)
            cursor.execute('''
                INSERT OR REPLACE INTO hekim_cari_eslestirme 
                (cari_id, doktor_id, doktor_adi, sube_id, sube_adi, aktif)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (cari_id, doktor_id, doktor_adi, sube_id, sube_adi, 1)) # 6 PARAMETRE
            
            conn.commit()
            conn.close()
            
            logger.info(f"Hekim-cari eşleştirme: Cari {cari_id} - Hekim {doktor_id} - Şube {sube_id}")
            return True, "Eşleştirme başarılı"
            
        except Exception as e:
            logger.error(f"Eşleştirme hatası: {e}")
            return False, str(e)
    def init_cari_tables(self):
        """Cari hesap tablolarını oluştur"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Cari hesaplar tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cari_hesaplar (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cari_kodu TEXT UNIQUE NOT NULL,
                    cari_adi TEXT NOT NULL,
                    telefon TEXT,
                    email TEXT,
                    adres TEXT,
                    notlar TEXT,
                    durum TEXT DEFAULT 'aktif',
                    bakiye REAL DEFAULT 0,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Hekim-Cari eşleştirme tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS hekim_cari_eslestirme (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cari_id INTEGER NOT NULL,
                    doktor_id TEXT NOT NULL,
                    doktor_adi TEXT NOT NULL,
                    sube_id TEXT NOT NULL,
                    sube_adi TEXT NOT NULL,
                    aktif BOOLEAN DEFAULT 1,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (cari_id) REFERENCES cari_hesaplar(id),
                    UNIQUE(doktor_id, sube_id)
                )
            ''')
            
            # Cari hareketler tablosu
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cari_hareketler (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cari_id INTEGER NOT NULL,
                    hareket_tipi TEXT NOT NULL,
                    prim_id INTEGER,
                    tarih DATE NOT NULL,
                    aciklama TEXT,
                    alacak REAL DEFAULT 0,
                    borc REAL DEFAULT 0,
                    bakiye REAL DEFAULT 0,
                    olusturan_kullanici TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (cari_id) REFERENCES cari_hesaplar(id),
                    FOREIGN KEY (prim_id) REFERENCES prim_hesaplamalari(id)
                )
            ''')
            
            # İndeksler
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_cari_durum ON cari_hesaplar(durum)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_eslestirme_doktor ON hekim_cari_eslestirme(doktor_id, sube_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_hareketler_cari ON cari_hareketler(cari_id)')
            
            conn.commit()
            conn.close()
            logger.info("Cari hesap tabloları oluşturuldu")
            
        except Exception as e:
            logger.error(f"Cari tablo oluşturma hatası: {e}")
            raise
    
    def cari_detay_getir(self, cari_id):
        """ID ile cari hesap detaylarını getir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM cari_hesaplar WHERE id = ?", (cari_id,))
            result = cursor.fetchone()
            conn.close()
            
            return dict(result) if result else None
            
        except Exception as e:
            logger.error(f"Cari detay getirme hatası: {e}")
            return None
    def cari_ekle(self, cari_data):
        """Yeni cari hesap ekle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO cari_hesaplar (cari_kodu, cari_adi, telefon, email, adres, notlar)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                cari_data['cari_kodu'],
                cari_data['cari_adi'],
                cari_data.get('telefon', ''),
                cari_data.get('email', ''),
                cari_data.get('adres', ''),
                cari_data.get('notlar', '')
            ))
            
            cari_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"Yeni cari oluşturuldu: {cari_id}")
            return cari_id
            
        except Exception as e:
            logger.error(f"Cari ekleme hatası: {e}")
            raise

    def cari_hareket_duzelt(self, hareket_id, cari_id, tarih, aciklama, alacak, borc):
        """Mevcut cari hareketi siler ve bakiyeyi yeniden hesaplar"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. Eski hareketi sil (basitçe silmek en kolayı, sonra yeniden hesaplama)
            cursor.execute("DELETE FROM cari_hareketler WHERE id = ? AND cari_id = ?", (hareket_id, cari_id))
            
            if cursor.rowcount == 0:
                conn.close()
                return False, "Hareket bulunamadı veya silinemedi."
                
            # 2. Güncellenmiş hareketi ekle (yeni bir kayıt olarak, aynı ID'yi kullanamayız)
            cursor.execute('''
                INSERT INTO cari_hareketler 
                (cari_id, hareket_tipi, tarih, aciklama, alacak, borc, olusturan_kullanici, olusturma_tarihi)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                cari_id,
                'odeme_borc', # Düzeltilen hareketin tipi
                tarih,
                aciklama,
                alacak,
                borc,
                "ADMIN_DUZELTME" # Kullanıcı bilgisini burada set edebilirsiniz.
            ))
            
            # 3. Bakiyeyi yeniden hesapla (En önemli kısım)
            return self._recalculate_bakiye(cari_id, conn)

        except Exception as e:
            logger.error(f"Cari hareket düzeltme/silme hatası: {e}")
            if conn:
                conn.rollback()
            return False, str(e)
        finally:
            if conn:
                conn.close()

    # YENİ: Cari Hareket Silme (Düzeltme fonksiyonunu kullanacağız)
    def cari_hareket_sil(self, hareket_id, cari_id):
        """Cari hareketi siler ve bakiyeyi yeniden hesaplar"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. Hareketi sil
            cursor.execute("DELETE FROM cari_hareketler WHERE id = ? AND cari_id = ?", (hareket_id, cari_id))
            
            if cursor.rowcount == 0:
                conn.close()
                return False, "Hareket bulunamadı veya silinemedi."
                
            # 2. Bakiyeyi yeniden hesapla
            return self._recalculate_bakiye(cari_id, conn)

        except Exception as e:
            logger.error(f"Cari hareket silme hatası: {e}")
            if conn:
                conn.rollback()
            return False, str(e)
        finally:
            if conn:
                conn.close()

    # YENİ YARDIMCI FONKSİYON: Bakiyeyi tüm hareketler üzerinden yeniden hesaplama
    def _recalculate_bakiye(self, cari_id, conn):
        """Belirli bir cari hesabın bakiyesini tüm hareketleri sırayla işleyerek yeniden hesaplar."""
        try:
            cursor = conn.cursor()
            
            # 1. Tüm hareketleri tarihe göre çek (ID ile de sırlamayı unutmayalım)
            cursor.execute('''
                SELECT id, alacak, borc 
                FROM cari_hareketler 
                WHERE cari_id = ? 
                ORDER BY tarih ASC, olusturma_tarihi ASC
            ''', (cari_id,))
            hareketler = cursor.fetchall()
            
            current_bakiye = 0
            
            # 2. Hareketleri sırayla işleyip BAKIYE sütununu güncelle
            for hid, alacak, borc in hareketler:
                current_bakiye += alacak - borc
                cursor.execute("UPDATE cari_hareketler SET bakiye = ? WHERE id = ?", (current_bakiye, hid))
            
            # 3. Ana cari hesabın bakiyesini güncelle
            cursor.execute("UPDATE cari_hesaplar SET bakiye = ? WHERE id = ?", (current_bakiye, cari_id))
            
            conn.commit()
            return True, "Bakiye başarıyla yeniden hesaplandı."
            
        except Exception as e:
            logger.error(f"Bakiye yeniden hesaplama hatası: {e}")
            conn.rollback()
            raise
    # database.py - CariDatabase sınıfı içine eklenecek

    def cari_hareket_kontrol(self, cari_id):
        """Cari hesaba ait hareket olup olmadığını kontrol eder."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(id) FROM cari_hareketler WHERE cari_id = ?", (cari_id,))
            count = cursor.fetchone()[0]
            
            conn.close()
            return count > 0
            
        except Exception as e:
            logger.error(f"Cari hareket kontrol hatası: {e}")
            return True # Hata durumunda silmeyi engellemek için True döndür
            
    def cari_sil(self, cari_id):
        """Cari hesabı siler (Önceden hareket kontrolü yapılmalıdır!)"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. İlişkili Hekim Eşleştirmelerini sil
            cursor.execute("DELETE FROM hekim_cari_eslestirme WHERE cari_id = ?", (cari_id,))
            
            # 2. Ana Cari Hesabı sil
            cursor.execute("DELETE FROM cari_hesaplar WHERE id = ?", (cari_id,))
            
            conn.commit()
            return True, "Cari hesap başarıyla silindi."
            
        except Exception as e:
            logger.error(f"Cari silme hatası: {e}")
            if conn:
                conn.rollback()
            return False, f"Cari silinirken hata oluştu: {str(e)}"
        finally:
            if conn:
                conn.close()
    # YENİ YARDIMCI FONKSİYON: Tekil Hareket Detayı Getirme
    def cari_hareket_detay_getir(self, hareket_id):
        """Tek bir cari hareketin detaylarını getirir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM cari_hareketler WHERE id = ?", (hareket_id,))
            result = cursor.fetchone()
            conn.close()
            
            return dict(result) if result else None
            
        except Exception as e:
            logger.error(f"Cari hareket detay getirme hatası: {e}")
            return None
 
    
    def cari_bul_hekim_sube(self, doktor_id, sube_id):
        """Hekim-şube kombinasyonu için cari bul"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT c.*, e.doktor_adi, e.sube_adi
                FROM hekim_cari_eslestirme e
                JOIN cari_hesaplar c ON e.cari_id = c.id
                WHERE e.doktor_id = ? AND e.sube_id = ? AND e.aktif = 1 AND c.durum = 'aktif'
            ''', (doktor_id, sube_id))
            
            result = cursor.fetchone()
            conn.close()
            
            return dict(result) if result else None
            
        except Exception as e:
            logger.error(f"Cari bulma hatası: {e}")
            return None
    
    def cari_listele(self, cari_turu=None, alt_turu=None):
        """Tüm aktif carileri listele (opsiyonel: cari_turu, alt_turu)"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            query = '''
                SELECT * FROM cari_hesaplar 
                WHERE durum = 'aktif'
            '''
            params = []

            if cari_turu:
                query += " AND cari_turu = ?"
                params.append(cari_turu)

            if alt_turu:
                query += " AND alt_turu = ?"
                params.append(alt_turu)

            query += " ORDER BY cari_adi"

            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()

            return [dict(row) for row in results]

        except Exception as e:
            logger.error(f"Cari listeleme hatası: {e}")
            return []
    def cari_turleri_getir(self):
        """Veritabanındaki mevcut cari_turu ve alt_turu değerlerini getir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("SELECT DISTINCT cari_turu FROM cari_hesaplar WHERE durum = 'aktif' AND cari_turu IS NOT NULL")
            turler = [row["cari_turu"] for row in cursor.fetchall()]

            cursor.execute("SELECT DISTINCT alt_turu FROM cari_hesaplar WHERE durum = 'aktif' AND alt_turu IS NOT NULL")
            alt_turler = [row["alt_turu"] for row in cursor.fetchall()]

            conn.close()
            return {"turler": turler, "alt_turler": alt_turler}

        except Exception as e:
            logger.error(f"Cari türleri getirme hatası: {e}")
            return {"turler": [], "alt_turler": []}

    def cari_hareket_ekle(self, hareket_data):
        """Cari hesaba hareket ekle ve bakiyeyi güncelle"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path, timeout=30.0)  # TIMEOUT EKLE
            cursor = conn.cursor()
            
            # Mevcut bakiyeyi al
            cursor.execute('SELECT bakiye FROM cari_hesaplar WHERE id = ?', (hareket_data['cari_id'],))
            result = cursor.fetchone()
            current_bakiye = result[0] if result else 0
            
            # Yeni bakiyeyi hesapla
            alacak = float(hareket_data.get('alacak', 0))
            borc = float(hareket_data.get('borc', 0))
            new_bakiye = current_bakiye + alacak - borc
            
            # Hareketi ekle
            cursor.execute('''
                INSERT INTO cari_hareketler 
                (cari_id, hareket_tipi, prim_id, tarih, aciklama, alacak, borc, bakiye, olusturan_kullanici)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                hareket_data['cari_id'],
                hareket_data['hareket_tipi'],
                hareket_data.get('prim_id'),
                hareket_data['tarih'],
                hareket_data.get('aciklama', ''),
                alacak,
                borc,
                new_bakiye,
                hareket_data.get('olusturan_kullanici', '')
            ))
            
            # Cari bakiyesini güncelle
            cursor.execute('UPDATE cari_hesaplar SET bakiye = ?, guncelleme_tarihi = CURRENT_TIMESTAMP WHERE id = ?', 
                          (new_bakiye, hareket_data['cari_id']))
            
            conn.commit()
            
            logger.info(f"Cari hareket eklendi: Cari {hareket_data['cari_id']}, Yeni bakiye: {new_bakiye}")
            return True, new_bakiye
            
        except sqlite3.OperationalError as e:
            if "locked" in str(e):
                logger.error(f"Database locked hatası: {e}")
                if conn:
                    conn.rollback()
                return False, 0
            raise
            
        except Exception as e:
            logger.error(f"Cari hareket ekleme hatası: {e}")
            if conn:
                conn.rollback()
            return False, 0
            
        finally:
            if conn:
                conn.close()
    
    def cari_guncelle(self, cari_id, cari_data):
        """Mevcut cari hesabı güncelle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE cari_hesaplar 
                SET cari_kodu = ?, cari_adi = ?, telefon = ?, email = ?, adres = ?, notlar = ?, guncelleme_tarihi = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                cari_data['cari_kodu'],
                cari_data['cari_adi'],
                cari_data.get('telefon', ''),
                cari_data.get('email', ''),
                cari_data.get('adres', ''),
                cari_data.get('notlar', ''),
                cari_id
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Cari güncellendi: ID {cari_id}")
            return True, "Cari başarıyla güncellendi"
            
        except Exception as e:
            logger.error(f"Cari güncelleme hatası: {e}")
            return False, str(e)
            
    def eslestirme_listele(self, cari_id):
        """Bir cariye ait tüm hekim eşleştirmelerini listele"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM hekim_cari_eslestirme 
                WHERE cari_id = ? AND aktif = 1
                ORDER BY sube_adi, doktor_adi
            ''', (cari_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Eşleştirme listeleme hatası: {e}")
            return []

    def eslestirme_sil(self, eslestirme_id):
        """Hekim-cari eşleştirmesini sil (aktif=0 yap)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Bu, aktif durumunu pasife çeker, kaydı silmek yerine
            cursor.execute('''
                UPDATE hekim_cari_eslestirme 
                SET aktif = 0, olusturma_tarihi = CURRENT_TIMESTAMP  -- Güncelleme tarihi alanı olmadığı için olusturma_tarihi'ni kullanabiliriz.
                WHERE id = ?
            ''', (eslestirme_id,))
            
            # Tamamen silmek için: cursor.execute("DELETE FROM hekim_cari_eslestirme WHERE id = ?", (eslestirme_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Eşleştirme silindi (pasife çekildi): ID {eslestirme_id}")
            return True, "Eşleştirme başarıyla silindi"
            
        except Exception as e:
            logger.error(f"Eşleştirme silme hatası: {e}")
            return False, str(e)

    def cari_hareket_listele(self, cari_id):
        """Bir cariye ait tüm hareketleri listele (en eski en üstte)"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM cari_hareketler 
                WHERE cari_id = ?
                ORDER BY olusturma_tarihi ASC
            ''', (cari_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Cari hareket listeleme hatası: {e}")
            return []        
# database.py dosyasının SONUNA eklenecek kod

class PersonelDatabase:
    def __init__(self, db_path="data/prim_hesaplamalari.db"):
        self.db_path = db_path
        self.init_personel_tables()
        self.upgrade_cari_table()
        self.upgrade_personel_tables()
        self.upgrade_personel_tables_izin()        
    def maas_sil(self, maas_id):
        """Maaş kaydını ve ilişkili cari hareketini sil"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. Maaş kaydını getir
            cursor.execute("""
                SELECT cari_id, personel_id, donem_ay, donem_yil, odenecek_tutar, odeme_durumu 
                FROM maas_odeme 
                WHERE id = ?
            """, (maas_id,))
            maas = cursor.fetchone()
            
            if not maas:
                return False, "Maaş kaydı bulunamadı"
            
            cari_id, personel_id, donem_ay, donem_yil, odenecek_tutar, odeme_durumu = maas
            
            # 2. Eğer cari_id varsa, ilişkili cari hareketini bul ve sil
            if cari_id:
                # Cari hareketi bul (maas_alacak tipinde ve açıklamada dönem bilgisi olan)
                cursor.execute("""
                    SELECT id FROM cari_hareketler 
                    WHERE cari_id = ? 
                    AND hareket_tipi = 'maas_alacak' 
                    AND aciklama LIKE ?
                """, (cari_id, f"%{donem_ay}/{donem_yil}%"))
                
                hareket = cursor.fetchone()
                if hareket:
                    hareket_id = hareket[0]
                    
                    # Cari hareketi sil (database.py'deki cari_db fonksiyonu)
                    # Önce connection'ı kapat, sonra cari_db fonksiyonunu çağır
                    conn.commit()
                    conn.close()
                    conn = None
                    
                    # CariDatabase üzerinden silme işlemi
                    from database import cari_db
                    success, msg = cari_db.cari_hareket_sil(hareket_id, cari_id)
                    
                    if not success:
                        logger.warning(f"Cari hareketi silinemedi: {msg}")
                    
                    # Yeni connection aç
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
            
            # 3. Maaş kaydını sil
            cursor.execute("DELETE FROM maas_odeme WHERE id = ?", (maas_id,))
            conn.commit()
            
            logger.info(f"Maaş kaydı silindi: Maaş ID {maas_id}, Dönem: {donem_ay}/{donem_yil}")
            return True, "Maaş kaydı ve ilişkili cari hareketi başarıyla silindi"
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Maaş silme hatası: {e}")
            return False, f"Maaş silinirken hata oluştu: {str(e)}"
        finally:
            if conn:
                conn.close()  


    def upgrade_personel_tables_izin(self):
        """Personel tablosuna izin takip alanları ekle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Personel tablosuna yıllık izin alanları ekle
            cursor.execute("PRAGMA table_info(personel)")
            existing_cols = {col[1] for col in cursor.fetchall()}
            
            new_columns = {
                'yillik_izin_hak_edis': "ALTER TABLE personel ADD COLUMN yillik_izin_hak_edis INTEGER DEFAULT 14",
                'yillik_izin_devir': "ALTER TABLE personel ADD COLUMN yillik_izin_devir INTEGER DEFAULT 0",
                'yillik_izin_donemi': "ALTER TABLE personel ADD COLUMN yillik_izin_donemi INTEGER"
            }
            
            for col_name, query in new_columns.items():
                if col_name not in existing_cols:
                    cursor.execute(query)
                    logger.info(f"Personel tablosuna {col_name} eklendi")
            
            # personel_izin tablosuna yeni alanlar ekle
            cursor.execute("PRAGMA table_info(personel_izin)")
            existing_izin_cols = {col[1] for col in cursor.fetchall()}
            
            izin_columns = {
                'ucretli_mi': "ALTER TABLE personel_izin ADD COLUMN ucretli_mi BOOLEAN DEFAULT 1",
                'yillik_izin_kullanimi': "ALTER TABLE personel_izin ADD COLUMN yillik_izin_kullanimi BOOLEAN DEFAULT 0"
            }
            
            for col_name, query in izin_columns.items():
                if col_name not in existing_izin_cols:
                    cursor.execute(query)
                    logger.info(f"personel_izin tablosuna {col_name} eklendi")
            
            conn.commit()
            conn.close()
            logger.info("İzin sistemi alanları başarıyla eklendi")
            
        except Exception as e:
            logger.warning(f"İzin alanları güncellenemedi: {e}")
    def upgrade_maas_odeme_table(self):
        """maas_odeme tablosuna yardım alanlarını ekle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # maas_odeme tablosu kolonlarını kontrol et
            cursor.execute("PRAGMA table_info(maas_odeme)")
            existing_cols = {col[1] for col in cursor.fetchall()}
            
            new_columns = {
                'yol_yardimi': "ALTER TABLE maas_odeme ADD COLUMN yol_yardimi REAL DEFAULT 0",
                'yemek_yardimi': "ALTER TABLE maas_odeme ADD COLUMN yemek_yardimi REAL DEFAULT 0",
                'cocuk_yardimi': "ALTER TABLE maas_odeme ADD COLUMN cocuk_yardimi REAL DEFAULT 0",
                'diger_odenekler': "ALTER TABLE maas_odeme ADD COLUMN diger_odenekler REAL DEFAULT 0"
            }
            
            for col_name, query in new_columns.items():
                if col_name not in existing_cols:
                    cursor.execute(query)
                    logger.info(f"maas_odeme tablosuna {col_name} eklendi")
            
            conn.commit()
            conn.close()
            logger.info("Maaş yardım alanları başarıyla eklendi")
            
        except Exception as e:
            logger.warning(f"Maaş yardım alanları güncellenemedi: {e}")
        

    # ==================== İZİN YÖNETİMİ ====================
    
    def izin_ekle(self, izin_data):
        """Yeni izin kaydı ekle - Yıllık izin kotası kontrolü ile"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            personel_id = izin_data['personel_id']
            gun_sayisi = float(izin_data['gun_sayisi'])
            yillik_izin_kullanimi = izin_data.get('yillik_izin_kullanimi', False)
            
            # Yıllık izin kullanımı kontrolü
            if yillik_izin_kullanimi:
                cursor.execute("""
                    SELECT yillik_izin_hak_edis, yillik_izin_devir 
                    FROM personel 
                    WHERE id = ?
                """, (personel_id,))
                
                result = cursor.fetchone()
                if not result:
                    return False, "Personel bulunamadı"
                
                hak_edis = result[0] or 14
                devir = result[1] or 0
                toplam_hak = hak_edis + devir
                
                # Kullanılan yıllık izinleri hesapla
                cursor.execute("""
                    SELECT COALESCE(SUM(gun_sayisi), 0)
                    FROM personel_izin
                    WHERE personel_id = ? 
                    AND yillik_izin_kullanimi = 1
                    AND onay_durumu != 'reddedildi'
                """, (personel_id,))
                
                kullanilan = cursor.fetchone()[0] or 0
                kalan = toplam_hak - kullanilan
                
                if gun_sayisi > kalan:
                    return False, f"Yetersiz yıllık izin hakkı! Kalan: {kalan} gün, Talep: {gun_sayisi} gün"
            
            # İzin kaydını ekle
            cursor.execute('''
                INSERT INTO personel_izin
                (personel_id, izin_tipi, baslangic_tarihi, bitis_tarihi, gun_sayisi, 
                 aciklama, onay_durumu, ucretli_mi, yillik_izin_kullanimi)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                personel_id,
                izin_data['izin_tipi'],
                izin_data['baslangic_tarihi'],
                izin_data['bitis_tarihi'],
                gun_sayisi,
                izin_data.get('aciklama', ''),
                'onaylandi',  # Otomatik onay
                izin_data.get('ucretli_mi', True),
                yillik_izin_kullanimi
            ))
            
            izin_id = cursor.lastrowid
            conn.commit()
            
            logger.info(f"İzin kaydı eklendi: ID {izin_id}, Personel: {personel_id}")
            return True, izin_id
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"İzin ekleme hatası: {e}")
            return False, str(e)
        finally:
            if conn:
                conn.close()
    
    def izin_listele(self, personel_id=None, baslangic=None, bitis=None, izin_tipi=None):
        """İzinleri listele"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    i.*,
                    p.ad,
                    p.soyad,
                    p.tc_kimlik
                FROM personel_izin i
                JOIN personel p ON i.personel_id = p.id
                WHERE 1=1
            """
            params = []
            
            if personel_id:
                query += " AND i.personel_id = ?"
                params.append(personel_id)
            
            if baslangic:
                query += " AND i.baslangic_tarihi >= ?"
                params.append(baslangic)
            
            if bitis:
                query += " AND i.bitis_tarihi <= ?"
                params.append(bitis)
            
            if izin_tipi:
                query += " AND i.izin_tipi = ?"
                params.append(izin_tipi)
            
            query += " ORDER BY i.baslangic_tarihi DESC"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"İzin listeleme hatası: {e}")
            return []
    
    def izin_sil(self, izin_id):
        """İzin kaydını sil"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM personel_izin WHERE id = ?", (izin_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"İzin kaydı silindi: ID {izin_id}")
            return True, "İzin başarıyla silindi"
            
        except Exception as e:
            logger.error(f"İzin silme hatası: {e}")
            return False, str(e)
    
    def yillik_izin_durumu(self, personel_id):
        """Personelin yıllık izin durumunu getir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Personel bilgileri
            cursor.execute("""
                SELECT 
                    yillik_izin_hak_edis,
                    yillik_izin_devir,
                    yillik_izin_donemi,
                    ise_baslama_tarihi
                FROM personel
                WHERE id = ?
            """, (personel_id,))
            
            personel = cursor.fetchone()
            if not personel:
                return None
            
            hak_edis = personel['yillik_izin_hak_edis'] or 14
            devir = personel['yillik_izin_devir'] or 0
            toplam_hak = hak_edis + devir
            
            # Kullanılan yıllık izinler
            cursor.execute("""
                SELECT COALESCE(SUM(gun_sayisi), 0)
                FROM personel_izin
                WHERE personel_id = ? 
                AND yillik_izin_kullanimi = 1
                AND onay_durumu != 'reddedildi'
            """, (personel_id,))
            
            kullanilan = cursor.fetchone()[0] or 0
            kalan = toplam_hak - kullanilan
            
            conn.close()
            
            return {
                'hak_edis': hak_edis,
                'devir': devir,
                'toplam_hak': toplam_hak,
                'kullanilan': kullanilan,
                'kalan': kalan
            }
            
        except Exception as e:
            logger.error(f"Yıllık izin durumu hatası: {e}")
            return None
    
    def aylik_kesintili_izin_hesapla(self, personel_id, donem_ay, donem_yil):
        """Belirli ay için kesintili izin günlerini hesapla"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # O ayın başı ve sonu
            from datetime import datetime, timedelta
            ay_basi = datetime(donem_yil, donem_ay, 1).date()
            
            if donem_ay == 12:
                ay_sonu = datetime(donem_yil + 1, 1, 1).date() - timedelta(days=1)
            else:
                ay_sonu = datetime(donem_yil, donem_ay + 1, 1).date() - timedelta(days=1)
            
            # Kesintili izinleri getir
            cursor.execute("""
                SELECT gun_sayisi, baslangic_tarihi, bitis_tarihi, izin_tipi
                FROM personel_izin
                WHERE personel_id = ?
                AND ucretli_mi = 0
                AND onay_durumu = 'onaylandi'
                AND (
                    (baslangic_tarihi BETWEEN ? AND ?)
                    OR (bitis_tarihi BETWEEN ? AND ?)
                    OR (baslangic_tarihi <= ? AND bitis_tarihi >= ?)
                )
            """, (personel_id, ay_basi, ay_sonu, ay_basi, ay_sonu, ay_basi, ay_sonu))
            
            izinler = cursor.fetchall()
            toplam_gun = 0
            
            for izin in izinler:
                gun_sayisi = izin[0]
                baslangic = datetime.strptime(izin[1], '%Y-%m-%d').date()
                bitis = datetime.strptime(izin[2], '%Y-%m-%d').date()
                izin_tipi = izin[3]
                
                # İzin bu aya düşüyorsa
                if baslangic <= ay_sonu and bitis >= ay_basi:
                    # O ay içindeki günleri hesapla
                    izin_ay_basi = max(baslangic, ay_basi)
                    izin_ay_sonu = min(bitis, ay_sonu)
                    ay_icindeki_gun = (izin_ay_sonu - izin_ay_basi).days + 1
                    
                    # Hastalık izni özel durumu (ilk 2 gün ücretli)
                    if izin_tipi == 'hastalik':
                        kesintili_gun = max(0, gun_sayisi - 2)
                        # Ay içindeki gün oranla
                        toplam_gun += min(kesintili_gun, ay_icindeki_gun)
                    else:
                        toplam_gun += ay_icindeki_gun
            
            conn.close()
            
            return toplam_gun
            
        except Exception as e:
            logger.error(f"Aylık kesintili izin hesaplama hatası: {e}")
            return 0
    
    def izin_ozet_rapor(self, personel_id=None, donem_yil=None):
        """İzin özet raporu - Tüm personel veya tek personel"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    p.id as personel_id,
                    p.ad,
                    p.soyad,
                    p.yillik_izin_hak_edis,
                    p.yillik_izin_devir,
                    COUNT(CASE WHEN i.izin_tipi = 'yillik' THEN 1 END) as yillik_adet,
                    COALESCE(SUM(CASE WHEN i.yillik_izin_kullanimi = 1 THEN i.gun_sayisi ELSE 0 END), 0) as yillik_kullanilan,
                    COUNT(CASE WHEN i.izin_tipi = 'ucretsiz' THEN 1 END) as ucretsiz_adet,
                    COALESCE(SUM(CASE WHEN i.izin_tipi = 'ucretsiz' THEN i.gun_sayisi ELSE 0 END), 0) as ucretsiz_gun,
                    COUNT(CASE WHEN i.izin_tipi = 'hastalik' THEN 1 END) as hastalik_adet,
                    COALESCE(SUM(CASE WHEN i.izin_tipi = 'hastalik' THEN i.gun_sayisi ELSE 0 END), 0) as hastalik_gun,
                    COUNT(CASE WHEN i.izin_tipi = 'mazeret' THEN 1 END) as mazeret_adet,
                    COALESCE(SUM(CASE WHEN i.izin_tipi = 'mazeret' THEN i.gun_sayisi ELSE 0 END), 0) as mazeret_gun,
                    COALESCE(SUM(CASE WHEN i.ucretli_mi = 0 THEN i.gun_sayisi ELSE 0 END), 0) as toplam_kesintili
                FROM personel p
                LEFT JOIN personel_izin i ON p.id = i.personel_id
                WHERE p.calisma_durumu = 'aktif'
            """
            params = []
            
            if personel_id:
                query += " AND p.id = ?"
                params.append(personel_id)
            
            if donem_yil:
                query += " AND strftime('%Y', i.baslangic_tarihi) = ?"
                params.append(str(donem_yil))
            
            query += " GROUP BY p.id, p.ad, p.soyad, p.yillik_izin_hak_edis, p.yillik_izin_devir"
            query += " ORDER BY p.ad, p.soyad"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            rapor = []
            for row in results:
                data = dict(row)
                hak_edis = data['yillik_izin_hak_edis'] or 14
                devir = data['yillik_izin_devir'] or 0
                toplam_hak = hak_edis + devir
                kullanilan = data['yillik_kullanilan']
                kalan = toplam_hak - kullanilan
                
                data['yillik_toplam_hak'] = toplam_hak
                data['yillik_kalan'] = kalan
                rapor.append(data)
            
            conn.close()
            return rapor
            
        except Exception as e:
            logger.error(f"İzin özet rapor hatası: {e}")
            return []

         
    def personel_sil(self, personel_id, admin_sifre):
        """Personel kaydını sil - Cari'yi de siler (hareket yoksa)"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. Personel bilgisini getir
            cursor.execute("SELECT ad, soyad, cari_id FROM personel WHERE id = ?", (personel_id,))
            personel = cursor.fetchone()
            
            if not personel:
                return False, "Personel bulunamadı"
            
            ad, soyad, cari_id = personel
            
            # 2. İlişkili kayıtları kontrol et
            cursor.execute("SELECT COUNT(*) FROM maas_odeme WHERE personel_id = ?", (personel_id,))
            maas_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM personel_izin WHERE personel_id = ?", (personel_id,))
            izin_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM personel_egitim WHERE personel_id = ?", (personel_id,))
            egitim_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM personel_dokuman WHERE personel_id = ?", (personel_id,))
            dokuman_count = cursor.fetchone()[0]
            
            toplam_kayit = maas_count + izin_count + egitim_count + dokuman_count
            
            if toplam_kayit > 0:
                detay = f"""Bu personele ait kayıtlar bulunmaktadır:
    - Maaş kayıtları: {maas_count}
    - İzin kayıtları: {izin_count}
    - Eğitim kayıtları: {egitim_count}
    - Döküman kayıtları: {dokuman_count}

    Toplam: {toplam_kayit} kayıt

    Silmek için önce bu kayıtları silmelisiniz."""
                return False, detay
            
            # 3. Cari hesabı kontrol et (ÖNEMLİ KONTROL)
            if cari_id:
                cursor.execute("SELECT COUNT(*) FROM cari_hareketler WHERE cari_id = ?", (cari_id,))
                hareket_count = cursor.fetchone()[0]
                
                if hareket_count > 0:
                    return False, f"""Bu personelin cari hesabında {hareket_count} adet hareket bulunmaktadır.

    Önce cari hareketlerini silmelisiniz:
    1. Cari Yönetimi sayfasına gidin
    2. {ad} {soyad} isimli cari'yi bulun
    3. Hareketlerini görüntüleyin ve silin
    4. Sonra personeli silebilirsiniz"""
            
            # 4. Personeli sil
            cursor.execute("DELETE FROM personel WHERE id = ?", (personel_id,))
            
            # 5. Cari hesabı ve eşleştirmelerini sil (hareket yoksa)
            if cari_id:
                cursor.execute("DELETE FROM hekim_cari_eslestirme WHERE cari_id = ?", (cari_id,))
                cursor.execute("DELETE FROM cari_hesaplar WHERE id = ?", (cari_id,))
                logger.info(f"Cari hesap da silindi: Cari ID {cari_id}")
            
            conn.commit()
            
            logger.info(f"Personel ve cari silindi: {ad} {soyad} (Personel ID: {personel_id}, Cari ID: {cari_id})")
            return True, f"{ad} {soyad} ve ilişkili cari hesap başarıyla silindi"
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Personel silme hatası: {e}")
            return False, f"Silme işlemi başarısız: {str(e)}"
        finally:
            if conn:
                conn.close()
    
    def upgrade_cari_table(self):
        """Mevcut cari_hesaplar tablosuna yeni alanlar ekle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Tablonun mevcut sütunlarını kontrol et
            cursor.execute("PRAGMA table_info(cari_hesaplar)")
            columns = [column[1] for column in cursor.fetchall()]
            
            # cari_turu alanı yoksa ekle
            if 'cari_turu' not in columns:
                cursor.execute("ALTER TABLE cari_hesaplar ADD COLUMN cari_turu TEXT DEFAULT 'hekim'")
                logger.info("cari_turu alanı eklendi")
            
            # alt_turu alanı yoksa ekle
            if 'alt_turu' not in columns:
                cursor.execute("ALTER TABLE cari_hesaplar ADD COLUMN alt_turu TEXT")
                logger.info("alt_turu alanı eklendi")
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.warning(f"Cari tablo güncelleme hatası (muhtemelen zaten güncel): {e}")
    
    def init_personel_tables(self):
        """Personel yönetim tablolarını oluştur"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 1. PERSONEL ANA TABLO
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personel (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cari_id INTEGER,
                    tc_kimlik TEXT UNIQUE NOT NULL,
                    ad TEXT NOT NULL,
                    soyad TEXT NOT NULL,
                    dogum_tarihi DATE,
                    cinsiyet TEXT,
                    adres TEXT,
                    telefon TEXT,
                    email TEXT,
                    
                    acil_durum_kisi TEXT,
                    acil_durum_telefon TEXT,
                    acil_durum_yakinlik TEXT,
                    
                    sube_id TEXT,
                    departman TEXT,
                    pozisyon TEXT,
                    ise_baslama_tarihi DATE NOT NULL,
                    ise_baslangic_egitim_veren TEXT,
                    ise_baslangic_egitim_tarihi DATE,
                    tecrube_durumu TEXT DEFAULT 'yeni',
                    deneme_suresi_gun INTEGER DEFAULT 0,
                    
                    calisma_durumu TEXT DEFAULT 'aktif',
                    ayrilis_tarihi DATE,
                    ayrilis_nedeni TEXT,
                    
                    fotograf BLOB,
                    
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    guncelleme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (cari_id) REFERENCES cari_hesaplar(id)
                )
            ''')
            
            # 2. EĞİTİM BİLGİLERİ
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personel_egitim (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    personel_id INTEGER NOT NULL,
                    egitim_turu TEXT NOT NULL,
                    okul_adi TEXT NOT NULL,
                    bolum TEXT,
                    mezuniyet_yili INTEGER,
                    sertifika_adi TEXT,
                    belge_no TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE
                )
            ''')
            
            # 3. DOKÜMAN TAKİP
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personel_dokuman (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    personel_id INTEGER NOT NULL,
                    dokuman_tipi TEXT NOT NULL,
                    dosya_adi TEXT,
                    dosya_yolu TEXT,
                    onay_tarihi DATE,
                    gecerlilik_tarihi DATE,
                    notlar TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE
                )
            ''')
            
            # 4. MAAŞ BİLGİLERİ
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personel_maas_bilgileri (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    personel_id INTEGER NOT NULL,
                    brut_maas REAL NOT NULL,
                    net_maas REAL NOT NULL,
                    prim REAL DEFAULT 0,
                    yemek_yardimi REAL DEFAULT 0,
                    yol_yardimi REAL DEFAULT 0,
                    diger_odemeler REAL DEFAULT 0,
                    baslangic_tarihi DATE NOT NULL,
                    bitis_tarihi DATE,
                    aktif BOOLEAN DEFAULT 1,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE
                )
            ''')
            
            # 5. MAAŞ ÖDEME KAYITLARI
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS maas_odeme (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    personel_id INTEGER NOT NULL,
                    cari_id INTEGER,
                    donem_ay INTEGER NOT NULL,
                    donem_yil INTEGER NOT NULL,
                    
                    brut_maas REAL NOT NULL,
                    net_maas REAL NOT NULL,
                    
                    ucretsiz_izin_gun INTEGER DEFAULT 0,
                    ucretsiz_izin_kesinti REAL DEFAULT 0,
                    
                    fazla_mesai_saat REAL DEFAULT 0,
                    fazla_mesai_ucret REAL DEFAULT 0,
                    
                    prim REAL DEFAULT 0,
                    bonus REAL DEFAULT 0,
                    
                    odenecek_tutar REAL NOT NULL,
                    odeme_tarihi DATE,
                    odeme_yontemi TEXT,
                    odeme_durumu TEXT DEFAULT 'beklemede',
                    
                    notlar TEXT,
                    olusturan_kullanici TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE,
                    FOREIGN KEY (cari_id) REFERENCES cari_hesaplar(id),
                    UNIQUE(personel_id, donem_ay, donem_yil)
                )
            ''')
            
            # 6. İZİN KAYITLARI
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS personel_izin (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    personel_id INTEGER NOT NULL,
                    izin_tipi TEXT NOT NULL,
                    baslangic_tarihi DATE NOT NULL,
                    bitis_tarihi DATE NOT NULL,
                    gun_sayisi INTEGER NOT NULL,
                    aciklama TEXT,
                    onay_durumu TEXT DEFAULT 'beklemede',
                    onaylayan TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (personel_id) REFERENCES personel(id) ON DELETE CASCADE
                )
            ''')
            
            # İndeksler
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_personel_tc ON personel(tc_kimlik)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_personel_durum ON personel(calisma_durumu)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_personel_cari ON personel(cari_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_maas_donem ON maas_odeme(donem_yil, donem_ay)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_izin_tarih ON personel_izin(baslangic_tarihi, bitis_tarihi)')
            
            conn.commit()
            conn.close()
            logger.info("Personel tabloları başarıyla oluşturuldu")
            
        except Exception as e:
            logger.error(f"Personel tablo oluşturma hatası: {e}")
            raise
    def upgrade_personel_tables(self):
        """Personel tablolarına yeni alanlar ekle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Mevcut personel kolonlarını kontrol et
            cursor.execute("PRAGMA table_info(personel)")
            existing_cols = {col[1] for col in cursor.fetchall()}
            
            # Yeni kolonlar ekle (eğer yoksa)
            new_columns = {
                'hesap_numarasi': "ALTER TABLE personel ADD COLUMN hesap_numarasi TEXT",
                'hekim_mi': "ALTER TABLE personel ADD COLUMN hekim_mi BOOLEAN DEFAULT 0",
                'sgk_sicil_no': "ALTER TABLE personel ADD COLUMN sgk_sicil_no TEXT",
                'sgk_baslangic_tarihi': "ALTER TABLE personel ADD COLUMN sgk_baslangic_tarihi DATE",
            }
            
            for col_name, query in new_columns.items():
                if col_name not in existing_cols:
                    cursor.execute(query)
                    logger.info(f"Personel tablosuna {col_name} kolonu eklendi")
            
            # Maaş tablosu güncellemeleri
            cursor.execute("PRAGMA table_info(personel_maas_bilgileri)")
            existing_maas_cols = {col[1] for col in cursor.fetchall()}
            
            maas_columns = {
                'cocuk_yardimi': "ALTER TABLE personel_maas_bilgileri ADD COLUMN cocuk_yardimi REAL DEFAULT 0",
                'diger_odenekler': "ALTER TABLE personel_maas_bilgileri ADD COLUMN diger_odenekler REAL DEFAULT 0",
            }
            
            for col_name, query in maas_columns.items():
                if col_name not in existing_maas_cols:
                    cursor.execute(query)
                    logger.info(f"Maaş tablosuna {col_name} kolonu eklendi")
            
            # İş başvuru tablosu oluştur
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS is_basvurulari (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tc_kimlik TEXT NOT NULL,
                    ad TEXT NOT NULL,
                    soyad TEXT NOT NULL,
                    dogum_tarihi DATE,
                    cinsiyet TEXT,
                    telefon TEXT NOT NULL,
                    email TEXT,
                    adres TEXT,
                    acil_kisi TEXT,
                    acil_telefon TEXT,
                    egitim_durumu TEXT,
                    mezun_okul TEXT,
                    bolum TEXT,
                    mezuniyet_yili INTEGER,
                    onceki_is_yeri TEXT,
                    onceki_pozisyon TEXT,
                    calisma_suresi TEXT,
                    basvuru_pozisyon TEXT,
                    tercih_sube TEXT,
                    basvuru_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    gorusme_tarihi DATETIME,
                    referans_kisi TEXT,
                    referans_telefon TEXT,
                    ehliyet_var BOOLEAN DEFAULT 0,
                    ehliyet_sinif TEXT,
                    kronik_hastalik TEXT,
                    notlar TEXT,
                    durum TEXT DEFAULT 'beklemede',
                    personel_id INTEGER,
                    degerlendiren_kullanici TEXT,
                    degerlendirme_notu TEXT,
                    olusturma_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (personel_id) REFERENCES personel(id)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Personel tabloları başarıyla güncellendi")
            
        except Exception as e:
            logger.warning(f"Tablo güncelleme hatası: {e}")        
    
    # ==================== PERSONEL CRUD ====================
    
    def personel_ekle(self, personel_data, cari_olustur=True):
        """Yeni personel ekle ve isteğe bağlı cari hesap oluştur"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cari_id = None
            
            # Cari hesap oluştur
            if cari_olustur:
                # TC kimlik tamamını kullan, benzersiz olsun
                cari_kodu = f"PER-{personel_data['tc_kimlik']}"
                cari_adi = f"{personel_data['ad']} {personel_data['soyad']}"
                
                # Eğer bu TC için zaten cari varsa, onu kullan
                cursor.execute("SELECT id FROM cari_hesaplar WHERE cari_kodu = ?", (cari_kodu,))
                existing_cari = cursor.fetchone()
                
                if existing_cari:
                    cari_id = existing_cari[0]
                    logger.info(f"Mevcut cari kullanılıyor: {cari_id}")
                else:
                    cursor.execute('''
                        INSERT INTO cari_hesaplar 
                        (cari_kodu, cari_adi, telefon, email, adres, cari_turu, alt_turu)
                        VALUES (?, ?, ?, ?, ?, 'personel', ?)
                    ''', (
                        cari_kodu,
                        cari_adi,
                        personel_data.get('telefon', ''),
                        personel_data.get('email', ''),
                        personel_data.get('adres', ''),
                        personel_data.get('pozisyon', 'diger')
                    ))
                    
                    cari_id = cursor.lastrowid
            
            # Personel kaydı oluştur
            cursor.execute('''
                INSERT INTO personel 
                (cari_id, tc_kimlik, ad, soyad, dogum_tarihi, cinsiyet, adres, telefon, email,
                 acil_durum_kisi, acil_durum_telefon, acil_durum_yakinlik,
                 sube_id, departman, pozisyon, ise_baslama_tarihi, 
                 ise_baslangic_egitim_veren, ise_baslangic_egitim_tarihi,
                 tecrube_durumu, deneme_suresi_gun, fotograf)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                cari_id,
                personel_data['tc_kimlik'],
                personel_data['ad'],
                personel_data['soyad'],
                personel_data.get('dogum_tarihi'),
                personel_data.get('cinsiyet'),
                personel_data.get('adres'),
                personel_data.get('telefon'),
                personel_data.get('email'),
                personel_data.get('acil_durum_kisi'),
                personel_data.get('acil_durum_telefon'),
                personel_data.get('acil_durum_yakinlik'),
                personel_data.get('sube_id'),
                personel_data.get('departman'),
                personel_data.get('pozisyon'),
                personel_data['ise_baslama_tarihi'],
                personel_data.get('ise_baslangic_egitim_veren'),
                personel_data.get('ise_baslangic_egitim_tarihi'),
                personel_data.get('tecrube_durumu', 'yeni'),
                personel_data.get('deneme_suresi_gun', 0),
                personel_data.get('fotograf')
            ))
            
            personel_id = cursor.lastrowid
            conn.commit()
            
            logger.info(f"Yeni personel eklendi: ID {personel_id}, Cari ID: {cari_id}")
            return personel_id, cari_id
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Personel ekleme hatası: {e}")
            raise
        finally:
            if conn:
                conn.close()
                
    def personel_listele(self, sadece_aktif=True, sube_id=None):
        """Personel listesini getir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = "SELECT * FROM personel WHERE 1=1"
            params = []
            
            if sadece_aktif:
                query += " AND calisma_durumu = 'aktif'"
            
            if sube_id:
                query += " AND sube_id = ?"
                params.append(sube_id)
            
            query += " ORDER BY ad, soyad"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Personel listeleme hatası: {e}")
            return []
    
    def personel_detay_getir(self, personel_id):
        """Personel detaylarını getir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Ana bilgi
            cursor.execute("SELECT * FROM personel WHERE id = ?", (personel_id,))
            personel = cursor.fetchone()
            
            if not personel:
                return None
            
            # Eğitim bilgileri
            cursor.execute("SELECT * FROM personel_egitim WHERE personel_id = ?", (personel_id,))
            egitimler = cursor.fetchall()
            
            # Dokümanlar
            cursor.execute("SELECT * FROM personel_dokuman WHERE personel_id = ?", (personel_id,))
            dokumanlar = cursor.fetchall()
            
            # Maaş bilgisi (aktif)
            cursor.execute("SELECT * FROM personel_maas_bilgileri WHERE personel_id = ? AND aktif = 1", (personel_id,))
            maas = cursor.fetchone()
            
            conn.close()
            
            return {
                'personel': dict(personel),
                'egitimler': [dict(e) for e in egitimler],
                'dokumanlar': [dict(d) for d in dokumanlar],
                'maas': dict(maas) if maas else None
            }
            
        except Exception as e:
            logger.error(f"Personel detay getirme hatası: {e}")
            return None
    
    def personel_guncelle(self, personel_id, personel_data):
        """Personel bilgilerini güncelle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE personel SET
                    ad = ?, soyad = ?, dogum_tarihi = ?, cinsiyet = ?,
                    adres = ?, telefon = ?, email = ?,
                    acil_durum_kisi = ?, acil_durum_telefon = ?, acil_durum_yakinlik = ?,
                    sube_id = ?, departman = ?, pozisyon = ?,
                    guncelleme_tarihi = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (
                personel_data['ad'],
                personel_data['soyad'],
                personel_data.get('dogum_tarihi'),
                personel_data.get('cinsiyet'),
                personel_data.get('adres'),
                personel_data.get('telefon'),
                personel_data.get('email'),
                personel_data.get('acil_durum_kisi'),
                personel_data.get('acil_durum_telefon'),
                personel_data.get('acil_durum_yakinlik'),
                personel_data.get('sube_id'),
                personel_data.get('departman'),
                personel_data.get('pozisyon'),
                personel_id
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Personel güncelleme hatası: {e}")
            return False
    
    # ==================== MAAŞ YÖNETİMİ ====================
    
    def maas_bilgisi_tanimla(self, personel_id, maas_data):
        """Personel için maaş bilgisi tanımla"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Önceki maaş tanımını pasife al
            cursor.execute('''
                UPDATE personel_maas_bilgileri 
                SET aktif = 0, bitis_tarihi = ?
                WHERE personel_id = ? AND aktif = 1
            ''', (maas_data['baslangic_tarihi'], personel_id))
            
            # Yeni maaş tanımı ekle
            cursor.execute('''
                INSERT INTO personel_maas_bilgileri
                (personel_id, brut_maas, net_maas, prim, yemek_yardimi, yol_yardimi, 
                 diger_odemeler, baslangic_tarihi)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                personel_id,
                maas_data['brut_maas'],
                maas_data['net_maas'],  
                maas_data.get('prim', 0),
                maas_data.get('yemek_yardimi', 0),
                maas_data.get('yol_yardimi', 0),
                maas_data.get('diger_odemeler', 0),
                maas_data['baslangic_tarihi']
            ))
            
            conn.commit()
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Maaş tanımlama hatası: {e}")
            return False
    
    # database.py içinde PersonelDatabase sınıfında
# maas_odeme_kaydet() fonksiyonunu BUL ve DEĞİŞTİR
# Yaklaşık satır 850 civarında

    def maas_odeme_kaydet(self, data):
        """Maaş ödemesi kaydet - Yardımlar dahil (SADECE hesaplama, ödeme değil)"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path, timeout=30.0)
            cursor = conn.cursor()
            
            # Maaş kaydı oluştur - DURUM: beklemede
            cursor.execute('''
                INSERT INTO maas_odeme
                (personel_id, cari_id, donem_ay, donem_yil, brut_maas, net_maas,
                 ucretsiz_izin_gun, ucretsiz_izin_kesinti, 
                 fazla_mesai_saat, fazla_mesai_ucret,
                 prim, bonus, odenecek_tutar, 
                 odeme_tarihi, odeme_yontemi, odeme_durumu,
                 notlar, olusturan_kullanici)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['personel_id'],
                data.get('cari_id'),
                data['donem_ay'],
                data['donem_yil'],
                data['brut_maas'],
                data['net_maas'],
                data.get('ucretsiz_izin_gun', 0),
                data.get('ucretsiz_izin_kesinti', 0),
                data.get('fazla_mesai_saat', 0),
                data.get('fazla_mesai_ucret', 0),
                data.get('prim', 0),
                data.get('bonus', 0),
                data['odenecek_tutar'],
                data.get('odeme_tarihi'),
                data.get('odeme_yontemi'),
                'beklemede',
                data.get('notlar'),
                data.get('olusturan_kullanici')
            ))
            
            maas_id = cursor.lastrowid
            conn.commit()
            
            logger.info(f"Maaş hesaplaması kaydedildi: ID {maas_id}, Durum: beklemede")
            return maas_id
            
        except sqlite3.OperationalError as e:
            if "locked" in str(e):
                logger.error(f"Database locked hatası: {e}")
                if conn:
                    conn.rollback()
                raise Exception("Veritabanı meşgul, lütfen tekrar deneyin")
            raise
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Maaş kaydetme hatası: {e}")
            raise
            
        finally:
            if conn:
                conn.close()

            # NOT: Eğer maas_odeme tablosuna yardım kolonları eklenmediyse, aşağıdaki SQL'i çalıştırın:

            """
            -- SQLite veritabanında manuel olarak çalıştırılacak (sadece gerekirse):

            ALTER TABLE maas_odeme ADD COLUMN yol_yardimi REAL DEFAULT 0;
            ALTER TABLE maas_odeme ADD COLUMN yemek_yardimi REAL DEFAULT 0;
            ALTER TABLE maas_odeme ADD COLUMN cocuk_yardimi REAL DEFAULT 0;
            ALTER TABLE maas_odeme ADD COLUMN diger_odenekler REAL DEFAULT 0;

            -- Veya init_personel_tables() fonksiyonunda tabloya bu kolonları ekleyin
            """

    
    def maas_listele(self, donem_ay=None, donem_yil=None, personel_id=None, cari_turu=None, alt_turu=None):
        """Maaş ödemelerini listele (cari_turu ve alt_turu filtreli)"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = '''
                SELECT m.*, p.ad, p.soyad, p.tc_kimlik, p.pozisyon, c.cari_turu, c.alt_turu
                FROM maas_odeme m
                JOIN personel p ON m.personel_id = p.id
                LEFT JOIN cari_hesaplar c ON m.cari_id = c.id
                WHERE 1=1
            '''
            params = []
            
            if donem_ay:
                query += " AND m.donem_ay = ?"
                params.append(donem_ay)
            
            if donem_yil:
                query += " AND m.donem_yil = ?"
                params.append(donem_yil)
            
            if personel_id:
                query += " AND m.personel_id = ?"
                params.append(personel_id)

            if cari_turu:
                query += " AND c.cari_turu = ?"
                params.append(cari_turu)

            if alt_turu:
                query += " AND c.alt_turu = ?"
                params.append(alt_turu)
            
            query += " ORDER BY m.donem_yil DESC, m.donem_ay DESC, p.ad"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"Maaş listeleme hatası: {e}")
            return []
   

    def upgrade_personel_tables_izin(self):
        """Personel tablosuna izin takip alanları ekle"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Personel tablosuna yıllık izin alanları ekle
            cursor.execute("PRAGMA table_info(personel)")
            existing_cols = {col[1] for col in cursor.fetchall()}
            
            new_columns = {
                'yillik_izin_hak_edis': "ALTER TABLE personel ADD COLUMN yillik_izin_hak_edis INTEGER DEFAULT 14",
                'yillik_izin_devir': "ALTER TABLE personel ADD COLUMN yillik_izin_devir INTEGER DEFAULT 0",
                'yillik_izin_donemi': "ALTER TABLE personel ADD COLUMN yillik_izin_donemi INTEGER"
            }
            
            for col_name, query in new_columns.items():
                if col_name not in existing_cols:
                    cursor.execute(query)
                    logger.info(f"Personel tablosuna {col_name} eklendi")
            
            # personel_izin tablosuna yeni alanlar ekle
            cursor.execute("PRAGMA table_info(personel_izin)")
            existing_izin_cols = {col[1] for col in cursor.fetchall()}
            
            izin_columns = {
                'ucretli_mi': "ALTER TABLE personel_izin ADD COLUMN ucretli_mi BOOLEAN DEFAULT 1",
                'yillik_izin_kullanimi': "ALTER TABLE personel_izin ADD COLUMN yillik_izin_kullanimi BOOLEAN DEFAULT 0"
            }
            
            for col_name, query in izin_columns.items():
                if col_name not in existing_izin_cols:
                    cursor.execute(query)
                    logger.info(f"personel_izin tablosuna {col_name} eklendi")
            
            conn.commit()
            conn.close()
            logger.info("İzin sistemi alanları başarıyla eklendi")
            
        except Exception as e:
            logger.warning(f"İzin alanları güncellenemedi: {e}")

    # ==================== İZİN YÖNETİMİ ====================
    
    def izin_ekle(self, izin_data):
        """Yeni izin kaydı ekle - Yıllık izin kotası kontrolü ile"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            personel_id = izin_data['personel_id']
            gun_sayisi = float(izin_data['gun_sayisi'])
            yillik_izin_kullanimi = izin_data.get('yillik_izin_kullanimi', False)
            
            # Yıllık izin kullanımı kontrolü
            if yillik_izin_kullanimi:
                cursor.execute("""
                    SELECT yillik_izin_hak_edis, yillik_izin_devir 
                    FROM personel 
                    WHERE id = ?
                """, (personel_id,))
                
                result = cursor.fetchone()
                if not result:
                    return False, "Personel bulunamadı"
                
                hak_edis = result[0] or 14
                devir = result[1] or 0
                toplam_hak = hak_edis + devir
                
                # Kullanılan yıllık izinleri hesapla
                cursor.execute("""
                    SELECT COALESCE(SUM(gun_sayisi), 0)
                    FROM personel_izin
                    WHERE personel_id = ? 
                    AND yillik_izin_kullanimi = 1
                    AND onay_durumu != 'reddedildi'
                """, (personel_id,))
                
                kullanilan = cursor.fetchone()[0] or 0
                kalan = toplam_hak - kullanilan
                
                if gun_sayisi > kalan:
                    return False, f"Yetersiz yıllık izin hakkı! Kalan: {kalan} gün, Talep: {gun_sayisi} gün"
            
            # İzin kaydını ekle
            cursor.execute('''
                INSERT INTO personel_izin
                (personel_id, izin_tipi, baslangic_tarihi, bitis_tarihi, gun_sayisi, 
                 aciklama, onay_durumu, ucretli_mi, yillik_izin_kullanimi)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                personel_id,
                izin_data['izin_tipi'],
                izin_data['baslangic_tarihi'],
                izin_data['bitis_tarihi'],
                gun_sayisi,
                izin_data.get('aciklama', ''),
                'onaylandi',  # Otomatik onay
                izin_data.get('ucretli_mi', True),
                yillik_izin_kullanimi
            ))
            
            izin_id = cursor.lastrowid
            conn.commit()
            
            logger.info(f"İzin kaydı eklendi: ID {izin_id}, Personel: {personel_id}")
            return True, izin_id
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"İzin ekleme hatası: {e}")
            return False, str(e)
        finally:
            if conn:
                conn.close()
    
    def izin_listele(self, personel_id=None, baslangic=None, bitis=None, izin_tipi=None):
        """İzinleri listele"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    i.*,
                    p.ad,
                    p.soyad,
                    p.tc_kimlik
                FROM personel_izin i
                JOIN personel p ON i.personel_id = p.id
                WHERE 1=1
            """
            params = []
            
            if personel_id:
                query += " AND i.personel_id = ?"
                params.append(personel_id)
            
            if baslangic:
                query += " AND i.baslangic_tarihi >= ?"
                params.append(baslangic)
            
            if bitis:
                query += " AND i.bitis_tarihi <= ?"
                params.append(bitis)
            
            if izin_tipi:
                query += " AND i.izin_tipi = ?"
                params.append(izin_tipi)
            
            query += " ORDER BY i.baslangic_tarihi DESC"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in results]
            
        except Exception as e:
            logger.error(f"İzin listeleme hatası: {e}")
            return []
    
    def izin_sil(self, izin_id):
        """İzin kaydını sil"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM personel_izin WHERE id = ?", (izin_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"İzin kaydı silindi: ID {izin_id}")
            return True, "İzin başarıyla silindi"
            
        except Exception as e:
            logger.error(f"İzin silme hatası: {e}")
            return False, str(e)
    
    def yillik_izin_durumu(self, personel_id):
        """Personelin yıllık izin durumunu getir"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Personel bilgileri
            cursor.execute("""
                SELECT 
                    yillik_izin_hak_edis,
                    yillik_izin_devir,
                    yillik_izin_donemi,
                    ise_baslama_tarihi
                FROM personel
                WHERE id = ?
            """, (personel_id,))
            
            personel = cursor.fetchone()
            if not personel:
                return None
            
            hak_edis = personel['yillik_izin_hak_edis'] or 14
            devir = personel['yillik_izin_devir'] or 0
            toplam_hak = hak_edis + devir
            
            # Kullanılan yıllık izinler
            cursor.execute("""
                SELECT COALESCE(SUM(gun_sayisi), 0)
                FROM personel_izin
                WHERE personel_id = ? 
                AND yillik_izin_kullanimi = 1
                AND onay_durumu != 'reddedildi'
            """, (personel_id,))
            
            kullanilan = cursor.fetchone()[0] or 0
            kalan = toplam_hak - kullanilan
            
            conn.close()
            
            return {
                'hak_edis': hak_edis,
                'devir': devir,
                'toplam_hak': toplam_hak,
                'kullanilan': kullanilan,
                'kalan': kalan
            }
            
        except Exception as e:
            logger.error(f"Yıllık izin durumu hatası: {e}")
            return None
    
    def aylik_kesintili_izin_hesapla(self, personel_id, donem_ay, donem_yil):
        """Belirli ay için kesintili izin günlerini hesapla"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # O ayın başı ve sonu
            from datetime import datetime, timedelta
            ay_basi = datetime(donem_yil, donem_ay, 1).date()
            
            if donem_ay == 12:
                ay_sonu = datetime(donem_yil + 1, 1, 1).date() - timedelta(days=1)
            else:
                ay_sonu = datetime(donem_yil, donem_ay + 1, 1).date() - timedelta(days=1)
            
            # Kesintili izinleri getir
            cursor.execute("""
                SELECT gun_sayisi, baslangic_tarihi, bitis_tarihi, izin_tipi
                FROM personel_izin
                WHERE personel_id = ?
                AND ucretli_mi = 0
                AND onay_durumu = 'onaylandi'
                AND (
                    (baslangic_tarihi BETWEEN ? AND ?)
                    OR (bitis_tarihi BETWEEN ? AND ?)
                    OR (baslangic_tarihi <= ? AND bitis_tarihi >= ?)
                )
            """, (personel_id, ay_basi, ay_sonu, ay_basi, ay_sonu, ay_basi, ay_sonu))
            
            izinler = cursor.fetchall()
            toplam_gun = 0
            
            for izin in izinler:
                gun_sayisi = izin[0]
                baslangic = datetime.strptime(izin[1], '%Y-%m-%d').date()
                bitis = datetime.strptime(izin[2], '%Y-%m-%d').date()
                izin_tipi = izin[3]
                
                # İzin bu aya düşüyorsa
                if baslangic <= ay_sonu and bitis >= ay_basi:
                    # O ay içindeki günleri hesapla
                    izin_ay_basi = max(baslangic, ay_basi)
                    izin_ay_sonu = min(bitis, ay_sonu)
                    ay_icindeki_gun = (izin_ay_sonu - izin_ay_basi).days + 1
                    
                    # Hastalık izni özel durumu (ilk 2 gün ücretli)
                    if izin_tipi == 'hastalik':
                        kesintili_gun = max(0, gun_sayisi - 2)
                        # Ay içindeki gün oranla
                        toplam_gun += min(kesintili_gun, ay_icindeki_gun)
                    else:
                        toplam_gun += ay_icindeki_gun
            
            conn.close()
            
            return toplam_gun
            
        except Exception as e:
            logger.error(f"Aylık kesintili izin hesaplama hatası: {e}")
            return 0
    
    def izin_ozet_rapor(self, personel_id=None, donem_yil=None):
        """İzin özet raporu - Tüm personel veya tek personel"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT 
                    p.id as personel_id,
                    p.ad,
                    p.soyad,
                    p.yillik_izin_hak_edis,
                    p.yillik_izin_devir,
                    COUNT(CASE WHEN i.izin_tipi = 'yillik' THEN 1 END) as yillik_adet,
                    COALESCE(SUM(CASE WHEN i.yillik_izin_kullanimi = 1 THEN i.gun_sayisi ELSE 0 END), 0) as yillik_kullanilan,
                    COUNT(CASE WHEN i.izin_tipi = 'ucretsiz' THEN 1 END) as ucretsiz_adet,
                    COALESCE(SUM(CASE WHEN i.izin_tipi = 'ucretsiz' THEN i.gun_sayisi ELSE 0 END), 0) as ucretsiz_gun,
                    COUNT(CASE WHEN i.izin_tipi = 'hastalik' THEN 1 END) as hastalik_adet,
                    COALESCE(SUM(CASE WHEN i.izin_tipi = 'hastalik' THEN i.gun_sayisi ELSE 0 END), 0) as hastalik_gun,
                    COUNT(CASE WHEN i.izin_tipi = 'mazeret' THEN 1 END) as mazeret_adet,
                    COALESCE(SUM(CASE WHEN i.izin_tipi = 'mazeret' THEN i.gun_sayisi ELSE 0 END), 0) as mazeret_gun,
                    COALESCE(SUM(CASE WHEN i.ucretli_mi = 0 THEN i.gun_sayisi ELSE 0 END), 0) as toplam_kesintili
                FROM personel p
                LEFT JOIN personel_izin i ON p.id = i.personel_id
                WHERE p.calisma_durumu = 'aktif'
            """
            params = []
            
            if personel_id:
                query += " AND p.id = ?"
                params.append(personel_id)
            
            if donem_yil:
                query += " AND strftime('%Y', i.baslangic_tarihi) = ?"
                params.append(str(donem_yil))
            
            query += " GROUP BY p.id, p.ad, p.soyad, p.yillik_izin_hak_edis, p.yillik_izin_devir"
            query += " ORDER BY p.ad, p.soyad"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            rapor = []
            for row in results:
                data = dict(row)
                hak_edis = data['yillik_izin_hak_edis'] or 14
                devir = data['yillik_izin_devir'] or 0
                toplam_hak = hak_edis + devir
                kullanilan = data['yillik_kullanilan']
                kalan = toplam_hak - kullanilan
                
                data['yillik_toplam_hak'] = toplam_hak
                data['yillik_kalan'] = kalan
                rapor.append(data)
            
            conn.close()
            return rapor
            
        except Exception as e:
            logger.error(f"İzin özet rapor hatası: {e}")
            return []

       


# Global instance
personel_db = PersonelDatabase()            

# Global instance
cari_db = CariDatabase()            

# Global prim database instance
prim_db = PrimDatabase()