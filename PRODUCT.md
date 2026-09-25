# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

La propietaria de 075arquitectura es la única usuaria del panel administrativo. Las personas visitantes consumen el portafolio público sin cuenta.

## Product Purpose

Presentar el trabajo profesional de arquitectura con prioridad visual y permitir que la propietaria gestione proyectos, categorías, perfil, contacto y galerías sin editar código.

## Positioning

El portafolio y su administración comparten una voz editorial sobria: la interfaz acompaña el material arquitectónico y no compite con él.

## Operating Context

La propietaria utilizará `/admin` desde escritorio y móvil para mantener contenido editorial. El acceso es ocasional pero sensible; debe ser claro, privado y recuperable sin registro público.

## Capabilities and Constraints

- Next.js integra frontend y lógica de servidor; no existe backend independiente.
- PostgreSQL persiste contenido y cuenta administrativa; un volumen local persistente conserva originales privados y variantes WebP.
- Existe una sola administradora creada mediante un comando privado.
- No hay registro público ni recuperación automática de contraseña en el MVP.
- Las sesiones duran como máximo ocho horas y se invalidan al cambiar la contraseña o desactivar la cuenta.
- La landing pública consume `SiteProfile` y proyectos publicados; cada obra dispone de un detalle por slug.
- El detalle presenta una cuadrícula de galería y un visor accesible con navegación táctil, por teclado y mediante controles visibles.
- Los recursos conceptuales permanecen identificados como demo hasta recibir obra real.
- El panel permite gestionar categorías, proyectos, perfil, redes, papelera y el ciclo completo de imágenes en la VPS.
- La portada principal de la landing es un recurso independiente del orden y las portadas de los proyectos.
- WhatsApp es el canal de contacto principal; las redes se administran como plataformas predefinidas con nombre de usuario y enlace propio.
- Las cargas pasan por una ruta administrativa interna, se procesan una sola vez con Sharp y se registran solo después de completar el directorio atómico.
- Las cargas no imponen una resolución mínima o máxima propia; conservan formato, peso y metadatos positivos como límites operativos.
- El panel guía a la propietaria mediante tareas y pasos breves; el lenguaje técnico queda reservado a herramientas de mantenimiento.
- El original exacto permanece privado y cada recurso público se entrega mediante una única variante WebP adecuada para su tipo de pantalla.
- Producción se ejecutará autohospedada en Docker sobre Ubuntu; Vercel y Cloudinary quedan descartados.

## Brand Commitments

- Nombre: 075arquitectura.
- Idioma del MVP: español.
- `../demo/01-editorial-completa.html` es la referencia visual vinculante: tipografía sans de gran escala, paleta cálida, líneas editoriales, grandes números y acento terracota.

## Evidence on Hand

- Especificación funcional y técnica en `../075arquitectura-docs`.
- Referencia visual completa en `../demo/01-editorial-completa.html`.
- Datos del seed deliberadamente ficticios; no existen todavía textos, contacto o imágenes reales aprobados.

## Product Principles

- El contenido arquitectónico tiene prioridad sobre la interfaz.
- Cada operación privada se autoriza en el servidor.
- La claridad operativa prevalece sobre el efecto visual dentro del panel.
- Cada pantalla administrativa presenta una acción principal y avisa antes de abandonar cambios sin guardar.
- Las decisiones pendientes se muestran como tales y no se presentan como contenido real.

## Accessibility & Inclusion

El sitio público y el panel deben funcionar con teclado, foco visible, contraste suficiente y una alternativa intencional para `prefers-reduced-motion`.
