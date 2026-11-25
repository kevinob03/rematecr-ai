# RemateCR AI

El checklist de lo implementado y lo pendiente está en [Estado del proyecto](docs/estado-del-proyecto.md).

Proyecto Full Stack de FWD Costa Rica para consultar y evaluar bienes en remate y adjudicados. El catálogo, el simulador de costos y el CRM de seguimiento forman parte de la misma aplicación.

La aplicación local incluye catálogo y ficha con procedencia, inicio y cierre de sesión, comparador de costos, solicitudes de seguimiento y auditoría agregada. Contiene los dos vehículos ficticios del anteproyecto. El filtro de inmuebles muestra un estado vacío hasta contar con datos autorizados.

Los accesos y decisiones que requieren intervención de Kevin se registran en [Tareas manuales](docs/tareas-manuales.md).

La descripción funcional del sitio y los límites de la demostración están en [Descripción del sitio](docs/descripcion-del-sitio.md).

## Ejecutar la demostración

Requiere Node.js 24 o superior y npm. Desde la raíz del proyecto:

```powershell
npm ci
npm run dev
```

Abrí **http://127.0.0.1:5173**. Vite reenvía la API al puerto 4310. La primera ejecución prepara PostgreSQL embebido y carga las cuentas y bienes ficticios. Los datos se conservan en `.local/postgres`.

Para ejecutar los archivos compilados desde Express, detené primero la sesión de desarrollo:

```powershell
npm run build
npm start
```

Abrí **http://127.0.0.1:4310**. La base local admite un servidor a la vez. Al volver a iniciar, se recupera el bloqueo si el proceso anterior ya terminó.

Antes de preparar el entorno final, ejecutá `npm run preflight:production`. El comando informa qué requisitos de arranque e integraciones faltan sin mostrar claves ni conectarse a los servicios.

## Recorrido para revisar

La contraseña pública de las cuentas ficticias es `RemateCR-demo-2026!`.

| Cuenta de demostración | Qué permite revisar |
| --- | --- |
| `comprador@example.test` | Comparar los vehículos, registrar una solicitud y consultar su estado. |
| `comprador2@example.test` | Comprobar la separación entre solicitudes de distintos compradores. |
| `admin@example.test` | Consultar el tablero, cambiar etapas y revisar el resumen de auditoría. |
| `auditor@example.test` | Leer las cantidades agregadas por etapa. |

En el comparador, los dos costos son ₡5.700.000 y ₡5.400.000. Al borrar la partida de reparaciones del vehículo A, el subtotal conocido es ₡4.500.000 y el total figura como pendiente. Si escribís cero en esa partida, el total conocido es ₡4.500.000.

En el catálogo podés filtrar por precio publicado y categoría. El comprador puede guardar una ficha en **Favoritos** y usar **Buscar con IA** cuando el proveedor esté habilitado. AG-01 interpreta la consulta y el catálogo aplica los filtros con parámetros SQL.

