package application.port;

import java.util.Objects;

/**
 * Result type for {@link MLPredictionPort#getInsight}.
 *
 * Mirrors env.MLInsight (currently a nested class inside
 * FleetMASEnvironment.java, holding componentId/score/urgency — see the
 * Multi-Agent-System-env-split.zip version of MLInsight.java). The
 * difference is that MLInsight is an infrastructure-facing data holder with
 * public mutable fields, while this is an immutable value the application
 * layer can depend on without pulling in anything from env/.
 *
 * Placed here in application/port rather than domain/model for now because
 * nothing in the domain layer currently reasons about maintenance
 * predictions — only the (not-yet-written) use case that calls this port
 * will. If a future increment adds prediction-related domain rules (e.g.
 * "an insight above urgency X must trigger a booking request"), promoting
 * this to domain/model at that point would be the natural next step.
 */
public final class MaintenanceInsight {

    private final String componentId;
    private final double score;
    private final String urgency;

    public MaintenanceInsight(String componentId, double score, String urgency) {
        if (componentId == null || componentId.isBlank()) {
            throw new IllegalArgumentException("componentId must not be blank");
        }
        if (urgency == null || urgency.isBlank()) {
            throw new IllegalArgumentException("urgency must not be blank");
        }
        this.componentId = componentId;
        this.score = score;
        this.urgency = urgency;
    }

    public String componentId() {
        return componentId;
    }

    public double score() {
        return score;
    }

    public String urgency() {
        return urgency;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MaintenanceInsight)) return false;
        MaintenanceInsight that = (MaintenanceInsight) o;
        return Double.compare(score, that.score) == 0
                && componentId.equals(that.componentId)
                && urgency.equals(that.urgency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(componentId, score, urgency);
    }

    @Override
    public String toString() {
        return "MaintenanceInsight{componentId='" + componentId + "', score=" + score
                + ", urgency='" + urgency + "'}";
    }
}
