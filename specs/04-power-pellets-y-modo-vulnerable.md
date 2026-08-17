# SPEC 04 — Power pellets y modo vulnerable

> **Status:** Approved
> **Depends on:** SPEC 03
> **Date:** 2026-08-17
> **Objective:** Añadir cuatro power pellets clásicos que otorguen 50 puntos y activen durante 6 segundos un modo vulnerable con fantasmas comestibles, puntuación encadenada y retorno al corral.

## Scope

**In:**

- Reemplazar los puntos de `(1,3)`, `(26,3)`, `(1,23)` y `(26,23)` por power pellets.
- Representarlos con el carácter `o` en `MAZE_STR` y el valor `4` en `game.grid`.
- Dibujarlos con el color actual de los puntos y un radio pulsante de 4 a 7 px en ciclos de 1 segundo.
- Conceder 50 puntos y reducir `dotsRemaining` al consumir cada pellet.
- Mantener consumidos los pellets después de perder una vida.
- Restaurarlos únicamente al iniciar o reiniciar una partida.
- Activar durante 6000 ms a los fantasmas que tengan `active = true` e `inPen = false`.
- Medir el efecto con `performance.now()`, incluido el tiempo en segundo plano.
- Reiniciar duración, cadena de puntos y dirección al consumir otro pellet.
- Mover los fantasmas vulnerables a velocidad `0.05`.
- Elegir rutas vulnerables mediante `Math.random()`, sin reversa salvo en callejones.
- Dibujar los fantasmas vulnerables en `#2121de`.
- Alternar azul y blanco cada 250 ms durante los últimos 2000 ms.
- Puntuar fantasmas comidos con la secuencia `200`, `400`, `800` y `1600`.
- Dibujar como ojos al fantasma comido y hacerlo regresar a `(13,14)` a velocidad `0.2`.
- Permitir que los ojos atraviesen la puerta y sean inofensivos.
- Recuperar el cuerpo en `(13,14)` y comenzar inmediatamente la salida normal.
- Mantener normal al fantasma recuperado aunque continúe el efecto actual.
- Cancelar vulnerabilidad y cadena al perder una vida.
- Modificar únicamente `src/js/maze.js`, `src/js/game.js` y `src/js/render.js`.

**Out of scope (for future specs):**

- Sonido o nuevos recursos.
- Persistencia entre sesiones.
- Nuevos controles, HTML o CSS.
- Power pellets en otras posiciones.
- Cambios permanentes en personalidades o velocidades normales.
- Vulnerabilidad para fantasmas que esperan o salen del corral.
- Incorporar al efecto vigente un fantasma que termine de salir después de consumir el pellet.
- Nuevos niveles o variaciones de duración.

## Data model

```js
// maze.js
// 'o' se parsea como 4.

// game.js
game: {
  frightenedUntilMs: 0,
  ghostEatStreak: 0,
}

ghost: {
  // Campos existentes...
  mode: 'normal', // 'normal' | 'frightened' | 'eyes'
}
```

Convenciones:

- `frightenedUntilMs = 0` indica que no hay un efecto temporal vigente.
- `ghostEatStreak` contiene la cantidad de fantasmas comidos desde el último power pellet.
- `mode = 'frightened'` se asigna únicamente a fantasmas elegibles al consumir el pellet.
- `mode = 'eyes'` permite atravesar la puerta, ignora colisiones y termina en `(13,14)`.
- `dotsRemaining` cuenta puntos normales y power pellets.

## Implementation plan

1. Añadir el carácter `o`, el valor `4` y las cuatro posiciones clásicas en `src/js/maze.js`.
2. Extender `drawDots()` en `src/js/render.js` para dibujar los pellets con el pulso de 1 segundo.
3. Incorporar en `src/js/game.js` la recolección de pellets, sus 50 puntos y su participación en `dotsRemaining`.
4. Añadir `frightenedUntilMs`, `ghostEatStreak` y `mode`, junto con la activación, reversa y expiración inmediata del efecto.
5. Implementar el movimiento vulnerable aleatorio sin reversa y su velocidad `0.05`.
6. Resolver colisiones vulnerables con la secuencia `200/400/800/1600` y transición a `mode = 'eyes'`.
7. Implementar el regreso de los ojos a `(13,14)`, su velocidad `0.2`, recuperación y salida inmediata.
8. Dibujar los estados vulnerable, parpadeante y ojos en `src/js/render.js`.
9. Integrar la cancelación del efecto y restauración de modos en `resetPositions()` sin restaurar coleccionables.

