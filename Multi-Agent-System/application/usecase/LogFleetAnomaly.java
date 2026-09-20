package application.usecase;

import application.port.BlockchainPort;
import domain.event.FleetAnomalyDetected;

/**
 * Replaces the "logFleetAnomalyToBlockchain" case currently handled inline
 * inside FleetMASEnvironment#executeAction:
 *
 *   case "logFleetAnomalyToBlockchain":
 *       String anomalyType = action.getTerm(0).toString();
 *       String countStr    = action.getTerm(1).toString();
 *       handleReadDigitalTwin(agentName, action.getTerm(0).toString());
 *       return blockchainAdapter.logFleetAnomaly(anomalyType, Integer.parseInt(countStr));
 *
 * That code parses two Jason terms and calls the adapter directly in the
 * same breath as the parsing — there's no seam where a test could exercise
 * "what happens when a fleet anomaly is logged" without also going through
 * Jason's Structure/term machinery.
 *
 * Here, the parsing stays in FleetMASEnvironment (it's the only place that
 * should know about Structure/Term at all); this class receives plain
 * Java values, builds the domain event — which validates anomalyType is
 * non-blank and vehicleCount is positive, per FleetAnomalyDetected's own
 * constructor — and delegates to the port.
 *
 * Note: the current inline code also calls handleReadDigitalTwin as a side
 * effect on every anomaly log, for reasons that aren't obvious from the
 * .asl side. That call isn't reproduced here — folding an unrelated
 * digital-twin read into "log this anomaly" is exactly the kind of hidden
 * coupling this refactor is meant to surface, not carry forward silently.
 * If that read is actually required, it belongs in its own use case,
 * called explicitly by whichever plan needs it.
 */
public final class LogFleetAnomaly {

    private final BlockchainPort blockchainPort;

    public LogFleetAnomaly(BlockchainPort blockchainPort) {
        this.blockchainPort = blockchainPort;
    }

    public boolean execute(String anomalyType, int vehicleCount) {
        FleetAnomalyDetected event = new FleetAnomalyDetected(anomalyType, vehicleCount);
        return blockchainPort.logFleetAnomaly(event);
    }
}
