# AG-06 Explicación del costo

El agente recibe el cálculo que produce el simulador. Envía al proveedor solamente las etiquetas y montos de hasta doce partidas conocidas con importe positivo. El modelo elige hasta dos identificadores de la lista para destacar. El backend valida la selección y redacta la explicación con las partidas, los valores calculados y las que falten. La bitácora conserva actor, modelo, fecha y estado de la llamada. El resultado y la entrada textual del proveedor no se guardan en ella.

## Configuración opcional

- `AI_API_URL` es la URL completa del endpoint con terminación `/chat/completions`. Usa HTTPS para un proveedor remoto.
- `AI_API_KEY` es la credencial del proveedor.
- `AI_MODEL` identifica el modelo. El endpoint debe aceptar solicitudes con `response_format: {"type":"json_object"}` y `max_completion_tokens`.

Un comprador o administrador inicia la llamada desde la explicación de su simulación. La capacidad se consulta en `GET /api/v1/capabilities`. El cálculo de costos sigue disponible cuando la capacidad está desactivada o el proveedor falla.
