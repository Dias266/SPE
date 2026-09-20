package domain.model;

import java.time.Instant;
import java.util.Objects;

/**
 * Value object: the outcome of a cross-organisation endorsement of a
 * {@link ServiceRecord}.
 *
 * Mirrors the endorsement(RID, approve|reject) message exchanged between
 * ServiceCenterAgent and FleetCoordinatorAgent (see mas/agents/*.asl and
 * docs/message_protocol.md). The endorsing party is either the fleet
 * coordinator's organisation (a "Center" source) or a peer service centre
 * performing Byzantine validation (a "Peer" source) — this class does not
 * care which, it only records who decided and what they decided.
 *
 * Immutable: once created, an Endorsement never changes. Re-deciding is
 * modelled at the {@link ServiceRecord} level (see ServiceRecord#endorse),
 * not by mutating an existing Endorsement.
 */
public final class Endorsement {

    private final String endorserId;
    private final boolean approved;
    private final Instant decidedAt;

    public Endorsement(String endorserId, boolean approved, Instant decidedAt) {
        if (endorserId == null || endorserId.isBlank()) {
            throw new IllegalArgumentException("endorserId must not be blank");
        }
        this.endorserId = endorserId;
        this.approved = approved;
        this.decidedAt = Objects.requireNonNull(decidedAt, "decidedAt must not be null");
    }

    /** Convenience factory that stamps the current time. */
    public static Endorsement decide(String endorserId, boolean approved) {
        return new Endorsement(endorserId, approved, Instant.now());
    }

    public String endorserId() {
        return endorserId;
    }

    public boolean isApproved() {
        return approved;
    }

    public Instant decidedAt() {
        return decidedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Endorsement)) return false;
        Endorsement that = (Endorsement) o;
        return approved == that.approved
                && endorserId.equals(that.endorserId)
                && decidedAt.equals(that.decidedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(endorserId, approved, decidedAt);
    }

    @Override
    public String toString() {
        return "Endorsement{endorserId='" + endorserId + "', approved=" + approved
                + ", decidedAt=" + decidedAt + '}';
    }
}