En la ficha y en el comparador, **Ver referencia en USD** consulta la serie USD/CRC del BCCR mediante Frankfurter. La conversión muestra fecha, tasa y fuente. El backend reutiliza la observación durante una hora y suspende la conversión tras un fallo de actualización o si la observación alcanza siete días. [Serie utilizada](https://frankfurter.dev/providers/bccr/)

## Configuración y pruebas

- [Base de datos](database/README.md). Para usar un servidor PostgreSQL, configurá `DATABASE_URL` en `backend/.env`. Con un servidor externo, el sembrado ficticio requiere `DEMO_DATA=1` en un entorno local. La aplicación rechaza la base sembrada al arrancar en modo producción.
- [Agente AG-06](backend/src/services/agents/finance/README.md). Se habilita con `AI_API_URL`, `AI_API_KEY` y `AI_MODEL`. Cuando está habilitado, el usuario decide si envía las partidas conocidas al proveedor para pedir una explicación. La aplicación calcula los importes siempre en Express.
- El comprador puede usar **Explicar la comparación** para contrastar dos escenarios con AG-07. Se requiere la misma configuración de IA que AG-06. React muestra los campos comparables, los límites y enlaces a las dos fichas. Express calcula la diferencia y verifica las partidas compartidas.
- AG-05 expone el desglose de RemateScore calculado por el servidor. La versión de pesos está marcada como propuesta y el puntaje queda como «No evaluable» cuando faltan datos estructurados del perfil y del bien.
- El rol administrador dispone de **Documentos** para enviar PDFs autorizados de hasta 8 MB y 100 páginas. AG-02 extrae texto seleccionable, conserva campos inciertos y citas de página en un borrador privado. Una persona administradora aprueba o rechaza cada borrador; los rechazos requieren un motivo y quedan en el historial con revisor y fecha. La extracción requiere un proveedor de IA configurado.
- El rol administrador puede seleccionar o pegar un CSV de hasta 500.000 bytes con título, categoría, resumen, precio y URL HTTPS de origen. Las filas quedan en revisión. Solo aprobar una fila crea una ficha publicada; un posible duplicado detiene la aprobación. Los reintentos solo se aceptan si conservan el mismo contenido. La pantalla conserva el estado de cada lote y las decisiones por fila con revisor, fecha y motivo obligatorio al rechazar.
- El comprador o administrador puede abrir **Consulta documental**. AG-03 busca fragmentos en páginas aprobadas, pide una respuesta estructurada y valida cada cita contra el texto recuperado. Los documentos pendientes o rechazados no participan.
- `npm test` ejecuta pruebas unitarias y un recorrido HTTP con PostgreSQL embebido. Las pruebas de AG-01, AG-06 y AG-07 usan respuestas simuladas. Para validar un proveedor real, se necesita configurarlo y ejecutar una consulta.

Desde **Iniciar sesión** se puede crear una cuenta de comprador con aceptación explícita o solicitar recuperación. Desde el nombre de usuario se abre **Mi cuenta**, donde se puede rectificar el nombre y solicitar una baja. La baja requiere la contraseña actual y confirmación, genera un folio pendiente y suspende la cuenta en la misma transacción que revoca las sesiones y los enlaces de recuperación. El administrador revisa los folios en Mi cuenta. Al aprobar, el sistema elimina la identidad y los registros individuales del comprador y acumula únicamente cantidades de solicitudes y transiciones por etapa final. El folio queda desvinculado del usuario y permite consultar el estado desde Iniciar sesión. Con SMTP configurado, la aprobación también intenta enviar un aviso al correo de la cuenta. El folio sigue disponible si falla el correo.

Para habilitar recuperación por correo, configurá `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` y, si corresponde, `SMTP_USER` y `SMTP_PASSWORD` en el entorno del backend. El primer origen de `CORS_ALLOWED_ORIGINS` debe ser la dirección web de React que recibirá el enlace. En desarrollo el valor predeterminado es `http://127.0.0.1:5173`. Usá un buzón SMTP de pruebas para los datos ficticios. Con credenciales o en producción se exige TLS. El enlace vence a los 20 minutos, cada solicitud invalida el enlace anterior y el cambio de contraseña cierra las sesiones existentes. Las pruebas automatizadas usan un buzón en memoria.

Quedan pendientes AG-04, la automatización de ingesta WF-01 y la indexación WF-03, además de importar y verificar WF-02 en la instancia final, probar IA y SMTP reales, y preparar el despliegue público. La aplicación ya permite importar CSV de fuentes autorizadas y revisar cada fila con un administrador; esto no sustituye la conexión automatizada a una fuente.

## Organización

| Carpeta | Contenido |
| --- | --- |
| [frontend/](frontend/) | React. Navegación y sesión en `src/app`, pantallas por función en `src/features`, componentes reutilizables en `src/components` y cliente HTTP en `src/api`. |
| [backend/](backend/) | Express. Capas obligatorias en `src` y pruebas en `tests`. |
| [database/](database/) | Migraciones SQL y datos ficticios de demostración. |
| [n8n/](n8n/) | Exportaciones y material de configuración para los workflows de ingesta, alertas e indexación documental. |
| [docs/](docs/) | Arquitectura, modelo de datos, decisiones técnicas y gobernanza. |
| [output/anteproyecto/](output/anteproyecto/) | Anteproyecto en Word y PDF, libro de marca y mockups. |

La [arquitectura por capas](docs/arquitectura.md) describe cómo se comunica cada carpeta. El [inventario de agentes](backend/src/services/agents/README.md) identifica sus ocho responsabilidades. Las variables de backend se listan en [`.env.example`](backend/.env.example).
