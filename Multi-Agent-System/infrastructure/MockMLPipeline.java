package infrastructure;

import application.port.MLPredictionPort;
import application.port.MaintenanceInsight;
import java.util.HashMap;
import java.util.Map;

/**
 * Moved from env/FleetMASEnvironment.java (was a static nested class using
 * env.MLInsight). The lookup table and its three seeded values are
 * unchanged from the original; only the return type changed, from
 * env.MLInsight to application.port.MaintenanceInsight, so that nothing
 * above the infrastructure layer needs to import from env/ at all.
 */
public final class MockMLPipeline implements MLPredictionPort {

    private final Map<String, MaintenanceInsight> insights = new HashMap<>();

    public MockMLPipeline() {
        insights.put("vehicle_agent1", new MaintenanceInsight("engine", 0.82, "high"));
        insights.put("vehicle_agent2", new MaintenanceInsight("brakes", 0.45, "medium"));
        insights.put("vehicle_agent3", new MaintenanceInsight("battery", 0.91, "low"));
    }

    @Override
    public MaintenanceInsight getInsight(String agentName) {
        return insights.getOrDefault(agentName, new MaintenanceInsight("unknown", 0.5, "low"));
    }
}
