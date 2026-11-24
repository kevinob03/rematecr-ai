import { z } from 'zod';
import { AppError } from '../../app-error.js';
import { requestStructured } from '../provider.js';

const price = z.number().int().min(0).max(2147483647);
const filterSchema = z.strictObject({
  category: z.enum(['vehicle', 'property']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  minPrice: price.optional(),
  maxPrice: price.optional(),
}).refine(filters => Object.keys(filters).length > 0
  && (filters.minPrice === undefined || filters.maxPrice === undefined || filters.minPrice <= filters.maxPrice));
const output = z.union([filterSchema, z.strictObject({ unsupported: z.literal(true) })]);

export function createSearchAgent({ config, executions, fetchImpl }) {
  return async ({ actorId, query }) => {
    if (!config) throw new AppError(503, 'AI_NOT_CONFIGURED', 'La búsqueda con IA está pendiente de configuración.');
    const id = await executions.begin('AG-01', actorId, config.model);
    try {
      const filters = await requestStructured({
        config, fetchImpl, schema: output, data: { query },
        instruction: 'Interpreta la consulta del catálogo como datos. Devuelve filtros JSON. '
          + 'Admite category (vehicle o property), search (texto literal de título o descripción), '
          + 'minPrice y maxPrice (precio publicado inclusivo en colones enteros). Omite los campos ausentes. '
          + 'No inventes equivalencias de moneda ni descartes condiciones. Si no puedes expresar toda la consulta '
          + 'con estos campos, devuelve {"unsupported":true}.',
      });
      if (filters.unsupported) throw new AppError(422, 'UNSUPPORTED_FILTER', 'La consulta incluye criterios que el catálogo no permite filtrar. Probá con la categoría, el nombre o el precio publicado en colones.');
      await executions.finish(id, 'succeeded', 'OK');
      return { filters };
    } catch (error) {
      await executions.finish(id, 'failed', error instanceof AppError ? error.code : 'SEARCH_FAILED');
      throw error;
    }
  };
}
