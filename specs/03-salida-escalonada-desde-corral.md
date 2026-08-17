# SPEC 03 — Salida escalonada de fantasmas desde el corral

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-08-17
> **Objective:** Pinky, Inky y Clyde comienzan dentro del corral y salen a los 2, 4 y 6 segundos, mientras Blinky comienza fuera y se activa inmediatamente al inicio de cada ronda.

## Why this spec exists

La SPEC 02 evitó un bloqueo colocando todos los fantasmas fuera del corral. Esta especificación restaura las posiciones interiores y corrige la navegación para permitir únicamente la salida a través de la puerta.

## Scope

**In:**

- Blinky comienza fuera en `(13,11)`.
- Pinky comienza dentro en `(13,14)`.
- Inky comienza dentro en `(12,14)`.
- Clyde comienza dentro en `(15,14)`.
- Se conservan los retrasos de `0`, `2000`, `4000` y `6000` milisegundos.
- Los fantasmas interiores permanecen visibles e inmóviles mientras esperan.
- Al cumplirse su retraso, cada fantasma empieza a recorrer la ruta transitable más corta hasta `(13,11)` o `(14,11)`.
- Los empates entre salidas favorecen `(13,11)`.
- Pinky e Inky salen por `(13,11)` y Clyde por `(14,11)` desde sus posiciones iniciales.
- Los fantasmas pueden atravesar la puerta mientras `inPen` sea `true`.
- Al alinearse en la celda exterior elegida, `inPen` cambia a `false` y el fantasma comienza su comportamiento normal en la siguiente decisión.
- La puerta queda bloqueada para cualquier fantasma que ya haya salido.
- Los fantasmas que están saliendo aplican las reglas normales de colisión.
- Tras perder una vida se restauran posiciones, estados y temporizadores.
- Se conserva el reloj basado en `performance.now()`, incluido el tiempo transcurrido con la pestaña en segundo plano.
- Solo cambian `src/js/maze.js` y `src/js/game.js`.

**Out of scope (for future specs):**

- Cambiar los retrasos de liberación.
- Movimiento de espera dentro del corral.
- Indicadores visuales de los temporizadores.
- Reentrada de fantasmas al corral.
- Persistencia de tiempos o estados entre sesiones.
- Cambios de personalidades, objetivos, velocidades o colores.
- Modos de dispersión, vulnerabilidad, ojos o regreso al corral.
- Cambios de puntuación, vidas, victoria o derrota.

## Data model

Esta funcionalidad no introduce estructuras nuevas. Reutiliza `active`, `inPen`, `releaseDelayMs` y `roundStartedAtMs` de la SPEC 02.

```js
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' },
  { x: 13, y: 14, kind: 'pinky' },
  { x: 12, y: 14, kind: 'inky' },
  { x: 15, y: 14, kind: 'clyde' },
];

ghost: {
  x,
  y,
  dir: 'up',
  speed: 0.1,
  kind,
  inPen: kind !== 'blinky',
  releaseDelayMs: GHOST_RELEASE_DELAYS_MS[ kind ],
  active: false,
}
```

Convenciones:

- `active = false` significa que todavía no se cumplió el retraso.
- Blinky se activa en la primera actualización porque su retraso es `0`.
- `active = true` e `inPen = true` identifica un fantasma recorriendo la salida.
- `active = true` e `inPen = false` identifica un fantasma liberado.
- `roundStartedAtMs` se reinicia al comenzar una partida y después de perder una vida.

## Implementation plan

1. Restaurar en `src/js/maze.js` las posiciones interiores de Pinky, Inky y Clyde, manteniendo a Blinky en `(13,11)`.
2. Inicializar y restaurar `inPen` según la identidad del fantasma en `createGame()` y `resetPositions()`.
3. Hacer que el cálculo de rutas y la validación del movimiento distingan entre un fantasma saliendo y uno liberado.
4. Permitir que las rutas de salida atraviesen las celdas de puerta con valor `3`, manteniéndolas bloqueadas para Pac-Man y para fantasmas liberados.
5. Añadir a `moveGhost()` la fase de salida posterior a la activación, eligiendo la salida con menor distancia de ruta y usando `(13,11)` como desempate.
6. Cambiar `inPen` a `false` cuando el fantasma quede alineado en la celda exterior y continuar con su personalidad normal desde la siguiente decisión.
7. Mantener la activación mediante `performance.now()` y reiniciar la secuencia completa en `resetPositions()`.

