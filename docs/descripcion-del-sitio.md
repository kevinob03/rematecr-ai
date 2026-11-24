# RemateCR AI

## ¿Qué es?

RemateCR AI es una aplicación para consultar bienes en remate o adjudicados y organizar su evaluación. Reúne catálogo, procedencia, comparación de costos, documentos y seguimiento de consultas en un mismo sitio.

La plataforma ayuda a ordenar la información disponible. No participa en la puja, no compra bienes y no procesa pagos. Un costo estimado no equivale a precio de adjudicación ni garantiza la condición del bien.

## Qué encuentra una persona usuaria

- **Catálogo y fichas.** Se puede filtrar por categoría y precio, abrir la ficha del bien y consultar su procedencia e historial de precios registrado.
- **Comparación de costos.** Se comparan escenarios en colones. Un importe desconocido permanece pendiente. Ingresar cero significa que el gasto se conoce y es cero.
- **Referencia en dólares.** Cuando el servicio externo responde con una observación vigente, se muestra el equivalente estimado junto con tasa, fecha y fuente. La conversión se oculta si no se puede confirmar.
- **Favoritos y seguimiento.** La persona compradora guarda bienes y puede enviar una consulta voluntaria al equipo. Solo ella y el personal autorizado ven los detalles de su solicitud.
- **Búsqueda y explicaciones con IA.** Los agentes disponibles pueden interpretar filtros, explicar escenarios y comparar fichas. La persona decide cuándo solicitar la consulta. Los importes y permisos los calcula y valida el backend.
- **Consulta documental.** El comprador y el administrador pueden preguntar sobre documentos aprobados. Las respuestas incluyen página y fragmento de respaldo.
- **Cuenta y privacidad.** La persona puede corregir su nombre y pedir la baja. La baja se confirma con contraseña y requiere aprobación administrativa. Tras la aprobación se eliminan los registros individuales del CRM y se conservan solo sus estadísticas anónimas.

## Perfiles

| Perfil | Acceso principal |
| --- | --- |
| Visitante | Consultar el catálogo público y sus fichas. |
| Comprador | Comparar, guardar favoritos, gestionar preferencias, solicitar seguimiento, consultar documentos aprobados y ejercer acciones de su cuenta. |
| Administrador | Revisar solicitudes de seguimiento, documentos y bajas de cuenta. |
| Auditor | Consultar métricas agregadas del CRM. |

## Procedencia de la información

La demostración inicial contiene dos vehículos ficticios tomados del ejemplo de la propuesta RemateCR AI v0.2. Los precios y gastos de esos casos no son anuncios reales. El catálogo de inmuebles permanece vacío hasta que se autoricen datos para cargar.

En la versión propuesta, el equipo incorporará información desde anuncios o archivos cuyo uso esté autorizado. Antes de publicar una ficha, una persona revisará el contenido y conservará su fuente y fecha de comprobación. Un documento sin aprobación no se utiliza para responder consultas. Las fuentes concretas de anuncios todavía deben seleccionarse y autorizarse.

## Papel de la inteligencia artificial

La IA ayuda a interpretar búsquedas, extraer campos de documentos, explicar importes o comparar información. Cuando analiza un PDF, los campos extraídos quedan como borrador para revisión humana. En respuestas documentales, cada cita debe coincidir con un fragmento de un documento aprobado.

RemateScore es una propuesta de afinidad, no una medida de rentabilidad, valor de mercado, seguridad o posibilidad de financiamiento. Mientras falte evidencia del perfil o del bien, el resultado indica «No evaluable». Sus pesos siguen pendientes de validación.

## Estado de la demostración

El catálogo de prueba, las cuentas por rol, el simulador, el CRM, favoritos, filtros, perfiles, tipos de cambio y los servicios de agentes distintos de AG-04 se implementan en la aplicación local. La disponibilidad de las funciones de IA depende de la configuración de un proveedor. Los correos requieren SMTP. La aplicación permite cargar un CSV autorizado y revisar sus filas; todavía no hay una conexión automatizada a la fuente de datos (WF-01). WF-02 tiene una exportación de n8n que debe importarse y configurarse en la instancia final. WF-03 y AG-04 siguen pendientes.

## En una frase

RemateCR AI permite revisar información disponible de bienes, comparar sus costos conocidos, identificar lo que falta confirmar y dar seguimiento a una consulta, manteniendo visibles las fuentes y los límites de cada dato.
