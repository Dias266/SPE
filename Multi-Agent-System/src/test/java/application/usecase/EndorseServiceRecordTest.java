package application.usecase;

import application.port.ServiceRecordRepository;
import domain.event.ServiceRecordEndorsed;
import domain.model.ServiceRecord;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class EndorseServiceRecordTest {

    static class InMemoryRepo implements ServiceRecordRepository {
        Map<Integer, ServiceRecord> store = new HashMap<>();

        @Override
        public void save(ServiceRecord record) {
            store.put(record.id(), record);
        }

        @Override
        public Optional<ServiceRecord> findById(int id) {
            return Optional.ofNullable(store.get(id));
        }
    }

    @Test
    void endorsesAnExistingRecordAndPersistsTheDecision() {
        InMemoryRepo repo = new InMemoryRepo();
        repo.save(new ServiceRecord(1, "vehicle_agent1", "brake_pad", "tech_a", 140));
        EndorseServiceRecord useCase = new EndorseServiceRecord(repo);

        ServiceRecordEndorsed event = useCase.execute(1, "fleet_coordinator_agent", true);

        assertTrue(event.isApproved());
        assertTrue(repo.findById(1).orElseThrow().isDecided());
    }

    @Test
    void reEndorsingThroughTheUseCaseStillThrows() {
        InMemoryRepo repo = new InMemoryRepo();
        repo.save(new ServiceRecord(1, "vehicle_agent1", "brake_pad", "tech_a", 140));
        EndorseServiceRecord useCase = new EndorseServiceRecord(repo);
        useCase.execute(1, "fleet_coordinator_agent", true);

        assertThrows(IllegalStateException.class,
                () -> useCase.execute(1, "some_peer", true));
    }

    @Test
    void endorsingAnUnknownRecordThrowsNoSuchElement() {
        InMemoryRepo repo = new InMemoryRepo();
        EndorseServiceRecord useCase = new EndorseServiceRecord(repo);

        assertThrows(NoSuchElementException.class,
                () -> useCase.execute(999, "fleet_coordinator_agent", true));
    }
}
