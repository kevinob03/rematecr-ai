# RemateCR AI · Dirección visual para Google Stitch

Dirección visual del anteproyecto basada en el export de Stitch `stitch_rematecr_ai_design_system (1).zip`. Su `screen.png` es la referencia visual y `code.html` aporta los colores, radios y proporciones. La captura original está en [referencia-stitch.png](output/design/referencia-stitch.png). Idioma de interfaz: español de Costa Rica. RemateCR AI permite consultar y evaluar bienes en remate y adjudicados. Usar los datos de demostración indicados al final.

## 1. Tema visual

Panel moderno y sobrio, con densidad moderada. El lienzo salvia reúne una barra lateral blanca flotante, un encabezado compacto y tarjetas blancas con radios amplios. El módulo principal ocupa dos tercios del ancho y el panel auxiliar el tercio restante. La tarjeta verde señala el dato que ayuda a decidir. Escribir **RemateCR AI** como firma tipográfica provisional.

## 2. Paleta y función

| Color | HEX | Uso |
|---|---|---|
| Salvia papel | `#E9ECE5` | Fondo continuo del tablero; valor aplicado al lienzo en el export |
| Salvia niebla | `#E4EDE7` | Miniaturas sin fotografía y selección clara |
| Blanco | `#FFFFFF` | Tarjetas, barra lateral y formularios |
| Tinta | `#222825` | Títulos y cuerpo |
| Carbón | `#1A221F` | Fondo circular de la navegación activa y botón de búsqueda |
| Gris musgo | `#545F57` | Texto secundario; ajuste para mantener la legibilidad |
| Borde suave | `#D6DDD4` | Separadores internos y contornos decorativos |
| Borde de control | `#77837A` | Contorno visible de campos; ajuste de accesibilidad |
| Verde salvia oscuro | `#587363` | Fondo de la tarjeta destacada, tomado del export |
| Verde profundo | `#3C5E4C` | Botón principal, enlaces y foco |

Usar texto blanco en las superficies de verde oscuro. Mantener una sola familia de acento, el verde salvia. Identificar los estados con texto explícito. Para el resto de las pantallas, usar esta paleta reducida a partir de los colores que se ven en el modelo.

## 3. Tipografía

- **Sans de sistema** como en el export (`font-sans`). Título de página de 24 px, peso 700. Títulos de tarjeta de 16 a 18 px, peso 600. Texto de trabajo de 14 a 16 px, con interlineado de 20 a 24 px y ancho máximo de lectura de 65 caracteres.
- Usar cifras tabulares de la misma tipografía. Alinear los importes a la derecha cuando formen una columna. Dar 24 px al importe destacado y 14 px a los metadatos. Usar el signo ₡ y el formato del ejemplo.

## 4. Componentes y estados

- Barra flotante blanca de 64 px con extremos redondeados. Mantener las secciones principales arriba y las acciones de cuenta abajo. Iconos lineales de 20 px y un disco oscuro para la sección activa. Dar a cada icono un nombre y un área interactiva de al menos 44 × 44 px. Mostrar los accesos permitidos para el rol.
- Tarjetas blancas de radio de 28 px, sombras suaves y relleno de 20 a 24 px. Reservar la tarjeta verde para el costo estimado en la vista de comprador. Usar una miniatura salvia con un icono de auto cuando no haya fotografía.
- Buscador superior blanco en forma de cápsula, de 256 px de ancho en escritorio, con botón oscuro circular. Mantener al menos 44 px de área interactiva. Botón principal con verde profundo y radio de 12 px. Botones secundarios blancos con borde. Foco visible de 2 px con separación de 2 px.
- Usar etiquetas de campo encima de los controles, mensajes al pie y espacio suficiente para navegar con teclado. Mostrar un estado vacío con una acción útil y conservar los filtros si hay un error.
- En la ficha, diferenciar visualmente «Precio publicado», «Gastos estimados» y «Costo total estimado». Si un gasto se elimina, mostrar «Subtotal conocido» y «Gasto pendiente». Mostrar «Fuente: caso ficticio de la propuesta RemateCR AI v0.2» donde corresponda.

