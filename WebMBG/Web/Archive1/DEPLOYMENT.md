# Deployment Guide

This guide will help you deploy the Gas Monitoring System to web hosting providers like Niagahoster or other shared hosting services.

## Prerequisites

- Akun hosting yang mendukung:
  - HTTPS (required untuk MQTT WebSocket)
  - Static file hosting
  - (Opsional) Server-side scripting jika diperlukan

## Deployment Steps

### 1. Preparation

1. Update konfigurasi Supabase dengan production URL:
   ```javascript
   // di js/app.js dan js/supabase.js
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'your-production-anon-key';
   ```

2. Test aplikasi secara lokal terlebih dahulu:
   ```bash
   npm start
   # atau
   python -m http.server 8000
   ```

### 2. Niagahoster Deployment

#### Metode 1: File Manager

1. Login ke cPanel Niagahoster
2. Buka File Manager
3. Navigate ke public_html atau folder domain
4. Upload semua file project:
   - `index.html`
   - `css/` folder
   - `js/` folder
   - (Opsional) `README.md`

#### Metode 2: FTP

1. Gunakan FTP client (FileZilla, WinSCP, dll)
2. Connect ke FTP server Niagahoster
3. Upload semua file ke public_html

#### Metode 3: Git (jika supported)

1. Initialize Git repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Add remote repository hosting
3. Push to hosting

### 3. Other Hosting Providers

#### Shared Hosting (cPanel)

1. Upload files melalui File Manager atau FTP
2. Pastikan file index.html ada di root directory
3. Test akses ke domain

#### VPS/Dedicated Server

1. Setup web server (Apache/Nginx)
2. Upload files ke web root
3. Konfigurasi virtual host

#### Static Hosting (Netlify, Vercel, GitHub Pages)

1. Push code ke Git repository
2. Connect repository ke hosting platform
3. Configure build settings (jika diperlukan)

### 4. Post-Deployment Configuration

#### HTTPS/SSL

Pastikan HTTPS aktif:
- Niagahoster: Auto SSL biasanya sudah aktif
- Other hosting: Install SSL certificate

#### CORS Configuration

Jika ada CORS issues dengan Supabase:
1. Login ke Supabase dashboard
2. Buka Settings > API
3. Tambahkan domain ke Allowed Origins

#### MQTT WebSocket

Pastikan WebSocket connection berfungsi:
- Test koneksi MQTT di production
- Jika ada issues, check firewall settings

### 5. Testing

1. Buka aplikasi di browser
2. Test semua fitur:
   - Dashboard
   - Grafik
   - Tabel data
   - Export
   - Notifikasi

3. Check browser console untuk error
4. Test dengan mobile device (responsive design)

### 6. Monitoring

Set up monitoring untuk production:
- Uptime monitoring
- Error tracking
- Performance monitoring

## Troubleshooting

### MQTT Connection Issues

1. **WebSocket Secure (WSS) Error**
   - Pastikan HTTPS aktif
   - Check MQTT broker port (8884 for WSS)

2. **Connection Timeout**
   - Check firewall settings
   - Verify broker URL

3. **Authentication Error**
   - Verify MQTT credentials
   - Check broker configuration

### Supabase Connection Issues

1. **CORS Error**
   - Tambahkan domain ke Supabase CORS settings
   - Pastikan protocol (http/https) sesuai

2. **Authentication Error**
   - Verify Supabase URL dan API key
   - Check RLS policies

### General Issues

1. **404 Errors**
   - Pastikan semua file terupload
   - Check file paths di HTML

2. **Performance Issues**
   - Optimize image sizes
   - Minify CSS/JS files
   - Enable gzip compression

## Security Considerations

1. **API Keys**
   - Jangan expose sensitive API keys
   - Gunakan environment variables jika possible

2. **HTTPS**
   - Selalu gunakan HTTPS di production
   - Redirect HTTP ke HTTPS

3. **Authentication**
   - Implement authentication jika diperlukan
   - Protect sensitive endpoints

## Maintenance

1. **Regular Updates**
   - Update dependencies
   - Monitor security advisories

2. **Backup**
   - Backup Supabase data
   - Backup application files

3. **Monitoring**
   - Monitor application performance
   - Set up alerts for critical issues

## Domain Configuration

### Custom Domain

1. Point domain ke hosting IP address
2. Configure DNS records:
   - A record: @ -> hosting IP
   - CNAME record: www -> domain

### Subdomain

1. Create subdomain in hosting control panel
2. Upload files to subdomain folder
3. Configure DNS if needed

## Performance Optimization

1. **Enable Caching**
   - Browser caching
   - CDN jika available

2. **Optimize Assets**
   - Compress images
   - Minify CSS/JS
   - Use efficient formats

3. **Lazy Loading**
   - Implement lazy loading untuk charts
   - Load data on demand

## Production Checklist

- [ ] Update Supabase configuration
- [ ] Test MQTT connection
- [ ] Verify HTTPS/SSL
- [ ] Test all features
- [ ] Check responsive design
- [ ] Set up monitoring
- [ ] Configure backup
- [ ] Document access credentials