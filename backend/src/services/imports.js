import {parse} from 'csv-parse/sync';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {AppError} from './app-error.js';

const rowSchema=z.object({
  title:z.string().trim().min(1).max(180),
  category:z.enum(['vehicle','property']),
  summary:z.string().trim().max(1000).default(''),
  price:z.coerce.number().int().min(0).max(2147483647),
  sourceUrl:z.string().url().max(2000).refine(value=>value.startsWith('https://')),
}).strict();

export function createImportService(model){
  return {
    pending:model.pending,
    history:model.history,
    review:model.review,
    async receive({eventId,sourceName,actorId,csv}){
      if(Buffer.byteLength(csv)>500_000) throw new AppError(413,'CSV_TOO_LARGE','El CSV supera 500 KB.');
      let records;
      try{records=parse(csv,{columns:true,skip_empty_lines:true,bom:true,relax_column_count:false,trim:true,max_record_size:4000});}
      catch{throw new AppError(422,'CSV_INVALID','El CSV no se pudo leer. Revisá encabezados, comillas y filas.');}
      const expected=['title','category','summary','price','sourceUrl'];
      if(!records.length||records.length>500||Object.keys(records[0]).sort().join()!==[...expected].sort().join()){
        throw new AppError(422,'CSV_COLUMNS','El CSV debe tener title, category, summary, price y sourceUrl, con hasta 500 filas.');
      }
      const rows=records.map((row,index)=>{
        const result=rowSchema.safeParse(row);
        if(!result.success) throw new AppError(422,'CSV_ROW_INVALID',`La fila ${index+2} tiene campos inválidos.`);
        return {...result.data,rowNumber:index+2};
      });
      const payloadHash=createHash('sha256').update(JSON.stringify({sourceName,rows})).digest('hex');
      return model.stage({eventId,sourceName,actorId,payloadHash,rows});
    },
  };
}
