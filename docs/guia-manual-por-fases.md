# Guía para completar las tareas manuales por fases

Revisada el 26 de noviembre de 2026. Esta guía ordena las conexiones, decisiones y comprobaciones que requieren cuentas o aprobación de Kevin. Se trabaja una fase completa y se confirma su criterio de cierre antes de avanzar. No compartir claves, contraseñas, tokens ni enlaces de recuperación en el chat.

## Cómo trabajaremos

1. Primero identificamos qué cuentas y servicios ya existen y en qué entorno están. No se crea una cuenta ni se contrata un servicio sin decidirlo contigo.
2. Configuramos credenciales localmente o en el panel de cada proveedor. Los valores secretos se quedan en tu equipo o en el gestor de secretos del servicio.
3. Hacemos una comprobación funcional con datos descartables y autorizados. La presencia de una variable no cuenta como conexión verificada.
4. Registramos fecha, resultado y cualquier bloqueo en `docs/tareas-manuales.md`. No anotamos valores secretos.
5. Solo pasamos a producción cuando el preflight, la seguridad, la aceptación y el despliegue estén preparados.

## Fase 1 — Preparar cuentas y servicios de prueba

**Objetivo:** dejar disponibles los servicios externos de prueba y separar sus credenciales de producción.

### 1. Inventario de lo que ya existe

- [ ] Proveedor de IA con acceso a un modelo y endpoint compatible con `/chat/completions`.
- [ ] Servicio SMTP o cuenta de correo autorizada para pruebas; usar un buzón que puedas revisar.
- [ ] Instancia n8n y tipo de instalación: alojada por proveedor, servidor propio o contenedor local.
- [ ] Confirmar que el proyecto arranca localmente en `http://127.0.0.1:5173` y que la API responde en `http://127.0.0.1:4310/api/v1/health`.
- [ ] Mantener los datos de demostración para esta fase; no cargar datos personales ni casos reales.

### 2. Configurar la IA en el entorno local

- [ ] Copiar `backend/.env.example` a `backend/.env` si todavía no existe. No reemplazar un archivo existente sin conservar sus valores.
- [ ] Completar `AI_API_URL`, `AI_API_KEY` y `AI_MODEL` con datos del proveedor que ya elegiste y autorizaste.
- [ ] Reiniciar el backend y abrir **Integraciones** con la cuenta administradora. Verificar que IA aparezca configurada; eso solo confirma que hay valores presentes.
- [ ] Hacer una consulta de bajo riesgo desde la aplicación, revisar el resultado y confirmar que se registra la ejecución. No enviar datos personales a un proveedor sin autorización.
- [ ] Confirmar el comportamiento de los agentes habilitados. AG-04 sigue separado: necesita definir imágenes autorizadas y atributos antes de configurarse.

### 3. Configurar el correo de prueba

- [ ] Completar `SMTP_HOST`, `SMTP_PORT` y `MAIL_FROM`. Si el servidor usa autenticación, completar `SMTP_USER` y `SMTP_PASSWORD` en `backend/.env`.
- [ ] Configurar el primer origen de `CORS_ALLOWED_ORIGINS` como `http://127.0.0.1:5173` mientras la prueba sea local.
- [ ] Reiniciar el backend y registrar una cuenta descartable con un buzón que puedas revisar.
- [ ] Solicitar recuperación, abrir el enlace recibido y fijar una contraseña nueva. Comprobar que el enlace no funcione una segunda vez.
- [ ] Guardar solo el resultado de la comprobación, nunca el correo con token ni la contraseña.

### Criterio para cerrar la fase 1

IA y correo muestran valores configurados en el panel, una consulta real autorizada responde y el flujo de recuperación termina desde un buzón de prueba. Si un servicio no está disponible, dejarlo marcado como pendiente sin bloquear el resto de la fase.

## Fase 2 — Conectar workflows y aprobar fuentes

**Objetivo:** habilitar la comunicación entre n8n y la app y dejar claro de dónde provienen los datos.

### 1. Preparar el token interno de n8n

- [ ] Generar un token aleatorio de al menos 32 bytes directamente en el equipo; guardarlo en `N8N_WORKFLOW_TOKEN` dentro de `backend/.env` y en una credencial secreta de n8n.
- [ ] No escribir el token en un workflow exportado, documento, captura de pantalla ni mensaje de chat.
- [ ] Reiniciar el backend y confirmar en **Integraciones** que detecta la configuración. El token nunca debe mostrarse en la pantalla.

### 2. Importar y comprobar WF-02

- [ ] Importar `n8n/workflows/WF-02_Alertas.json` en la instancia elegida.
- [ ] Crear la credencial `Authorization` de tipo encabezado HTTP con el valor `Bearer <token guardado localmente>` y asignarla al nodo.
- [ ] Cambiar `http://127.0.0.1:4310` solo si la instancia n8n no puede alcanzar la API en esa dirección. Elegir la URL según dónde corran n8n y el backend; no asumir que `localhost` apunta al mismo equipo.
- [ ] Ejecutar primero con el disparador manual. Revisar la ejecución de n8n y la respuesta de la API; después comprobar la alerta en la cuenta de prueba.
- [ ] Dejar WF-02 inactivo hasta verificar credencial, URL y resultado. Registrar cuándo se activa y quién lo autorizó.

### 3. WF-01 y su fuente de datos

