const mqtt = require('mqtt');

// Connect to your local broker where control-unit-iot.js is running
const client = mqtt.connect('mqtt://localhost:1883');

const TOPIC = 'vehicle/telemetry';

// Simulated Telemetry Data
const vin = 'TEST-VIN-123';
const temp = '55'; // Warning level (>= 30)
const mileage = '4000';
const state = 'NORMAL';
const timestamp = Date.now().toString();
const sig = '12345678'; // Dummy signature for now

// Construct the packet matching the parsing logic in control-unit-iot.js
const packet = `VIN:${vin}|TEMP:${temp}|MILEAGE:${mileage}|STATE:${state}|TIMESTAMP:${timestamp}|SIG:${sig}`;

client.on('connect', () => {
    console.log('Connected to broker. Sending test telemetry...');
    
    // Publish the packet
    client.publish(TOPIC, packet);
    
    console.log(`Sent: ${packet}`);
    
    // Disconnect after sending
    setTimeout(() => {
        client.end();
        process.exit();
    }, 1000);
});