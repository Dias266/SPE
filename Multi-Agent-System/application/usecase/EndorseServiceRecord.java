package application.usecase;

import application.port.ServiceRecordRepository;
import domain.event.ServiceRecordEndorsed;
import domain.model.ServiceRecord;
import java.util.NoSuchElementException;

/**
 * This use case does not have a call site in FleetMASEnvironment#executeAction
 * today — and that gap is exactly the problem it exists to close.
 *
 * Right now, endorsement is decided entirely on the .asl side:
 *   ServiceCenterAgent  --endorse_request(RID, VehicleID)-->  FleetCoordinatorAgent
 *   FleetCoordinatorAgent --endorsement(RID, approve|reject)--> ServiceCenterAgent
 * and the receiving +endorsement(RID, approve) / +endorsement(RID, reject)
 * plans in service_center_agent.asl just print a message (or retract the
 * belief, on reject). Nothing anywhere checks whether a record was already
 * decided before acting on a second endorsement message — the invariant
 * only exists as an assumption about how the protocol is supposed to be
 * used, not as an enforced rule.
 *
 * This use case is what you'd wire an "endorseServiceRecord" Jason action
 * into (a new case in executeAction, sending the coordinator's or peer's
 * decision into Java instead of leaving it purely inter-agent) if you want
 * ServiceRecord#endorse's invariant to actually run. Until that action
 * exists on the .asl/env side, this class is complete and tested but not
 * yet reachable from a running scenario — worth being upfront about in
 * the report rather than implying it's already wired end-to-end.
 */
public final class EndorseServiceRecord {

    private final ServiceRecordRepository repository;

    public EndorseServiceRecord(ServiceRecordRepository repository) {
        this.repository = repository;
    }

    /**
     * @throws NoSuchElementException if no record with this id has been saved
     * @throws IllegalStateException if the record was already endorsed or
     *         rejected — see ServiceRecord#endorse
     */
    public ServiceRecordEndorsed execute(int recordId, String endorserId, boolean approved) {
        ServiceRecord record = repository.findById(recordId)
                .orElseThrow(() -> new NoSuchElementException(
                        "No service record #" + recordId + " found — cannot endorse an unknown record"));

        ServiceRecordEndorsed event = record.endorse(endorserId, approved);
        repository.save(record);
        return event;
    }
}
