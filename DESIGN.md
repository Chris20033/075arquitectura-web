# Design — 075arquitectura

## Autoridad visual

La referencia vinculante es `../demo/01-editorial-completa.html`. El panel traslada su lenguaje editorial a una superficie operativa; no replica la composición pública literalmente.

## Paleta

| Token      | Valor     | Uso                                            |
| ---------- | --------- | ---------------------------------------------- |
| Papel      | `#ebe8e1` | Fondo principal.                               |
| Superficie | `#f3f0ea` | Campos y zonas elevadas por contraste tonal.   |
| Texto      | `#171717` | Texto y controles primarios.                   |
| Oscuro     | `#161616` | Plano de marca y rail administrativo.          |
| Gris       | `#aaa69e` | Líneas y texto secundario grande.              |
| Terracota  | `#b66f50` | Reglas, foco y señalización; no texto pequeño. |

## Tipografía y composición

- Geist Sans continúa el carácter sans de la referencia.
- La marca `075`, títulos de sección y cifras usan escala monumental, peso alto y tracking negativo.
- Etiquetas y navegación usan mayúsculas compactas con tracking positivo.
- La composición se estructura con líneas finas, filas editoriales y espacio negativo; no con una colección uniforme de tarjetas.

## Superficie administrativa

- Modo: Operate.
- Login dividido entre plano oscuro de marca y papel cálido de acceso.
- Shell con rail oscuro en escritorio y navegación horizontal compacta en móvil.
- Navegación numerada `01–05`; el estado activo se expresa mediante regla terracota y contraste, no mediante pastillas.
- Los módulos aún no implementados muestran claramente su sprint previsto.

## Movimiento

- Momento focal: la marca se descubre mediante recorte y la regla terracota se expande al entrar al acceso, en un máximo de 550 ms.
- Continuidad: cambios de navegación y estados entre 120 y 300 ms.
- Feedback: el botón comunica envío, error o cierre de sesión sin desplazar el layout.
- `prefers-reduced-motion` elimina recortes y desplazamientos; conserva cambios breves de opacidad y color.

## Restricciones

- Sin serif, gradientes, glassmorphism, imágenes externas ni ornamentación genérica.
- El acento terracota es señal, no relleno dominante.
- La landing pública permanece sin rediseño durante el Sprint 3.
