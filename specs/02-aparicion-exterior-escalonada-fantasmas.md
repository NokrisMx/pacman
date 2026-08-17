# SPEC 02 — Aparición exterior escalonada de fantasmas

> **Status:** Approved
> **Depends on:** SPEC 01
> **Date:** 2026-08-17
> **Objective:** Los cuatro fantasmas comienzan en celdas exteriores distintas y se activan escalonadamente cada 2 segundos desde el inicio de cada ronda.

## Why this spec exists

La SPEC 01 define que Pinky, Inky y Clyde nacen dentro del corral y deben salir mediante BFS. En la práctica esa ruta queda atrapada y los fantasmas no logran incorporarse al juego. Esta SPEC corrige la aparición posicionando a los cuatro fuera del corral y usando una activación temporal escalonada.

## Scope

**In:**

- Pinky, Inky y Clyde aparecen en celdas exteriores distintas junto a Blinky, no dentro del corral.
- Posiciones iniciales: Blinky `(13,11)`, Pinky `(14,11)`, Inky `(12,11)`, Clyde `(15,11)`.
- Activación escalonada con tiempo real medido con `performance.now()`: Blinky al inicio, Pinky a 2 s, Inky a 4 s, Clyde a 6 s.
- Durante la espera, los fantasmas son visibles e inmóviles pero siguen peligrosos; la colisión con Pac-Man quita vida.
- Tras perder una vida, todos vuelven a sus posiciones exteriores y la secuencia de activación se reinicia desde cero.
- `inPen` se conserva pero todos los fantasmas comienzan con `inPen = false`.
- La puerta del corral (valor `3`) se bloquea para los fantasmas en `canMove`, igual que para Pac-Man.
- Se eliminan la lógica de salida BFS del corral y el bloqueo de reentrada por `isPenCell`, ya que los fantasmas nunca entran ni regresan al interior.
- Verificación con `node --check` y prueba de humo manual dirigida.

**Out of scope (for future specs):**

- Salidas escalonadas por tiempo en especificaciones futuras.
- Cambios en personalidades, objetivos, velocidad, colores, puntuación, vidas o reglas de victoria.
- Persistencia de tiempos o estados de activación entre sesiones.
- Indicadores visuales del temporizador de activación.

## Data model

```js
// Posiciones iniciales exteriores (maze.js)
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' },
  { x: 14, y: 11, kind: 'pinky' },
  { x: 12, y: 11, kind: 'inky' },
  { x: 15, y: 11, kind: 'clyde' },
];

// Retrasos de activación por fantasma (game.js)
const GHOST_RELEASE_DELAYS_MS = {
  blinky: 0,
  pinky: 2000,
  inky: 4000,
  clyde: 6000,
};

// Estado de cada fantasma (game.js)
ghost: {
  x,
  y,
  dir,
  speed: 0.1,
  kind,
  inPen: false,
  releaseDelayMs,
  active: false,
}

// Estado de la ronda (game.js)
game: {
  ...,
  roundStartedAtMs: 0,
}
```

Convenciones:

- `releaseDelayMs` es el tiempo en milisegundos que el fantasma espera antes de activarse.
- `active` indica si el fantasma ya comenzó a moverse.
- `roundStartedAtMs` es la marca temporal del inicio de la ronda actual.

## Implementation plan

