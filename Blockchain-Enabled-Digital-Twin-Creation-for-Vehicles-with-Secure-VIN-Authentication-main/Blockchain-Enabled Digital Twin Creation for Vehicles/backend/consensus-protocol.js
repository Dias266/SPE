
// consensus-protocol.js - Raft-based Consensus Protocol

class RaftConsensusProtocol { 
    constructor(nodeId, peers) { 
        this.nodeId = nodeId; 
        this.peers = peers; // Other nodes in the network 
        this.state = 'follower'; // 'follower', 'candidate', 'leader' 
        this.currentTerm = 0; 
        this.votedFor = null; 
        this.log = []; // Replicated log entries 
        this.commitIndex = 0; 
        this.lastApplied = 0; 
        this.electionTimeout = this.randomTimeout(150, 300); 
        this.heartbeatInterval = 50; // ms 
        this.votes = new Set(); 
    } 

    // Start the Raft consensus protocol 
    start() { 
        this.resetElectionTimer(); 
        console.log(` Node ${this.nodeId} starting Raft consensus protocol`); 
    } 

    // Election timeout - become candidate and request votes 
    onElectionTimeout() { 
        this.state = 'candidate'; 
        this.currentTerm++; 
        this.votedFor = this.nodeId; 
        this.votes.clear(); 
        this.votes.add(this.nodeId); // Vote for self 

        console.log(`📢 Node ${this.nodeId} became candidate for term ${this.currentTerm}`); 

        this.requestVotes(); 
    } 

    // Request votes from all peers 
    async requestVotes() { 
        const voteRequests = this.peers.map(peer =>  
            this.sendVoteRequest(peer, { 
                term: this.currentTerm, 
                candidateId: this.nodeId, 
                lastLogIndex: this.log.length - 1, 
                lastLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0 
            }) 
        ); 


        const results = await Promise.allSettled(voteRequests); 

        results.forEach((result, index) => { 
            if (result.status === 'fulfilled' && result.value.voteGranted) { 
                this.votes.add(this.peers[index].nodeId); 
            } 
        }); 

        // Check if we won the election 
        if (this.votes.size > Math.floor(this.peers.length / 2)) { 
            this.becomeLeader(); 
        } 
    } 

    async sendVoteRequest(peer, request) { 
        // Simulate RPC call to peer 
        // In real implementation: HTTP/gRPC call to peer node 
        if (peer.status === 'online') { 
            // Peer votes if candidate's log is at least as up-to-date 
            const voteGranted = request.term > peer.currentTerm; 
            return { 
                term: peer.currentTerm, 
                voteGranted 
            }; 
        } 

        return { term: peer.currentTerm, voteGranted: false }; 
    } 

    // Become leader after winning election 
    becomeLeader() { 
        console.log(`👑 Node ${this.nodeId} became LEADER for term ${this.currentTerm}`); 
        this.state = 'leader'; 

        // Start sending heartbeats 
        this.sendHeartbeats(); 
        this.heartbeatTimer = setInterval(() => this.sendHeartbeats(), this.heartbeatInterval); 
    } 

    // Leader sends heartbeats to maintain authority 
    async sendHeartbeats() { 
        const heartbeats = this.peers.map(peer =>  
            this.sendAppendEntries(peer, { 
                term: this.currentTerm, 
                leaderId: this.nodeId, 
                prevLogIndex: this.log.length - 1, 
                prevLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0, 
                entries: [], // Empty for heartbeat 
                leaderCommit: this.commitIndex 
            }) 
        ); 

        await Promise.allSettled(heartbeats); 
    } 

    async sendAppendEntries(peer, request) { 
        if (peer.status === 'online') { 
            // Follower acknowledges if terms match 
            if (request.term >= peer.currentTerm) { 
                peer.currentTerm = request.term; 
                return { term: peer.currentTerm, success: true }; 
            } 
        } 
        return { term: peer.currentTerm, success: false }; 
    } 

    // Append new entry to log (leader only) 
    async appendEntry(entry) { 
        if (this.state !== 'leader') { 
            throw new Error('Only leader can append entries'); 
        } 
 
        const logEntry = { 
            term: this.currentTerm, 
            index: this.log.length, 
            command: entry, 
            timestamp: Date.now() 
        }; 

        this.log.push(logEntry); 
        console.log(`📝 Leader ${this.nodeId} appended entry at index ${logEntry.index}`); 

        // Replicate to followers 
        await this.replicateToFollowers(logEntry); 
        
        return logEntry; 
    } 

    async replicateToFollowers(entry) { 
        const replicationPromises = this.peers.map(peer => 
            this.sendAppendEntries(peer, { 
                term: this.currentTerm, 
                leaderId: this.nodeId, 
                prevLogIndex: entry.index - 1, 
                prevLogTerm: entry.index > 0 ? this.log[entry.index - 1].term : 0, 
                entries: [entry], 
                leaderCommit: this.commitIndex 
            }) 
        ); 

        const results = await Promise.allSettled(replicationPromises); 
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length; 

        // Commit if majority acknowledged 
        if (successCount > Math.floor(this.peers.length / 2)) { 
            this.commitIndex = entry.index; 
            console.log(`✅ Entry ${entry.index} committed on majority of nodes`); 
        } 
    } 

    resetElectionTimer() { 
        if (this.electionTimer) clearTimeout(this.electionTimer); 
        this.electionTimeout = this.randomTimeout(150, 300); 
        this.electionTimer = setTimeout(() => this.onElectionTimeout(), this.electionTimeout); 
    } 

    randomTimeout(min, max) { 
        return Math.floor(Math.random() * (max - min + 1)) + min; 
    } 

    getState() { 
        return { 
            nodeId: this.nodeId, 
            state: this.state, 
            currentTerm: this.currentTerm, 
            logLength: this.log.length, 
            commitIndex: this.commitIndex, 
            votes: Array.from(this.votes) 
        }; 
    } 

    stop() { 
        if (this.electionTimer) clearTimeout(this.electionTimer); 
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer); 
    } 
} 

module.exports = RaftConsensusProtocol;
