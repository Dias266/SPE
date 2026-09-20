package application.port;

/**
 * Port onto the Maintenance Prediction context (Python/scikit-learn
 * service, per the proposal's tech stack).
 *
 * Replaces env.MLPipelineAdapter (currently a nested interface inside
 * FleetMASEnvironment.java: {@code MLInsight getInsight(String agentName)}).
 * MockMLPipeline — the existing mock implementation, in env/ after the
 * earlier split — becomes an infrastructure/ implementation of this port
 * with its method return type changed from env.MLInsight to
 * MaintenanceInsight; its internal lookup table does not need to change.
 *
 * Note this is not what backs the Jason-side "acknowledgement hooks"
 * (evaluateRandomForest, evaluateIsolationForest, etc. — see
 * FleetMASEnvironment's comment on why those can't bind return values into
 * a Jason plan). Those remain acknowledgement-only actions in
 * executeAction() regardless of this refactor, per the limitation your own
 * README documents in docs/agent_design.md §5. This port only covers
 * fetchMLHealthInsights, which already does receive a real result today.
 */
public interface MLPredictionPort {

    /**
     * Replaces the fetchMLHealthInsights case in
     * FleetMASEnvironment#executeAction (currently calling
     * mlAdapter.getInsight(agentName) directly).
     */
    MaintenanceInsight getInsight(String agentName);
}
