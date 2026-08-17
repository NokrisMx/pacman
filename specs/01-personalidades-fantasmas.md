# SPEC 01 — Personalidades de los cuatro fantasmas

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-08-16
> **Objective:** Cuatro fantasmas con identidades y conductas de persecución distintas, incluyendo uno que persigue agresivamente a Pac-Man.

## Why this spec exists

El juego ya resuelve movimiento y colisiones. Esta especificación cambia la cantidad, la identidad, la navegación y la representación de los fantasmas, y añade persecución agresiva mediante BFS.

## Scope

**In:**

- Cuatro fantasmas en vez de dos: Blinky, Pinky, Inky y Clyde.
- Estados iniciales y de reinicio: Blinky en `(13,11)` fuera del corral con `inPen = false`; Pinky en `(13,14)`, Inky en `(12,14)` y Clyde en `(15,14)` dentro del corral con `inPen = true`.
- Salida inmediata desde el corral hacia la calle exterior y bloqueo de reentrada.
- Rutas de persecución deterministas: Blinky usa BFS hasta la celda de Pac-Man; Pinky, Inky y Clyde eligen la salida más cercana a su objetivo y rompen empates con prioridad `arriba -> izquierda -> abajo -> derecha`.
- Objetivos: Blinky = celda más cercana de Pac-Man; Pinky = 4 celdas en la dirección de Pac-Man; Inky = duplicar el vector desde Blinky hasta 2 celdas delante de Pac-Man; Clyde = perseguir si está a 8 o más celdas (distancia euclídea al cuadrado) o ir a `(0, 31)` si está más cerca.
- Distancia usada: euclídea al cuadrado.
- Mantener velocidad común de fantasmas en `0.1` celdas por fotograma.
- Mantener reglas de puntuación, vidas, colisiones, reinicio de posiciones y victoria.
- Asignación de colores por identidad en `render.js`.
- Verificación con `node --check` y prueba de humo manual dirigida.

**Out of scope (for future specs):**

- Modos de dispersión, vulnerabilidad, ojos y regreso al corral.
- Salidas escalonadas o temporizadores de spawn.
- Cambios de velocidad por fantasma o por estado.
- Etiquetas de texto con los nombres de los fantasmas.
- Cambios en puntuación, vidas o reglas de victoria/derrota.

## Data model

```js
// Maze (iniciales de los cuatro fantasmas)
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky' },
  { x: 13, y: 14, kind: 'pinky' },
  { x: 12, y: 14, kind: 'inky' },
  { x: 15, y: 14, kind: 'clyde' },
];

// Estado de cada fantasma
ghost: {
  x,
  y,
  dir,
  speed: 0.1,
  kind,
  inPen,
}
```

Convenciones:

- `inPen` es `true` mientras el fantasma se encuentra dentro del corral y `false` después de salir.
- Los cálculos de objetivo usan `Math.round` en la posición de Pac-Man.
- Blinky calcula su primer paso con BFS sobre el grafo de celdas transitables.

## Implementation plan

1. Actualizar `GHOST_STARTS` en `src/js/maze.js` para incluir los cuatro fantasmas, sus coordenadas y sus `kind`.
2. Añadir `inPen` al estado de cada fantasma en `createGame()` dentro de `src/js/game.js`.
3. Crear una función `bfsFirstStep(grid, fromX, fromY, targetX, targetY)` en `src/js/game.js` que devuelva el primer movimiento hacia la celda destino más corta, usando la conexión del túnel en la fila 14 y sin girar 180 grados salvo en callejón.
4. Extraer una función `ghostTarget(game, g)` en `src/js/game.js` que calcule el objetivo de cada fantasma usando la celda más cercana de Pac-Man, la proyección de 4 celdas de Pinky, el vector duplicado de Inky con Blinky y la regla de umbral de Clyde con distancia euclídea al cuadrado y objetivo `(0, 31)`.
5. Modificar `decideGhost` en `src/js/game.js` para usar `bfsFirstStep` con Blinky y distancia al objetivo para Pinky, Inky y Clyde, siempre aplicando la prioridad `arriba -> izquierda -> abajo -> derecha`.
6. Añadir en `src/js/game.js` una lógica de salida del corral: si `inPen` es `true`, el fantasma calcula un `penExit` en la celda más cercana entre `(13,11)` y `(14,11)` y recorre esa ruta hasta que quede alineado en esa celda, momento en que `inPen` pasa a `false`.
7. Bloquear reentrada al corral: durante el movimiento normal, las decisiones no deben permitir volver a ninguna celda de `inPen` ni cruzar la puerta hacia dentro.
8. Restaurar `inPen` junto con las coordenadas al perder una vida en `resetPositions` en `src/js/game.js`.
9. Cambiar `GHOST_COLORS` en `src/js/render.js` para asignar `#ff0000` a Blinky, `#ffb8ff` a Pinky, `#00ffff` a Inky y `#ffb852` a Clyde a partir del `kind`.
10. Ejecutar `node --check src/js/maze.js`, `node --check src/js/game.js` y `node --check src/js/render.js`.
11. Realizar prueba de humo dirigida: reinicio, controles, puntos, colisión, pérdida de vida, victoria, túnel, cuatro colores visibles y comportamientos esperados.

