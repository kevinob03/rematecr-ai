import {useState} from 'react'
import {api,uploadPdf} from '../api/client.js'
import {useRemote} from '../api/useRemote.js'
import {Loading,PageHeading,Pagination,Problem} from '../components/ui.jsx'

export function ImportReview(){
  const [page,setPage]=useState(1)
  const [historyPage,setHistoryPage]=useState(1)
  const [openBatch,setOpenBatch]=useState(null)
  const [reasonByRow,setReasonByRow]=useState({})
  const [csv,setCsv]=useState('title,category,summary,price,sourceUrl\n')
  const [sourceName,setSourceName]=useState('')
  const [eventId,setEventId]=useState(()=>crypto.randomUUID())
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const pending=useRemote('/imports/pending?page='+page)
  const history=useRemote('/imports/history?page='+historyPage)
  const batchDetails=useRemote(openBatch?'/imports/batches/'+openBatch:null)
  async function loadCsv(event){
    const file=event.target.files?.[0]
    if(!file)return
    if(file.size>500_000){setError('El CSV supera el límite de 500.000 bytes.');event.target.value='';return}
    try{setCsv(await file.text());setError('')}
    catch{setError('No pudimos leer el archivo CSV.')}
  }
  async function submit(event){
    event.preventDefault();setBusy(true);setMessage('');setError('')
    try{
      const result=await api('/imports/csv',{method:'POST',body:{eventId,sourceName,csv}})
      setMessage(`Importación recibida: ${result.rows.length} filas en revisión. ${result.replay?'Se reconoció como reintento.':''}`)
      setEventId(crypto.randomUUID());setPage(1);setHistoryPage(1);pending.retry();history.retry()
    }catch(problem){setError(problem.message)}
    finally{setBusy(false)}
  }
  async function review(id,approve){
    const reason=reasonByRow[id]?.trim()||''
    if(!approve&&!reason){setError('Escribí el motivo antes de rechazar la fila.');return}
    setBusy(true);setError('')
    try{
      await api('/imports/'+id,{method:'PATCH',body:{approve,...(!approve?{reason}:{})}})
      setReasonByRow(current=>{const next={...current};delete next[id];return next})
      pending.retry();history.retry();batchDetails.retry()
    }
    catch(problem){setError(problem.message)}
    finally{setBusy(false)}
  }
  return <><PageHeading title="Importación y revisión">El CSV se valida y queda pendiente de aprobación antes de publicarse.</PageHeading>
    <form className="card form-card stack" onSubmit={submit}>
      <label className="field">Nombre de la fuente<input required maxLength={120} value={sourceName} onChange={e=>setSourceName(e.target.value)}/></label>
      <label className="field">Seleccionar archivo CSV<input type="file" accept=".csv,text/csv" onChange={loadCsv}/></label>
      <label className="field">Contenido CSV<textarea required rows={8} value={csv} onChange={e=>setCsv(e.target.value)} /></label>
      <small>Columnas requeridas: title, category, summary, price, sourceUrl. Categoría vehicle o property. Máximo 500.000 bytes y 500 filas. Usá enlaces HTTPS cuya publicación esté autorizada.</small>
      <div><button className="button primary" disabled={busy}>Validar y enviar a revisión</button></div>
    </form>
    {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="inline-error">{error}</p>}
    <h2>Filas pendientes</h2>
    {pending.pending?<Loading label="Cargando filas"/>:pending.error?<Problem error={pending.error} retry={pending.retry}/>:pending.data.items.length===0?<p>No hay filas pendientes de revisión.</p>:pending.data.items.map(row=>
      <article className="card form-card stack" key={row.id}>
        <h3>{row.title}</h3><p>{row.category} · ₡{row.price.toLocaleString('es-CR')} · {row.sourceName} · {row.submissionMethod==='workflow'?'Recibido por n8n':'Cargado por administrador'}</p>
        <p>{row.summary}</p><a href={row.sourceUrl} target="_blank" rel="noreferrer">Revisar fuente original</a>
        <label className="field">Motivo del rechazo (obligatorio para rechazar)
          <textarea rows={2} maxLength={500} value={reasonByRow[row.id]||''}
            onChange={event=>setReasonByRow(current=>({...current,[row.id]:event.target.value}))}/>
        </label>
        <div className="action-group"><button className="button primary" disabled={busy} onClick={()=>review(row.id,true)}>Aprobar y publicar</button>
          <button className="button secondary" disabled={busy||!reasonByRow[row.id]?.trim()} onClick={()=>review(row.id,false)}>Rechazar</button></div>
      </article>)}
    {!pending.pending&&!pending.error&&<Pagination page={page} nextPage={pending.data.nextPage} onChange={setPage}/>}
    <h2>Importaciones recientes</h2>
    {history.pending?<Loading label="Cargando historial"/>:history.error?<Problem error={history.error} retry={history.retry}/>:history.data.items.length===0?<p>Aún no hay importaciones registradas.</p>:history.data.items.map(batch=>
      <article className="card form-card stack" key={batch.id}>
        <h3>{batch.sourceName}</h3>
        <p>{batch.status==='reviewed'?'Resuelta':'En revisión'} · recibida {new Date(batch.createdAt).toLocaleString('es-CR')}</p>
        <p>{batch.submissionMethod==='workflow'?'Enviado por n8n':'Enviado por administrador'} · {batch.totalRows} filas · {batch.pendingRows} pendientes · {batch.publishedRows} publicadas · {batch.rejectedRows} rechazadas</p>
        {batch.lastReviewedAt&&<small>Última revisión: {new Date(batch.lastReviewedAt).toLocaleString('es-CR')}</small>}
        <button type="button" className="button secondary" aria-expanded={openBatch===batch.id}
          onClick={()=>setOpenBatch(openBatch===batch.id?null:batch.id)}>
          {openBatch===batch.id?'Ocultar detalle':'Ver decisiones por fila'}
        </button>
        {openBatch===batch.id&&<div className="stack" aria-live="polite">
          {batchDetails.pending?<Loading label="Cargando detalle"/>:batchDetails.error?<Problem error={batchDetails.error} retry={batchDetails.retry}/>:batchDetails.data?.batch.items.map(item=><div className="card" key={item.id}>
            <strong>Fila {item.rowNumber}: {item.title}</strong>
            <p>{item.category} · ₡{item.price.toLocaleString('es-CR')} · {item.status==='published'?'Publicada':item.status==='rejected'?'Rechazada':'Pendiente de revisión'}</p>
            <p>{item.summary||'Sin resumen'}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">Abrir fuente original</a>
            {item.reviewedAt&&<small>Revisada por {item.reviewedBy||'cuenta no disponible'} el {new Date(item.reviewedAt).toLocaleString('es-CR')}</small>}
            {item.reviewNote&&<p>Motivo registrado: {item.reviewNote}</p>}
          </div>)}</div>}
      </article>)}
    {!history.pending&&!history.error&&<Pagination page={historyPage} nextPage={history.data.nextPage} onChange={setHistoryPage}/>}
  </>
}

