package domain.model;

import java.util.Objects;

/**
 * Value object wrapping the fleet-wide stigmergic signal that
 * FleetCoordinatorAgent maintains and broadcasts as booking_pressure(Level)
 * (see mas/agents/fleet_coordinator_agent.asl, "STIGMERGY — BOOKING
 * PRESSURE MANAGEMENT").
 *
 * The four levels and their ordering (LOW -> MEDIUM -> HIGH -> CRITICAL)
 * mirror the .asl escalate_pressure / decay_pressure plans exactly,
 * including the saturation behaviour at both ends:
 *   - escalating from CRITICAL logs a warning and stays at CRITICAL
 *   - decaying from LOW is a no-op and stays at LOW
 *
 * Agents never negotiate point-to-point over this value — they only ever
 * react to the shared belief — which is exactly why it is modelled as an
 * immutable value object rather than an entity: two BookingPressure
 * instances at the same level are interchangeable.
 */
public final class BookingPressure {

    public enum Level { LOW, MEDIUM, HIGH, CRITICAL }

    private final Level level;

    private BookingPressure(Level level) {
        this.level = Objects.requireNonNull(level, "level must not be null");
    }

    public static final BookingPressure LOW = new BookingPressure(Level.LOW);

    public static BookingPressure of(Level level) {
        return new BookingPressure(level);
    }

    /** Parses the lower-case atom used in the .asl belief, e.g. "critical". */
    public static BookingPressure fromAtom(String atom) {
        if (atom == null) {
            throw new IllegalArgumentException("atom must not be null");
        }
        return new BookingPressure(Level.valueOf(atom.trim().toUpperCase()));
    }

    /** Mirrors the escalate_pressure(Level) plans; saturates at CRITICAL. */
    public BookingPressure escalate() {
        return switch (level) {
            case LOW -> of(Level.MEDIUM);
            case MEDIUM -> of(Level.HIGH);
            case HIGH -> of(Level.CRITICAL);
            case CRITICAL -> this;
        };
    }

    /** Mirrors the decay_pressure plans; saturates at LOW. */
    public BookingPressure decay() {
        return switch (level) {
            case CRITICAL -> of(Level.HIGH);
            case HIGH -> of(Level.MEDIUM);
            case MEDIUM -> of(Level.LOW);
            case LOW -> this;
        };
    }

    public Level level() {
        return level;
    }

    /** Lower-case atom form, matching what the .asl side expects/produces. */
    public String toAtom() {
        return level.name().toLowerCase();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BookingPressure)) return false;
        return level == ((BookingPressure) o).level;
    }

    @Override
    public int hashCode() {
        return level.hashCode();
    }

    @Override
    public String toString() {
        return toAtom();
    }
}
