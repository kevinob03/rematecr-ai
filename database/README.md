# Base de datos de RemateCR AI

El esquema usa PostgreSQL. Las migraciones contienen los cambios versionados y los datos de referencia de roles y etapas. El archivo de demostración se carga por separado en un entorno local.

## Modelo inicial

| Tabla | Responsabilidad |
| --- | --- |
| `roles`, `users` | Roles del sistema y cuentas. El correo normalizado es único y la contraseña tiene formato de hash bcrypt. |
| `sessions` | Vigencia y revocación de sesiones autenticadas. |
| `sources`, `assets` | Procedencia y estado del catálogo. Una fuente puede respaldar varios bienes. |
| `asset_costs` | Partidas identificadas dentro de cada bien, con orden estable. |
| `crm_stages`, `crm_requests` | Etapas y solicitudes voluntarias de seguimiento. Una solicitud pertenece a un comprador y se refiere a un bien. |
| `crm_stage_history` | Registro de responsable, etapa y fecha. Se actualiza en la misma transacción que la solicitud. |

Los importes se almacenan en colones enteros. En una partida, `NULL` representa un importe pendiente y `0` un importe conocido de cero. El servicio calcula el subtotal y el total a partir de las partidas, sin persistir un resultado redundante. Los índices cubren relaciones y consultas de catálogo, solicitudes propias y orden de historial.

## Demostración local

Las migraciones 003 y 004 registran aceptación de cuenta, credenciales temporales de recuperación y solicitudes de baja. El enlace de recuperación se representa en SQL por su digest SHA-256. La tabla `archived_crm_counts` conserva una fila por etapa, con las cantidades de casos retirados y sus transiciones. Al aprobar una baja, el modelo acumula esos conteos, elimina las solicitudes individuales y sus historiales, y desvincula el folio de la identidad. La auditoría suma los conteos archivados y los del CRM activo.

La fuente de los dos vehículos es el caso ficticio de la propuesta RemateCR AI v0.2. El vehículo A suma ₡5.700.000 y el vehículo B ₡5.400.000. Al dejar pendientes las reparaciones del A, las partidas conocidas suman ₡4.500.000. El filtro de inmuebles queda vacío hasta que exista una fuente autorizada con datos verificables.

Todas las cuentas ficticias tienen la contraseña pública de demostración `RemateCR-demo-2026!`. El archivo SQL almacena solamente los hashes.

| Cuenta local | Rol |
| --- | --- |
| `comprador@example.test` | Comprador |
| `comprador2@example.test` | Comprador para comprobar la separación de solicitudes |
| `admin@example.test` | Administrador |
| `auditor@example.test` | Auditor |
