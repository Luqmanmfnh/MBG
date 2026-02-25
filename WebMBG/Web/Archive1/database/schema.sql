-- Gas Monitoring System Database Schema for Supabase

-- Drop tables if they exist (for development)
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS alert_notifications CASCADE;
DROP TABLE IF EXISTS sensor_thresholds CASCADE;

-- Devices table
CREATE TABLE devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    operator VARCHAR(100) NOT NULL,
    ssid VARCHAR(100),
    wifi_status VARCHAR(20) DEFAULT 'offline',
    last_online TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sensor thresholds table
CREATE TABLE sensor_thresholds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    sensor_type VARCHAR(20) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, sensor_type)
);

-- Sensor readings table
CREATE TABLE sensor_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    sensor_type VARCHAR(20) NOT NULL,
    sensor_name VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'normal', -- normal, warning, danger
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    sensor_type VARCHAR(20) NOT NULL,
    sensor_name VARCHAR(100) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert notifications table
CREATE TABLE alert_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL, -- email, sms, push
    recipient VARCHAR(255) NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_sensor_readings_device_id ON sensor_readings(device_id);
CREATE INDEX idx_sensor_readings_sensor_type ON sensor_readings(sensor_type);
CREATE INDEX idx_sensor_readings_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_sensor_readings_device_timestamp ON sensor_readings(device_id, timestamp);

CREATE INDEX idx_alerts_device_id ON alerts(device_id);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);

CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_last_online ON devices(last_online);

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at columns
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensor_thresholds_updated_at BEFORE UPDATE ON sensor_thresholds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check sensor threshold and create alerts
CREATE OR REPLACE FUNCTION check_sensor_threshold()
RETURNS TRIGGER AS $$
DECLARE
    threshold_record sensor_thresholds%ROWTYPE;
    alert_record alerts%ROWTYPE;
BEGIN
    -- Get the threshold for this sensor and device
    SELECT * INTO threshold_record 
    FROM sensor_thresholds 
    WHERE device_id = NEW.device_id AND sensor_type = NEW.sensor_type;
    
    -- If threshold exists and value exceeds it
    IF FOUND AND NEW.value > threshold_record.threshold_value THEN
        -- Determine status based on how much it exceeds the threshold
        IF NEW.value > threshold_record.threshold_value THEN
            NEW.status := 'danger';
        ELSE
            NEW.status := 'warning';
        END IF;
        
        -- Create an alert
        INSERT INTO alerts (device_id, sensor_type, sensor_name, value, threshold_value, unit)
        VALUES (NEW.device_id, NEW.sensor_type, NEW.sensor_name, NEW.value, threshold_record.threshold_value, NEW.unit);
    ELSE
        NEW.status := 'normal';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check sensor threshold
CREATE TRIGGER check_sensor_threshold_trigger
    BEFORE INSERT ON sensor_readings
    FOR EACH ROW EXECUTE FUNCTION check_sensor_threshold();

-- Row Level Security (RLS) policies
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for devices
CREATE POLICY "Anyone can view devices" ON devices FOR SELECT USING (true);
CREATE POLICY "Anyone can insert devices" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update devices" ON devices FOR UPDATE USING (true);

-- Policies for sensor_readings
CREATE POLICY "Anyone can view sensor readings" ON sensor_readings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sensor readings" ON sensor_readings FOR INSERT WITH CHECK (true);

-- Policies for alerts
CREATE POLICY "Anyone can view alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Anyone can update alerts" ON alerts FOR UPDATE USING (true);

-- Policies for sensor_thresholds
CREATE POLICY "Anyone can view sensor thresholds" ON sensor_thresholds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sensor thresholds" ON sensor_thresholds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sensor thresholds" ON sensor_thresholds FOR UPDATE USING (true);

-- Policies for alert_notifications
CREATE POLICY "Anyone can view alert notifications" ON alert_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert alert notifications" ON alert_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update alert notifications" ON alert_notifications FOR UPDATE USING (true);

-- Insert sample data for testing
INSERT INTO devices (device_id, operator, ssid, wifi_status, last_online) VALUES
('GAS-001', 'Operator 1', 'GasMonitor_WiFi', 'online', NOW());

-- Insert default sensor thresholds
INSERT INTO sensor_thresholds (device_id, sensor_type, threshold_value, unit) VALUES
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'NH3', 25, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'CO', 35, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'NO2', 5, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'CH4', 1000, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'H2S', 10, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'SO2', 5, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'O2', 19.5, '%'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'H2', 1000, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'CL2', 0.5, 'ppm'),
((SELECT id FROM devices WHERE device_id = 'GAS-001'), 'PM25', 35, 'μg/m³');