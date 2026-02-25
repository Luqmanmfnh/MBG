// Supabase Integration for Gas Monitoring System

// Configuration - Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://dragdfllvihjqgznbjzj.supabase.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyYWdkZmxsdmloanFnem5ianpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MTQ4NTIsImV4cCI6MjA4NzQ5MDg1Mn0.pVcg97xfOU4e3lIshghQcwBar6mc_xsQdZbY9uXQ5U4';

// Initialize Supabase client
let supabase;

// Initialize Supabase when the script loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSupabase();
});

function initializeSupabase() {
    try {
        // Only initialize if we have valid credentials
        if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
            // Check if the Supabase client library is loaded
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('Supabase initialized successfully');
            } else {
                console.error('Supabase client library not loaded');
            }
        } else {
            console.warn('Supabase credentials not configured. Using local storage only.');
        }
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
    }
}

// Device Management
async function getDevice(deviceId) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('devices')
            .select('*')
            .eq('device_id', deviceId)
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching device:', error);
        return null;
    }
}

// Helper function to get device UUID by device_id (VARCHAR)
async function getDeviceUuid(deviceId) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('devices')
            .select('id')
            .eq('device_id', deviceId)
            .single();
            
        if (error) throw error;
        return data ? data.id : null;
    } catch (error) {
        console.error('Error fetching device UUID:', error);
        return null;
    }
}

async function upsertDevice(deviceData) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('devices')
            .upsert(deviceData, {
                onConflict: 'device_id',
                returning: 'representation'
            });
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error upserting device:', error);
        return null;
    }
}

// Sensor Thresholds Management
async function getSensorThresholds(deviceId) {
    if (!supabase) return null;
    
    try {
        // Check if deviceId is a UUID or VARCHAR device_id
        let queryDeviceId = deviceId;
        
        // If it's not a UUID format, get the UUID from devices table
        if (!deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const deviceUuid = await getDeviceUuid(deviceId);
            if (!deviceUuid) {
                console.error('Device not found:', deviceId);
                return null;
            }
            queryDeviceId = deviceUuid;
        }
        
        const { data, error } = await supabase
            .from('sensor_thresholds')
            .select('*')
            .eq('device_id', queryDeviceId);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching sensor thresholds:', error);
        return null;
    }
}

async function upsertSensorThreshold(thresholdData) {
    if (!supabase) return null;
    
    try {
        // Check if device_id is a UUID or VARCHAR device_id
        let queryDeviceId = thresholdData.device_id;
        
        // If it's not a UUID format, get the UUID from devices table
        if (!thresholdData.device_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const deviceUuid = await getDeviceUuid(thresholdData.device_id);
            if (!deviceUuid) {
                console.error('Device not found:', thresholdData.device_id);
                return null;
            }
            queryDeviceId = deviceUuid;
        }
        
        // Update the device_id with the UUID
        const dataWithUuid = { ...thresholdData, device_id: queryDeviceId };
        
        const { data, error } = await supabase
            .from('sensor_thresholds')
            .upsert(dataWithUuid, {
                onConflict: 'device_id,sensor_type',
                returning: 'representation'
            });
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error upserting sensor threshold:', error);
        return null;
    }
}

// Sensor Readings Management
async function insertSensorReading(readingData) {
    if (!supabase) return null;
    
    try {
        // Check if device_id is a UUID or VARCHAR device_id
        let queryDeviceId = readingData.device_id;
        
        // If it's not a UUID format, get the UUID from devices table
        if (!readingData.device_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const deviceUuid = await getDeviceUuid(readingData.device_id);
            if (!deviceUuid) {
                console.error('Device not found:', readingData.device_id);
                return null;
            }
            queryDeviceId = deviceUuid;
        }
        
        // Update the device_id with the UUID
        const dataWithUuid = { ...readingData, device_id: queryDeviceId };
        
        const { data, error } = await supabase
            .from('sensor_readings')
            .insert(dataWithUuid);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error inserting sensor reading:', error);
        return null;
    }
}

async function getSensorReadings(deviceId, options = {}) {
    if (!supabase) return [];
    
    try {
        // Check if deviceId is a UUID or VARCHAR device_id
        let queryDeviceId = deviceId;
        
        // If it's not a UUID format, get the UUID from devices table
        if (!deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const deviceUuid = await getDeviceUuid(deviceId);
            if (!deviceUuid) {
                console.error('Device not found:', deviceId);
                return [];
            }
            queryDeviceId = deviceUuid;
        }
        
        let query = supabase
            .from('sensor_readings')
            .select('*')
            .eq('device_id', queryDeviceId);
            
        // Apply filters
        if (options.sensorType) {
            query = query.eq('sensor_type', options.sensorType);
        }
        
        if (options.startDate) {
            query = query.gte('timestamp', options.startDate);
        }
        
        if (options.endDate) {
            query = query.lte('timestamp', options.endDate);
        }
        
        // Apply ordering
        if (options.orderBy) {
            query = query.order(options.orderBy, { ascending: options.ascending !== false });
        } else {
            query = query.order('timestamp', { ascending: false });
        }
        
        // Apply limit
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching sensor readings:', error);
        return [];
    }
}