## Acceptance criteria

- [ ] Hay power pellets en `(1,3)`, `(26,3)`, `(1,23)` y `(26,23)`.
- [ ] Cada pellet usa el valor `4` y reemplaza un punto normal.
- [ ] El radio visible varía entre 4 y 7 px en ciclos de 1 segundo.
- [ ] Consumir un pellet concede exactamente 50 puntos.
- [ ] Los pellets cuentan para la condición de victoria.
- [ ] Un pellet consumido permanece ausente después de perder una vida.
- [ ] Una partida nueva restaura los cuatro pellets.
- [ ] El efecto dura 6000 ms de tiempo real.
- [ ] Solo los fantasmas activos y fuera del corral se vuelven vulnerables.
- [ ] Cada fantasma afectado invierte su dirección.
- [ ] Otro pellet reinicia tiempo, cadena y dirección.
- [ ] Los fantasmas vulnerables usan velocidad `0.05`.
- [ ] En intersecciones eligen una salida aleatoria sin reversa, salvo en callejones.
- [ ] Durante los primeros 4 segundos se dibujan en `#2121de`.
- [ ] Durante los últimos 2 segundos alternan azul y blanco cada 250 ms.
- [ ] Al vencer el tiempo vuelven a ser peligrosos antes de evaluar colisiones.
- [ ] Los fantasmas comidos conceden `200`, `400`, `800` y `1600` puntos.
- [ ] Un fantasma comido se representa únicamente mediante sus ojos.
- [ ] Los ojos se mueven a velocidad `0.2`, atraviesan la puerta y no afectan a Pac-Man.
- [ ] Los ojos regresan a `(13,14)` y el fantasma inicia inmediatamente su salida normal.
- [ ] El fantasma recuperado no adopta el tiempo restante del pellet vigente.
- [ ] Un fantasma que sale durante el efecto sin haber sido afectado permanece peligroso.
- [ ] Perder una vida cancela el temporizador, la cadena y los modos especiales.
- [ ] Se conservan salida escalonada, personalidades, túnel, vidas y reglas de victoria.
- [ ] Los tres archivos modificados pasan `node --check`.
- [ ] La prueba de humo cubre el flujo obligatorio y todos los estados del power pellet.

## Decisions

- **Yes:** Usar las cuatro posiciones clásicas.
- **Yes:** Representar el pellet mediante `o` y el valor `4`.
- **Yes:** Conceder 50 puntos y contar los pellets para la victoria.
- **Yes:** Usar `mode` en lugar de booleanos superpuestos.
- **Yes:** Medir los 6 segundos con `performance.now()`.
- **Yes:** Aplicar vulnerabilidad solo a fantasmas activos fuera del corral.
- **Yes:** Reiniciar efecto, cadena y dirección con cada pellet.
- **Yes:** Usar movimiento aleatorio sin reversa.
- **Yes:** Implementar ojos que regresan al corral.
- **No:** No restaurar pellets al perder una vida.
- **No:** No afectar retroactivamente a fantasmas que salgan durante el efecto.
- **No:** No añadir audio, persistencia, controles ni estilos.

## Risks

| Riesgo                                      | Mitigación                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Conflictos entre `mode`, `active` e `inPen` | Definir transiciones explícitas y conservar una sola fuente de verdad para el modo. |
| Colisión justo al vencer el temporizador    | Expirar el modo antes de evaluar colisiones.                                        |
| Los ojos quedan bloqueados por la puerta    | Permitir la puerta expresamente cuando `mode === 'eyes'`.                           |
| `dotsRemaining` no incluye pellets          | Contar valores `2` y `4` al crear la partida.                                       |
| Movimiento aleatorio difícil de reproducir  | Verificar reglas invariantes: transitabilidad, velocidad y prohibición de reversa.  |

## What is **not** in this spec

- Audio.
- Persistencia.
- Nuevos controles o estilos.
- Power pellets adicionales.
- Nuevos niveles.
- Cambios permanentes en el comportamiento normal de los fantasmas.
