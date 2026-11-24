import { AppError } from './app-error.js';

export function createPreferencesService(model) {
  return {
    get: model.get, alerts: model.alerts, runAlerts: model.runAlerts,
    async save(owner, preferences) {
      if (preferences.alertsEnabled && (preferences.budget === null || !preferences.categories.length)) {
        throw new AppError(422,'INCOMPLETE_PREFERENCES','Para activar alertas, elegí una categoría e indicá tu presupuesto.');
      }
      await model.save(owner, preferences);
    },
  };
}