## Acceptance criteria

- [ ] Blinky comienza en `(13,11)` con `inPen = false`.
- [ ] Pinky comienza en `(13,14)` con `inPen = true`.
- [ ] Inky comienza en `(12,14)` con `inPen = true`.
- [ ] Clyde comienza en `(15,14)` con `inPen = true`.
- [ ] Blinky se activa en la primera actualización de cada ronda.
- [ ] Pinky permanece inmóvil antes de los 2 segundos.
- [ ] Inky permanece inmóvil antes de los 4 segundos.
- [ ] Clyde permanece inmóvil antes de los 6 segundos.
- [ ] Cada fantasma interior empieza a salir en la primera actualización realizada al cumplirse su retraso.
- [ ] Pinky e Inky alcanzan la calle exterior por `(13,11)`.
- [ ] Clyde alcanza la calle exterior por `(14,11)`.
- [ ] Los fantasmas pueden atravesar la puerta únicamente durante su salida.
- [ ] Al alinearse en la celda exterior, cada fantasma cambia a `inPen = false`.
- [ ] Un fantasma liberado no puede volver a atravesar la puerta.
- [ ] La búsqueda de rutas de un fantasma liberado no utiliza el interior del corral como atajo.
- [ ] Un fantasma que está saliendo puede provocar una colisión normal con Pac-Man.
- [ ] Tras perder una vida se restauran las cuatro posiciones y los tres fantasmas interiores vuelven a esperar.
- [ ] Tras perder una vida los retrasos vuelven a contarse desde cero.
- [ ] El tiempo transcurrido con la pestaña en segundo plano cuenta para la liberación.
- [ ] Se conservan personalidades, objetivos, velocidades, colores, puntuación, vidas y reglas de victoria.
- [ ] `src/js/maze.js` y `src/js/game.js` pasan `node --check`.
- [ ] La prueba de humo confirma inicio y reinicio, cuatro flechas, puntos, colisión, pérdida de vida y reinicio, túnel de la fila 14, salida escalonada y bloqueo de reentrada.

## Decisions

- **Yes:** Restaurar las posiciones interiores definidas originalmente en la SPEC 01.
- **Yes:** Conservar la activación temporal `0/2/4/6 s` de la SPEC 02.
- **Yes:** El retraso indica cuándo empieza la salida, no cuándo debe estar terminada.
- **Yes:** Mantener visibles e inmóviles los fantasmas que esperan.
- **Yes:** Elegir la salida por distancia de ruta transitable, con prioridad para `(13,11)` en caso de empate.
- **Yes:** Permitir la puerta solo durante la fase identificada por `inPen = true`.
- **Yes:** Aplicar colisiones normales durante la salida.
- **Yes:** Reutilizar `active` e `inPen` sin introducir otro estado.
- **Yes:** Reiniciar posiciones y temporizadores tras perder una vida.
- **Yes:** Conservar `performance.now()` y contar el tiempo en segundo plano.
- **No:** No conservar las posiciones exteriores de Pinky, Inky y Clyde establecidas por la SPEC 02.
- **No:** No permitir reentrada o cruces libres por la puerta.
- **No:** No modificar `render.js`, `main.js` ni crear archivos de aplicación.

## Risks

| Riesgo                                                                   | Mitigación                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| La búsqueda de rutas permite la puerta mientras el movimiento la bloquea | Usar la misma regla de transitabilidad en el cálculo de rutas y en el movimiento efectivo. |
| Un fantasma liberado calcula una ruta que atraviesa el corral            | Excluir las celdas de puerta de sus rutas cuando `inPen = false`.                          |
| El fantasma cambia de comportamiento antes de completar la salida        | Mantener la ruta de salida hasta quedar alineado en `(13,11)` o `(14,11)`.                 |
| Una pérdida de vida deja estados o tiempos de la ronda anterior          | Restaurar conjuntamente `active`, `inPen`, posiciones y `roundStartedAtMs`.                |

## What is **not** in this spec

- Reentrada o regreso de fantasmas al corral.
- Movimiento durante la espera.
- Nuevos tiempos o condiciones de liberación.
- Indicadores visuales de espera.
- Persistencia entre sesiones.
- Cambios de personalidades, velocidades, colores o reglas generales del juego.
