import { CRM_STAGES } from './crm.js';

export function createAuditService(model) {
  return {
    async summary() {
      const result = await model.summary();
      return {
        ...result,
        requestsByStage: Object.fromEntries(
          CRM_STAGES.map((stage) => [stage, result.requestsByStage[stage] ?? 0]),
        ),
      };
    },
  };
}
