
#!/bin/bash

echo "Starting Complete System..."

# Start Fabric Network
echo "Starting Fabric network..."
cd fabric-network
./network.sh up createChannel -ca
./network.sh deployCC -ccn vehicle-chaincode -ccp ../chaincode
cd ..

# Start Blockchain Backend
echo "Starting Blockchain Backend..."
cd backend
node app.js &
BACKEND_PID=$!

# Start MQTT Broker
echo "Starting MQTT Broker..."
mosquitto &

# Start MQTT Bridge
echo "Starting MQTT Bridge..."
node mqtt-integration.js &
BRIDGE_PID=$!

# Start IoT Control Unit
echo "Starting IoT Control Unit..."
cd ../iot-telematics
node control-unit-iot.js &
IOT_PID=$!

echo ""
echo "All services started!"
echo ""
echo "Access Points:"
echo "   - Blockchain API:    http://localhost:3000"
echo "   - IoT Dashboard:     http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop all services..."

trap "kill $BACKEND_PID $BRIDGE_PID $IOT_PID; exit" INT TERM
wait