export function DocumentReview(){
  const [page,setPage]=useState(1)
  const [historyPage,setHistoryPage]=useState(1)
  const [reasonByDocument,setReasonByDocument]=useState({})
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const drafts=useRemote('/document-drafts?page='+page)
  const history=useRemote('/document-drafts/history?page='+historyPage)
  async function submit(event){
    event.preventDefault();setBusy(true);setError('');setMessage('')
    const form=event.currentTarget
    const file=new FormData(form).get('pdf')
    try{await uploadPdf('/agents/extract',file);form.reset();drafts.retry();history.retry();setMessage('PDF recibido. Revisá las citas y los campos antes de resolver el borrador.')}
    catch(problem){setError(problem.message);drafts.retry();history.retry()}
    finally{setBusy(false)}
  }
  async function review(id,status){
    const reason=reasonByDocument[id]?.trim()||''
    if(status==='rejected'&&!reason){setError('Escribí el motivo antes de rechazar el documento.');return}
    setBusy(true);setError('')
    try{
      await api('/document-drafts/'+id,{method:'PATCH',body:{status,...(status==='rejected'?{reason}:{})}})
      setReasonByDocument(current=>{const next={...current};delete next[id];return next})
      drafts.retry();history.retry()
    }
    catch(problem){setError(problem.message)}
    finally{setBusy(false)}
  }
  return <><PageHeading title="Revisión de documentos">Los campos extraídos esperan aprobación humana antes de usarse.</PageHeading>
    <form className="card form-card stack" onSubmit={submit}>
      <label className="field">PDF autorizado<input required type="file" name="pdf" accept="application/pdf,.pdf" /></label>
      <small>Máximo 8 MB y 100 páginas. Solo se extrae texto seleccionable. El documento se guarda en almacenamiento privado.</small>
      <div><button className="button primary" disabled={busy}>Enviar para extracción</button></div>
    </form>
    {message&&<p role="status">{message}</p>}{error&&<p role="alert" className="inline-error">{error}</p>}
    <h2>Borradores pendientes</h2>
    {drafts.pending?<Loading label="Cargando borradores"/>:drafts.error?<Problem error={drafts.error} retry={drafts.retry}/>:<>
      {drafts.data.items.map(document=><article className="card form-card stack" key={document.id}>
        <h3>{document.originalName}</h3><small>{document.pageCount} páginas · {new Date(document.createdAt).toLocaleDateString('es-CR')}</small>
        <dl className="totals-list">{Object.entries(document.fields).filter(([key])=>!['evidence','uncertain'].includes(key)).map(([key,value])=>
          <div key={key}><dt>{key}</dt><dd>{value??'No consta'}</dd></div>)}</dl>
        <h4>Referencias para verificar</h4><ul>{document.fields.evidence?.map((item,index)=>
          <li key={index}>Página {item.page} · {item.field}: “{item.excerpt}”</li>)}</ul>
        {document.fields.uncertain?.length>0&&<p>Datos inciertos: {document.fields.uncertain.join(', ')}</p>}
        <label className="field">Motivo del rechazo (obligatorio para rechazar)
          <textarea rows={2} maxLength={500} value={reasonByDocument[document.id]||''}
            onChange={event=>setReasonByDocument(current=>({...current,[document.id]:event.target.value}))}/>
        </label>
        <div className="action-group"><button className="button primary" disabled={busy} onClick={()=>review(document.id,'approved')}>Aprobar borrador</button>
          <button className="button secondary" disabled={busy||!reasonByDocument[document.id]?.trim()} onClick={()=>review(document.id,'rejected')}>Rechazar</button></div>
      </article>)}
      {!drafts.data.items.length&&<p>No hay documentos pendientes.</p>}
      <Pagination page={page} nextPage={drafts.data.nextPage} onChange={setPage}/></>}
    <h2>Documentos revisados</h2>
    {history.pending?<Loading label="Cargando historial de documentos"/>:history.error?<Problem error={history.error} retry={history.retry}/>:history.data.items.length===0?<p>Aún no hay documentos revisados.</p>:history.data.items.map(document=><article className="card form-card stack" key={document.id}>
      <h3>{document.originalName}</h3>
      <p>{document.status==='approved'?'Aprobado':'Rechazado'} · enviado {new Date(document.createdAt).toLocaleString('es-CR')}</p>
      {document.reviewedAt&&<small>Revisado por {document.reviewedBy||'cuenta no disponible'} el {new Date(document.reviewedAt).toLocaleString('es-CR')}</small>}
      {document.reviewNote&&<p>Motivo registrado: {document.reviewNote}</p>}
    </article>)}
    {!history.pending&&!history.error&&<Pagination page={historyPage} nextPage={history.data.nextPage} onChange={setHistoryPage}/>}
  </>
}

