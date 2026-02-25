// Configuration
const config = {
    // MQTT Configuration
    mqtt: {
        broker: 'broker.hivemq.com',
        port: 8884,
        clientId: 'foodtray-monitor-' + Math.random().toString(16).substr(2, 8),
        username: '',
        password: '',
        topics: {
            baseTopic: 'foodtray',
            sensorData: 'foodtray/+/sensors/#',
            deviceStatus: 'foodtray/+/status',
            deviceConfig: 'foodtray/+/config',
            bridgeData: 'foodtray/+/bridge'
        }
    },
    
    // Supabase Configuration (replace with your actual config)
    supabase: {
        url: 'YOUR_SUPABASE_URL',
        apiKey: 'YOUR_SUPABASE_ANON_KEY'
    },
    
    // Sensor Configuration
    sensors: [
        { id: 'sensor1', name: 'NH3 (Amonia)', unit: 'ppm', threshold: 25 },
        { id: 'sensor2', name: 'H2S (Hidrogen Sulfida)', unit: 'ppm', threshold: 10 },
        { id: 'sensor3', name: 'CH4 (Metana)', unit: 'ppm', threshold: 1000 },
        { id: 'sensor4', name: 'CO2 (Karbon Dioksida)', unit: 'ppm', threshold: 5000 },
        { id: 'sensor5', name: 'VOC (Senyawa Organik Volatil)', unit: 'ppm', threshold: 500 },
        { id: 'sensor6', name: 'Alcohol/Etanol (C2H5OH)', unit: 'ppm', threshold: 1000 },
        { id: 'sensor7', name: 'CO (Karbon Monoksida)', unit: 'ppm', threshold: 35 },
        { id: 'sensor8', name: 'Acetone', unit: 'ppm', threshold: 250 },
        { id: 'sensor9', name: 'H2 (Hidrogen)', unit: 'ppm', threshold: 1000 },
        { id: 'sensor10', name: 'Temperature', unit: '°C', threshold: 40 }
    ],
    
    // Chart Configuration
    charts: {
        maxDataPoints: 20,
        updateInterval: 2000 // 2 seconds
    }
};

// Global Variables
let mqttClient = null;
let sensorCharts = {}; // Object to store individual sensor charts
let sensorData = {};
let devices = {}; // Multi-device support
let currentDeviceId = null; // Currently selected device
let alerts = [];
let dataHistory = [];
let completeSensorSets = []; // Array to store complete sets of 10 sensors
let currentPage = 1;
let itemsPerPage = 10;
let pendingSensorData = {}; // Object to store pending sensor data for completion

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication first
    if (initializeAuth()) {
        // If authenticated, initialize the main app
        initializeApp();
    }
});

function initializeApp() {
    // Show session info
    const sessionInfo = document.getElementById('session-info');
    if (sessionInfo) {
        sessionInfo.style.display = 'flex';
    }
    
    // Setup navigation
    setupNavigation();
    
    // Initialize sensor data structure
    initializeSensorData();
    
    // Initialize charts
    initializeCharts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup authentication event listeners
    setupAuthEventListeners();
    
    // Start session monitoring
    extendSessionOnActivity();
    
    // Connect to MQTT broker
    connectToMQTT();
    
    // Generate dummy data for testing (disabled - only use real ESP32 data)
    // generateDummyData();
    
    // Update UI with initial data
    updateDashboard();
    updateSensorCards();
    updateConfiguration();
    updateThresholdTable();
    
    // Start real-time updates (disabled - only use real ESP32 data)
    // startRealTimeUpdates();
    
    // Start continuous dummy data generation (disabled - only use real ESP32 data)
    // startContinuousDummyData();
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section') + '-section';
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
                document.getElementById('page-title').textContent = this.textContent.trim();
            }
            
            // Update charts when charts section is shown
            if (this.getAttribute('data-section') === 'charts') {
                updateCharts();
            }
            
            // Update data table when data section is shown
            if (this.getAttribute('data-section') === 'data') {
                updateDataTable();
            }
        });
    });
}

function initializeSensorData() {
    config.sensors.forEach(sensor => {
        sensorData[sensor.id] = {
            name: sensor.name,
            unit: sensor.unit,
            threshold: sensor.threshold,
            currentValue: 0,
            history: [],
            status: 'normal'
        };
    });
}