1. Actualizar `GHOST_STARTS` en `src/js/maze.js` para que las cuatro posiciones sean exteriores: `(13,11)`, `(14,11)`, `(12,11)`, `(15,11)`.
2. Añadir `GHOST_RELEASE_DELAYS_MS` en `src/js/game.js` con los valores `0`, `2000`, `4000`, `6000`.
3. Añadir `releaseDelayMs` y `active` al estado de cada fantasma en `createGame()` dentro de `src/js/game.js`, inicializando `inPen: false` y `active: false` para todos.
4. Añadir `roundStartedAtMs: performance.now()` al objeto retornado por `createGame()`.
5. Modificar `canMove` en `src/js/game.js` para que el valor `3` bloquee también a los fantasmas (además de a Pac-Man).
6. Eliminar la lógica de salida BFS del corral en `moveGhost` (bloque `if (g.inPen)`). Los fantasmas solo se mueven mediante `decideGhost` cuando `g.active` es `true`.
7. Eliminar el bloqueo de reentrada al corral en `decideGhost` (condición `if (!g.inPen)` con `isPenCell`). La puerta ya está bloqueada por `canMove`.
8. Eliminar la función `isPenCell` de `src/js/game.js` ya que no se usa.
9. Añadir en `update` una verificación antes de mover cada fantasma: si `!g.active`, comprobar si `performance.now() - game.roundStartedAtMs >= g.releaseDelayMs`; si es así, marcar `g.active = true`.
10. Modificar `resetPositions` en `src/js/game.js` para restaurar `inPen: false`, `active: false` y `roundStartedAtMs: performance.now()` junto con las posiciones exteriores.
11. Ejecutar `node --check src/js/maze.js` y `node --check src/js/game.js`.
12. Realizar prueba de humo dirigida: inicio, controles, puntos, colisión, pérdida de vida y reinicio, túnel, cuatro colores, cuatro fantasmas fuera del corral y activación escalonada.

## Acceptance criteria

- [ ] Los cuatro fantasmas comienzan en celdas exteriores distintas.
- [ ] Blinky se mueve desde el inicio de la ronda.
- [ ] Pinky se activa a los 2 segundos.
- [ ] Inky se activa a los 4 segundos.
- [ ] Clyde se activa a los 6 segundos.
- [ ] Durante la espera, los fantasmas son visibles e inmóviles.
- [ ] Un fantasma inmóvil pero esperando puede quitar vida si Pac umiejętm lo toca.
- [ ] Tras perder una vida, todos vuelven a sus posiciones exteriores y la secuencia se reinicia.
- [ ] Ningún fantasma puede pisar la puerta del corral (valor `3`).
- [ ] `inPen` es `false` para todos los fantasmas al inicio y al reiniciar.
- [ ] Las personalidades, objetivos, velocidad, colores, puntuación, vidas y victoria no cambian.
- [ ] Los archivos modificados pasan `node --check`.
- [ ] La prueba de humo dirigida confirma la activación escalonada y el reinicio de posiciones.

## Decisions

- **Yes:** Aparición exterior en celdas distintas para evitar superposición y atrapamiento.
- **Yes:** Activación escalonada a 0/2/4/6 s con tiempo real (`performance.now()`).
- **Yes:** Fantasmas visibles, inmóviles y peligrosos durante la espera.
- **Yes:** Reinicio completo de posiciones y tiempos al perder una vida.
- **Yes:** Puerta del corral bloqueada para fantasmas en `canMove`, misma regla que Pac-Man.
- **Yes:** Conservar `inPen = false` para mantener la estructura existente sin lógica de salida.
- **Yes:** Eliminar `isPenCell` y la lógica de salida BFS, ya que no se usan.
- **No:** No usar间隔 basado en fotogramas; se usa tiempo real para independizar de la tasa de refresco.
- **No:** No incluir indicadores visuales del temporizador.
- **No:** No persistir estados de activación entre sesiones.
- **No:** No modificar personalidades, velocidades ni reglas de puntuación.

## Risks

| Riesgo                                                                     | Mitigación                                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `performance.now()` puede no estar disponible en navegadores antiguos      | Todos los navegadores modernos lo soportan; el juego ya requiere canvas y requestAnimationFrame    |
| La activación escalonada puede parecer lenta para jugadores experimentados | Los 6 segundos total son aceptables para una partida de Pac-Man; puede ajustarse en un futuro spec |

## What is **not** in this spec

- Salidas escalonadas o restricciones de spawn por tiempo en futuras especificaciones.
- Cambios en personalidades, objetivos, velocidad, colores o reglas de juego.
- Persistencia de tiempos o estados de activación.
- Indicadores visuales del temporizador de activación.
- Modo de vulnerabilidad, ojos o regreso al corral.