## Acceptance criteria

- [ ] Hay cuatro fantasmas en el estado y cada uno tiene `kind` único.
- [ ] Blinky comienza fuera del corral con `inPen = false`.
- [ ] Pinky, Inky y Clyde comienzan dentro del corral con `inPen = true`.
- [ ] Al iniciar o reiniciar, Blinky se mueve de inmediato.
- [ ] Los tres fantasmas con `inPen = true` recorren la ruta más corta hacia `(13,11)` o `(14,11)` y abandonan el corral sin volver a entrar.
- [ ] Blinky persigue la celda más cercana de Pac-Man usando BFS.
- [ ] Pinky apunta a 4 celdas en la dirección de Pac-Man desde su celda más cercana.
- [ ] Inky usa el vector desde Blinky hasta 2 celdas delante de Pac-Man y lo duplica.
- [ ] Clyde persigue si la distancia euclídea al cuadrado es mayor o igual a 64 y va a `(0, 31)` si es menor.
- [ ] Las salidas se desempatan con prioridad `arriba -> izquierda -> abajo -> derecha`.
- [ ] Los fantasmas no pueden girar 180 grados salvo en callejón.
- [ ] La conexión del túnel en la fila 14 está disponible para el cálculo de rutas.
- [ ] La velocidad de todos los fantasmas sigue siendo `0.1` celdas por fotograma.
- [ ] Blinky es rojo, Pinky rosa, Inky cian y Clyde naranja durante la partida.
- [ ] Tras una colisión que reste vida, se restauran las posiciones y los valores de `inPen` de todos los fantasmas.
- [ ] Se conservan las reglas de puntuación, vidas, victoria y derrota.
- [ ] Los archivos modificados pasan `node --check`.
- [ ] La prueba de humo dirigida confirma los cuatro colores y al menos un escenario claro por cada personalidad.

## Decisions

- **Yes:** Cuatro fantasmas clásicos simplificadas, no el modelo arcade completo.
- **Yes:** BFS con túnel para Blinky porque se pide persecución agresiva verificable.
- **Yes:** Distancia euclídea al cuadrado para objetivos y umbral de Clyde.
- **Yes:** Meta de salida del corral como `(13,11)` o `(14,11)`.
- **Yes:** No reproducir el desvío histórico al proyectar el objetivo de Pac-Man hacia arriba.
- **Yes:** No mostrar etiquetas de texto con los nombres en pantalla.
- **No:** No incluir dispersión, vulnerabilidad, ojos, regreso al corral, salidas escalonadas, cambios de velocidad ni reglas de vidas o puntuación.

## Risks

| Riesgo                                                                              | Mitigación                                                                                                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Cálculo de Inky requiere la posición de Blinky durante el primer fotograma          | Usar la celda inicial de Blinky en `GHOST_STARTS` y recalcular en cada decisión                                               |
| Blinky puede llegar a `(13,11)` o `(14,11)` y activar una celda interior del corral | Evaluar objetivo de salida por distancia a esas dos metas y permitir la salida sin considerar si la celda pertenece al corral |
| BFS aumenta el coste respecto a decidir solo por salidas legales                    | Se limita a una ejecución por fantasma en intersecciones, mantiene la velocidad común y evita crear caminos completos         |

## What is **not** in this spec

- Modos de comportamiento por tiempo como dispersión o vulnerabilidad.
- Salidas escalonadas o restricciones de spawn por tiempo.
- Ojos, regreso al corral ni interacción especial tras ser comido.
- Cambios de velocidad por fantasma o por situación.
- Etiquetas visibles con los nombres en pantalla.
- Cambios en puntuación, vidas o regla de victoria.