function initializeCharts() {
    // Create individual charts for each sensor
    const chartsContainer = document.getElementById('charts-container');
    chartsContainer.innerHTML = ''; // Clear existing charts
    
    config.sensors.forEach((sensor, index) => {
        // Create chart container
        const chartCol = document.createElement('div');
        chartCol.className = 'col-lg-6 col-xl-4 mb-3';
        
        const chartCard = document.createElement('div');
        chartCard.className = `card individual-chart-card ${sensor.id}`;
        chartCard.innerHTML = `
            <div class="card-header">
                <h6 class="card-title mb-0">${sensor.name}</h6>
                <small class="text-muted">Threshold: ${sensor.threshold} ${sensor.unit}</small>
            </div>
            <div class="card-body p-2">
                <div class="chart-container">
                    <canvas id="chart-${sensor.id}"></canvas>
                </div>
            </div>
        `;
        
        chartCol.appendChild(chartCard);
        chartsContainer.appendChild(chartCol);
        
        // Initialize chart for this sensor
        const ctx = document.getElementById(`chart-${sensor.id}`).getContext('2d');
        sensorCharts[sensor.id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: sensor.name,
                    data: [],
                    borderColor: getColorByIndex(index),
                    backgroundColor: getColorByIndex(index, 0.1),
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Waktu'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: `Nilai (${sensor.unit})`
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${sensor.name}: ${context.parsed.y.toFixed(2)} ${sensor.unit}`;
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    });
}

function setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', function() {
        updateDashboard();
        updateSensorCards();
        updateCharts();
        updateDataTable();
    });
    
    // Export buttons
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    
    // Filter button
    document.getElementById('filter-btn').addEventListener('click', function() {
        const filterRow = document.getElementById('filter-row');
        filterRow.style.display = filterRow.style.display === 'none' ? 'flex' : 'none';
    });
    
    // Filter inputs
    document.getElementById('start-date').addEventListener('change', updateDataTable);
    document.getElementById('end-date').addEventListener('change', updateDataTable);
    document.getElementById('device-select').addEventListener('change', updateDataTable);
    document.getElementById('time-range').addEventListener('change', updateAllCharts);
    
    // Alert modal acknowledge button
    document.getElementById('acknowledge-alert').addEventListener('click', function() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('alertModal'));
        modal.hide();
    });
    
    // Save thresholds button
    document.getElementById('save-thresholds').addEventListener('click', saveThresholds);
}

function setupAuthEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Extend session when user interacts with the app
    document.addEventListener('click', function() {
        if (AuthSystem.isAuthenticated()) {
            AuthSystem.extendSession();
            updateSessionTimeRemaining();
        }
    });
    
    // Show session expiry warning 5 minutes before expiry
    setInterval(function() {
        if (AuthSystem.isAuthenticated()) {
            const minutesRemaining = AuthSystem.getSessionTimeRemaining();
            if (minutesRemaining > 0 && minutesRemaining <= 5) {
                showSessionExpiryWarning(minutesRemaining);
            }
        }
    }, 60 * 1000); // Check every minute
}

function connectToMQTT() {
    try {
        // Connect to MQTT broker
        const options = {
            clientId: config.mqtt.clientId,
            clean: true,
            connectTimeout: 30 * 1000,
            username: config.mqtt.username,
            password: config.mqtt.password,
            reconnectPeriod: 1000,
        };
        
        // For demo purposes, we'll use WebSocket connection
        mqttClient = mqtt.connect(`wss://${config.mqtt.broker}:${config.mqtt.port}/mqtt`, options);
        
        mqttClient.on('connect', function() {
            console.log('Connected to MQTT broker');
            
            // Subscribe to topics with wildcards for multi-device support
            mqttClient.subscribe(config.mqtt.topics.sensorData);
            mqttClient.subscribe(config.mqtt.topics.deviceStatus);
            mqttClient.subscribe(config.mqtt.topics.deviceConfig);
            mqttClient.subscribe(config.mqtt.topics.bridgeData);
            
            // Update connection status
            updateConnectionStatus(true);
        });
        
        mqttClient.on('message', function(topic, message) {
            console.log('Received message from topic:', topic);
            
            // Parse topic to extract device ID and data type
            const topicParts = topic.split('/');
            if (topicParts.length >= 3 && topicParts[0] === 'foodtray') {
                const deviceId = topicParts[1];
                const dataType = topicParts[2];
                const subType = topicParts[3];
                
                // Initialize device if not exists
                if (!devices[deviceId]) {
                    devices[deviceId] = {
                        id: deviceId,
                        operator: 'Operator ' + deviceId,
                        ssid: 'FoodTray_WiFi',
                        wifiStatus: 'online',
                        lastUpdate: new Date(),
                        sensors: {}
                    };
                    
                    // Initialize sensor data for this device
                    config.sensors.forEach(sensor => {
                        devices[deviceId].sensors[sensor.id] = {
                            name: sensor.name,
                            unit: sensor.unit,
                            threshold: sensor.threshold,
                            currentValue: 0,
                            history: [],
                            status: 'normal'
                        };
                    });
                    
                    // Update device selector when new device is added
                    updateDeviceSelector();
                }
                
                // Set current device if none selected
                if (!currentDeviceId) {
                    currentDeviceId = deviceId;
                }
                
                // Process message based on topic structure
                if (dataType === 'sensors' && subType && subType.startsWith('sensor')) {
                    // Individual sensor data: foodtray/DEVICE_ID/sensors/sensor1
                    processIndividualSensorData(deviceId, subType, message.toString());
                } else if (dataType === 'status') {
                    // Device status: foodtray/DEVICE_ID/status
                    processDeviceStatus(deviceId, message.toString());
                } else if (dataType === 'config') {
                    // Device config: foodtray/DEVICE_ID/config
                    processDeviceConfig(deviceId, message.toString());
                } else if (dataType === 'bridge') {
                    // Bridge data from Serial Monitor: foodtray/DEVICE_ID/bridge
                    processBridgeData(deviceId, message.toString());
                }
            }
        });
        
        mqttClient.on('error', function(err) {
            console.error('MQTT connection error:', err);
            updateConnectionStatus(false);
        });
        
        mqttClient.on('close', function() {
            console.log('MQTT connection closed');
            updateConnectionStatus(false);
        });
    } catch (error) {
        console.error('Failed to connect to MQTT:', error);
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
        statusElement.className = 'badge bg-success';
        statusElement.innerHTML = '<i class="bi bi-wifi"></i> Terhubung';
    } else {
        statusElement.className = 'badge bg-danger';
        statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Terputus';
    }
}

// Process individual sensor data from topics like foodtray/DEVICE_ID/sensors/sensor1
function processIndividualSensorData(deviceId, sensorType, message) {
    if (!devices[deviceId] || !devices[deviceId].sensors[sensorType]) return;
    
    const sensor = devices[deviceId].sensors[sensorType];
    const value = parseFloat(message);
    
    if (isNaN(value)) return;
    
    const timestamp = new Date();
    
    // Update current value
    sensor.currentValue = value;
    
    // Add to history
    sensor.history.push({
        value: value,
        timestamp: timestamp
    });
    
    // Limit history size
    if (sensor.history.length > config.charts.maxDataPoints) {
        sensor.history.shift();
    }
    
    // Check threshold
    checkThreshold(deviceId, sensorType, value);
    
    // Update device last update
    devices[deviceId].lastUpdate = timestamp;
    
    // Add to data history
    dataHistory.push({
        timestamp: timestamp,
        deviceId: deviceId,
        operator: devices[deviceId].operator,
        sensorType: sensorType,
        sensorName: sensor.name,
        value: value,
        unit: sensor.unit,
        status: sensor.status
    });
    
    // Check if we have a complete set of sensors for this device
    checkCompleteSensorSet(deviceId, timestamp);
    
    // Update UI if this is the current device
    if (deviceId === currentDeviceId) {
        updateDashboard();
        updateSensorCards();
        updateCharts();
    }
}

// Process device status from topic foodtray/DEVICE_ID/status
function processDeviceStatus(deviceId, message) {
    if (!devices[deviceId]) return;
    
    // Parse status message: STATUS:FT123ABCDEF,WIFI:-45,HEAP:200000,UPTIME:123456
    const parts = message.split(',');
    parts.forEach(part => {
        const [key, value] = part.split(':');
        if (key === 'STATUS') {
            devices[deviceId].id = value;
        } else if (key === 'WIFI') {
            devices[deviceId].wifiSignal = value;
            devices[deviceId].wifiStatus = parseInt(value) > -80 ? 'online' : 'poor';
        } else if (key === 'HEAP') {
            devices[deviceId].heapMemory = value;
        } else if (key === 'UPTIME') {
            devices[deviceId].uptime = value;
        }
    });
    
    devices[deviceId].lastUpdate = new Date();
    
    // Update UI if this is the current device
    if (deviceId === currentDeviceId) {
        updateDashboard();
        updateConfiguration();
    }
}

// Process device config from topic foodtray/DEVICE_ID/config
function processDeviceConfig(deviceId, message) {
    if (!devices[deviceId]) return;
    
    // Parse config message (implementation depends on ESP32 config format)
    console.log('Device config received:', deviceId, message);
    
    devices[deviceId].lastUpdate = new Date();
    
    // Update UI if this is the current device
    if (deviceId === currentDeviceId) {
        updateConfiguration();
    }
}

// Process bridge data from Serial Monitor via topic foodtray/DEVICE_ID/bridge
function processBridgeData(deviceId, message) {
    if (!devices[deviceId]) return;
    
    console.log('Bridge data received:', deviceId, message);
    
    // Parse bridge data (implementation depends on Serial Monitor format)
    // This can be used for debugging, configuration, or special commands
    
    devices[deviceId].lastUpdate = new Date();
    
    // Update UI if this is the current device
    if (deviceId === currentDeviceId) {
        updateDashboard();
    }
}

function checkThreshold(deviceId, sensorType, value) {
    if (!devices[deviceId] || !devices[deviceId].sensors[sensorType]) return;
    
    const sensor = devices[deviceId].sensors[sensorType];
    const threshold = sensor.threshold;
    
    if (value > threshold) {
        sensor.status = 'danger';
        
        // Create alert
        const alert = {
            id: Date.now(),
            deviceId: deviceId,
            sensorType: sensorType,
            sensorName: sensor.name,
            value: value,
            threshold: threshold,
            unit: sensor.unit,
            timestamp: new Date(),
            acknowledged: false
        };
        
        alerts.unshift(alert);
        
        // Don't show popup alert - just update alert count
        document.getElementById('alert-count').textContent = alerts.filter(a => !a.acknowledged).length;
    } else if (value > threshold * 0.8) {
        sensor.status = 'warning';
    } else {
        sensor.status = 'normal';
    }
}

// Function disabled - no more popup alerts
function showAlert(alert) {
    // Popup alerts disabled - data will still be recorded
    // Alert information is stored in alerts array for viewing in alerts section
    console.log('Alert recorded:', alert.sensorName, alert.value, alert.unit);
}

function generateDummyData() {
    // Set device info
    const deviceId = 'FT2492851C06';
    const operator = 'Operator 1';
    
    // Initialize device if not exists
    if (!devices[deviceId]) {
        devices[deviceId] = {
            id: deviceId,
            operator: operator,
            ssid: 'GasMonitor_WiFi',
            wifiStatus: 'online',
            lastUpdate: new Date(),
            sensors: {}
        };
        
        // Initialize sensor data for this device
        config.sensors.forEach(sensor => {
            devices[deviceId].sensors[sensor.id] = {
                name: sensor.name,
                unit: sensor.unit,
                threshold: sensor.threshold,
                currentValue: 0,
                history: [],
                status: 'normal'
            };
        });
    }
    
    // Set current device if none selected
    if (!currentDeviceId) {
        currentDeviceId = deviceId;
    }
    
    // Update device selector
    updateDeviceSelector();
}

// Function to generate continuous dummy data
function startContinuousDummyData() {
    setInterval(function() {
        const deviceId = 'FT2492851C06';
        const timestamp = new Date();
        
        // Create a complete sensor set
        const completeSet = {
            timestamp: timestamp,
            deviceId: deviceId,
            operator: devices[deviceId].operator,
            sensors: {}
        };
        
        // Generate values for all sensors
        config.sensors.forEach(sensor => {
            const currentValue = devices[deviceId].sensors[sensor.id].currentValue;
            const change = (Math.random() - 0.5) * currentValue * 0.1;
            const value = Math.max(0, currentValue + change);
            const status = value > sensor.threshold ? 'danger' : (value > sensor.threshold * 0.8 ? 'warning' : 'normal');
            
            // Update device sensor data
            devices[deviceId].sensors[sensor.id].currentValue = value;
            devices[deviceId].sensors[sensor.id].status = status;
            
            // Add to history
            devices[deviceId].sensors[sensor.id].history.push({
                value: value,
                timestamp: timestamp
            });
            
            // Limit history size
            if (devices[deviceId].sensors[sensor.id].history.length > config.charts.maxDataPoints) {
                devices[deviceId].sensors[sensor.id].history.shift();
            }
            
            // Add to data history
            dataHistory.push({
                timestamp: timestamp,
                deviceId: deviceId,
                operator: devices[deviceId].operator,
                sensorType: sensor.id,
                sensorName: sensor.name,
                value: value,
                unit: sensor.unit,
                status: status
            });
            
            // Add to complete set
            completeSet.sensors[sensor.id] = {
                value: value,
                status: status
            };
        });
        
        // Update device last update
        devices[deviceId].lastUpdate = timestamp;
        
        // Add to complete sensor sets
        completeSensorSets.unshift(completeSet);
        
        // Keep only the last 100 complete sets to prevent memory issues
        if (completeSensorSets.length > 100) {
            completeSensorSets = completeSensorSets.slice(0, 100);
        }
        
        // Update UI if this is the current device
        if (deviceId === currentDeviceId) {
            updateDashboard();
            updateSensorCards();
            updateCharts();
            
            // Update data table if we're on the data section
            if (document.getElementById('data-section').style.display !== 'none') {
                updateDataTable();
            }
        }
    }, 3000); // Generate new data every 3 seconds
}

function startRealTimeUpdates() {
    setInterval(function() {
        // Generate new dummy data
        config.sensors.forEach(sensor => {
            const currentValue = sensorData[sensor.id].currentValue;
            const change = (Math.random() - 0.5) * currentValue * 0.1;
            const newValue = Math.max(0, currentValue + change);
            
            const timestamp = new Date();
            
            // Update current value
            sensorData[sensor.id].currentValue = newValue;
            
            // Add to history
            sensorData[sensor.id].history.push({
                value: newValue,
                timestamp: timestamp
            });
            
            // Limit history size
            if (sensorData[sensor.id].history.length > config.charts.maxDataPoints) {
                sensorData[sensor.id].history.shift();
            }
            
            // Check threshold
            checkThreshold(sensor.id, newValue);
            
            // Add to data history
            dataHistory.push({
                timestamp: timestamp,
                deviceId: deviceInfo.id,
                operator: deviceInfo.operator,
                sensorType: sensor.id,
                sensorName: sensor.name,
                value: newValue,
                unit: sensor.unit,
                status: sensorData[sensor.id].status
            });
        });
        
        // Update device last update
        deviceInfo.lastUpdate = new Date();
        
        // Update UI
        updateDashboard();
        updateSensorCards();
        updateCharts();
    }, config.charts.updateInterval);
}

function updateDashboard() {
    if (!currentDeviceId || !devices[currentDeviceId]) {
        // Show default values when no device is connected
        document.getElementById('device-id').textContent = '--';
        document.getElementById('operator').textContent = '--';
        document.getElementById('last-update').textContent = '--';
        document.getElementById('alert-count').textContent = '0';
        return;
    }
    
    const device = devices[currentDeviceId];
    document.getElementById('device-id').textContent = device.id || '--';
    document.getElementById('operator').textContent = device.operator || '--';
    document.getElementById('last-update').textContent = device.lastUpdate ?
        device.lastUpdate.toLocaleTimeString('id-ID') : '--';
    document.getElementById('alert-count').textContent = alerts.filter(a => !a.acknowledged).length;
}

function updateSensorCards() {
    const container = document.getElementById('sensor-cards');
    container.innerHTML = '';
    
    if (!currentDeviceId || !devices[currentDeviceId]) {
        // Show "No device connected" message when no device is available
        const noDeviceCard = document.createElement('div');
        noDeviceCard.className = 'col-12';
        noDeviceCard.innerHTML = `
            <div class="alert alert-info text-center">
                <h5>Menunggu Koneksi Perangkat</h5>
                <p>Belum ada data dari ESP32. Pastikan perangkat terhubung dan mengirim data.</p>
            </div>
        `;
        container.appendChild(noDeviceCard);
        return;
    }
    
    const deviceSensors = devices[currentDeviceId].sensors;
    Object.keys(deviceSensors).forEach(sensorId => {
        const sensor = deviceSensors[sensorId];
        const statusClass = sensor.status === 'danger' ? 'border-danger' :
                           sensor.status === 'warning' ? 'border-warning' : 'border-success';
        
        const statusBadge = sensor.status === 'danger' ? 'bg-danger' :
                           sensor.status === 'warning' ? 'bg-warning' : 'bg-success';
        
        const card = document.createElement('div');
        card.className = `col-md-6 col-lg-4 mb-3`;
        card.innerHTML = `
            <div class="card sensor-card ${statusClass}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="card-subtitle mb-2">${sensor.name}</h6>
                            <div class="sensor-value">
                                ${sensor.currentValue.toFixed(2)}
                                <span class="sensor-unit">${sensor.unit}</span>
                            </div>
                        </div>
                        <div>
                            <span class="badge ${statusBadge} sensor-status">
                                ${sensor.status === 'danger' ? 'Bahaya' :
                                  sensor.status === 'warning' ? 'Peringatan' : 'Normal'}
                            </span>
                        </div>
                    </div>
                    <div class="progress mt-2" style="height: 5px;">
                        <div class="progress-bar ${sensor.status === 'danger' ? 'bg-danger' :
                                                   sensor.status === 'warning' ? 'bg-warning' : 'bg-success'}"
                             role="progressbar"
                             style="width: ${Math.min(100, (sensor.currentValue / sensor.threshold) * 100)}%"
                             aria-valuenow="${sensor.currentValue}"
                             aria-valuemin="0"
                             aria-valuemax="${sensor.threshold}">
                        </div>
                    </div>
                    <small class="text-muted">Threshold: ${sensor.threshold} ${sensor.unit}</small>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateConfiguration() {
    if (!currentDeviceId || !devices[currentDeviceId]) return;
    
    const device = devices[currentDeviceId];
    document.getElementById('config-device-id').textContent = device.id || '--';
    document.getElementById('config-operator').textContent = device.operator || '--';
    document.getElementById('config-ssid').textContent = device.ssid || '--';
    
    const wifiStatusElement = document.getElementById('config-wifi-status');
    if (device.wifiStatus === 'online') {
        wifiStatusElement.innerHTML = '<span class="badge bg-success">Terhubung</span>';
    } else if (device.wifiStatus === 'poor') {
        wifiStatusElement.innerHTML = '<span class="badge bg-warning">Lemah</span>';
    } else {
        wifiStatusElement.innerHTML = '<span class="badge bg-danger">Terputus</span>';
    }
    
    document.getElementById('config-last-update').textContent = device.lastUpdate ?
        device.lastUpdate.toLocaleString('id-ID') : '--';
}

function updateThresholdTable() {
    const table = document.getElementById('threshold-table');
    table.innerHTML = '';
    
    if (!currentDeviceId || !devices[currentDeviceId]) return;
    
    const deviceSensors = devices[currentDeviceId].sensors;
    Object.keys(deviceSensors).forEach(sensorId => {
        const sensor = deviceSensors[sensorId];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sensor.name}</td>
            <td>
                <input type="number"
                       class="form-control form-control-sm threshold-input"
                       data-sensor-id="${sensorId}"
                       value="${sensor.threshold}"
                       min="0"
                       step="0.1">
            </td>
            <td>${sensor.unit}</td>
        `;
        table.appendChild(row);
    });
}

function updateCharts() {
    // Update all individual sensor charts
    config.sensors.forEach(sensor => {
        const chart = sensorCharts[sensor.id];
        if (!chart) return;
        
        const sensorId = sensor.id;
        const currentSensorData = currentDeviceId && devices[currentDeviceId] ?
            devices[currentDeviceId].sensors[sensorId] :
            sensorData[sensorId];
            
        if (!currentSensorData || !currentSensorData.history) return;
        
        const labels = [];
        const data = [];
        
        currentSensorData.history.forEach(entry => {
            labels.push(entry.timestamp.toLocaleTimeString('id-ID'));
            data.push(entry.value);
        });
        
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    });
}

function updateAllCharts() {
    updateCharts();
    updateHistoricalCharts();
}

function updateHistoricalCharts() {
    const timeRange = document.getElementById('time-range').value;
    const hours = parseInt(timeRange);
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
    
    // Update each individual sensor chart with historical data
    config.sensors.forEach(sensor => {
        const chart = sensorCharts[sensor.id];
        if (!chart) return;
        
        // Filter data for this sensor and time range
        const filteredData = dataHistory.filter(entry =>
            entry.timestamp >= startTime &&
            entry.timestamp <= endTime &&
            entry.sensorType === sensor.id &&
            (!currentDeviceId || entry.deviceId === currentDeviceId)
        );
        
        // Group data by time (rounded to nearest minute)
        const timeData = {};
        filteredData.forEach(entry => {
            const timeKey = new Date(entry.timestamp).setSeconds(0, 0);
            if (!timeData[timeKey]) {
                timeData[timeKey] = [];
            }
            timeData[timeKey].push(entry.value);
        });
        
        // Average values for each timestamp and sort
        const timestamps = Object.keys(timeData).map(t => parseInt(t)).sort();
        const labels = [];
        const data = [];
        
        timestamps.forEach(timestamp => {
            labels.push(new Date(timestamp).toLocaleString('id-ID'));
            const values = timeData[timestamp];
            const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
            data.push(avgValue);
        });
        
        // Update chart
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.update();
    });
}

function getColorByIndex(index, alpha = 1) {
    const colors = [
        `rgba(74, 111, 165, ${alpha})`,
        `rgba(40, 167, 69, ${alpha})`,
        `rgba(255, 193, 7, ${alpha})`,
        `rgba(220, 53, 69, ${alpha})`,
        `rgba(23, 162, 184, ${alpha})`,
        `rgba(108, 117, 125, ${alpha})`,
        `rgba(102, 16, 242, ${alpha})`,
        `rgba(255, 133, 27, ${alpha})`,
        `rgba(214, 51, 132, ${alpha})`,
        `rgba(32, 201, 151, ${alpha})`
    ];
    
    return colors[index % colors.length];
}

function updateDataTable() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const selectedDeviceId = document.getElementById('device-select').value;
    
    // Filter complete sensor sets
    let filteredData = [...completeSensorSets];
    
    // If no complete sensor sets, try to use individual sensor data from dataHistory
    if (filteredData.length === 0 && dataHistory.length > 0) {
        // Group individual sensor readings by timestamp and device
        const groupedData = {};
        
        dataHistory.forEach(entry => {
            const timeKey = Math.floor(entry.timestamp.getTime() / 1000) * 1000;
            const deviceKey = entry.deviceId;
            
            if (!groupedData[deviceKey]) {
                groupedData[deviceKey] = {};
            }
            
            if (!groupedData[deviceKey][timeKey]) {
                groupedData[deviceKey][timeKey] = {
                    timestamp: entry.timestamp,
                    deviceId: entry.deviceId,
                    operator: entry.operator,
                    sensors: {}
                };
            }
            
            groupedData[deviceKey][timeKey].sensors[entry.sensorType] = {
                value: entry.value,
                status: entry.status
            };
        });
        
        // Convert grouped data to array and filter for complete sets (all 10 sensors)
        Object.keys(groupedData).forEach(deviceId => {
            Object.keys(groupedData[deviceId]).forEach(timeKey => {
                const entry = groupedData[deviceId][timeKey];
                if (Object.keys(entry.sensors).length === 10) {
                    filteredData.push(entry);
                }
            });
        });
    }
    
    // Filter by device
    if (selectedDeviceId) {
        filteredData = filteredData.filter(entry => entry.deviceId === selectedDeviceId);
    } else if (currentDeviceId) {
        filteredData = filteredData.filter(entry => entry.deviceId === currentDeviceId);
    }
    
    if (startDate) {
        const start = new Date(startDate);
        filteredData = filteredData.filter(entry => entry.timestamp >= start);
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter(entry => entry.timestamp <= end);
    }
    
    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // Update table body
    const tableBody = document.getElementById('data-table-body');
    tableBody.innerHTML = '';
    
    // Show message if no data
    if (pageData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="13" class="text-center text-muted py-4">
                <i class="bi bi-info-circle me-2"></i>
                Belum ada data sensor yang lengkap. Tunggu hingga semua 10 sensor terkirim.
            </td>
        `;
        tableBody.appendChild(row);
        updatePagination(0);
        return;
    }
    
    pageData.forEach(entry => {
        const row = document.createElement('tr');
        
        // Get sensor values in order
        const sensorValues = config.sensors.map(sensor => {
            const sensorData = entry.sensors[sensor.id];
            if (!sensorData) return { value: '--', status: 'normal' };
            
            const statusClass = sensorData.status === 'danger' ? 'bg-danger' :
                               sensorData.status === 'warning' ? 'bg-warning' : 'bg-success';
            
            return {
                value: sensorData.value.toFixed(2),
                status: statusClass
            };
        });
        
        row.innerHTML = `
            <td>${entry.timestamp.toLocaleString('id-ID')}</td>
            <td>${entry.deviceId}</td>
            <td>${entry.operator}</td>
            ${sensorValues.map((sv, index) =>
                `<td><span class="badge ${sv.status}">${sv.value}</span></td>`
            ).join('')}
        `;
        tableBody.appendChild(row);
    });
    
    // Update pagination
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const pagination = document.getElementById('data-pagination');
    pagination.innerHTML = '';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>`;
    pagination.appendChild(prevLi);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        // Show only a subset of pages
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            pagination.appendChild(li);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = '<a class="page-link" href="#">...</a>';
            pagination.appendChild(li);
        }
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>`;
    pagination.appendChild(nextLi);
    
    // Add click event to pagination links
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (page && page !== currentPage) {
                currentPage = page;
                updateDataTable();
            }
        });
    });
}

function exportToCSV() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const selectedDeviceId = document.getElementById('device-select').value;
    
    // Filter complete sensor sets (same as in updateDataTable)
    let filteredData = [...completeSensorSets];
    
    if (selectedDeviceId) {
        filteredData = filteredData.filter(entry => entry.deviceId === selectedDeviceId);
    } else if (currentDeviceId) {
        filteredData = filteredData.filter(entry => entry.deviceId === currentDeviceId);
    }
    
    if (startDate) {
        const start = new Date(startDate);
        filteredData = filteredData.filter(entry => entry.timestamp >= start);
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter(entry => entry.timestamp <= end);
    }
    
    // Sort by timestamp
    filteredData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Create CSV content
    const sensorHeaders = config.sensors.map(s => `${s.name} (${s.unit})`).join(',');
    let csvContent = `Timestamp,ID Alat,Operator,${sensorHeaders}\n`;
    
    filteredData.forEach(entry => {
        const sensorValues = config.sensors.map(sensor => {
            const sensorData = entry.sensors[sensor.id];
            return sensorData ? sensorData.value : '--';
        }).join(',');
        
        csvContent += `${entry.timestamp.toLocaleString('id-ID')},${entry.deviceId},${entry.operator},${sensorValues}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `gas-monitor-data-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToExcel() {
    // For simplicity, we'll use CSV format and change the extension
    // In a real application, you would use a library like SheetJS
    exportToCSV();
    
    // Change the download filename
    const link = document.querySelector('a[download$=".csv"]');
    if (link) {
        link.setAttribute('download', `gas-monitor-data-${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
}

function updateDeviceInfo(data) {
    if (data.id_alat) deviceInfo.id = data.id_alat;
    if (data.operator) deviceInfo.operator = data.operator;
    if (data.ssid) deviceInfo.ssid = data.ssid;
    if (data.wifi_status) deviceInfo.wifiStatus = data.wifi_status;
    if (data.timestamp) deviceInfo.lastUpdate = new Date(data.timestamp);
    
    updateDashboard();
    updateConfiguration();
}

function updateDeviceConfig(data) {
    if (data.thresholds) {
        data.thresholds.forEach(threshold => {
            if (sensorData[threshold.sensor_type]) {
                sensorData[threshold.sensor_type].threshold = threshold.value;
            }
        });
        updateThresholdTable();
    }
}
// Function to switch between devices
function switchToDevice(deviceId) {
    if (devices[deviceId]) {
        currentDeviceId = deviceId;
        updateDashboard();
        updateSensorCards();
        updateConfiguration();
        updateThresholdTable();
        updateCharts();
        updateDataTable();
    }
}

// Function to get list of available devices
function getAvailableDevices() {
    return Object.keys(devices);
}

// Function to add device selector to UI
function addDeviceSelector() {
    const deviceList = document.getElementById('device-list');
    if (!deviceList) {
        // Create device selector if it doesn't exist
        const sidebar = document.querySelector('.sidebar .nav.flex-column');
        const deviceSection = document.createElement('li');
        deviceSection.className = 'nav-item';
        deviceSection.innerHTML = `
            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                <span>Devices</span>
            </h6>
            <ul class="nav flex-column mb-2" id="device-list">
                <!-- Device items will be added here -->
            </ul>
        `;
        sidebar.appendChild(deviceSection);
    }
    
    const deviceListElement = document.getElementById('device-list');
    deviceListElement.innerHTML = '';
    
    Object.keys(devices).forEach(deviceId => {
        const device = devices[deviceId];
        const li = document.createElement('li');
        li.className = 'nav-item';
        
        const a = document.createElement('a');
        a.className = 'nav-link' + (deviceId === currentDeviceId ? ' active' : '');
        a.href = '#';
        a.textContent = device.id || deviceId;
        a.style.cursor = 'pointer';
        a.addEventListener('click', function(e) {
            e.preventDefault();
            switchToDevice(deviceId);
        });
        
        li.appendChild(a);
        deviceListElement.appendChild(li);
    });
}

// Update the message handler to call addDeviceSelector when new device is detected
function updateDeviceSelector() {
    addDeviceSelector();
    updateDataDeviceSelector();
}

// Function to update device selector in data section
function updateDataDeviceSelector() {
    const deviceSelect = document.getElementById('device-select');
    if (!deviceSelect) return;
    
    // Clear existing options except the first one
    deviceSelect.innerHTML = '<option value="">Semua Alat</option>';
    
    // Add device options
    Object.keys(devices).forEach(deviceId => {
        const device = devices[deviceId];
        const option = document.createElement('option');
        option.value = deviceId;
        option.textContent = device.id || deviceId;
        if (deviceId === currentDeviceId) {
            option.selected = true;
        }
        deviceSelect.appendChild(option);
    });
}

// Function to check if we have a complete set of sensors and create a complete record
function checkCompleteSensorSet(deviceId, timestamp) {
    // Initialize pending data for this device if not exists
    if (!pendingSensorData[deviceId]) {
        pendingSensorData[deviceId] = {};
    }
    
    // Create a unique key for this timestamp (rounded to seconds to group nearby readings)
    const timeKey = Math.floor(timestamp.getTime() / 1000) * 1000;
    
    // Initialize this timestamp if not exists
    if (!pendingSensorData[deviceId][timeKey]) {
        pendingSensorData[deviceId][timeKey] = {
            timestamp: timestamp,
            sensors: {}
        };
    }
    
    // Add current sensor data to the pending set
    const sensorId = Object.keys(devices[deviceId].sensors).find(key =>
        devices[deviceId].sensors[key].currentValue !== undefined
    );
    
    if (sensorId) {
        pendingSensorData[deviceId][timeKey].sensors[sensorId] = {
            value: devices[deviceId].sensors[sensorId].currentValue,
            status: devices[deviceId].sensors[sensorId].status
        };
    }
    
    // Check if we have all 10 sensors for this timestamp
    const sensorCount = Object.keys(pendingSensorData[deviceId][timeKey].sensors).length;
    if (sensorCount === 10) {
        // Create a complete sensor set record
        const completeSet = {
            timestamp: timestamp, // Use timestamp of last received sensor
            deviceId: deviceId,
            operator: devices[deviceId].operator,
            sensors: pendingSensorData[deviceId][timeKey].sensors
        };
        
        // Add to complete sensor sets
        completeSensorSets.unshift(completeSet);
        
        // Keep only the last 1000 complete sets to prevent memory issues
        if (completeSensorSets.length > 1000) {
            completeSensorSets = completeSensorSets.slice(0, 1000);
        }
        
        // Remove from pending data
        delete pendingSensorData[deviceId][timeKey];
        
        // Update data table in real-time whenever new data arrives
        updateDataTable();
    }
}

// Function to save threshold values
function saveThresholds() {
    if (!currentDeviceId || !devices[currentDeviceId]) return;
    
    const thresholdInputs = document.querySelectorAll('.threshold-input');
    let updated = false;
    
    thresholdInputs.forEach(input => {
        const sensorId = input.getAttribute('data-sensor-id');
        const newThreshold = parseFloat(input.value);
        
        if (!isNaN(newThreshold) && newThreshold > 0) {
            const oldThreshold = devices[currentDeviceId].sensors[sensorId].threshold;
            
            if (oldThreshold !== newThreshold) {
                // Update threshold in device data
                devices[currentDeviceId].sensors[sensorId].threshold = newThreshold;
                
                // Update threshold in global sensor data
                if (sensorData[sensorId]) {
                    sensorData[sensorId].threshold = newThreshold;
                }
                
                // Update threshold in config
                const configSensor = config.sensors.find(s => s.id === sensorId);
                if (configSensor) {
                    configSensor.threshold = newThreshold;
                }
                
                updated = true;
                
                // Check current value against new threshold
                const currentValue = devices[currentDeviceId].sensors[sensorId].currentValue;
                checkThreshold(currentDeviceId, sensorId, currentValue);
            }
        }
    });
    
    if (updated) {
        // Update UI
        updateSensorCards();
        updateCharts();
        
        // Show success message
        showNotification('Threshold berhasil diperbarui!', 'success');
        
        // Send new thresholds to device via MQTT (if connected)
        if (mqttClient && mqttClient.connected) {
            const thresholdData = {
                deviceId: currentDeviceId,
                thresholds: config.sensors.map(sensor => ({
                    sensor_type: sensor.id,
                    value: sensor.threshold
                })),
                timestamp: new Date().toISOString()
            };
            
            const topic = `${config.mqtt.topics.baseTopic}/${currentDeviceId}/config`;
            mqttClient.publish(topic, JSON.stringify(thresholdData));
        }
    } else {
        showNotification('Tidak ada perubahan threshold', 'info');
    }
}

// Function to show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Show session expiry warning
function showSessionExpiryWarning(minutesRemaining) {
    // Check if warning already exists
    let warningModal = document.getElementById('session-expiry-warning-modal');
    if (warningModal) return;
    
    // Create warning modal
    warningModal = document.createElement('div');
    warningModal.id = 'session-expiry-warning-modal';
    warningModal.className = 'modal fade';
    warningModal.setAttribute('tabindex', '-1');
    warningModal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-warning text-dark">
                    <h5 class="modal-title">Peringatan Sesi</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Sesi Anda akan berakhir dalam <strong>${minutesRemaining} menit</strong>.</p>
                    <p>Klik "Perpanjang Sesi" untuk melanjutkan menggunakan aplikasi.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Nanti</button>
                    <button type="button" class="btn btn-primary" id="extend-session-expiry-btn">Perpanjang Sesi</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(warningModal);
    
    // Show modal
    const modal = new bootstrap.Modal(warningModal);
    modal.show();
    
    // Handle extend session button
    const extendSessionBtn = document.getElementById('extend-session-expiry-btn');
    if (extendSessionBtn) {
        extendSessionBtn.addEventListener('click', () => {
            AuthSystem.extendSession();
            updateSessionTimeRemaining();
            modal.hide();
            showNotification('Sesi berhasil diperpanjang', 'success');
        });
    }
    
    // Handle modal close
    warningModal.addEventListener('hidden.bs.modal', () => {
        warningModal.remove();
    });
}