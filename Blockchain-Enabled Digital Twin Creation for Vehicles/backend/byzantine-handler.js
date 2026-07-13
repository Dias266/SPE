
// byzantine-handler.js - Real Byzantine Fault Tolerance 

class ByzantineFaultHandler { 
    constructor(peers) { 
        this.peers = peers; // Array of blockchain peer nodes 
        this.faultyNodes = new Set(); 
        this.votingHistory = []; 
        this.consensusThreshold = Math.floor(peers.length * 2/3) + 1; // BFT: 2f+1 
    } 

    // Detect Byzantine behavior through voting inconsistencies 
    async detectByzantineNodes(transaction) { 
        const votes = await this.collectVotes(transaction); 
        const consensusVote = this.determineConsensus(votes); 

        // Identify nodes that deviated from consensus 
        for (const [nodeId, vote] of Object.entries(votes)) { 
            if (vote.decision !== consensusVote && !this.isNetworkPartition(nodeId)) { 
                this.faultyNodes.add(nodeId); 
                console.log(`🚨 Byzantine node detected: ${nodeId}`); 
                this.quarantineNode(nodeId); 
            } 
        } 

        return { 
            byzantineNodes: Array.from(this.faultyNodes), 
            consensusAchieved: votes.filter(v => v.decision === consensusVote).length >= this.consensusThreshold 
        }; 
    } 

    // Collect votes from all peers 
    async collectVotes(transaction) { 
        const votes = {}; 
       
        for (const peer of this.peers) { 
            if (!this.faultyNodes.has(peer.nodeId)) { 
                try { 
                    const vote = await this.requestVote(peer, transaction); 
                    votes[peer.nodeId] = vote; 
                } catch (error) { 
                    console.error(`Failed to get vote from ${peer.nodeId}:`, error.message); 
                    // Mark as potentially faulty 
                    votes[peer.nodeId] = { decision: 'UNAVAILABLE', timestamp: Date.now() }; 
                } 
            } 
        } 

        return votes; 
    } 

    // Determine consensus based on majority voting (BFT requirement: 2f+1) 
    determineConsensus(votes) { 
        const voteCounts = {}; 
         
        Object.values(votes).forEach(vote => { 
            if (vote.decision !== 'UNAVAILABLE') { 
                voteCounts[vote.decision] = (voteCounts[vote.decision] || 0) + 1; 
            } 
        }); 

        // Find decision with >= consensusThreshold votes 
        for (const [decision, count] of Object.entries(voteCounts)) { 
            if (count >= this.consensusThreshold) { 
                return decision; 
            } 
        } 

        return null; // No consensus reached 
    } 

    // Check if node failure is due to network partition vs Byzantine behavior 
    isNetworkPartition(nodeId) { 
        // Simple heuristic: if multiple nodes are unreachable, likely network partition 
        const unavailableNodes = this.peers.filter(p => !this.canReach(p.nodeId)); 
        return unavailableNodes.length > 1 && unavailableNodes.some(n => n.nodeId === nodeId); 
    } 

    // Quarantine Byzantine node (exclude from consensus) 
    quarantineNode(nodeId) { 
        console.log(`🔒 Quarantining Byzantine node: ${nodeId}`); 
        this.faultyNodes.add(nodeId); 
         
        // Log for audit trail 
        this.votingHistory.push({ 
            timestamp: new Date().toISOString(), 
            action: 'QUARANTINE', 
            nodeId, 
            reason: 'Byzantine behavior detected' 
        }); 
    } 

    // Simulate node failure for testing 
    simulateNodeFailure(nodeId, failureType = 'crash') { 
        const peer = this.peers.find(p => p.nodeId === nodeId); 
        if (peer) { 
            peer.status = 'failed'; 
            peer.failureType = failureType; // 'crash', 'byzantine', 'partition' 
            console.log(`💥 Simulated ${failureType} failure on node: ${nodeId}`); 
        } 
    } 

    // Recovery: restore quarantined node after verification 
    async recoverNode(nodeId) { 
        if (this.faultyNodes.has(nodeId)) { 
            // Verify node has recovered and is honest 
            const isHonest = await this.verifyNodeBehavior(nodeId);   

            if (isHonest) { 
                this.faultyNodes.delete(nodeId); 
                console.log(`✅ Node ${nodeId} recovered and restored to network`); 
                 
                this.votingHistory.push({ 
                    timestamp: new Date().toISOString(), 
                    action: 'RECOVER', 
                    nodeId, 
                    reason: 'Node verified as honest' 
                }); 
            } 
        } 
    } 

    async verifyNodeBehavior(nodeId) { 
        // In real implementation: check recent voting patterns 
        // For now, simple simulation 
        return Math.random() > 0.2; // 80% chance of honest behavior 
    } 

    canReach(nodeId) { 
        const peer = this.peers.find(p => p.nodeId === nodeId); 
        return peer && peer.status === 'online'; 
    } 

    async requestVote(peer, transaction) { 
        // Simulate peer voting on transaction 
        // In real implementation: call peer's API endpoint 
        return { 
            decision: peer.status === 'online' && Math.random() > 0.1 ? 'APPROVE' : 'REJECT', 
            timestamp: Date.now(), 
            signature: `sig_${peer.nodeId}_${Date.now()}` 
        }; 
    } 

    getNetworkHealth() { 
        const totalNodes = this.peers.length; 
        const healthyNodes = this.peers.filter(p =>  
            p.status === 'online' && !this.faultyNodes.has(p.nodeId) 
        ).length; 
         
        return { 
            totalNodes, 
            healthyNodes, 
            faultyNodes: this.faultyNodes.size, 
            canReachConsensus: healthyNodes >= this.consensusThreshold, 
            byzantineTolerance: `Can tolerate ${Math.floor((totalNodes - 1) / 3)} Byzantine nodes` 
        }; 
    } 
} 

module.exports = ByzantineFaultHandler;