// Alerts Management
async function getAlerts(deviceId, options = {}) {
    if (!supabase) return [];
    
    try {
        // Check if deviceId is a UUID or VARCHAR device_id
        let queryDeviceId = deviceId;
        
        // If it's not a UUID format, get the UUID from devices table
        if (!deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const deviceUuid = await getDeviceUuid(deviceId);
            if (!deviceUuid) {
                console.error('Device not found:', deviceId);
                return [];
            }
            queryDeviceId = deviceUuid;
        }
        
        let query = supabase
            .from('alerts')
            .select('*')
            .eq('device_id', queryDeviceId);
            
        // Apply filters
        if (options.acknowledged !== undefined) {
            query = query.eq('acknowledged', options.acknowledged);
        }
        
        if (options.startDate) {
            query = query.gte('timestamp', options.startDate);
        }
        
        if (options.endDate) {
            query = query.lte('timestamp', options.endDate);
        }
        
        // Apply ordering
        query = query.order('timestamp', { ascending: false });
        
        // Apply limit
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
}

async function acknowledgeAlert(alertId, acknowledgedBy) {
    if (!supabase) return null;
    
    try {
        const { data, error } = await supabase
            .from('alerts')
            .update({
                acknowledged: true,
                acknowledged_by: acknowledgedBy,
                acknowledged_at: new Date().toISOString()
            })
            .eq('id', alertId);
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        return null;
    }
}

// Real-time subscriptions
async function subscribeToSensorReadings(deviceId, callback) {
    if (!supabase) return null;
    
    try {
        // Check if deviceId is a UUID or VARCHAR device_id
        let queryDeviceId = deviceId;
        
        // If it's not a UUID format, get the UUID from devices table
        if (!deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const deviceUuid = await getDeviceUuid(deviceId);
            if (!deviceUuid) {
                console.error('Device not found:', deviceId);
                return null;
            }
            queryDeviceId = deviceUuid;
        }
        
        const subscription = supabase
            .channel(`sensor_readings:${queryDeviceId}`)
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'sensor_readings',
                    filter: `device_id=eq.${queryDeviceId}`
                }, 
                (payload) => callback(payload.new)
            )
            .subscribe();
            
        return subscription;
    } catch (error) {
        console.error('Error subscribing to sensor readings:', error);
        return null;
    }
}

async function subscribeToDeviceStatus(deviceId, callback) {
    if (!supabase) return null;
    
    try {
        // For devices table, we can use the VARCHAR device_id directly
        const subscription = supabase
            .channel(`devices:${deviceId}`)
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'devices',
                    filter: `device_id=eq.${deviceId}`
                }, 
                (payload) => callback(payload.new)
            )
            .subscribe();
            
        return subscription;
    } catch (error) {
        console.error('Error subscribing to device status:', error);
        return null;
    }
}

async function subscribeToAlerts(deviceId, callback) {
    if (!supabase) return null;
    
    try {
        // Check if deviceId is a UUID or VARCHAR device_id
        let queryDeviceId = deviceId;
        
        // If it's not a UUID format, get the UUID from devices table
        if (!deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const deviceUuid = await getDeviceUuid(deviceId);
            if (!deviceUuid) {
                console.error('Device not found:', deviceId);
                return null;
            }
            queryDeviceId = deviceUuid;
        }
        
        const subscription = supabase
            .channel(`alerts:${queryDeviceId}`)
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'alerts',
                    filter: `device_id=eq.${queryDeviceId}`
                }, 
                (payload) => callback(payload.new)
            )
            .subscribe();
            
        return subscription;
    } catch (error) {
        console.error('Error subscribing to alerts:', error);
        return null;
    }
}

// Utility function to format data for Supabase
function formatSensorReadingForSupabase(deviceId, sensorData, timestamp = new Date()) {
    return {
        device_id: deviceId,
        sensor_type: sensorData.type,
        sensor_name: sensorData.name || sensorData.type,
        value: sensorData.value,
        unit: sensorData.unit,
        status: sensorData.status || 'normal',
        timestamp: timestamp.toISOString()
    };
}

// Utility function to format device data for Supabase
function formatDeviceForSupabase(deviceData) {
    return {
        device_id: deviceData.id || deviceData.device_id,
        operator: deviceData.operator,
        ssid: deviceData.ssid,
        wifi_status: deviceData.wifiStatus || deviceData.wifi_status,
        last_online: deviceData.lastUpdate ? deviceData.lastUpdate.toISOString() : new Date().toISOString()
    };
}

// Export functions for use in other scripts
window.SupabaseService = {
    getDevice,
    upsertDevice,
    getSensorThresholds,
    upsertSensorThreshold,
    insertSensorReading,
    getSensorReadings,
    getAlerts,
    acknowledgeAlert,
    subscribeToSensorReadings,
    subscribeToDeviceStatus,
    subscribeToAlerts,
    formatSensorReadingForSupabase,
    formatDeviceForSupabase
};