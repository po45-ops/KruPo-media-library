export interface AiBudget{budgetSatang:number;usedSatang:number;thresholdPercent:number;}
export function canUseAdvancedAi(input:AiBudget){if(input.budgetSatang<=0)return false;return input.usedSatang*100<input.budgetSatang*input.thresholdPercent}
export function selectCopyrightMode(requested:"NONE"|"BASIC"|"ADVANCED",budget:AiBudget){if(requested!=="ADVANCED")return requested;return canUseAdvancedAi(budget)?"ADVANCED":"BASIC"}
