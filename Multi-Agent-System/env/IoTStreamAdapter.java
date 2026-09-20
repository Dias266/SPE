package env;

import java.util.List;

interface IoTStreamAdapter {
    List<IoTAnomaly> getLatestAnomalies();
}
