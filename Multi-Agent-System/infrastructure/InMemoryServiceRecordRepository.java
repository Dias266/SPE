package infrastructure;

import application.port.ServiceRecordRepository;
import domain.model.ServiceRecord;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * New — there is no equivalent of this in the current codebase at all.
 * Service records today live only as service_record(RID, VehicleID, Part,
 * Tech, Cost) beliefs inside ServiceCenterAgent's .asl belief base
 * (mas/agents/service_center_agent.asl), which disappear the moment the
 * Jason process ends.
 *
 * This is a plain HashMap-backed implementation of ServiceRecordRepository
 * — the simplest thing that could work, matching what the .asl belief
 * base already does implicitly (in-memory, id-keyed, no real
 * persistence). It exists so EndorseServiceRecord and any future use case
 * needing to look up or save a ServiceRecord has something concrete to
 * run against, in tests and otherwise. A durable implementation (backed by
 * the Hyperledger Fabric ledger itself, or Postgres/MongoDB per the
 * proposal's stack) can implement the same interface later without any
 * use case having to change.
 */
public final class InMemoryServiceRecordRepository implements ServiceRecordRepository {

    private final Map<Integer, ServiceRecord> records = new HashMap<>();

    @Override
    public void save(ServiceRecord record) {
        records.put(record.id(), record);
    }

    @Override
    public Optional<ServiceRecord> findById(int id) {
        return Optional.ofNullable(records.get(id));
    }
}
