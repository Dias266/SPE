// =============================================================================
// vehicle_agent.asl — VehicleAgent (runnable, protocol-aligned)
// =============================================================================
// Owner : Danial
// Protocol:
//   Vehicle  -> Coordinator : book_request(Vehicle, Part, Urgency)
//   Coordinator -> Service   : booking_request(Vehicle, Part, Urgency)
//   Service  -> Vehicle      : booking_confirmed(Slot, Center)
//                              booking_deferred(AltSlot, Center)
//                              booking_declined(Reason)
//   Service  -> Coordinator  : booking_confirmed(Vehicle)
// =============================================================================

/* ---------------- Initial beliefs ---------------- */
mileage(0).
current_temperature(25.0).
engine_status(ok).
battery_condition(good).
brake_condition(good).
reported_issues(0).

urgency_level(low).
is_registered(false).
booking_status(none).          // none | requested | confirmed | deferred
booking_pressure(low).
service_part(oil_filter).

/* ---------------- Initial goal ---------------- */
!initialize_agent.

/* ---------------- Startup & registration ---------------- */
+!initialize_agent
    <- .my_name(Me);
       // 1. Generate 3 letters
       .concat("", "XYZ", Letters);

       // 2. Generate 10 digits as two 5-digit blocks to prevent leading zero issues
       .random(R4); .random(R5);
       Part1 = 10000 + math.floor(R4 * 89999); // Ensures 5 digits
       Part2 = 10000 + math.floor(R5 * 89999); // Ensures 5 digits
       
       .term2string(Part1, S1);
       .term2string(Part2, S2);
       .concat(Letters, S1, TempVIN);
       .concat(TempVIN, S2, FinalVIN);
       
       +vin(FinalVIN);
       .print("[VehicleAgent] Generated Unique VIN: ", FinalVIN);
       !register_on_blockchain.



+!register_on_blockchain
    :  vin(VIN) & is_registered(false)
    <- .my_name(Me);
       .print("[VehicleAgent:", Me, "] Registering VIN ", VIN, " on Hyperledger Fabric...");
       registerVehicle(Me, VIN);
       -+is_registered(true);
       !collect_telemetry.

+!register_on_blockchain
    <- .print("[VehicleAgent] Registration skipped or malformed VIN.").

/* ---------------- Telemetry / ML / signing loop ---------------- */
+!collect_telemetry
    :  is_registered(true)
    <- !sense_edge;
       !classify_health;
       !sign_and_publish;
       !evaluate_maintenance_need;
       !calculate_sampling_delay(Delay);
       .wait(Delay);
       !collect_telemetry.

+!sense_edge
    <- .random(R);
       T = 25.0 + (R * 25.0);
       -+current_temperature(T);
       ?mileage(M);
       NM = M + 100;
       -+mileage(NM).

+!classify_health
    :  current_temperature(T) & reported_issues(I)
    <- if (T >= 40.0 | I > 0) {
            -+urgency_level(high);
            .print("[VehicleAgent] ML: maintenance needed (T=", T, ", issues=", I, ").")
       } else {
            -+urgency_level(low)
       };
       if (T >= 45.0) {
            -+telemetry_anomaly(true);
            -+urgency_level(high);
            .print("[VehicleAgent] High Temperature Detected: statistical outlier telemetry (T=", T, ").")
       }.

+!sign_and_publish
    :  vin(VIN) & current_temperature(T) & mileage(M) & urgency_level(U)
    <- .my_name(Me);
       deriveECDSAKey(VIN, key);
       signTelemetryRecord(T, M, U, key, sig);
       .print("[VehicleAgent:", Me, "] Published signed telemetry (T=", T,
              ", mileage=", M, ", urgency=", U, ").").

+!calculate_sampling_delay(5000) : current_temperature(T) & T < 30.0.
+!calculate_sampling_delay(2000) : current_temperature(T) & T >= 30.0 & T < 40.0.
+!calculate_sampling_delay(1000) : current_temperature(T) & T >= 40.0.
+!calculate_sampling_delay(5000).

/* ---------------- Maintenance evaluation & booking ---------------- */
+!evaluate_maintenance_need
    :  urgency_level(high) & booking_status(none) & service_part(P)
    <- !request_fleet_booking.

