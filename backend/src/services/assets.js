import { AppError } from './app-error.js';

export function createAssetService(model) {
  return {
    list: (filters) => model.listPublished(filters),
    favorites: (owner, paging) => model.listPublished(paging, owner),
    priceHistory: model.priceHistory,
    async favorite(owner, assetId, save) {
      if (save === false) {
        await model.removeFavorite(owner, assetId);
        return { saved: false };
      }
      if (!await model.findPublished(assetId)) throw new AppError(404, 'ASSET_NOT_FOUND', 'No encontramos este bien publicado.');
      if (save) await model.saveFavorite(owner, assetId);
      return { saved: await model.hasFavorite(owner, assetId) };
    },

    async get(id) {
      const asset = await model.findPublished(id);
      if (!asset) throw new AppError(404, 'ASSET_NOT_FOUND', 'No encontramos este bien publicado.');
      return asset;
    },
  };
}
