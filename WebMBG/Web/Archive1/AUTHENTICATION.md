# Sistem Autentikasi Gas Monitoring Web App

## Overview

Sistem autentikasi ini ditambahkan untuk melindungi akses ke aplikasi Web Gas Monitoring dengan password yang telah ditentukan.

## Fitur

### 1. Login
- **Password**: `brinmbg123`
- **Session Timeout**: 24 jam
- **Auto-redirect**: Setelah login berhasil, user akan diarahkan ke halaman yang sebelumnya diakses

### 2. Session Management
- **Session Storage**: Menggunakan sessionStorage browser
- **Auto-extend**: Session diperpanjang otomatis saat ada aktivitas user
- **Session Warning**: Peringatan 5 menit sebelum session berakhir
- **Inactivity Warning**: Peringatan setelah 30 menit tidak ada aktivitas

### 3. Logout
- **Manual Logout**: Tombol logout di sidebar
- **Auto-logout**: Otomatis logout saat session berakhir
- **Confirmation**: Konfirmasi sebelum logout

## Struktur File

### JavaScript Files
- `js/auth.js` - Sistem autentikasi utama
- `js/app.js` - Integrasi dengan aplikasi utama

### CSS Files
- `css/auth.css` - Styling untuk login dan session management

### HTML Modifications
- `index.html` - Ditambahkan login overlay dan session info

## Cara Kerja

### 1. Proses Login
1. User membuka aplikasi web
2. Jika belum terautentikasi, login overlay akan muncul
3. User memasukkan password `brinmbg123`
4. Jika password benar, session dibuat dan user diarahkan ke dashboard
5. Jika password salah, error message ditampilkan

### 2. Session Management
1. Session disimpan di sessionStorage dengan expiry time
2. Session diperpanjang otomatis saat user berinteraksi dengan aplikasi
3. Session dicek setiap menit untuk expiry
4. Peringatan ditampilkan 5 menit sebelum expiry

### 3. Proses Logout
1. User klik tombol logout di sidebar
2. Konfirmasi dialog muncul
3. Jika dikonfirmasi, session dihapus dan halaman direload
4. User akan kembali ke login screen

## Security Features

### 1. Password Protection
- Password hardcoded di client-side (untuk demo purposes)
- Dapat dengan mudah diubah ke server-side authentication

### 2. Session Security
- Session timeout otomatis
- Session storage (clear saat browser ditutup)
- Auto-logout saat session expired

### 3. Activity Monitoring
- Deteksi aktivitas user (click, keypress, scroll, mousemove)
- Perpanjang session otomatis
- Warning untuk inactivity berlebihan

## Customization

### Mengubah Password
Edit file `js/auth.js`:
```javascript
config: {
    loginPassword: 'brinmbg123', // Ubah password di sini
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 jam
    // ...
}
```

### Mengubah Session Timeout
Edit file `js/auth.js`:
```javascript
config: {
    // ...
    sessionTimeout: 12 * 60 * 60 * 1000, // 12 jam
    // ...
}
```

### Mengubah Warna Tema
Edit file `css/auth.css`:
```css
.login-overlay {
    background: linear-gradient(135deg, #E60012 0%, #99000D 100%);
}

.login-form .btn-primary {
    background: #E60012;
}
```

## Browser Compatibility

Sistem autentikasi ini kompatibel dengan:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Accessibility Features

1. **Keyboard Navigation**: Semua elemen dapat diakses dengan keyboard
2. **Screen Reader Support**: Semantic HTML dan ARIA labels
3. **High Contrast Mode**: Support untuk prefers-contrast: high
4. **Reduced Motion**: Support untuk prefers-reduced-motion: reduce

## Troubleshooting

### Login tidak berhasil
1. Pastikan password benar: `brinmbg123`
2. Cek console browser untuk error messages
3. Pastikan JavaScript tidak disabled

### Session expired terlalu cepat
1. Cek session timeout configuration
2. Pastikan tidak ada browser extensions yang menghapus sessionStorage
3. Cek system clock accuracy

### Login overlay tidak muncul
1. Cek apakah sessionStorage sudah ada
2. Clear browser cache dan sessionStorage
3. Reload halaman

## Future Enhancements

1. **Server-side Authentication**: Integrasi dengan backend authentication
2. **Multi-user Support**: Support untuk multiple users dengan role-based access
3. **Remember Me**: Option untuk mengingat login state
4. **Two-Factor Authentication**: Tambahkan 2FA untuk enhanced security
5. **Audit Trail**: Log semua aktivitas login/logout

## Integration dengan Existing Features

Sistem autentikasi terintegrasi dengan:
- **MQTT Connection**: Hanya terhubung setelah login berhasil
- **Real-time Updates**: Hanya menerima data setelah terautentikasi
- **Data Export**: Hanya dapat export data setelah login
- **Configuration**: Hanya dapat mengubah konfigurasi setelah login

## Testing

Untuk testing sistem autentikasi:
1. Buka browser incognito/private mode
2. Akses aplikasi web
3. Coba login dengan password salah
4. Login dengan password benar
5. Test session timeout (ubah ke 1 menit untuk testing)
6. Test logout functionality
7. Test inactivity warning