#  Blockchain-Enabled Digital Twin Creation for Vehicles with Secure VIN Authentication and IoT Telemetry Integration 
A distributed system implementing VIN-based digital twins, secure authentication, and Hyperledger Fabric integration.

---

#  Quick Start

## 1. **Install Dependencies**

Run installation **in all three folders**:

### **Backend**
```bash
cd backend
npm install
```

### **IoT Telematics**
```bash
cd ../iot-telematics
npm install
```

### **Chaincode / Blockchain SDK**
```bash
cd ../chaincode
npm install
```

---

## 2. **Configure Environment**

- Update `.env` with your credentials  
- Ensure certificates are correctly placed and referenced  
- Check Fabric MSP paths inside backend configuration files  

---

## 3. **Start Development Server**

```bash
npm start
```

This runs the backend on:

```
http://localhost:3000
```

---

## 4. **Test API**

```bash
curl http://localhost:3001/health
```

---

# Architecture Overview

- **Blockchain**: Hyperledger Fabric  
- **Backend**: Node.js + Express  
- **Deployment**: Local development — `http://localhost:3000
- **Authentication**: X.509 certificates  
- **IoT Layer**: ESP32 + MQTT-based telematics  

---

#  API Endpoints

| Method | Endpoint | Description |
|-------|----------|-------------|
| `GET` | `/health` | System health check |
| `GET` | `/api/identity/list` | List registered identities |
| `POST` | `/api/identity/register` | Register a new blockchain identity |
| `GET` | `/api/identity/contract` | Hyperledger contract metadata |

---

#  Development Environment

- **Node.js**: v22.18.0  
- **npm**: 10.9.3  
- **fabric-network**: 2.2.20  
- **Express.js**: 4.19.2  

---

# Implementation Status

- [x] VIN-Based Digital Twins  
- [x] Secure VIN Authentication  

---

#  Academic Requirements (Prof. Omicini — Distributed Systems)

- Byzantine Fault Tolerance  
- Consensus Mechanisms  
- Distributed Identity Management  
- Failure Detection & Recovery  

---

#  Project Structure

```
distributed-systems-project/ 
├── backend    # Main server (vehicles only)
   └── app.js
   └── byzantine-handler.js    # Byzantine fault tolerance
   └── consensus protocol.js    # Raft consensus implementation
   └── failure-recovery.js     # Failure detection & recovery
   └── mqtt-integration.js
├── chaincode        
   └── fabric samples
   └── index.js 
   └── package-lock.json
   └── package.json
   └── vehicle-chaincode.js
├── fabric-network          
   └── configtx.yaml
   └── crypto-config.yaml
   └── docker-compose.yml
   └── network.sh
├── iot-telematics        
   └── arduino_auth_controller.ino
   └── congif.h
   └── control-unit-iot.js
   └── dashboard-iot.html
   └── esp32_telematics.ino
├── public              
   └── index.html
   └── style.css
├──test
   └── test-distributed-systems.js
├── README.md              
├── start-all.sh 
