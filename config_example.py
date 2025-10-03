# config_example.py

# MySQL Veritabanı Bağlantı Bilgileri
# Bu bilgileri kendi yerel veya uzak sunucunuzdaki GECERLI degerlerle degistirmelisiniz.
MYSQL_HOST = 'YOUR_DB_HOST_ADDRESS_HERE'  #
MYSQL_USER = 'YOUR_DB_USERNAME_HERE'     # 
MYSQL_PASSWORD = 'YOUR_DB_PASSWORD_HERE' # 
MYSQL_DB = 'YOUR_DB_NAME_HERE'           #

# Kullanıcılar ve Varsayılan Ayarlar
# Dikkat: Gerçek projelerde bu şekilde sabit şifre tutmak yerine
# veritabanı kullanılması ve şifrelerin hashlenmesi önerilir!
USERS = {
    'admin': {
        # Varsayılan şifre yerine yer tutucu. Gerçek config.py dosyasında değiştirin!
        'password': 'ADMIN_PASSWORD_HERE',
        'role': 'admin',
        'calendar_settings': {
            # Takvim ayarları genellikle hassas bilgi içermez, 
            # ancak varsayılan değerler burada tutulabilir.
            'defaultView': 'timeGridDay',
            'startTime': '09:00',
            'endTime': '21:00',
            'slotDuration': '30',
            'weekStart': '1',
            'language': 'tr',
            'timeFormat': '24',
            'dateFormat': 'DD.MM.YYYY',
            'showWeekends': True,
            'showAllDay': False,
            'appointmentColor': '#0d6efd',
            'urgentColor': '#dc3545',
            'completedColor': '#198754',
            'cancelledColor': '#6c757d',
            'branchColors': []
        }
    },
    'armagan': {
        'password': 'DOKTOR_PASSWORD_HERE', # Varsayılan şifre kaldırıldı
        'role': 'doktor', 
        'doktor_id': '2018-11-08-16-07-44-0597'
    },
    'sekreter1': {
        'hekimler': [
            {'doktor_id': '1234', 'sube_id': '2311'}, 
            {'doktor_id': '5678', 'sube_id': '2142'}
        ],
        'password': 'SEKRETER_PASSWORD_HERE', # Varsayılan şifre kaldırıldı
        'role': 'user'
    },
    'ss': {
        'password': 'DOKTOR_SS_PASSWORD_HERE', # Varsayılan şifre kaldırıldı
        'role': 'doktor'
    }
}