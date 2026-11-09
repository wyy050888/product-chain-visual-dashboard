import {verifyExecutionIdentity,verifyRiskTaskIndependence,verifyProjectTaskGaps,verifyRiskChanges} from './diagnosis-workspace.mjs';
export async function diagnosisRuleLifecycle(){
 verifyExecutionIdentity();verifyRiskTaskIndependence();verifyProjectTaskGaps();verifyRiskChanges();
}
