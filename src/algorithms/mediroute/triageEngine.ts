import {
  CasualtyAssessmentInput,
  TriageResult,
  TriageCategory
} from '../../../shared/contracts';

export const TRIAGE_RULE_VERSION = 'SENTINEL-DEMO-TRIAGE-v1.4';

/**
 * Deterministic Emergency Triage Evaluator
 * 
 * NOTE: This is an illustrative simulation algorithm designed for emergency workflow
 * demonstrations in hackathon scenarios. It is NOT clinically validated medical advice.
 */
export class MediRouteTriageEngine {
  /**
   * Evaluate vital signs and casualty observations against structured triage criteria
   */
  public static evaluate(input: CasualtyAssessmentInput): TriageResult {
    const decisionTreePath: string[] = [];
    const missingDataWarnings: string[] = [];

    // Step 0: Check for missing data
    if (input.canWalk === undefined) missingDataWarnings.push('Ambulation status (canWalk) is missing');
    if (input.respiratoryRate === undefined) missingDataWarnings.push('Respiratory rate is missing');
    if (input.pulse === undefined) missingDataWarnings.push('Pulse rate is missing');
    if (!input.mentalStatus) missingDataWarnings.push('Mental status is missing');

    // Rule 1: Ambulatory Walking Casualties (Minimal - Green)
    if (input.canWalk === true) {
      decisionTreePath.push('Patient is ambulatory and able to follow verbal directions to designated casualty collection point.');
      return {
        category: 'minimal_green',
        ruleVersion: TRIAGE_RULE_VERSION,
        triageReason: 'Minimal (Green): Walking wounded casualty capable of self-care and delayed evacuation.',
        decisionTreePath,
        missingDataWarnings
      };
    }
    decisionTreePath.push('Patient is non-ambulatory; evaluating critical respiration.');

    // Rule 2: Apnea / Non-breathing (Expectant - Black)
    if (input.respiratoryRate !== undefined && input.respiratoryRate === 0) {
      decisionTreePath.push('Spontaneous respiration absent (0 breaths/min). Airway repositioning assessed.');
      return {
        category: 'expectant_black',
        ruleVersion: TRIAGE_RULE_VERSION,
        triageReason: 'Expectant (Black): No spontaneous respirations detected.',
        decisionTreePath,
        missingDataWarnings
      };
    }

    // Rule 3: Severe Hemorrhage or Respiratory Distress (Immediate - Red)
    if (input.severeBleeding === true) {
      decisionTreePath.push('Uncontrolled arterial/severe hemorrhage reported; tourniquet/hemostatic dressing required.');
      return {
        category: 'immediate_red',
        ruleVersion: TRIAGE_RULE_VERSION,
        triageReason: 'Immediate (Red): Life-threatening active hemorrhage requiring immediate intervention.',
        decisionTreePath,
        missingDataWarnings
      };
    }

    if (input.respiratoryRate !== undefined) {
      if (input.respiratoryRate > 30 || input.respiratoryRate < 10) {
        decisionTreePath.push(`Abnormal respiratory rate observed: ${input.respiratoryRate} breaths/min (normal range: 10-30).`);
        return {
          category: 'immediate_red',
          ruleVersion: TRIAGE_RULE_VERSION,
          triageReason: `Immediate (Red): Tachypnea/Bradypnea (${input.respiratoryRate} bpm) indicates acute respiratory compromise.`,
          decisionTreePath,
          missingDataWarnings
        };
      }
      decisionTreePath.push(`Respiratory rate normal: ${input.respiratoryRate} breaths/min.`);
    }

    // Rule 4: Perfusion / Radial Pulse Anomaly (Immediate - Red)
    if (input.pulse !== undefined) {
      if (input.pulse > 125 || input.pulse < 40) {
        decisionTreePath.push(`Hemodynamic instability: Pulse rate ${input.pulse} bpm outside safe range (40-125).`);
        return {
          category: 'immediate_red',
          ruleVersion: TRIAGE_RULE_VERSION,
          triageReason: `Immediate (Red): Severe hemodynamic compromise/tachycardia (${input.pulse} bpm).`,
          decisionTreePath,
          missingDataWarnings
        };
      }
      decisionTreePath.push(`Pulse rate present and stable: ${input.pulse} bpm.`);
    }

    // Rule 5: Neurological Assessment / Mental Status
    if (input.mentalStatus) {
      if (input.mentalStatus === 'unresponsive' || input.mentalStatus === 'pain') {
        decisionTreePath.push(`Depressed mental status: responds only to ${input.mentalStatus}. Unable to follow simple commands.`);
        return {
          category: 'immediate_red',
          ruleVersion: TRIAGE_RULE_VERSION,
          triageReason: `Immediate (Red): Altered mental status / unresponsive indicating neurological trauma or shock.`,
          decisionTreePath,
          missingDataWarnings
        };
      }
      decisionTreePath.push(`Mental status intact: responds to ${input.mentalStatus}.`);
    }

    // Rule 6: Delayed Care (Yellow)
    decisionTreePath.push('Patient is non-ambulatory, but respirations, perfusion, and neurological status are stable.');
    return {
      category: 'delayed_yellow',
      ruleVersion: TRIAGE_RULE_VERSION,
      triageReason: 'Delayed (Yellow): Serious injury requiring medical transport, but vitals are currently stable without immediate life threat.',
      decisionTreePath,
      missingDataWarnings
    };
  }
}
