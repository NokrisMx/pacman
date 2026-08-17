// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const FRIGHTENED_SPEED = 0.05; // 1/20 celda/frame

const GHOST_RELEASE_DELAYS_MS = {
  blinky: 0,
  pinky: 2000,
  inky: 4000,
  clyde: 6000,
};

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 || v === 4 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    frightenedUntilMs: 0,
    ghostEatStreak: 0,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      inPen: g.kind !== 'blinky',
      releaseDelayMs: GHOST_RELEASE_DELAYS_MS[ g.kind ],
      active: false,
      mode: 'normal',
    } ) ),
    roundStartedAtMs: performance.now(),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado por pared (1); puerta (3) solo si inPen es false
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  if ( v === 3 && typeof actor === 'object' && !actor.inPen ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function bfsFirstStep( grid, fromX, fromY, targetX, targetY, inPen ) {
  const width = grid[ 0 ].length;
  const height = grid.length;

  function neighbors( x, y ) {
    const dirs = [ 'up', 'left', 'down', 'right' ];
    const result = [];
    for ( const dir of dirs ) {
      const d = DIRS[ dir ];
      let nx = x + d.x;
      let ny = y + d.y;
      // Tunel fila 14
      if ( ny === TUNNEL_ROW ) {
        if ( nx < 0 ) nx += width;
        else if ( nx >= width ) nx -= width;
      }
      if ( ny < 0 || ny >= height || nx < 0 || nx >= width ) continue;
      if ( grid[ ny ][ nx ] === 1 ) continue;
      if ( grid[ ny ][ nx ] === 3 && !inPen ) continue;
      result.push( { nx, ny, dir } );
    }
    return result;
  }

  const key = ( x, y ) => `${x},${y}`;
  const visited = new Set();
  const queue = [ { x: fromX, y: fromY, firstDir: null } ];
  visited.add( key( fromX, fromY ) );

  while ( queue.length ) {
    const { x, y, firstDir } = queue.shift();
    if ( x === targetX && y === targetY ) return firstDir;

    for ( const { nx, ny, dir } of neighbors( x, y ) ) {
      const k = key( nx, ny );
      if ( visited.has( k ) ) continue;
      visited.add( k );
      queue.push( { x: nx, y: ny, firstDir: firstDir || dir } );
    }
  }
  return null;
}

function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );
  const blinky = game.ghosts.find( ( gh ) => gh.kind === 'blinky' );
  const bx = Math.round( blinky.x );
  const by = Math.round( blinky.y );

  if ( g.kind === 'blinky' ) {
    return { x: px, y: py };
  }

  if ( g.kind === 'pinky' ) {
    const d = DIRS[ p.dir ];
    return { x: px + d.x * 4, y: py + d.y * 4 };
  }

  if ( g.kind === 'inky' ) {
    const d = DIRS[ p.dir ];
    const aheadX = px + d.x * 2;
    const aheadY = py + d.y * 2;
    return { x: aheadX * 2 - bx, y: aheadY * 2 - by };
  }

  // clyde
  const dx = g.x - px;
  const dy = g.y - py;
  const distSq = dx * dx + dy * dy;
  if ( distSq >= 64 ) return { x: px, y: py };
  return { x: 0, y: 31 };
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet.
    const tile = grid[ p.y ][ p.x ];
    if ( tile === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    } else if ( tile === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 50;
      game.dotsRemaining--;
      // Activar modo vulnerable
      game.frightenedUntilMs = performance.now() + 6000;
      game.ghostEatStreak = 0;
      game.ghosts.forEach( ( g ) => {
        if ( g.active && !g.inPen ) {
          g.mode = 'frightened';
          g.dir = OPPOSITE[ g.dir ];
        }
      } );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter( ( dir ) => {
    if ( dir === OPPOSITE[ g.dir ] ) return false;
    if ( !canMove( grid, g.x, g.y, dir, g ) ) return false;
    return true;
  } );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Modo vulnerable: elegir dirección aleatoria sin reversa
  if ( g.mode === 'frightened' ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  if ( g.kind === 'blinky' ) {
    const target = ghostTarget( game, g );
    const bfsDir = bfsFirstStep( grid, g.x, g.y, target.x, target.y, g.inPen );
    g.dir = bfsDir && choices.includes( bfsDir ) ? bfsDir : choices[ 0 ];
    return;
  }

  const target = ghostTarget( game, g );
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dx = nx - target.x;
    const dy = ny - target.y;
    const dist = dx * dx + dy * dy;
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function bfsDistance( grid, fromX, fromY, targetX, targetY, inPen ) {
  const width = grid[ 0 ].length;
  const height = grid.length;

  function neighbors( x, y ) {
    const dirs = [ 'up', 'left', 'down', 'right' ];
    const result = [];
    for ( const dir of dirs ) {
      const d = DIRS[ dir ];
      let nx = x + d.x;
      let ny = y + d.y;
      if ( ny === TUNNEL_ROW ) {
        if ( nx < 0 ) nx += width;
        else if ( nx >= width ) nx -= width;
      }
      if ( ny < 0 || ny >= height || nx < 0 || nx >= width ) continue;
      if ( grid[ ny ][ nx ] === 1 ) continue;
      if ( grid[ ny ][ nx ] === 3 && !inPen ) continue;
      result.push( { nx, ny } );
    }
    return result;
  }

  const key = ( x, y ) => `${x},${y}`;
  const visited = new Set();
  const queue = [ { x: fromX, y: fromY, dist: 0 } ];
  visited.add( key( fromX, fromY ) );

  while ( queue.length ) {
    const { x, y, dist } = queue.shift();
    if ( x === targetX && y === targetY ) return dist;

    for ( const { nx, ny } of neighbors( x, y ) ) {
      const k = key( nx, ny );
      if ( visited.has( k ) ) continue;
      visited.add( k );
      queue.push( { x: nx, y: ny, dist: dist + 1 } );
    }
  }
  return Infinity;
}

const EXIT_CELLS = [
  { x: 13, y: 11 },
  { x: 14, y: 11 },
];

function chooseExit( grid, fromX, fromY ) {
  let best = EXIT_CELLS[ 0 ];
  let bestDist = Infinity;
  for ( const exit of EXIT_CELLS ) {
    const dist = bfsDistance( grid, fromX, fromY, exit.x, exit.y, true );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = exit;
    }
  }
  return best;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( !g.active ) return;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );

    if ( g.inPen ) {
      const exit = chooseExit( grid, g.x, g.y );
      if ( g.x === exit.x && g.y === exit.y ) {
        g.inPen = false;
      } else {
        g.dir = bfsFirstStep( grid, g.x, g.y, exit.x, exit.y, true );
        if ( !g.dir || !canMove( grid, g.x, g.y, g.dir, g ) ) return;
      }
    } else {
      decideGhost( game, g );
      if ( !canMove( grid, g.x, g.y, g.dir, g ) ) return;
    }
  }

  const speed = g.mode === 'frightened' ? FRIGHTENED_SPEED : g.speed;
  const d = DIRS[ g.dir ];
  g.x += d.x * speed;
  g.y += d.y * speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.inPen = GHOST_STARTS[ i ].kind !== 'blinky';
    g.active = false;
  } );
  game.roundStartedAtMs = performance.now();
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  movePacman( game );
  game.ghosts.forEach( ( g ) => {
    if ( !g.active && performance.now() - game.roundStartedAtMs >= g.releaseDelayMs ) {
      g.active = true;
    }
    moveGhost( game, g );
  } );

  // Expirar modo vulnerable
  const now = performance.now();
  if ( game.frightenedUntilMs > 0 && now >= game.frightenedUntilMs ) {
    game.frightenedUntilMs = 0;
    game.ghosts.forEach( ( g ) => {
      if ( g.mode === 'frightened' ) {
        g.mode = 'normal';
      }
    } );
  }

  for ( const g of game.ghosts ) {
    if ( !collides( game.pacman, g ) ) continue;

    if ( g.mode === 'frightened' ) {
      // Comer fantasma vulnerable
      const points = 200 * Math.pow( 2, game.ghostEatStreak );
      game.score += Math.min( points, 1600 );
      game.ghostEatStreak++;
      g.mode = 'eyes';
    } else if ( g.mode !== 'eyes' ) {
      // Colisión normal: perder vida
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
