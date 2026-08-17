# Guía del repositorio!!

## Flujo de trabajo

- Esta es una aplicación estática sin dependencias. No hay manifiesto de paquetes, compilación, linter, ejecutor de pruebas ni CI; no inventes flujos de trabajo con `npm`.
- Ejecútala en Windows con `Start-Process .\src\index.html`. Los recursos son locales, por lo que no se necesita un servidor de desarrollo.
- Comprueba cada archivo JavaScript modificado con `node --check src/js/<archivo>.js`. Los cambios de ejecución y jugabilidad también requieren una prueba de humo en el navegador.
- Para una prueba de humo de la jugabilidad, comprueba el inicio/reinicio, las cuatro flechas, la recolección de puntos, la colisión con fantasmas y el reinicio de vidas, y el túnel envolvente de la fila 14.

## Arquitectura

- `src/index.html` usa scripts clásicos, no módulos. Conserva el orden de carga `maze.js -> game.js -> render.js -> main.js`: los archivos se comunican mediante variables globales compartidas y exportaciones explícitas en `window.*`.
- Los scripts clásicos comparten un único ámbito léxico global. Antes de añadir un `const` o `let` de nivel superior, comprueba que el nombre no exista en los demás scripts.
- `maze.js` contiene el mapa original de 28x31 y las coordenadas iniciales; `createGame()` clona `MAZE` en el objeto mutable `game.grid`. La jugabilidad y el renderizado deben usar `game.grid` para que los puntos comidos se restauren al iniciar una partida nueva.
- Los valores del mapa son: `0` espacio transitable vacío, `1` pared, `2` punto y `3` puerta del corral de fantasmas. Pac-Man no puede atravesar `3`, pero los fantasmas sí.
- La geometría está acoplada: el mapa de 28x31, `TILE = 20` en `render.js`, el canvas de 560x620, `TUNNEL_ROW` y las coordenadas iniciales de los actores deben mantenerse consistentes.
- Las responsabilidades están divididas de forma estricta: `maze.js` define los datos del nivel, `game.js` gestiona el estado, las reglas y el movimiento, `render.js` dibuja el estado actual y `main.js` gestiona la entrada del DOM, las pantallas superpuestas y el bucle de animación.

## Convenciones

- No hay ningún formateador configurado. Respeta el estilo existente: comillas simples, punto y coma, comas finales y espacios dentro de paréntesis y corchetes; no apliques un formateador ajeno al proyecto en todos los archivos.
- Para funcionalidades grandes, usa primero la habilidad local `spec`. Las especificaciones permanecen en estado Borrador (`Draft`) hasta que una persona las marque como Aprobadas (`Approved`); solo entonces usa `spec-impl`, que controla la creación de ramas y las pausas entre los pasos de implementación.
