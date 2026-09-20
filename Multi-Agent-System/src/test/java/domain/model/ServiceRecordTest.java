package domain.model;

import domain.event.ServiceRecordEndorsed;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ServiceRecordTest {

    @Test
    void freshRecordIsNotDecided() {
        ServiceRecord record = new ServiceRecord(1, "vehicle_agent1", "brake_pad", "tech_a", 140);
        assertFalse(record.isDecided());
    }

    @Test
    void firstEndorsementSucceedsAndReturnsMatchingEvent() {
        ServiceRecord record = new ServiceRecord(1, "vehicle_agent1", "brake_pad", "tech_a", 140);

        ServiceRecordEndorsed event = record.endorse("fleet_coordinator_agent", true);

        assertTrue(record.isDecided());
        assertTrue(event.isApproved());
        assertEquals(1, event.recordId());
        assertEquals("vehicle_agent1", event.vehicleId());
    }

    @Test
    void reEndorsingACommittedRecordThrows() {
        ServiceRecord record = new ServiceRecord(1, "vehicle_agent1", "brake_pad", "tech_a", 140);
        record.endorse("fleet_coordinator_agent", true);

        assertThrows(IllegalStateException.class,
                () -> record.endorse("some_peer", true));
    }

    @Test
    void rejectingIsAlsoADecisionAndCannotBeRedone() {
        // Mirrors service_center_agent.asl's +endorsement(RID, reject) path:
        // a rejected record is still a DECIDED record, not an open one.
        ServiceRecord record = new ServiceRecord(2, "vehicle_agent2", "oil_filter", "tech_b", 85);
        record.endorse("fleet_coordinator_agent", false);

        assertTrue(record.isDecided());
        assertThrows(IllegalStateException.class,
                () -> record.endorse("fleet_coordinator_agent", true));
    }

    @Test
    void constructorRejectsInvalidFields() {
        assertThrows(IllegalArgumentException.class,
                () -> new ServiceRecord(1, "", "brake_pad", "tech_a", 140));
        assertThrows(IllegalArgumentException.class,
                () -> new ServiceRecord(1, "vehicle_agent1", "brake_pad", "tech_a", -10));
        assertThrows(IllegalArgumentException.class,
                () -> new ServiceRecord(0, "vehicle_agent1", "brake_pad", "tech_a", 140));
    }
}
