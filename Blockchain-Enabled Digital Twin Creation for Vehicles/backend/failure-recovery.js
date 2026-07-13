// failure-recovery.js - Distributed Failure Detection and Recovery

class FailureRecoveryManager {
    constructor(peers) {
        this.peers = peers;
        this.failureDetector = new FailureDetector(peers);
        this.recoveryStrategies = new Map();
        this.failureLog = [];
    }

    startMonitoring() {
        // Monitor peer health with heartbeats
        this.monitoringInterval = setInterval(() => {
            this.checkPeerHealth();
        }, 5000); // Check every 5 seconds

        console.log('Started distributed failure monitoring');
    }

    async checkPeerHealth() {
        for (const peer of this.peers) {
            const isHealthy = await this.failureDetector.checkHealth(peer);
            
            if (!isHealthy && peer.status === 'online') {
                console.log(`Peer ${peer.nodeId} failed health check`);
                await this.handleFailure(peer);
            } else if (isHealthy && peer.status === 'failed') {
                console.log(`Peer ${peer.nodeId} recovered`);
                await this.handleRecovery(peer);
            }
        }
    }

    async handleFailure(peer) {
        peer.status = 'failed';
        peer.failureTimestamp = Date.now();
        
        this.failureLog.push({
            nodeId: peer.nodeId,
            timestamp: new Date().toISOString(),
            event: 'FAILURE_DETECTED'
        });

        // Initiate recovery procedure
        await this.initiateRecovery(peer);
    }

    async initiateRecovery(peer) {
        console.log(`🔧 Initiating recovery for peer ${peer.nodeId}`);

        // Step 1: Attempt to reconnect
        const reconnected = await this.attemptReconnection(peer);
        
        if (reconnected) {
            // Step 2: Synchronize state
            await this.synchronizeState(peer);
            
            // Step 3: Restore to active status
            peer.status = 'online';
            console.log(`✅ Successfully recovered peer ${peer.nodeId}`);
        } else {
            // Failed to recover - redistribute load
            await this.redistributeLoad(peer);
        }
    }

    async attemptReconnection(peer, maxAttempts = 3) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`🔄 Reconnection attempt ${attempt}/${maxAttempts} for ${peer.nodeId}`);
            
            // Simulate reconnection attempt
            const success = Math.random() > 0.3; // 70% success rate
            
            if (success) {
                return true;
            }
            
            await this.sleep(2000); // Wait 2 seconds between attempts
        }
        
        return false;
    }

    async synchronizeState(peer) {
        console.log(`🔄 Synchronizing state for recovered peer ${peer.nodeId}`);
        
        // Find a healthy peer to sync from
        const healthyPeer = this.peers.find(p => p.status === 'online' && p.nodeId !== peer.nodeId);
        
        if (healthyPeer) {
            // Copy committed log entries from healthy peer
            peer.log = [...healthyPeer.log];
            peer.currentTerm = healthyPeer.currentTerm;
            
            console.log(`✅ State synchronized from ${healthyPeer.nodeId} to ${peer.nodeId}`);
        }
    }

    async redistributeLoad(failedPeer) {
        console.log(`⚖️ Redistributing load from failed peer ${failedPeer.nodeId}`);
        
        const healthyPeers = this.peers.filter(p => p.status === 'online');
        
        if (healthyPeers.length === 0) {
            console.error('❌ No healthy peers available for load redistribution');
            return;
        }

        // Redistribute transactions to healthy peers
        const transactionsPerPeer = Math.ceil(failedPeer.pendingTransactions / healthyPeers.length);
        
        healthyPeers.forEach(peer => {
            peer.pendingTransactions += transactionsPerPeer;
        });

        console.log(`✅ Redistributed ${failedPeer.pendingTransactions} transactions to ${healthyPeers.length} peers`);
    }

    async handleRecovery(peer) {
        this.failureLog.push({
            nodeId: peer.nodeId,
            timestamp: new Date().toISOString(),
            event: 'RECOVERY_COMPLETED'
        });

        // Restore peer to full capacity
        await this.synchronizeState(peer);
        peer.status = 'online';
    }

    getFailureStatistics() {
        const failures = this.failureLog.filter(e => e.event === 'FAILURE_DETECTED');
        const recoveries = this.failureLog.filter(e => e.event === 'RECOVERY_COMPLETED');
        
        return {
            totalFailures: failures.length,
            totalRecoveries: recoveries.length,
            currentlyFailed: this.peers.filter(p => p.status === 'failed').length,
            averageRecoveryTime: this.calculateAverageRecoveryTime(),
            failureLog: this.failureLog
        };
    }

    calculateAverageRecoveryTime() {
        const recoveryTimes = [];
        
        this.failureLog.forEach((event, index) => {
            if (event.event === 'RECOVERY_COMPLETED') {
                // Find corresponding failure event
                const failureEvent = this.failureLog
                    .slice(0, index)
                    .reverse()
                    .find(e => e.nodeId === event.nodeId && e.event === 'FAILURE_DETECTED');
                
                if (failureEvent) {
                    const recoveryTime = new Date(event.timestamp) - new Date(failureEvent.timestamp);
                    recoveryTimes.push(recoveryTime);
                }
            }
        });

        if (recoveryTimes.length === 0) return 0;
        return recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
}

class FailureDetector {
    constructor(peers) {
        this.peers = peers;
        this.heartbeatTimeout = 3000; // 3 seconds
    }

    async checkHealth(peer) {
        try {
            // Simulate heartbeat request
            const startTime = Date.now();
            const response = await this.sendHeartbeat(peer);
            const responseTime = Date.now() - startTime;
            
            peer.lastHeartbeat = Date.now();
            peer.responseTime = responseTime;
            
            return response && responseTime < this.heartbeatTimeout;
        } catch (error) {
            return false;
        }
    }

    async sendHeartbeat(peer) {
        // Simulate network call
        return new Promise((resolve) => {
            setTimeout(() => {
                // 90% chance of successful heartbeat for online peers
                resolve(peer.status === 'online' && Math.random() > 0.1);
            }, Math.random() * 1000); // Random delay 0-1s
        });
    }
}

module.exports = { FailureRecoveryManager, FailureDetector };
