---
name: 075arquitectura
description: Un portafolio editorial donde la arquitectura ocupa el primer plano.
colors:
  terracotta-signal: "#b66f50"
  warm-paper: "#ebe8e1"
  raised-paper: "#f3f0ea"
  ink: "#171717"
  architectural-black: "#161616"
  graphite: "#6b6862"
  drafting-line: "#aaa69e"
  warm-white: "#f5f2ec"
typography:
  display:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(3.75rem, 8vw, 6rem)"
    fontWeight: 760
    lineHeight: 0.84
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(2.25rem, 4.5vw, 4.6rem)"
    fontWeight: 480
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.96rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.68rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.1em"
rounded:
  none: "0"
spacing:
  gutter: "clamp(1.125rem, 3vw, 2.625rem)"
  section: "clamp(5.5rem, 11vw, 9rem)"
components:
  contact-action:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0"
    height: "3rem"
---

# Design System: 075arquitectura

## Overview

**Creative North Star: "El archivo habitable"**

El sistema traduce la disciplina de un plano editorial a una experiencia de portafolio. Grandes campos de papel, reglas finas, tipografía monumental y fotografías materiales construyen una presencia sobria que desaparece cuando la obra necesita hablar.

La interfaz alterna papel cálido, planos negros y un único campo terracota. Evita el lenguaje de producto digital —tarjetas suaves, sombras y ornamento— para sentirse más próxima a una publicación de arquitectura.

**Key Characteristics:**

- Escala tipográfica monumental con una sola familia sans.
- Composición asimétrica, reglas de dibujo y espacio negativo generoso.
- Fotografía a sangre con materialidad cálida y realista.
- Terracota reservado para señal, foco y cierre.
- Movimiento breve que revela, nunca entretiene.

## Colors

La paleta combina papeles minerales y negros profundos con una única señal terracota.

### Primary

- **Terracota señal:** ocupa el cierre de contacto y los estados de foco; no se usa como texto pequeño sobre papel.

### Neutral

- **Papel cálido:** superficie pública principal.
- **Papel elevado:** alternancia tonal en el proceso.
- **Tinta y negro arquitectónico:** texto, bloques inmersivos y navegación.
- **Grafito y línea de dibujo:** información secundaria y divisores.
- **Blanco cálido:** texto sobre planos oscuros o terracota.

**The Signal Rule.** El terracota señala una decisión o un destino; su rareza preserva su fuerza.

## Typography

**Display Font:** Geist con respaldo sans-serif.

**Body Font:** Geist con respaldo sans-serif.

**Character:** Una sola voz tipográfica cambia de escala y densidad como una lámina editorial. Los títulos tensan el espacio; el cuerpo se mantiene sereno y legible.

### Hierarchy

- **Display:** peso 760, escala fluida hasta 6rem y línea 0.84 para títulos de sección.
- **Headline:** peso 480, escala fluida hasta 4.6rem y línea 1.04 para manifiestos.
- **Body:** 0.96rem y línea 1.7, con medida máxima cercana a 65 caracteres.
- **Label:** 0.68rem, peso 700 y tracking 0.1em, siempre para información breve.

**The Single Voice Rule.** No se introduce una serif decorativa; el contraste nace de escala, peso y espacio.

## Layout

Las secciones usan un gutter fluido y separación vertical amplia. En escritorio, las composiciones alternan rejillas asimétricas de dos columnas, listas de tres columnas y filas editoriales. Bajo 900px se reduce la rejilla; bajo 700px la navegación se convierte en un plano oscuro de pantalla completa y las composiciones se apilan sin perder asimetría.

La primera vista ocupa el alto del dispositivo. La fotografía llena el plano, la marca monumental se centra y la información auxiliar se ancla a los bordes como notas de una lámina.

## Elevation & Depth

El sistema es plano por definición. La profundidad proviene del contraste entre superficies, la escala de la fotografía y las capas del hero; no se usan sombras de caja.

**The Material Depth Rule.** Las imágenes y los cambios de superficie crean profundidad; las cajas no flotan.

## Shapes

Los bordes son rectos y las esquinas permanecen a cero. Reglas de un píxel organizan servicios, procesos, captions y navegación. Las únicas formas redondeadas pertenecen al contenido fotografiado, no a la interfaz.

## Components

### Buttons

- **Shape:** acción tipográfica rectangular, sin relleno ni radio.
- **Primary:** enlace de contacto en tinta oscura, con subrayado de un píxel y altura táctil mínima de 3rem.
- **Hover / Focus:** el espacio hacia la flecha aumenta; el foco usa un contorno terracota de 2px.

### Cards / Containers

Los proyectos no usan tarjetas. Cada figura combina imagen a sangre, caption editorial y una regla inferior. Los servicios forman una sola matriz continua de líneas, no contenedores independientes.

### Navigation

En escritorio, los destinos se distribuyen en una línea sobre el hero. En móvil, un control compacto abre un plano oscuro con destinos de gran escala, reglas horizontales y cierre explícito.

### Project Figure

La pareja preliminar combina una imagen vertical y otra horizontal para establecer ritmo de archivo. El hover aplica una ampliación mínima y la procedencia demo permanece visible en el caption.

## Do's and Don'ts

### Do:

- **Do** usar imágenes con proporciones reservadas y descripciones significativas.
- **Do** mantener el terracota como señal y el papel como campo principal.
- **Do** construir jerarquía con escala, reglas y espacio negativo.
- **Do** retirar máscaras y desplazamientos cuando se prefiera movimiento reducido.

### Don't:

- **Don't** usar gradientes, glassmorphism, sombras decorativas o tarjetas genéricas.
- **Don't** introducir serif, iconos emoji ni recursos externos de imagen.
- **Don't** presentar contenido conceptual o datos `.test` como obra o contacto real.
- **Don't** convertir el panel administrativo en una extensión visual del hero público.
