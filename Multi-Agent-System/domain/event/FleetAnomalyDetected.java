package domain.event;

import java.time.Instant;
import java.util.Objects;

/**
 * Domain event mirroring the collective alert FleetCoordinatorAgent raises
 * when the same anomaly type is observed across multiple vehicles — see
 * "COLLECTIVE ALERT — anomaly pattern detected" in
 * mas/agents/fleet_coordinator_agent.asl, and the
 * logFleetAnomalyToBlockchain(AnomalyType, Count) action currently handled
 * inline inside FleetMASEnvironment#executeAction.
 *
 * Today that path logs straight to the blockchain adapter with no
 * intermediate object — this event is what an application-layer
 * LogFleetAnomaly use case would produce instead, decoupling "an anomaly
 * pattern was detected" (a domain fact) from "write it to Hyperledger
 * Fabric" (an infrastructure concern behind a BlockchainPort).
 */
public final class FleetAnomalyDetected {

    private final String anomalyType;
    private final int vehicleCount;
    private final Instant occurredAt;

    public FleetAnomalyDetected(String anomalyType, int vehicleCount) {
        this(anomalyType, vehicleCount, Instant.now());
    }

    public FleetAnomalyDetected(String anomalyType, int vehicleCount, Instant occurredAt) {
        if (anomalyType == null || anomalyType.isBlank()) {
            throw new IllegalArgumentException("anomalyType must not be blank");
        }
        if (vehicleCount <= 0) {
            throw new IllegalArgumentException("vehicleCount must be positive (got " + vehicleCount + ")");
        }
        this.anomalyType = anomalyType;
        this.vehicleCount = vehicleCount;
        this.occurredAt = Objects.requireNonNull(occurredAt, "occurredAt must not be null");
    }

    public String anomalyType() {
        return anomalyType;
    }

    public int vehicleCount() {
        return vehicleCount;
    }

    public Instant occurredAt() {
        return occurredAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FleetAnomalyDetected)) return false;
        FleetAnomalyDetected that = (FleetAnomalyDetected) o;
        return vehicleCount == that.vehicleCount
                && anomalyType.equals(that.anomalyType)
                && occurredAt.equals(that.occurredAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(anomalyType, vehicleCount, occurredAt);
    }

    @Override
    public String toString() {
        return "FleetAnomalyDetected{anomalyType='" + anomalyType + "', vehicleCount=" + vehicleCount
                + ", occurredAt=" + occurredAt + '}';
    }
}