+!evaluate_maintenance_need
    :  urgency_level(high) & (booking_status(requested) | booking_status(confirmed))
    <- .print("[VehicleAgent] Maintenance pipeline active (", booking_status,
              "). Awaiting network handshake response...").

+!evaluate_maintenance_need
    :  urgency_level(high) & booking_status(deferred)
    <- .print("[VehicleAgent] Retrying deferred request due to ongoing high urgency.");
       -+booking_status(none);
       !evaluate_maintenance_need.

+!evaluate_maintenance_need
    :  urgency_level(high) & booking_status(none)
    <- .print("[VehicleAgent] Urgency is high, but no target component found. Defaulting to oil_filter.");
       +service_part(oil_filter);
       !request_fleet_booking.

+!evaluate_maintenance_need
    :  booking_status(deferred)
    <- .print("[VehicleAgent] Maintenance evaluation paused — fleet load-shedding active.");
       .wait(4000);
       ?booking_pressure(CurrentPressure);
       if (CurrentPressure == low | CurrentPressure == medium) {
           .print("[VehicleAgent] Fleet backpressure relaxed. Re-enabling evaluation.");
           -+booking_status(none);
           !evaluate_maintenance_need
       }.

+!evaluate_maintenance_need
    <- true.

+!request_fleet_booking
    :  booking_pressure(critical) & not urgency_level(critical)
    <- .print("[VehicleAgent] Critical backpressure — deferring request to reduce congestion.");
       -+booking_status(deferred).

+!request_fleet_booking
    :  service_part(P)
    <- .my_name(Me);
       .print("[VehicleAgent:", Me, "] Sending book_request to FleetCoordinator (part=", P, ").");
       -+booking_status(requested);
       .send(fleet_coordinator_agent, tell, book_request(Me, P, high)).

/* ---------------- Reactive coordination plans ---------------- */
+booking_pressure(Level)
    <- .print("[VehicleAgent] Stigmergy Signal: Fleet booking pressure changed to: ", Level);
       if (Level == critical & booking_status(requested) & not urgency_level(critical)) {
           .print("[VehicleAgent] Shedding load. Relinquishing active request slot.");
           -+booking_status(deferred)
       }.

+fleet_anomaly_alert(AnomalyType, Count)
    <- .print("[VehicleAgent] Fleet alert received: ", AnomalyType, " tracking across ", Count, " units.");
       if (reported_issues(I)) {
           -+reported_issues(I + 1)
       } else {
           -+reported_issues(1)
       };
       if (AnomalyType == oil_pressure) {
           -+service_part(oil_filter);
           .print("[VehicleAgent] Fleet oil_pressure pattern detected. Prioritising oil service.")
       };
       if (AnomalyType == brake_wear) {
           -+service_part(brake_pad);
           .print("[VehicleAgent] Fleet brake_wear pattern detected. Prioritising brake service.")
       }.

+booking_confirmed(Slot, Center)
    <- .print("[VehicleAgent] Booking CONFIRMED at ", Center, " slot ", Slot, ".");
       -+booking_status(confirmed).

+booking_deferred(AlternativeSlot, Center)
    <- .print("[VehicleAgent] Booking DEFERRED by ", Center, ". Capacity full. Accepting alternative.");
       -+booking_status(confirmed).

+booking_declined(Reason)
    <- .print("[VehicleAgent] Booking declined: ", Reason, ". Will retry on next cycle.");
       -+booking_status(none).

+service_finished[source(fleet_coordinator_agent)]
    <- !reset_after_service.

+service_cycle_finished
    <- !reset_after_service.

+!reset_after_service
    <- .print("[VehicleAgent] Service cycle finished. Resetting vehicle state.");
       -+booking_status(none);
       -+urgency_level(low);
       -+reported_issues(0);
       -+service_part(oil_filter);
       -engine_status(ok);
       -+engine_status(ok);
       -brake_condition(good);
       -+brake_condition(good);
       -service_finished[source(fleet_coordinator_agent)].

/* ---------------- Failure fallback ---------------- */
-!X
    <- .print("[VehicleAgent] Plan failure on: ", X).
