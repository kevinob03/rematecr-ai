# Agentes de IA

Cada carpeta corresponde a un agente del anteproyecto. [AG-01](search/search.js), [AG-02](extract/extract.js), [AG-03](rag/rag.js), [AG-05](score/README.md), [AG-06](finance/README.md) y [AG-07](compare/compare.js) tienen servicios en el backend. Comparten transporte y validación del proveedor, con responsabilidad independiente y registro por agente. AG-02 conserva la extracción en un borrador privado para revisión administrativa. AG-03 solo recupera páginas aprobadas y valida sus citas. AG-05 devuelve «No evaluable» cuando falta evidencia para sus componentes propuestos.

| ID | Carpeta | Responsabilidad |
| --- | --- | --- |
| AG-01 | [search/](search/) | Traducir búsqueda en lenguaje natural a filtros permitidos del catálogo. |
| AG-02 | [extract/](extract/) | Extraer campos de un PDF autorizado para revisión editorial. |
| AG-03 | [rag/](rag/) | Responder sobre documentos autorizados con citas verificables. |
| AG-04 | [vision/](vision/) | Describir hallazgos visibles en imágenes autorizadas y señalar incertidumbre. |
| AG-05 | [score/](score/) | Explicar el RemateScore calculado por el servicio de negocio. |
| AG-06 | [finance/](finance/) | Explicar los importes y los supuestos calculados en la simulación. |
| AG-07 | [compare/](compare/) | Sintetizar diferencias entre bienes a partir de datos comparables. |
| AG-08 | [remy/](remy/) | Guiar la evaluación usando herramientas de lectura autorizadas. |

AG-08 está implementado como un asistente de consulta que clasifica la intención y llama únicamente herramientas internas de lectura. AG-04 permanece reservado; su implementación depende de definir fuentes de imágenes autorizadas y los campos que puede describir.
