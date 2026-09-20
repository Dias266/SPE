package infrastructure;

import application.port.BlockchainPort;
import domain.event.FleetAnomalyDetected;
import domain.model.ServiceRecord;

/**
 * Moved from env/FleetMASEnvironment.java (was a static nested class),
 * now implementing BlockchainPort instead of env.BlockchainAdapter. Note
 * this class is not currently wired up anywhere — FleetMASEnvironment's
 * init() constructs RealBlockchainClient in both the mock and real
 * branches today (the mock/real toggle for blockchain doesn't actually do
 * anything, a pre-existing bug this refactor surfaces rather than
 * silently fixes). This class is kept because it's clearly intended to be
 * the real mock path once that's corrected.
 */
public final class MockBlockchainClient implements BlockchainPort {

    @Override
    public boolean logFleetAnomaly(FleetAnomalyDetected event) {
        System.out.println("[BLOCKCHAIN-MOCK] Fleet anomaly logged: "
                + event.anomalyType() + " x" + event.vehicleCount());
        return true;
    }

    @Override
    public boolean writeServiceRecord(ServiceRecord record) {
        System.out.println("[BLOCKCHAIN-MOCK] Service record written for: "
                + record.vehicleId() + " — part=" + record.part()
                + " tech=" + record.technician() + " cost=" + record.cost());
        return true;
    }

    @Override
    public String readDigitalTwin(String vehicleId) {
        return "last_service:2024-11-01,mileage:45200,status:ok";
    }
}
