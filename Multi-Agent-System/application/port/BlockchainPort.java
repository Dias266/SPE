package application.port;

import domain.event.FleetAnomalyDetected;
import domain.model.ServiceRecord;

/**
 * Port onto the Trust & Service Ledger context (Hyperledger Fabric backend,
 * per the proposal's tech stack) — what the application layer needs from
 * "the blockchain", expressed in domain terms rather than HTTP/JSON.
 *
 * This replaces env.BlockchainAdapter (currently a nested interface inside
 * FleetMASEnvironment.java with signatures like
 * writeServiceRecord(String vehicleId, String details)). The difference is
 * deliberate: that version takes loose strings assembled ad hoc at the call
 * site inside executeAction(); this version takes the actual domain
 * objects, so the only place still allowed to know about HTTP status
 * codes, endpoint URLs or JSON payloads is the infrastructure
 * implementation of this interface (e.g. RealBlockchainClient).
 *
 * Existing adapters already in the repo (RealBlockchainClient,
 * MockBlockchainClient — currently in env/, per the split we did earlier)
 * become infrastructure/ implementations of this port; their HTTP/JSON
 * internals don't need to change, only their method signatures and where
 * the file lives.
 */
public interface BlockchainPort {

    /**
     * Replaces the logFleetAnomalyToBlockchain case currently handled
     * inline in FleetMASEnvironment#executeAction. Takes the domain event
     * produced once an anomaly pattern has actually been recognised,
     * rather than the raw (anomalyType, count) terms pulled straight off
     * the incoming Jason action.
     */
    boolean logFleetAnomaly(FleetAnomalyDetected event);

    /**
     * Replaces the writeServiceRecord case. Takes the aggregate itself so
     * the adapter can serialise whatever fields the real Fabric backend
     * needs (vehicleId, part, technician, cost, and — once decided — the
     * endorsement) instead of receiving two disconnected strings.
     */
    boolean writeServiceRecord(ServiceRecord record);

    /**
     * Replaces readDigitalTwin(String vin). Left as a raw String return
     * for now — a DigitalTwin domain type is a reasonable next addition,
     * but is out of scope for this pass since no code yet does anything
     * with the returned history beyond logging it (see
     * FleetMASEnvironment#handleReadDigitalTwin).
     */
    String readDigitalTwin(String vehicleId);
}
