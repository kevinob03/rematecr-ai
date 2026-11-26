import {loadEnvironment} from '../src/config/env.js';
import {readAgentConfig} from '../src/services/agents/provider.js';

loadEnvironment();

const env=process.env;
const required=[];
const recommended=[];

function check(list,label,ok,detail=''){
  list.push({label,ok:Boolean(ok),detail});
}

function validPostgresUrl(value){
  if(!value)return false;
  try{
    const url=new URL(value);
    return ['postgres:','postgresql:'].includes(url.protocol)&&Boolean(url.hostname)&&Boolean(url.pathname.slice(1));
  }catch{return false;}
}

function validHttpsOrigins(value){
  const entries=value?.split(',').map(item=>item.trim()).filter(Boolean)??[];
  if(!entries.length)return false;
  return entries.every(entry=>{
    try{
      const url=new URL(entry);
      return url.protocol==='https:'&&entry===url.origin;
    }catch{return false;}
  });
}

function validPort(value){
  if(!value)return true;
  const number=Number(value);
  return Number.isInteger(number)&&number>=1&&number<=65535;
}

check(required,'Node.js 24 o superior',Number(process.versions.node.split('.')[0])>=24);
check(required,'NODE_ENV=production',env.NODE_ENV==='production');
check(required,'DATABASE_URL PostgreSQL',validPostgresUrl(env.DATABASE_URL));
check(required,'JWT_SECRET de al menos 32 bytes',Buffer.byteLength(env.JWT_SECRET||'')>=32);
check(required,'DEMO_DATA desactivado',env.DEMO_DATA!=='1');
check(required,'Orígenes CORS exactos en HTTPS',validHttpsOrigins(env.CORS_ALLOWED_ORIGINS));
check(required,'Puertos API y SMTP válidos',validPort(env.PORT)&&validPort(env.SMTP_PORT));
const proxyHops=Number(env.TRUST_PROXY_HOPS||0);
check(required,'TRUST_PROXY_HOPS entero no negativo',Number.isSafeInteger(proxyHops)&&proxyHops>=0);

const aiConfig=readAgentConfig(env);
check(recommended,'Proveedor de IA listo',Boolean(aiConfig),'AI_API_URL, AI_API_KEY y AI_MODEL');
check(recommended,'Respaldo de IA configurado',Boolean(aiConfig?.providers.some(provider=>provider.id==='backup')),'AI_BACKUP_API_URL, AI_BACKUP_API_KEY y AI_BACKUP_MODEL; mantener el proveedor en su plan gratuito');
const mailConfigured=Boolean(env.SMTP_HOST?.trim()&&env.MAIL_FROM?.trim());
const mailAuthConsistent=Boolean(env.SMTP_USER?.trim())===Boolean(env.SMTP_PASSWORD);
check(recommended,'Correo listo',mailConfigured&&mailAuthConsistent,'SMTP_HOST y MAIL_FROM; SMTP_USER y SMTP_PASSWORD deben configurarse juntos');
check(recommended,'Workflow WF-02 listo',Boolean(env.N8N_WORKFLOW_TOKEN&&Buffer.byteLength(env.N8N_WORKFLOW_TOKEN)>=32),'N8N_WORKFLOW_TOKEN de al menos 32 bytes');
check(recommended,'HOST accesible desde el proxy',!['127.0.0.1','::1','localhost'].includes(env.HOST||'127.0.0.1'),'Confirmá que el proxy esté en el mismo equipo o configurá HOST según el despliegue');

console.log('Preflight de producción (no conecta a servicios ni muestra valores secretos)');
console.log('\nRequisitos de arranque:');
for(const item of required) console.log(`${item.ok?'[OK]':'[FALTA]'} ${item.label}`);
console.log('\nIntegraciones y red (pendientes si todavía no las vas a activar):');
for(const item of recommended) console.log(`${item.ok?'[OK]':'[PENDIENTE]'} ${item.label}${item.ok?'':` — ${item.detail}`}`);

if(required.some(item=>!item.ok))process.exitCode=1;
