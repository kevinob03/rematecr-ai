# Tareas manuales de Kevin

Revisión del 26 de noviembre de 2026. Usá esta lista al preparar las pruebas con servicios reales. El desarrollo y las pruebas locales pueden continuar mientras estos puntos estén pendientes.

## Acceso a los servicios

El recorrido detallado para completar todo está en [Guía manual por fases](guia-manual-por-fases.md). Empezaremos con inventario y servicios de prueba, seguiremos con workflows y fuentes autorizadas, y cerraremos con staging y aceptación.

- [ ] Crear clave Groq en plan Free como respaldo de Gemini. No actualizar a Developer ni agregar método de pago. Guardar la clave solo en `backend/.env` como `AI_BACKUP_API_KEY`; nunca pegarla en el chat.

- [ ] **Revisar la configuración antes de producción.** Ejecutá `npm run preflight:production` desde la raíz. El comando no se conecta a los servicios y no muestra valores secretos; resolvé los requisitos marcados como faltantes y verificá las integraciones que vayas a activar.
- [ ] **Consultar Integraciones** con el perfil administrador. El panel indica la configuración detectada; cada proveedor sigue pendiente hasta comprobarlo con una conexión real.

- [ ] **Habilitar el proveedor de IA.** Elegí una cuenta que autorices para las pruebas. Guardá en `backend/.env` la URL completa del endpoint compatible con `/chat/completions` en `AI_API_URL`, una clave válida en `AI_API_KEY` y un modelo habilitado para esa cuenta en `AI_MODEL`. La comprobación técnica será ejecutar los agentes desde React con datos de demostración y verificar el resultado y su registro en la API.
- [ ] **Habilitar el correo de prueba.** Elegí un remitente autorizado y un buzón al que tengas acceso. Configurá `SMTP_HOST`, `SMTP_PORT` y `MAIL_FROM`. Si el servidor pide autenticación, agregá `SMTP_USER` y `SMTP_PASSWORD`. Para recibir enlaces válidos, el primer origen de `CORS_ALLOWED_ORIGINS` debe apuntar al frontend de la prueba.
- [ ] **Confirmar recepción en el buzón.** Después de configurar SMTP y reiniciar el backend, usaremos una cuenta descartable registrada con tu buzón de prueba. Primero comprobá la llegada del enlace de recuperación y que te permita fijar otra contraseña. Al final de la prueba de baja, comprobá la llegada del aviso de cierre con el mismo folio que mostró la aplicación.

## Activar WF-02

- [ ] **Importar el workflow** `n8n/workflows/WF-02_Alertas.json` en tu instancia de n8n.
- [ ] **Crear la credencial de encabezado HTTP** para `Authorization` con el valor `Bearer <N8N_WORKFLOW_TOKEN>`. Definí ese token en `backend/.env`. No guardés el token dentro del archivo JSON del workflow.
- [ ] **Revisar la URL del backend** en el nodo «Crear alertas internas». El archivo apunta al backend local en `http://127.0.0.1:4310`. Si n8n corre en otra computadora o servicio, reemplazala por una dirección que alcance al backend.
- [ ] **Probar manualmente y luego publicar** el workflow solo cuando la URL y la credencial funcionen. Registrar la ejecución en la entrega de FWD.

## Preparar WF-01 para una fuente autorizada

- [ ] Importar `n8n/workflows/WF-01_Ingreso_CSV.json` en la misma instancia de n8n.
- [ ] Crear la credencial HTTP Header Auth `RemateCR WF-01` con `Authorization: Bearer <N8N_WORKFLOW_TOKEN>`. El mismo secreto protege la entrada webhook y la llamada al backend; no lo guardés en el JSON.
- [ ] Cambiar la URL del backend si n8n no alcanza `http://127.0.0.1:4310`. Configurar el origen autorizado para hacer POST al webhook protegido de n8n.
- [ ] Enviar JSON con `eventId`, `sourceName` y `csv`. El CSV debe usar el formato documentado abajo. El lote llegará a **Importaciones** como recibido por n8n y necesitará aprobación humana.
- [ ] Seleccionar el portal/API que alimentará el webhook y confirmar permiso de recolección y publicación. El workflow entrega el CSV al backend; no incluye un adaptador específico de portal.

## Preparar una importación de bienes

- [ ] Reunir un CSV únicamente de fuentes cuyo uso y publicación estén autorizados. Cada fila debe incluir título, categoría `vehicle` o `property`, resumen, precio entero en colones y URL HTTPS de la fuente original.
- [ ] Guardarlo en UTF-8 con encabezados exactos `title,category,summary,price,sourceUrl`. El archivo puede tener hasta 500.000 bytes y 500 filas. No incluyás columnas adicionales.
- [ ] Con el perfil administrador, abrir **Importaciones**, indicar el nombre de la fuente, seleccionar el CSV (o pegar su contenido) y enviar a revisión.
- [ ] Revisar cada fila y su fuente original. Aprobar solo información autorizada y correcta. Una coincidencia de título, categoría y precio requiere revisión adicional.

## Definir las fuentes para automatizaciones pendientes

- [ ] **WF-01:** indicar qué entidad o portal se puede consultar, confirmar que permite recolectar y republicar los datos, y facilitar una cuenta/API autorizada o un formato de exportación. La importación CSV ya funciona; la conexión automática depende de esta decisión.
- [ ] **AG-04:** autorizar ejemplos de imágenes y especificar qué atributos visibles se quieren describir. No enviar fotografías personales o documentos de identidad para esta función.
- [ ] **WF-03:** definir qué repositorio documental aprobado debe vigilar n8n y con qué frecuencia. El sitio ya puede consultar documentos aprobados; falta automatizar la indexación desde una fuente acordada.

## Verificar AG-02 con un documento

- [ ] Preparar un PDF autorizado con texto seleccionable y no más de 100 páginas ni 8 MB.
- [ ] Después de habilitar el proveedor de IA, iniciar sesión con el perfil administrador, abrir **Documentos**, cargar el PDF y revisar cada fragmento citado contra su página original.
- [ ] Aprobar únicamente los campos respaldados por el documento. La extracción permanece como borrador y no publica bienes.

Las variables disponibles figuran en el [ejemplo de entorno](../backend/.env.example). Guardá los secretos solo en el entorno correspondiente. Para cerrar un punto basta anotar fecha y resultado en esta lista. Los enlaces de recuperación, contraseñas y claves de proveedor son privados.

## Decisiones pendientes para publicar

- [ ] **Confirmar la política de privacidad que se publicará.** Cuando esté listo el borrador, confirmá el canal real para ejercer derechos, los plazos de conservación y los proveedores autorizados. La decisión sobre el CRM ya quedó incorporada: al aprobar la baja se conservan únicamente estadísticas anónimas. La revisión termina cuando el contenido y el canal que verá el usuario tienen tu aprobación.
