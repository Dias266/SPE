// test-distributed-systems.js - Automated Testing Suite

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

class DistributedSystemsTest {
    constructor() {
        this.results = [];
    }

    async runAllTests() {
        console.log('\n DISTRIBUTED SYSTEMS TEST SUITE\n');
        console.log('='.repeat(60));

        await this.testNetworkStatus();
        await this.testByzantineTolerance();
        await this.testConsensusProtocol();
        await this.testFailureRecovery();
        await this.testDataReplication();

        this.printSummary();
    }

    async testNetworkStatus() {
        console.log('\n Test 1: Network Status');
        try {
            const response = await axios.get(`${BASE_URL}/api/network/status`);
            const { network, consensus, byzantineDefense } = response.data;

            const passed = network.totalNodes === 5 && 
                          byzantineDefense.canReachConsensus;

            this.recordResult('Network Status', passed, {
                nodes: network.totalNodes,
                consensus: byzantineDefense.canReachConsensus
            });
        } catch (error) {
            this.recordResult('Network Status', false, { error: error.message });
        }
    }

    async testByzantineTolerance() {
        console.log('\n  Test 2: Byzantine Fault Tolerance');
        try {
            const response = await axios.post(`${BASE_URL}/api/test/byzantine`);
            const passed = response.data.success && 
                          response.data.byzantineDetection.consensusAchieved;

            this.recordResult('Byzantine Tolerance', passed, response.data);
        } catch (error) {
            this.recordResult('Byzantine Tolerance', false, { error: error.message });
        }
    }

    async testConsensusProtocol() {
        console.log('\n⚡ Test 3: Raft Consensus Protocol');
        try {
            const response = await axios.post(`${BASE_URL}/api/test/consensus`);
            const passed = response.data.success;

            this.recordResult('Consensus Protocol', passed, response.data);
        } catch (error) {
            this.recordResult('Consensus Protocol', false, { error: error.message });
        }
    }

    async testFailureRecovery() {
        console.log('\n🔧 Test 4: Failure Detection & Recovery');
        try {
            const response = await axios.post(`${BASE_URL}/api/test/recovery`);
            const passed = response.data.success;

            this.recordResult('Failure Recovery', passed, response.data);
        } catch (error) {
            this.recordResult('Failure Recovery', false, { error: error.message });
        }
    }

    async testDataReplication() {
        console.log('\n Test 5: Distributed Data Replication');
        try {
            // Register vehicle
            const vin = `TEST${Date.now()}`;
            const regResponse = await axios.post(`${BASE_URL}/api/vehicle/register`, {
                vin,
                make: 'Tesla',
                model: 'Model 3',
                year: 2024
            });

            // Add service record
            const serviceResponse = await axios.post(`${BASE_URL}/api/vehicle/${vin}/service`, {
                type: 'Test Service',
                description: 'Automated test',
                cost: 100
            });

            const passed = regResponse.data.success && 
                          serviceResponse.data.success &&
                          serviceResponse.data.replication.replicationFactor >= 3;

            this.recordResult('Data Replication', passed, {
                vin,
                replicationFactor: serviceResponse.data.replication.replicationFactor
            });
        } catch (error) {
            this.recordResult('Data Replication', false, { error: error.message });
        }
    }

    recordResult(testName, passed, details) {
        this.results.push({ testName, passed, details });
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`   ${status}: ${testName}`);
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log(' TEST SUMMARY\n');

        const total = this.results.length;
        const passed = this.results.filter(r => r.passed).length;
        const failed = total - passed;

        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${Math.round((passed / total) * 100)}%\n`);

        console.log('='.repeat(60));

        process.exit(failed > 0 ? 1 : 0);
    }
}

// Run tests
const tester = new DistributedSystemsTest();
tester.runAllTests().catch(console.error);
