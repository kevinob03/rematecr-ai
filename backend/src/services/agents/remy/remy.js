import { z } from 'zod';
import { AppError } from '../../app-error.js';
import { requestStructured } from '../provider.js';

const intentSchema=z.strictObject({
  intent:z.enum(['search','compare','follow_up','documents','help']),
  category:z.enum(['vehicle','property']).nullable(),
  search:z.string().trim().min(1).max(100).nullable(),
});

export function createRemyAgent({config,assets,executions,fetchImpl}){
  return async({actorId,query})=>{
    if(!config) throw new AppError(503,'AI_NOT_CONFIGURED','Remy requiere configurar un proveedor de IA.');
    const execution=await executions.begin('AG-08',actorId,config.model);
    try{
      const parsed=await requestStructured({
        config,fetchImpl,schema:intentSchema,
        instruction:'Clasifica la solicitud en search, compare, follow_up, documents o help. Propón categoría solo si la persona la menciona claramente. Devuelve texto de búsqueda literal breve solo si la consulta identifica un bien. No afirmes que ejecutaste acciones ni inventes bienes.',
        data:{query},
      });
      let result;
      if(parsed.intent==='search'){
        const filters={page:1,limit:5,category:parsed.category||undefined,search:parsed.search||undefined};
        const found=await assets.list(filters);
        result={intent:parsed.intent,message:found.items.length?'Encontré estos bienes en el catálogo.':'No encontré coincidencias en los datos disponibles.',items:found.items.map(item=>({id:item.id,title:item.title,price:item.price,source:item.source}))};
      }else{
        const destinations={compare:'/comparar',follow_up:'/seguimiento',documents:'/consultar-documentos',help:'/ayuda'};
        const messages={compare:'Elegí hasta dos bienes para comparar sus costos conocidos.',follow_up:'Abrí la ficha del bien y enviá una solicitud voluntaria de seguimiento.',documents:'Podés consultar documentos aprobados y revisar las citas por página.',help:'El catálogo muestra datos y costos estimados. Verificá cada ficha en su fuente antes de tomar decisiones.'};
        result={intent:parsed.intent,message:messages[parsed.intent],path:destinations[parsed.intent],items:[]};
      }
      await executions.finish(execution,'succeeded','OK');
      return result;
    }catch(error){
      await executions.finish(execution,'failed',error instanceof AppError?error.code:'REMY_FAILED');
      throw error;
    }
  };
}
