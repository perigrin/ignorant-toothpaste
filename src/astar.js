import {MDistance, EqualPositions} from './map.js';

export class AStar {
  static get_path(level, s, e) {
    const start = { position: s, f: 0, g: 0, h: 0 };
    const enp = { position: e, f: 0, g: 0, h: 0 };

    let fringe = [start];
    const closed = {};
    const id = (n) => level.getIndexFromPoint(n.position);

    while (fringe.length) {
      const current = fringe.shift();
      closed[id(current)] = current;

      if (EqualPositions(current.position, enp.position)) {
        const path = [];
        let c = current;
        do {
          path.unshift(c.position);
        } while ((c = c.parent));
        return path;
      }

      const edges = level
        .getTilesNear(current.position)
        .filter((t) => !t.is_wall())
        .map((t) => ({
          parent: current,
          position: t.position(),
          f: 0,
          g: 0,
          h: 0,
        }));

      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        if (closed[id(e)]) continue;

        e.g = current.g + 1;
        e.h = MDistance(e.position, enp.position);
        e.f = e.g + e.h;

        if (fringe.some((n) => e.g > n.g)) continue;
        fringe.push(e);
      }
      fringe.sort((a, b) => a.f < b.f); // keep fringe sorted by f
    }
    return [];
  }
}