## 5. Retícula y adaptación

- Diseñar en marcos de 1440 px y 390 px. En escritorio, usar el lienzo de ancho máximo de 1400 px del export, 20 px de separación entre la barra flotante y el contenido, 24 px entre secciones y 32 px de margen exterior. Retícula de 12 columnas, con una división principal de 8 y 4. En móvil, margen de 16 px y separación de 12 px.
- En escritorio, situar la barra desde el inicio del lienzo. En la zona de trabajo, colocar encabezado y búsqueda a la misma altura. Bajo el encabezado va la franja de filtros o acciones. Las tarjetas comienzan a la misma altura a ambos lados de la retícula.
- El catálogo usa la columna ancha para resultados y el panel auxiliar para costo estimado y procedencia. La ficha conserva el mismo patrón con detalle y gastos a la izquierda y total a la derecha. Para el CRM, mantener cabecera, barra y tarjetas, y dedicar el ancho principal al tablero de seguimiento.
- Bajo 768 px, pasar a una sola columna, sustituir la barra lateral por un menú compacto y colocar el costo estimado después de los resultados o del encabezado de la ficha, según la vista. Evitar el desplazamiento horizontal.

## 6. Movimiento e interacción

Mantener la interfaz en reposo. Respuesta táctil de 1 px en botones y transición breve de opacidad o transformación, de 120 a 180 ms. En carga, usar un esqueleto en las dimensiones del contenido esperado. Desactivar animaciones con la preferencia de movimiento reducido.

## 7. Patrones a evitar

Evitar neón, brillos, sombras pronunciadas, texto sobre imágenes y métricas de relleno. Usar la referencia para el tratamiento visual de los bloques. Adaptar sus módulos al catálogo, la ficha y el seguimiento con iconografía, textos y datos de RemateCR AI.

## 8. Encargo para la primera generación en Stitch

Usar `referencia-stitch.png` como referencia visual del proyecto. Crear cuatro marcos: **Catálogo · escritorio**, **Ficha de vehículo · escritorio**, **Catálogo · móvil** y **Ficha de vehículo · móvil**. Aplicar la misma paleta, tipografía y componentes a los cuatro.

- **Catálogo.** Encabezado de RemateCR AI, barra lateral, buscador superior, filtro por categoría y resultados en una tarjeta blanca. Usar dos resultados: «Vehículo A» y «Vehículo B». Mostrar el precio publicado en el listado y los costos totales estimados en una tarjeta verde lateral. Incluir la acción de abrir la ficha y marcar el contenido con «Datos ficticios de demostración».
- **Ficha.** Abrir «Vehículo A» desde catálogo. Mostrar fuente, bloque sin fotografía de referencia, tres partidas de costo y botón «Agregar a comparación». Dar mayor peso visual a la cifra total. Incluir una indicación de procedencia cerca de los importes.
- **Estado de ejemplo.** Si se retira la estimación de reparaciones del Vehículo A, indicar subtotal conocido de ₡4.500.000 y marcar el costo total como pendiente. Mantenerlo como variante del desglose.

| Dato del ejemplo | Vehículo A | Vehículo B |
|---|---:|---:|
| Precio publicado | ₡4.000.000 | ₡4.600.000 |
| Reparaciones estimadas | ₡1.200.000 | ₡300.000 |
| Otros gastos estimados | ₡500.000 | ₡500.000 |
| Costo total estimado | ₡5.700.000 | ₡5.400.000 |

Fuente del ejemplo: propuesta RemateCR AI v0.2, sección 03. Identificar los nombres de los vehículos como los del ejemplo. Omitir marca, placa, kilometraje, ubicación, disponibilidad, fotografías y fechas de verificación cuando no consten en los materiales.
