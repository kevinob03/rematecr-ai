# Estado y checklist de RemateCR AI

Revisado el 24 de noviembre de 2026. Las casillas marcadas describen funciones que ya están en el repositorio y en la demostración local. No implican que se hayan aceptado para producción ni que se hayan validado con servicios externos.

## Implementado en la demostración local

- [x] Proyecto full stack con frontend React, API Express por capas, base SQL, migraciones y datos ficticios.
- [x] Catálogo de bienes, filtros, fichas con procedencia y estado vacío para categorías sin datos autorizados.
- [x] Autenticación, roles, aceptación de políticas, recuperación de cuenta y gestión de sesiones.
- [x] Simulador y comparación de costos; favoritos y preferencias del comprador.
- [x] CRM de seguimiento con etapas y auditoría agregada. La baja aprobada elimina datos individuales y conserva únicamente estadísticas anónimas.
- [x] Importación CSV para el administrador: validación, revisión fila por fila, bloqueo por posible duplicado e historial con estado de lote, revisor, fecha y motivo obligatorio de rechazo.
- [x] Revisión de PDFs autorizados y consultas sobre páginas aprobadas, sujetas a proveedor de IA. Los rechazos requieren motivo y quedan en el historial administrativo.
- [x] AG-01, AG-02, AG-03 y AG-05–AG-08 integrados en la aplicación. AG-05 mantiene sus pesos como propuesta y responde «No evaluable» cuando no hay evidencia suficiente.
- [x] Exportación del workflow WF-02 en `n8n/workflows/WF-02_Alertas.json`.
- [x] Anteproyecto, documentos técnicos, manual de tareas y material visual en `output/`.

## Seguridad implementada en el código

Estas medidas están implementadas en la demostración local. Su presencia en el código no equivale a una auditoría independiente ni confirma la configuración de producción.

- [x] Contraseñas almacenadas con bcrypt; respuesta de inicio de sesión genérica y hash ficticio para reducir diferencias cuando el correo no existe.
- [x] Sesiones firmadas con JWT limitado por algoritmo, emisor y audiencia, y respaldadas por sesiones revocables en la base de datos.
- [x] Cookie de sesión `HttpOnly` y `SameSite=Strict`; en producción se marca `Secure`.
- [x] Middleware de autorización por rol en las rutas protegidas del backend.
- [x] Validación estricta de entradas con esquemas; límites de tamaño para JSON, CSV y PDFs, límite de filas, páginas y registro CSV.
- [x] Protección de origen para solicitudes que modifican datos, cabeceras Helmet y política CSP.
- [x] Límites de intentos para autenticación y consultas de IA; identificador de solicitud y `Cache-Control: no-store`.
- [x] Restablecimiento de contraseña con token aleatorio de un solo uso almacenado como digest y vencimiento; revocación de sesiones después del cambio.
- [x] Endpoint interno de n8n deshabilitado si falta el token; comparación de credenciales en tiempo constante.
- [x] PDFs almacenados fuera del frontend, dentro de `.local/`, con permisos restrictivos; nombre sanitizado, tamaño y tipo verificados, y citas de IA comprobadas contra el texto original.
- [x] La configuración rechaza arranque de producción sin PostgreSQL, secreto JWT de al menos 32 bytes, datos demo desactivados y orígenes HTTPS explícitos.
- [x] `.gitignore` excluye archivos `.env`, la base local y dependencias; solo se publica `.env.example` sin secretos.

## Seguridad pendiente antes de producción

- [ ] Configurar y proteger los secretos de producción: `JWT_SECRET`, `N8N_WORKFLOW_TOKEN`, proveedor de IA y credenciales SMTP. No reutilizar claves de demostración.
- [ ] Configurar HTTPS en el host o proxy final y fijar `TRUST_PROXY_HOPS` solo al número real de proxies confiables.
- [ ] Confirmar `CORS_ALLOWED_ORIGINS` con orígenes exactos y probar sesiones/cookies desde el dominio final.
- [ ] Usar credenciales de base con privilegios mínimos; habilitar cifrado, copias de seguridad y comprobar una restauración en el proveedor elegido.
- [ ] Acordar retención y eliminación de documentos subidos y registros operativos, además de los datos del CRM.
- [ ] Revisar dependencias y realizar una revisión de seguridad y privacidad antes de publicar. No se marca como realizada en esta revisión.
- [ ] Validar rate limits, recuperación de cuenta, permisos y manejo de archivos en el entorno de staging.

## Pendiente de implementación en el repositorio

- [ ] **WF-01: ingesta automática desde una fuente autorizada.** La carga CSV ya está hecha; falta conectar el origen elegido y su autorización de uso y publicación.
- [ ] **WF-03: indexación documental automatizada con n8n.** La aplicación ya consulta documentos aprobados; falta acordar el repositorio documental y automatizar la entrada.
- [ ] **AG-04: visión por computadora.** Falta definir imágenes autorizadas y qué atributos visibles debe describir; por eso no se inventa aún su alcance.
- [ ] Completar la integración de los puntos anteriores con permisos, manejo de errores y documentación de operación.

## Pendiente de configuración o decisión manual

- [ ] Configurar un proveedor de IA y validar los agentes con una cuenta de prueba. Ver variables en [`backend/.env.example`](../backend/.env.example).
- [ ] Configurar SMTP y comprobar recuperación de contraseña y correo de cierre con un buzón de prueba.
- [ ] Importar y configurar WF-02 en la instancia final de n8n; crear la credencial secreta y confirmar que la URL del backend sea alcanzable.
- [ ] Elegir y autorizar la fuente de datos de WF-01 y aportar un CSV de prueba o acceso API permitido.
- [ ] Elegir el repositorio y la frecuencia para WF-03.
- [ ] Autorizar ejemplos de imágenes y definir los campos de AG-04.
- [ ] Confirmar el contenido final de privacidad: canal para ejercer derechos, retención y proveedores autorizados.
- [ ] Preparar el despliegue: proveedor, dominio, variables de entorno y base PostgreSQL administrada.
- [ ] Ejecutar la suite automatizada y el recorrido de aceptación antes de considerar la entrega lista. No se marca como realizada en esta revisión.

## Guía para continuar

Las acciones que requieren cuentas, accesos o decisiones están detalladas en [Tareas manuales](tareas-manuales.md). La explicación de lo que hoy puede hacer el sitio está en [Descripción del sitio](descripcion-del-sitio.md).
