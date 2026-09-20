package application.usecase;

/**
 * Replaces the "registerVehicle" case in FleetMASEnvironment#executeAction:
 *
 *   case "registerVehicle":
 *       String vin = action.getTerm(0).toString();
 *       addPercept("fleet_coordinator_agent",
 *               ASSyntax.createLiteral("vehicle_registered", ASSyntax.createAtom(vin)));
 *       return true;
 *
 * Deliberately thin, and worth being honest about why: there is currently
 * no Vehicle aggregate anywhere in the system (Java or .asl) — the .asl
 * side only ever increments FleetCoordinatorAgent's fleet_size belief and
 * fires a percept back, it never stores per-vehicle state beyond that. So
 * this use case has no invariant to enforce yet beyond "a VIN was
 * supplied" — it mirrors the current behaviour rather than inventing
 * domain rules that don't exist in the real system.
 *
 * If per-vehicle state is ever needed (e.g. tracking each vehicle's last
 * known health status, or preventing the same VIN registering twice),
 * that's the point to add a Vehicle entity in domain/model and a
 * VehicleRepository port alongside ServiceRecordRepository — this class
 * would then depend on that repository instead of standing alone.
 */
public final class RegisterVehicle {

    public boolean execute(String vin) {
        if (vin == null || vin.isBlank()) {
            throw new IllegalArgumentException("vin must not be blank");
        }
        return true;
    }
}
