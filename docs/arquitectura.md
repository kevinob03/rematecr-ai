# Arquitectura de RemateCR AI

RemateCR AI sigue el monolito modular del anteproyecto. React consume una API Express, Express accede a la base SQL y sus servicios se comunican con n8n y los proveedores externos. La referencia académica es *Proyecto Final Full Stack* de FWD Costa Rica, sección 6, pp. 6 y 7 impresas.

## Capas del backend

| Ubicación | Responsabilidad |
| --- | --- |
| `backend/src/config` | Leer variables de entorno y configurar la conexión SQL. |
| `backend/src/models` | Representar entidades y encapsular las consultas y la persistencia en SQL. |
| `backend/src/controllers` | Recibir la petición validada, llamar al servicio y devolver la respuesta HTTP. |
| `backend/src/routes` | Declarar endpoints y ordenar sus middlewares y controladores. |
| `backend/src/middlewares` | Validar entradas, comprobar JWT y roles, y centralizar el manejo de errores. |
| `backend/src/services` | Aplicar reglas de negocio, coordinar operaciones con los modelos e integrar IA, APIs y n8n. |
| `backend/tests` | Alojar pruebas unitarias por capa e integración cuando haya componentes ejecutables. |

Las rutas de n8n están separadas en `backend/src/routes/workflows.js`. Allí se aplican el token interno, límites de cuerpo y esquemas antes de delegar en controladores y servicios; `app.js` solo compone el router.

`src/app.js` compone la aplicación con middlewares globales, rutas y manejo de errores. `src/server.js` prepara el esquema SQL e inicia la escucha.

## Recorrido de una petición

```text
React → ruta Express → middlewares → controlador → servicio → modelo SQL
                                                        └→ integración externa
```

Por ejemplo, el controlador del simulador entrega al servicio el bien y el escenario validados. El servicio calcula el subtotal, el total cuando corresponda y las partidas pendientes. El modelo consulta el precio y las partidas de referencia. El controlador transforma el resultado en una respuesta HTTP. Los cambios del escenario se calculan en la solicitud y la versión actual no almacena una copia.

En el CRM el middleware valida la identidad y el rol. El servicio verifica el acceso al caso, valida el cambio de etapa y registra quién lo hizo. Los modelos conservan el historial y las consultas sobre los datos compartidos.

## Límites entre componentes

- React consume la API del backend. Las credenciales de SQL, IA y n8n se configuran en el entorno del backend.
- Cada agente tiene una carpeta dentro de `backend/src/services/agents`. AG-06 recibe el resultado del cálculo y usa un proveedor configurable para seleccionar partidas. El backend conserva el control del cálculo y del texto que presenta los importes.
- `database/migrations` versiona el esquema y `database/seeds` contiene datos sintéticos. Las mismas migraciones se ejecutan en PostgreSQL embebido y en el adaptador a servidor. Los modelos encapsulan el acceso a las tablas.
- `n8n/workflows` contendrá las exportaciones de una instancia de n8n. Los flujos se comunicarán con Express por endpoints autenticados.
- `docs` reúne la documentación técnica. Los entregables académicos se mantienen en `output/anteproyecto`.
