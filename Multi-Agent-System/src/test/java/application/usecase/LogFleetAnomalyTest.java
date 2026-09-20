package application.usecase;

import application.port.BlockchainPort;
import domain.event.FleetAnomalyDetected;
import domain.model.ServiceRecord;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LogFleetAnomalyTest {

    /** Fake, not mock — a plain hand-written test double, no framework needed. */
    static class FakeBlockchain implements BlockchainPort {
        FleetAnomalyDetected received;
        boolean returnValue = true;

        @Override
        public boolean logFleetAnomaly(FleetAnomalyDetected event) {
            this.received = event;
            return returnValue;
        }

        @Override
        public boolean writeServiceRecord(ServiceRecord record) {
            return true;
        }

        @Override
        public String readDigitalTwin(String vehicleId) {
            return "stub";
        }
    }

    @Test
    void delegatesToPortWithTheBuiltEvent() {
        FakeBlockchain fake = new FakeBlockchain();
        LogFleetAnomaly useCase = new LogFleetAnomaly(fake);

        boolean result = useCase.execute("brake_wear", 2);

        assertTrue(result);
        assertNotNull(fake.received);
        assertEquals("brake_wear", fake.received.anomalyType());
        assertEquals(2, fake.received.vehicleCount());
    }

    @Test
    void propagatesPortFailure() {
        FakeBlockchain fake = new FakeBlockchain();
        fake.returnValue = false;
        LogFleetAnomaly useCase = new LogFleetAnomaly(fake);

        assertFalse(useCase.execute("oil_pressure", 1));
    }

    @Test
    void rejectsNonPositiveVehicleCountBeforeReachingThePort() {
        FakeBlockchain fake = new FakeBlockchain();
        LogFleetAnomaly useCase = new LogFleetAnomaly(fake);

        assertThrows(IllegalArgumentException.class, () -> useCase.execute("brake_wear", 0));
        assertNull(fake.received, "port should never be called when the event fails validation");
    }
}
