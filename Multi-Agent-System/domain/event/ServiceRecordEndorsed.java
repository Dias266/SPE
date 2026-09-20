package domain.event;

import java.time.Instant;
import java.util.Objects;

/**
 * Domain event raised by ServiceRecord#endorse when a cross-organisation
 * endorsement decision is recorded for the first (and only) time.
 *
 * This is a genuine domain event in the DDD sense — distinct from a Jason
 * percept or belief. Where the .asl side reacts to an incoming
 * endorsement(RID, approve|reject) message and immediately prints/acts on
 * it, this event is the outcome of the domain rule having been checked
 * (see ServiceRecord's invariant against re-endorsing) and is what an
 * application-layer use case would publish onward — e.g. to the
 * FleetMASEnvironment adapter, which can translate it into a percept for
 * the relevant agent, or to the ledger/blockchain port.
 */
public final class ServiceRecordEndorsed {

    private final int recordId;
    private final String vehicleId;
    private final boolean approved;
    private final Instant occurredAt;

    public ServiceRecordEndorsed(int recordId, String vehicleId, boolean approved) {
        this(recordId, vehicleId, approved, Instant.now());
    }

    public ServiceRecordEndorsed(int recordId, String vehicleId, boolean approved, Instant occurredAt) {
        this.recordId = recordId;
        this.vehicleId = Objects.requireNonNull(vehicleId, "vehicleId must not be null");
        this.approved = approved;
        this.occurredAt = Objects.requireNonNull(occurredAt, "occurredAt must not be null");
    }

    public int recordId() {
        return recordId;
    }

    public String vehicleId() {
        return vehicleId;
    }

    public boolean isApproved() {
        return approved;
    }

    public Instant occurredAt() {
        return occurredAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ServiceRecordEndorsed)) return false;
        ServiceRecordEndorsed that = (ServiceRecordEndorsed) o;
        return recordId == that.recordId
                && approved == that.approved
                && vehicleId.equals(that.vehicleId)
                && occurredAt.equals(that.occurredAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(recordId, vehicleId, approved, occurredAt);
    }

    @Override
    public String toString() {
        return "ServiceRecordEndorsed{recordId=" + recordId + ", vehicleId='" + vehicleId
                + "', approved=" + approved + ", occurredAt=" + occurredAt + '}';
    }
}
