require('dotenv').config();
const mqtt = require('mqtt');
const { SerialPort } = require('serialport');
const axios = require('axios');

// Configuration with fallbacks
const config = {
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    topic: process.env.MQTT_TOPIC_VEHICLE || 'vehicle/telemetry',
    qos: parseInt(process.env.MQTT_QOS) || 1,
    clientId: process.env.MQTT_CLIENT_ID || 'control-unit-' + Math.random().toString(16).substr(2, 8)
  },
  serial: {
    port: process.env.ARDUINO_PORT || '/dev/cu.usbmodem1101',
    baudRate: parseInt(process.env.ARDUINO_BAUD_RATE) || 9600
  },
  blockchain: {
    apiUrl: process.env.BLOCKCHAIN_API_URL || 'http://localhost:3000/api'
  },
  debug: process.env.LOG_LEVEL === 'debug'
};

// MQTT Client with error handling
let mqttClient;

function connectMQTT() {
  console.log(`[MQTT] Connecting to ${config.mqtt.brokerUrl}...`);
  
  mqttClient = mqtt.connect(config.mqtt.brokerUrl, {
    clientId: config.mqtt.clientId,
    clean: true,
    reconnectPeriod: 5000, // Retry every 5 seconds
    connectTimeout: 30000
  });

  mqttClient.on('connect', () => {
    console.log('[MQTT] ✅ Connected successfully');
    
    // Subscribe to vehicle telemetry topic
    mqttClient.subscribe(config.mqtt.topic, { qos: config.mqtt.qos }, (err) => {
      if (err) {
        console.error('[MQTT] ❌ Subscription error:', err.message);
      } else {
        console.log(`[MQTT] ✅ Subscribed to ${config.mqtt.topic}`);
      }
    });
  });

  mqttClient.on('error', (error) => {
    console.error('[MQTT] ❌ Connection error:', error.message);
    console.error('[MQTT] Check if Mosquitto broker is running:');
    console.error('[MQTT]   Mac/Linux: mosquitto -v');
    console.error('[MQTT]   Or check: ps aux | grep mosquitto');
  });

  mqttClient.on('offline', () => {
    console.warn('[MQTT] ⚠️  Client offline - attempting reconnection...');
  });

  mqttClient.on('reconnect', () => {
    console.log('[MQTT] 🔄 Reconnecting...');
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const telemetryData = JSON.parse(message.toString());
      console.log('[MQTT] 📨 Received telemetry:', {
        vin: telemetryData.vin,
        temp: telemetryData.temperature,
        timestamp: telemetryData.timestamp
      });

      // Forward to Arduino for signature verification
      await verifySignature(telemetryData);
      
    } catch (error) {
      console.error('[MQTT] ❌ Message processing error:', error.message);
    }
  });
}

// Serial Port with error handling
let serialPort;

function connectSerial() {
  console.log(`[Serial] Connecting to ${config.serial.port}...`);
  
  serialPort = new SerialPort({
    path: config.serial.port,
    baudRate: config.serial.baudRate,
    autoOpen: false
  });

  serialPort.open((err) => {
    if (err) {
      console.error('[Serial] ❌ Connection error:', err.message);
      console.error('[Serial] Available ports:');
      SerialPort.list().then(ports => {
        ports.forEach(port => {
          console.error(`[Serial]   - ${port.path}`);
        });
      });
      console.error('[Serial] Update ARDUINO_PORT in .env file');
      return;
    }
    
    console.log('[Serial] ✅ Connected successfully');
  });

  serialPort.on('data', (data) => {
    console.log('[Serial] 📨 Received:', data.toString());
  });

  serialPort.on('error', (error) => {
    console.error('[Serial] ❌ Error:', error.message);
  });
}

// Signature verification
async function verifySignature(telemetryData) {
  if (!serialPort || !serialPort.isOpen) {
    console.warn('[Serial] ⚠️  Port not open, skipping verification');
    // In simulation mode, proceed anyway
    await submitToBlockchain(telemetryData);
    return;
  }

  return new Promise((resolve, reject) => {
    const verificationRequest = JSON.stringify({
      vin: telemetryData.vin,
      signature: telemetryData.signature,
      data: telemetryData.data
    });

    serialPort.write(verificationRequest + '\n', (err) => {
      if (err) {
        console.error('[Serial] ❌ Write error:', err.message);
        reject(err);
        return;
      }

      // Wait for Arduino response
      serialPort.once('data', async (response) => {
        const result = response.toString().trim();
        
        if (result === 'VALID') {
          console.log('[Serial] ✅ Signature verified');
          await submitToBlockchain(telemetryData);
          resolve(true);
        } else {
          console.error('[Serial] ❌ Invalid signature');
          reject(new Error('Invalid signature'));
        }
      });
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Verification timeout'));
    }, 5000);
  });
}

// Blockchain submission
async function submitToBlockchain(telemetryData) {
  try {
    console.log('[Blockchain] 📤 Submitting telemetry...');
    
    const response = await axios.post(
      `${config.blockchain.apiUrl}/vehicle/${telemetryData.vin}/telemetry`,
      telemetryData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    if (response.data.success) {
      console.log('[Blockchain] ✅ Telemetry stored successfully');
      console.log('[Blockchain] Transaction ID:', response.data.transactionId);
    } else {
      console.error('[Blockchain] ❌ Submission failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('[Blockchain] ❌ API error:', error.message);
    if (error.response) {
      console.error('[Blockchain] Status:', error.response.status);
      console.error('[Blockchain] Response:', error.response.data);
    }
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[System] Shutting down gracefully...');
  
  if (mqttClient) {
    mqttClient.end(true);
    console.log('[MQTT] Disconnected');
  }
  
  if (serialPort && serialPort.isOpen) {
    serialPort.close();
    console.log('[Serial] Disconnected');
  }
  
  process.exit(0);
});

// Start services
console.log('==================================================');
console.log('   IoT Control Unit - Starting Services');
console.log('==================================================\n');

connectMQTT();
connectSerial();

console.log('\n[System] ✅ Control unit initialized');
console.log('[System] Waiting for telemetry data...\n');