export function DocumentQuestion(){
  const [answer,setAnswer]=useState(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  async function submit(event){
    event.preventDefault();setBusy(true);setError('');setAnswer(null)
    const query=new FormData(event.currentTarget).get('query')
    try{setAnswer(await api('/agents/rag',{method:'POST',body:{query}}))}
    catch(problem){setError(problem.message)}
    finally{setBusy(false)}
  }
  return <><PageHeading title="Consultar documentos">Respuestas basadas en PDFs aprobados con citas por página.</PageHeading>
    <form className="card form-card stack" onSubmit={submit}>
      <label className="field">Pregunta<input name="query" required minLength={3} maxLength={500} /></label>
      <small>La pregunta y los fragmentos recuperados se envían al proveedor de IA configurado. No incluyás datos personales.</small>
      <div><button className="button primary" disabled={busy}>{busy?'Consultando…':'Buscar en documentos aprobados'}</button></div>
    </form>
    {error&&<p role="alert" className="inline-error">{error}</p>}
    {answer&&<section className="card form-card stack" role="status"><p>{answer.answer}</p>
      {answer.citations.length>0&&<><h2>Referencias</h2><ul>{answer.citations.map((cite,index)=>
        <li key={index}>{cite.document}, página {cite.page}: “{cite.excerpt}”</li>)}</ul></>}
    </section>}
  </>
}
