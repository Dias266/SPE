package application.port;

import domain.model.ServiceRecord;
import java.util.Optional;

/**
 * Port for persisting/retrieving {@link ServiceRecord} aggregates.
 *
 * Today, service records live only as .asl beliefs — service_record(RID,
 * VehicleID, Part, Tech, Cost) in mas/agents/service_center_agent.asl —
 * which vanish the moment the Jason process ends, and as a
 * record_counter(0) belief that assigns ids. There is no Java-side
 * persistence at all right now.
 *
 * This interface describes only what the application layer needs from
 * storage — save a record, look one up by id — without saying how or where
 * it's stored. A first implementation can be a trivial in-memory HashMap
 * (InMemoryServiceRecordRepository, in infrastructure/), matching what the
 * .asl belief base already does implicitly; a later one could back onto the
 * Hyperledger Fabric ledger itself, without any use case that depends on
 * this interface having to change.
 */
public interface ServiceRecordRepository {

    /**
     * Persists a record, whether newly created or updated (e.g. after
     * ServiceRecord#endorse has been called). Implementations should key by
     * ServiceRecord#id, consistent with the .asl side's record_counter
     * being the single source of truth for id assignment.
     */
    void save(ServiceRecord record);

    /**
     * Looks up a record by id. Returns Optional.empty() if no such record
     * exists — mirroring the .asl side's record_valid(RID) check in
     * service_center_agent.asl, which is currently just a belief-base
     * lookup with no explicit "not found" case.
     */
    Optional<ServiceRecord> findById(int id);
}
