import { AppError } from './app-error.js';

export const CRM_STAGES = ['received', 'reviewing', 'follow_up', 'attended', 'closed'];

function owner(user) {
  if (user.role === 'buyer') return user.id;
  if (user.role === 'admin') return null;
  throw new AppError(403, 'FORBIDDEN', 'Tu cuenta no tiene permiso para ver estas solicitudes.');
}

function found(request) {
  if (!request) throw new AppError(404, 'REQUEST_NOT_FOUND', 'No encontramos esta solicitud.');
  return request;
}

export function createCrmService(model) {
  return {
    list: (user, paging) => model.list(owner(user), paging),
    async get(user, id) {
      return found(await model.get(id, owner(user)));
    },

    async create(user, { assetId, subject, comment, consent }) {
      if (user.role !== 'buyer') {
        throw new AppError(403, 'FORBIDDEN', 'Solo una cuenta compradora puede iniciar una solicitud.');
      }
      if (consent !== true) {
        throw new AppError(422, 'CONSENT_REQUIRED', 'Confirmá qué datos querés compartir.');
      }
      const request = await model.create({ assetId, subject, comment, userId: user.id });
      if (!request) throw new AppError(404, 'ASSET_NOT_FOUND', 'No encontramos este bien publicado.');
      return request;
    },

    async setStage(user, id, stage) {
      if (user.role !== 'admin') {
        throw new AppError(403, 'FORBIDDEN', 'Solo administración puede cambiar la etapa.');
      }
      return found(await model.setStage({ id, stage, actorId: user.id }));
    },
  };
}
