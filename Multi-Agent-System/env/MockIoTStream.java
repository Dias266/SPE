package env;

import java.util.ArrayList;
import java.util.List;

// =========================================================================
// MOCK ADAPTERS — used when USE_REAL_INTEGRATIONS = false
// =========================================================================
class MockIoTStream implements IoTStreamAdapter {
    private final String[][] data = {
            {"vehicle_agent1", "brake_wear",   "high"},
            {"vehicle_agent2", "brake_wear",   "medium"},
            {"vehicle_agent3", "oil_pressure", "low"},
            {"vehicle_agent1", "oil_pressure", "high"},
            {"vehicle_agent2", "oil_pressure", "critical"},
    };
    private int cursor = 0;

    @Override
    public List<IoTAnomaly> getLatestAnomalies() {
        List<IoTAnomaly> result = new ArrayList<>();
        int batch = Math.min(2, data.length - cursor);
        for (int i = 0; i < batch; i++) {
            String[] row = data[(cursor + i) % data.length];
            result.add(new IoTAnomaly(row[0], row[1], row[2]));
        }
        cursor = (cursor + batch) % data.length;
        return result;
    }
}
