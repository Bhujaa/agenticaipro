// A "perfect" maze (exactly one route between any two cells), built with a
// randomized depth-first backtracker. Because it's a perfect maze, the path
// between the start and goal is unique — that unique path is the puzzle
// the agent network is trying to uncover.

const DIRS = [
  { dx: 0, dy: -1, wall: "N", opp: "S" },
  { dx: 1, dy: 0, wall: "E", opp: "W" },
  { dx: 0, dy: 1, wall: "S", opp: "N" },
  { dx: -1, dy: 0, wall: "W", opp: "E" },
];

export function generateMaze(cols, rows) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      row.push({ x, y, walls: { N: true, E: true, S: true, W: true }, visited: false });
    }
    cells.push(row);
  }

  const start = cells[0][0];
  start.visited = true;
  const stack = [start];

  while (stack.length) {
    const current = stack[stack.length - 1];
    const options = [];
    for (const d of DIRS) {
      const nx = current.x + d.dx, ny = current.y + d.dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !cells[ny][nx].visited) {
        options.push({ cell: cells[ny][nx], dir: d });
      }
    }
    if (!options.length) { stack.pop(); continue; }
    const { cell: next, dir } = options[Math.floor(Math.random() * options.length)];
    current.walls[dir.wall] = false;
    next.walls[dir.opp] = false;
    next.visited = true;
    stack.push(next);
  }

  return { cols, rows, cells };
}

export function shortestPath(maze, [sx, sy], [gx, gy]) {
  const { cols, rows, cells } = maze;
  const key = (x, y) => `${x},${y}`;
  const visited = new Set([key(sx, sy)]);
  const prev = new Map();
  const queue = [[sx, sy]];

  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === gx && y === gy) break;
    const cell = cells[y][x];
    for (const d of DIRS) {
      if (cell.walls[d.wall]) continue;
      const nx = x + d.dx, ny = y + d.dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      visited.add(k);
      prev.set(k, [x, y]);
      queue.push([nx, ny]);
    }
  }

  const path = [[gx, gy]];
  let curKey = key(gx, gy);
  while (curKey !== key(sx, sy)) {
    const p = prev.get(curKey);
    if (!p) break; // unreachable — shouldn't happen in a perfect maze
    path.push(p);
    curKey = key(p[0], p[1]);
  }
  path.reverse();
  return path;
}