- [ ] Importar `n8n/workflows/WF-01_Ingreso_CSV.json` y asignar la credencial compartida indicada arriba.
- [ ] Elegir portal o API y confirmar que permite recolectar y publicar estos datos. Aportar un usuario/API autorizados o un CSV de exportación permitido.
- [ ] Verificar que la fuente entrega CSV UTF-8 con encabezados exactos `title,category,summary,price,sourceUrl`, hasta 500 filas y 500.000 bytes.
- [ ] Enviar un lote de prueba con `eventId`, `sourceName` y `csv`; confirmar que aparece como recibido por n8n en **Importaciones**.
- [ ] Revisar las filas y URLs originales. Aprobar solo información autorizada; confirmar que la publicación requiere aprobación humana.
- [ ] No activar una extracción automática ni publicar datos hasta confirmar el permiso de la fuente.

### 4. Definir WF-03 y AG-04

- [ ] Elegir el repositorio documental permitido, quién puede acceder y cada cuánto se sincronizaría. No configurar el flujo hasta identificar el repositorio.
- [ ] Autorizar ejemplos de imágenes para AG-04 y especificar los atributos visibles que el agente describiría. No incluir rostros, identificaciones ni datos privados.
- [ ] Confirmar que los documentos e imágenes se pueden tratar para este propósito antes de conectarlos.

### Criterio para cerrar la fase 2

Los workflows que se hayan habilitado ejecutan correctamente, la credencial está guardada en n8n y no en Git, y cada fuente usada tiene responsable y autorización documentados. WF-03 y AG-04 pueden permanecer pendientes si falta una decisión.

## Fase 3 — Gobernanza, seguridad y entorno de staging

**Objetivo:** convertir la configuración local en una configuración segura para un entorno de ensayo controlado.

- [ ] Definir el proveedor de despliegue, dominio, base PostgreSQL administrada y responsable operativo. No cargar secretos reales hasta elegirlos.
- [ ] Preparar secretos distintos de los de desarrollo: `JWT_SECRET`, `N8N_WORKFLOW_TOKEN`, clave de IA y credenciales SMTP. Usar el gestor de secretos del proveedor cuando esté disponible.
- [ ] Configurar `NODE_ENV=production`, `DEMO_DATA=0`, `DATABASE_URL` y orígenes HTTPS exactos en `CORS_ALLOWED_ORIGINS`.
- [ ] Configurar `HOST` y `TRUST_PROXY_HOPS` según el proxy real; no confiar en proxies que no estén bajo control del proyecto.
- [ ] Activar TLS/HTTPS y revisar cookies, sesión, CORS y cabeceras desde el dominio de staging.
- [ ] Crear credencial SQL de mínimo privilegio, activar cifrado y copias de seguridad, y comprobar una restauración antes de guardar datos operativos.
- [ ] Acordar por escrito canal de derechos, conservación y eliminación de archivos, registros y datos de CRM. La baja de CRM conserva estadísticas anónimas, según la decisión ya tomada.
- [ ] Revisar dependencias, privacidad, controles de acceso, rate limits y manejo de PDF/CSV antes de aceptar datos reales.
- [ ] No copiar la base local con datos demo a staging ni producción.

### Criterio para cerrar la fase 3

Staging arranca sin datos de demo, utiliza HTTPS y secretos de staging, solo admite los orígenes previstos y cuenta con una copia restaurable. La política de privacidad y retención tiene responsables y plazos confirmados.

## Fase 4 — Aceptación integral y publicación

**Objetivo:** verificar recorridos de usuario y administración antes de publicar.

- [ ] Ejecutar `npm run preflight:production` y resolver todos los requisitos obligatorios. Revisar integraciones opcionales una por una.
- [ ] Ejecutar la suite automatizada con `npm test` y guardar el resultado. No afirmar que está aprobada hasta correrla en el entorno previsto.
- [ ] Revisar inicio, cierre, recuperación de cuenta y permisos con cuentas descartables de comprador, administrador y auditor.
- [ ] Revisar catálogo, filtros, favoritos, comparación, simulador y estados sin datos; verificar que no se presenten datos demo como reales.
- [ ] Revisar CRM, cambios de etapa, auditoría agregada y baja de cuenta; confirmar que tras aprobar la baja solo queden las estadísticas anónimas acordadas.
- [ ] Revisar importaciones y documentos: procedencia, filas/citas, motivo de rechazo, historial y aprobación humana.
- [ ] Verificar las conexiones reales autorizadas (IA, SMTP y n8n), expiración de enlaces, reintentos e idempotencia donde corresponda.
- [ ] Resolver hallazgos de seguridad y accesibilidad, confirmar dominio y contenido de privacidad, y aprobar el momento de publicación.
- [ ] Después de publicar, revisar logs y health check; no registrar contraseñas, tokens, datos personales ni cuerpos de documentos.

### Criterio para cerrar la fase 4

Preflight sin requisitos obligatorios faltantes, aceptación y suite registradas, controles de producción revisados y autorización explícita para publicar.

## Estado actual

- Fase 1: el proveedor elegido para probar IA es Gemini API en cuota gratuita. La URL y el modelo quedaron configurados localmente y la app reconoció la clave sin mostrarla. La consulta de demostración recibió HTTP 503 en dos intentos; falta repetir cuando el servicio tenga disponibilidad. No se enviaron datos personales. Falta inventariar correo SMTP y n8n.
- Fase 2: WF-01 tiene endpoint autenticado y workflow genérico exportado; falta importar n8n y elegir fuente. WF-02 está exportado; WF-03 y AG-04 esperan definiciones.
- Fase 3: pendiente; no se ha elegido infraestructura de staging/producción.
- Fase 4: pendiente; no se marca como aprobada sin ejecución real.

Para seguir, respondé con nombres y estado, nunca con credenciales: proveedor de IA y modelo disponibles; SMTP (sí/no); n8n (alojado, propio o local); y si ya existe dominio, PostgreSQL o proveedor de despliegue.
