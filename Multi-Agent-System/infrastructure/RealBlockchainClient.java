package infrastructure;

import application.port.BlockchainPort;
import domain.event.FleetAnomalyDetected;
import domain.model.ServiceRecord;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.logging.Logger;

/**
 * Moved from env/FleetMASEnvironment.java, where it was a non-static inner
 * class reaching directly into the outer class's httpClient and
 * DS_BACKEND_URL fields. As a standalone infrastructure class it takes
 * both as constructor arguments instead, and implements BlockchainPort
 * (application/port/BlockchainPort.java) rather than the old
 * env.BlockchainAdapter interface.
 *
 * The HTTP calls themselves are unchanged from the original — including
 * the pre-existing oddities (logFleetAnomaly issues a GET to
 * /api/telemetry/history rather than a POST carrying the anomaly payload,
 * and writeServiceRecord is a no-op stub that always returns true without
 * calling the backend at all). Fixing those is a separate decision from
 * relocating the file, so they're preserved here rather than silently
 * "improved" mid-move — call it out explicitly if you want them fixed in
 * a later pass.
 *
 * DS backend endpoints, per the DS project's start-all.sh output:
 *   POST /api/telemetry/store        — store fleet anomaly event
 *   POST /api/vehicle/:vin/service   — write service record
 *   GET  /api/vehicle/:vin           — read digital twin history
 */
public final class RealBlockchainClient implements BlockchainPort {

    private static final Logger logger = Logger.getLogger(RealBlockchainClient.class.getName());
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final String dsBackendUrl;

    public RealBlockchainClient(String dsBackendUrl) {
        this.dsBackendUrl = dsBackendUrl;
        System.out.println("[BLOCKCHAIN-REAL] RealBlockchainClient initialized and active.");
    }

    @Override
    public boolean logFleetAnomaly(FleetAnomalyDetected event) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(dsBackendUrl + "/api/telemetry/history"))
                    .header("Content-Type", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, BodyHandlers.ofString());
            System.out.println("[BLOCKCHAIN-REAL] Fleet anomaly logged: "
                    + event.anomalyType() + " x" + event.vehicleCount() + " → HTTP " + resp.statusCode());

            if (resp.statusCode() == 200) {
                System.out.println("[BLOCKCHAIN-REAL] Successfully fetched telemetry data.");
                System.out.println("[BLOCKCHAIN-REAL] Received JSON: " + resp.body());
            } else {
                System.out.println("[BLOCKCHAIN-REAL] Failed to fetch data. HTTP Status: " + resp.statusCode());
            }

            return resp.statusCode() == 200 || resp.statusCode() == 201;

        } catch (Exception e) {
            logger.warning("[ENV] Blockchain log failed: " + e.getMessage());
            System.out.println("[BLOCKCHAIN-REAL] FAILED — falling back to local log");
            return false;
        }
    }

    @Override
    public boolean writeServiceRecord(ServiceRecord record) {
        // Unchanged stub behaviour from the original inner class: the real
        // write was never actually implemented, only acknowledged.
        System.out.println("[BLOCKCHAIN-REAL] writeServiceRecord stub called for record #"
                + record.id() + " (vehicle=" + record.vehicleId() + ") — not yet sent to backend.");
        return true;
    }

    @Override
    public String readDigitalTwin(String vehicleId) {
        System.out.println("[BLOCKCHAIN-REAL] Read for " + vehicleId);
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(dsBackendUrl + "/api/telemetry/latest/"))
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, BodyHandlers.ofString());
            if (resp.statusCode() == 200) {
                System.out.println("[BLOCKCHAIN-REAL] Digital twin read for " + vehicleId);
                return resp.body();
            }
        } catch (Exception e) {
            logger.warning("[ENV] Digital twin read failed: " + e.getMessage());
        }
        return "last_service:unknown,status:unknown";
    }
}
