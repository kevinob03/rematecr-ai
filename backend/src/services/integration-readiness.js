export function buildIntegrationReadiness({env,agentConfigured,databaseKind}){
  const smtpHost=Boolean(env.SMTP_HOST?.trim());
  const mailFrom=Boolean(env.MAIL_FROM?.trim());
  const smtpUser=Boolean(env.SMTP_USER?.trim());
  const smtpPassword=Boolean(env.SMTP_PASSWORD);
  const smtpConfigured=smtpHost&&mailFrom&&smtpUser===smtpPassword;
  const workflowTokenConfigured=Boolean(env.N8N_WORKFLOW_TOKEN&&Buffer.byteLength(env.N8N_WORKFLOW_TOKEN)>=32);

  return {
    environment:env.NODE_ENV==='production'?'production':'development',
    database:{provider:databaseKind,demoData:env.DEMO_DATA==='1'||(env.NODE_ENV!=='production'&&!env.DATABASE_URL&&env.DEMO_DATA!=='0')},
    integrations:[
      {id:'ai',name:'Proveedor de IA',configured:agentConfigured,connectionChecked:false,detail:agentConfigured?'Variables presentes; falta comprobar el proveedor con una consulta.':'Configurar AI_API_URL, AI_API_KEY y AI_MODEL.'},
      {id:'mail',name:'Correo SMTP',configured:smtpConfigured,connectionChecked:false,detail:smtpConfigured?'Variables presentes; falta comprobar entrega en un buzón de prueba.':'Configurar SMTP_HOST y MAIL_FROM; si hay autenticación, configurar usuario y contraseña juntos.'},
      {id:'n8n',name:'n8n y WF-02',configured:workflowTokenConfigured,connectionChecked:false,detail:workflowTokenConfigured?'Token presente; importar el workflow y verificar URL y credencial en la instancia.':'Configurar N8N_WORKFLOW_TOKEN, importar WF-02 y validar el flujo.'},
      {id:'wf01',name:'WF-01: fuente de bienes',configured:false,connectionChecked:false,detail:'El workflow de entrada CSV autenticada está exportado. Falta importarlo, conectar y autorizar una fuente para la ingesta automática.'},
      {id:'wf03',name:'WF-03: documentos',configured:false,connectionChecked:false,detail:'La consulta de documentos aprobados funciona en la aplicación. Falta elegir el repositorio y la frecuencia de sincronización.'},
      {id:'ag04',name:'AG-04: análisis visual',configured:false,connectionChecked:false,detail:'Pendiente de definir imágenes autorizadas y atributos visibles antes de implementar el análisis.'},
    ],
  };
}
