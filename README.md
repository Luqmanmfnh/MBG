# Gas Monitoring System

Web admin minimalis untuk monitoring data dari 10 sensor gas yang dikirim oleh ESP32.

## Features

- Real-time dashboard untuk monitoring 10 sensor gas
- Visualisasi data dengan grafik real-time dan historis
- Tabel riwayat data dengan filter dan export
- Konfigurasi parameter perangkat
- Sistem notifikasi alert untuk nilai sensor di atas ambang batas
- Responsive design yang optimal di desktop, tablet, dan mobile
- Integrasi dengan Supabase untuk database
- Koneksi MQTT untuk menerima data sensor

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **UI Framework**: Bootstrap 5
- **Charts**: Chart.js
- **Database**: Supabase
- **Communication**: MQTT (HiveMQ)
- **Icons**: Bootstrap Icons

## Prerequisites

- Web browser modern dengan JavaScript diaktifkan
- Koneksi internet untuk akses Supabase dan MQTT broker
- (Opsional) Server lokal untuk development

## Setup Instructions

### 1. Supabase Setup

1. Buat akun di [Supabase](https://supabase.com/)
2. Buat project baru
3. Eksekusi SQL schema dari `database/schema.sql` di SQL Editor
4. Dapatkan URL dan Anon Key dari Settings > API
5. Update konfigurasi Supabase di `js/app.js` dan `js/supabase.js`

```javascript
// di js/app.js dan js/supabase.js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 2. Local Development

1. Clone atau download repository ini
2. Buka `index.html` di browser atau jalankan dengan server lokal

#### Menggunakan Live Server (VS Code Extension):

1. Install Live Server extension di VS Code
2. Klik kanan pada `index.html` dan pilih "Open with Live Server"

#### Menggunakan Python:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Menggunakan Node.js:

```bash
npx serve .
```

### 3. MQTT Configuration

Secara default, aplikasi menggunakan HiveMQ broker publik:
- Broker: `broker.hivemq.com`
- Port: `8884` (WebSocket)
- Topics:
  - `gas-monitor/sensors` - Data sensor
  - `gas-monitor/status` - Status perangkat
  - `gas-monitor/config` - Konfigurasi perangkat

Untuk mengubah konfigurasi MQTT, edit di `js/app.js`:

```javascript
mqtt: {
    broker: 'broker.hivemq.com',
    port: 8884,
    clientId: 'gas-monitor-' + Math.random().toString(16).substr(2, 8),
    username: '',
    password: '',
    topics: {
        sensorData: 'gas-monitor/sensors',
        deviceStatus: 'gas-monitor/status',
        deviceConfig: 'gas-monitor/config'
    }
}
```

## Data Format

### Format Data Sensor

```json
{
    "id_alat": "GAS-001",
    "operator": "Operator 1",
    "timestamp": "2023-01-01T12:00:00Z",
    "sensors": [
        {"type": "NH3", "value": 15.5},
        {"type": "CO", "value": 10.2},
        // ... sensor lainnya
    ]
}
```

### Format Status Perangkat

```json
{
    "id_alat": "GAS-001",
    "wifi_status": "online",
    "ssid": "GasMonitor_WiFi",
    "timestamp": "2023-01-01T12:00:00Z"
}
```

### Format Konfigurasi Perangkat

```json
{
    "id_alat": "GAS-001",
    "thresholds": [
        {"sensor_type": "NH3", "value": 25},
        {"sensor_type": "CO", "value": 35},
        // ... threshold lainnya
    ],
    "timestamp": "2023-01-01T12:00:00Z"
}
```

## Deployment

### Niagahoster atau Hosting Lainnya

1. Upload semua file ke hosting
2. Pastikan hosting mendukung HTTPS (required untuk MQTT WebSocket)
3. Update konfigurasi Supabase dengan URL production
4. Test aplikasi di production environment

### Environment Variables

Untuk production, sebaiknya gunakan environment variables untuk konfigurasi sensitif:

```javascript
const config = {
    supabase: {
        url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
        apiKey: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
    },
    mqtt: {
        broker: process.env.MQTT_BROKER || 'broker.hivemq.com',
        port: process.env.MQTT_PORT || 8884,
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || ''
    }
};
```

## Sensor Configuration

Default sensor configuration:

| Sensor | Nama | Unit | Threshold |
|--------|------|------|-----------|
| NH3 | Amonia | ppm | 25 |
| CO | Karbon Monoksida | ppm | 35 |
| NO2 | Nitrogen Dioksida | ppm | 5 |
| CH4 | Metana | ppm | 1000 |
| H2S | Hidrogen Sulfida | ppm | 10 |
| SO2 | Sulfur Dioksida | ppm | 5 |
| O2 | Oksigen | % | 19.5 |
| H2 | Hidrogen | ppm | 1000 |
| CL2 | Klorin | ppm | 0.5 |
| PM25 | Partikulat PM2.5 | μg/m³ | 35 |

## Troubleshooting

### MQTT Connection Issues

1. Pastikan broker MQTT dan port benar
2. Check koneksi internet
3. Pastikan WebSocket connection diblokir oleh firewall

### Supabase Connection Issues

1. Verify URL dan API key
2. Pastikan RLS policies mengizinkan akses
3. Check CORS configuration di Supabase

### Data Not Displaying

1. Check browser console untuk error
2. Verify MQTT message format
3. Pastikan sensor ID dan configuration benar

## Development Notes

- Aplikasi menggunakan dummy data untuk testing saat tidak ada koneksi MQTT
- Data disimpan secara lokal di browser dan di Supabase
- Real-time updates menggunakan interval polling (default: 2 detik)
- Charts menggunakan Chart.js dengan responsive design

## License

MIT License
