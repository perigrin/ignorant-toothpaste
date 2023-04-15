const GetDiceRoll = (i) => Math.floor(Math.random() * i) + 1;
const GetMultiDiceRoll = (n, d) => [(0).n].map((_) => GetDiceRoll(d));
const GetRandomBetween = (l, h) => GetDiceRoll(h - l) + h;

// simple manhattan distance
const MDistance = (here, there) =>
  Math.abs(here.x - there.x) + Math.abs(here.y - there.y);

const EqualPositions = (n, o) => n.x === o.x && n.y === o.y;

class Tile {
  static WallTile(x, y, c = "#", b = true) {
    return new Tile("wall", x, y, c, b);
  }

  constructor(type, x, y, char, blocked) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.char = char;
    this.blocked = blocked;
    this.seen = false;
    this.color = "grey";
  }

  position() {
    return { x: this.x, y: this.y };
  }

  is_wall() {
    return this.type === "wall";
  }

  convertToFloor() {
    this.type = "floor";
    this.char = " ";
    this.blocked = false;
  }

  distance(that) {
    return MDistance(this, that);
  }
}

class Room {
  constructor(x, y, h, w) {
    this.x = x;
    this.y = y;
    this.h = h;
    this.w = w;
  }

  center() {
    return {
      x: Math.round(this.x + this.w / 2),
      y: Math.round(this.y + this.h / 2),
    };
  }

  intersects(that) {
    if (
      this.x + this.w < that.x ||
      that.x + that.w < this.x ||
      this.y + this.h < that.y ||
      that.y + that.h < this.y
    )
      return false;

    return true;
  }
}

class GameMap {
  levels = [];
  constructor(width, height, tileSize = 10) {
    this.tileSize = tileSize;
    this.levels.push(new SimpleLevelBuilder(width, height).level);
  }

  #level = 0;
  currentLevel() {
    return this.levels[this.#level];
  }
}

class SimpleLevelBuilder {
  rooms = [];
  constructor(width, height) {
    this.level = new Level(width, height);

    for (let y = 0; y <= height; y++) {
      for (let x = 0; x <= width; x++) {
        if (this.level.inBounds(x, y)) {
          const i = this.level.getIndexFromXY(x, y);
          this.level.tiles[i] = Tile.WallTile(x, y);
        }
      }
    }

    this.createLevel();

    this.level.entrance = { ...this.rooms[0].center(), level: this.level };
    this.level.spawn_points = this.rooms
      .filter((_, i) => i !== 0)
      .map((r) => r.center());
  }

  createLevel() {
    const MIN_SIZE = 3;
    const MAX_SIZE = 10;
    const MAX_ROOMS = 1;
    const level = this.level;

    for (let idx = 0; idx < MAX_ROOMS; idx++) {
      const w = GetRandomBetween(MIN_SIZE, MAX_SIZE);
      const h = GetRandomBetween(MIN_SIZE, MAX_SIZE);
      const x = GetDiceRoll(level.width - w - 1);
      const y = GetDiceRoll(level.height - h - 1);

      const new_room = new Room(x, y, h, w);

      if (!level.inBounds(x, y)) continue;

      if (this.rooms.some((r) => r.intersects(new_room))) continue;

      if (this.rooms.length != 0) {
        const last_room = this.rooms[this.rooms.length - 1];
        this.connectRooms(last_room, new_room);
      }

      this.addRoom(new_room);
    }
  }

  addRoom(r) {
    this.rooms.push(r);
    for (let x = 0; x <= r.w; x++) {
      for (let y = 0; y <= r.h; y++) {
        const i = this.level.getIndexFromXY(r.x + x, r.y + y);
        console.log({ x: r.x + x, y: r.y + y }, "tile");
        this.level.tiles[i].convertToFloor();
      }
    }
  }

  createHorizontalTunnel(x1, x2, y) {
    for (let x = Math.min(x1, x2); x < Math.max(x1, x2) + 1; x++) {
      if (this.level.inBounds(x, y))
        this.level.tiles[this.level.getIndexFromXY(x, y)].convertToFloor();
    }
  }

  createVerticalTunnel(y1, y2, x) {
    for (let y = Math.min(y1, y2); y < Math.max(y1, y2) + 1; y++) {
      if (this.level.inBounds(x, y))
        this.level.tiles[this.level.getIndexFromXY(x, y)].convertToFloor();
    }
  }

  connectRooms(r1, r2) {
    const c1 = r1.center();
    const c2 = r2.center();

    const coin = GetDiceRoll(2);
    if (coin == 2) {
      this.createHorizontalTunnel(c1.x, c2.x, c1.y);
      this.createVerticalTunnel(c1.y, c2.y, c2.x);
    } else {
      this.createHorizontalTunnel(c1.x, c2.x, c2.y);
      this.createVerticalTunnel(c1.y, c2.y, c1.x);
    }
  }
}

class Level {
  tiles = [];

  constructor(width, height) {
    this.height = height;
    this.width = width;
    this.tiles = new Array(height * width);
  }

  getIndexFromXY(x, y) {
    return y * this.width + x;
  }

  getIndexFromPoint({ x, y }) {
    return this.getIndexFromXY(x, y);
  }

  getTile(x, y) {
    return this.tiles[this.getIndexFromXY(x, y)];
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  blockTile(p) {
    this.tiles[this.getIndexFromPoint(p)].blocked = true;
  }
  unblockTile(p) {
    this.tiles[this.getIndexFromPoint(p)].blocked = false;
  }

  getTilesNear(p) {
    return [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ].map((n) => this.getTile(p.x + n[0], p.y + n[1]));
  }
}

class Component {}

class System {
  entities = [];
  ecs = false;

  constructor(game) {
    this.game = game;
  }
  update() {}
  add(e) {
    this.entities.push(e);
  }
  remove(en) {
    this.entities = this.entities.filter((e) => e != en);
  }
}

class ComponentContainer {
  containers = {};

  add(c) {
    this.containers[c.constructor.name] = c;
  }
  has(Class) {
    if (this.containers[Class.constructor.name] !== undefined) return true;
    return Object.values(this.containers).some((c) => c instanceof Class);
  }
  has_all(comps) {
    return comps.every((C) => this.has(C));
  }
  get(Class) {
    if (this.containers[Class.constructor.name] !== undefined)
      return this.containers[Class];
    return Object.values(this.containers).find((c) => c instanceof Class);
  }
  remove(Class) {
    delete this.containers[Class.constructor.name];
  }
}

class ECS {
  systems = [];
  entities_to_destroy = [];
  entities = {};

  add_entity() {
    const e = Object.keys(this.entities).length;
    this.entities[e] = new ComponentContainer();
    return e;
  }

  remove_entity(e) {
    delete this.entities[e];
  }
  get_components(e) {
    return this.entities[e];
  }
  add_component(e, c) {
    this.entities[e].add(c);
    this.checkE(e);
  }

  remove_component(e, c) {
    this.entities[e].remove(c);
    this.checkE(e);
  }

  find_entity(f) {
    return Object.keys(this.entities).find((e) => f(this.get_components(e)));
  }

  get_all_components(c) {
    return Object.values(this.entities).filter((comp) => comp.has(c));
  }

  add_system(s) {
    s.ecs = this;
    this.systems.push(s);
    Object.keys(this.entities).forEach((e) => this.checkES(e, s));
  }

  remove_system(sys) {
    this.systems = this.systems.filter((s) => s != sys);
  }

  update() {
    this.systems.forEach((s) => s.update());
    this.entities_to_destroy.forEach((e) => this.destroy_entity(e));
  }

  destroy_entity(e) {
    this.systems.forEach((s) => s.remove(e));
    this.remove_entity(e);
  }

  checkE(e) {
    this.systems.forEach((s) => this.checkES(e, s));
  }

  checkES(e, s) {
    const ec = this.entities[e];
    ec.has_all(s.components_required) ? s.add(e) : s.remove(e);
  }
}

class Actor extends Component {
  static StatsRoll = () => {
    // [lowest 2 8d10]/2 + 3
    const rolls = GetMultiDiceRoll(8, 10)
      .sort((a, b) => a < b)
      .slice(0, 2)
      .reduce((a, v) => a + v);
    return Math.round(rolls / 2) + 3;
  };

  static stat_names = ["strength", "endurance", "agility", "luck"]; // don't need SPECIAL yet

  color = "silver";
  constructor() {
    super();
    Actor.stat_names.forEach((a) => (this[a] = Actor.StatsRoll()));
  }

  max_health() {
    return this.endurance + this.luck;
  }
}

// TODO differentiate stats between Players and Monsters
class Player extends Actor {
  char = "@";

  max_health() {
    return (this.endurance + this.luck) * 2; // double the health for now
  }
}
class Monster extends Actor {
  char = "m";
} // TODO different monsters

class ActionQueue extends Component {
  nextAction = false;
}

class Position extends Component {
  constructor({ x = 0, y = 0, level }) {
    super();
    this.x = x;
    this.y = y;
    this.level = level;
    this.block();
  }

  block() {
    this.level.blockTile(this);
  }
  unblock() {
    this.level.unblockTile(this);
  }

  move(dx, dy) {
    console.log(this, "pre-move");
    this.unblock();
    this.x += dx;
    this.y += dy;
    this.block();
    console.log(this, "post-move");
  }
}

class Health extends Component {
  constructor(health) {
    super();
    this.current_health = health;
  }
}

class Viewshed extends Component {
  visible_tiles = [];
  dirty = true;
  constructor(r = 8) {
    super(r);
    this.range = r;
  }

  visible(idx) {
    return this.visible_tiles.find((i) => i === idx);
  }
}

class AStar {
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

class VisibilitySystem extends System {
  components_required = [Position, Viewshed];

  constructor(g) {
    super(g);
    this.level = g.map.currentLevel();
    this.player = g.player;
  }

  static fov(p, r, l) {
    const indexes = [l.getIndexFromPoint(p)];
    for (let y = p.y - r; y < p.y + r; y++) {
      for (let x = p.x - r; x < p.x + r; x++) {
        if (!l.inBounds(x, y)) continue;

        indexes.push(l.getIndexFromXY(x, y));
      }
    }
    return indexes;
  }

  update() {
    const { ecs, entities, level } = this;

    entities.forEach((e) => {
      const pos = ecs.get_components(e).get(Position);
      const v = ecs.get_components(e).get(Viewshed);
      if (!v.dirty) return; // if no viewshed change, don't update

      const level = this.level;
      v.visible_tiles = VisibilitySystem.fov(
        { x: pos.x, y: pos.y },
        v.range,
        level
      );
      // update what the player can see
      if (e == this.player) {
        v.visible_tiles
          .filter((i) => level.tiles[i])
          .forEach((i) => (level.tiles[i].seen = true));
        v.dirty = false;
      }
    });
  }
}

class Action {
  constructor(g, e) {
    this.game = g;
    this.entity = e;
  }
  perform() {}
}

class MovementAction extends Action {
  constructor(g, e, dx, dy) {
    super(g, e);
    this.dx = dx;
    this.dy = dy;
  }
  perform() {
    const { entity, dx, dy } = this;
    const { ecs, map } = this.game;
    const pos = ecs.get_components(entity).get(Position);
    const l = map.currentLevel();

    if (!l.inBounds(pos.x + dx, pos.y + dy)) return;
    const tile = l.getTile(pos.x + dx, pos.y + dy);
    console.log(pos, { x: pos.x + dx, y: pos.y + dy }, tile, "move");
    if (tile.blocked) {
      // get monster at that position:
      const monster = this.game.ecs.find_entity((e) =>
        EqualPositions(e.get(Position), tile)
      );
      if (monster) {
        return new MeleeAttack(this.game, this.entity, monster);
      }
      return; // nothing to attack but we can't move there so  ... "bump"
    } else {
      pos.move(dx, dy);
      ecs.get_components(entity).get(Viewshed).dirty = true;
    }
  }
}

class MeleeAttack extends Action {
  constructor(g, e, d) {
    super(g, e);
    this.defender = d;
  }

  #actors() {
    const a = this.game.ecs.get_components(this.entity).get(Actor);
    const d = this.game.ecs.get_components(this.defender).get(Actor);
    return { a, d };
  }

  #check_for_hit() {
    const { a, d } = this.#actors();
    // TODO replace raw agility with derived attack/dodge stats
    return GetMultiDiceRoll(a.agility, 10) > GetMultiDiceRoll(d.agility, 10);
  }

  #calculate_damage() {
    const { a, d } = this.#actors();
    // TODO replace raw strenght with a derived damage roll stat
    return Math.abs(
      GetMultiDiceRoll(a.strength, 10) - GetMultiDiceRoll(d.endurance, 10)
    );
  }

  perform() {
    if (!this.#check_for_hit()) return; // no hit no combat
    const { a, d } = this.#actors();
    const damage = this.#calculate_damage();
    Game.log(`${a.char} hits ${d.char} for ${damage} points of damage`);
    const h = this.game.ecs.get_components(this.defender).get(Health);
    if (this.defender != this.game.player) h.current_health -= damage;
    Game.log(`${d.char} is at ${h.current_health} health`);
  }
}

class MonsterAISystem extends System {
  components_required = [Monster];

  constructor(g) {
    super();
    this.game = g;
  }

  update() {
    const { game, entities, ecs } = this;
    const { map } = game;
    const level = map.currentLevel();
    const p_pos = ecs.get_components(game.player).get(Position);
    entities.forEach((e) => {
      const move = (dx, dy) => new MovementAction(game, e, dx, dy);
      const cs = ecs.get_components(e);
      const v = cs.get(Viewshed);
      const q = cs.get(ActionQueue);
      const p = cs.get(Position);
      if (v.visible(level.getIndexFromPoint(p_pos))) {
        const path = AStar.get_path(level, p, p_pos);
        if (path.length > 1) {
          q.nextAction = move(path[1].x - p.x, path[1].y - p.y);
        }
      }
    });
  }
}

class SamsaraSystem extends System {
  components_required = [Health, Actor, Position];

  update() {
    const { game, ecs, entities } = this;
    console.log("Checking for death and rebirth");
    entities.forEach((e) => {
      const cs = ecs.get_components(e);
      const h = cs.get(Health);
      const a = cs.get(Actor);
      if (h.current_health <= 0) {
        Game.log(`${a.char} has died`);
        if (a instanceof Player) Game.log("Game Over."); // TODO respawn player
        if (a instanceof Monster)
          console.log("I should probably spawn another monster"); // TODO respawn monster
        const p = cs.get(Position);
        p.unblock(); // unblock the position
        ecs.destroy_entity(e);
      }
    });
  }
} // handle death and rebirth

class Camera {
  SHOW_BOUNDARIES = true;
  constructor(g, width, height) {
    this.x_chars = width;
    this.y_chars = height;
    this.center = {
      x: Math.round(this.x_chars / 2),
      y: Math.round(this.y_chars / 2),
    };
    this.game = g;
  }

  update(p) {
    const min = { x: p.x - this.center.x, y: p.y - this.center.y };
    const max = { x: min.x + this.x_chars, y: min.y + this.y_chars };
    return [min, max];
  }
}

class Game {
  ecs = new ECS();
  map = new GameMap(40, 40);

  static log(message) {
    const p = document.createElement("p");
    p.textContent = message;
    document.querySelector("#log").prepend(p);
  }

  #initCanvas() {
    const canvas = document.querySelector("#game");
    const ctx = canvas.getContext("2d");

    ctx.font = this.map.tileSize + "px monospace";

    this.ctx = ctx;
    this.canvas = canvas;
    this.camera = new Camera(
      this,
      Math.round(canvas.width / this.map.tileSize),
      Math.round(canvas.height / this.map.tileSize)
    );
  }

  #init_actor(actor, position) {
    const e = this.ecs.add_entity();
    this.ecs.add_component(e, actor);
    this.ecs.add_component(e, new Health(actor.max_health()));
    this.ecs.add_component(e, position);
    this.ecs.add_component(e, new Viewshed());
    this.ecs.add_component(e, new ActionQueue());
    return e;
  }

  #initPlayer() {
    const level = this.map.currentLevel();
    this.player = this.#init_actor(new Player(), new Position(level.entrance));
  }

  spawn_monster(level, p) {
    this.#init_actor(new Monster(), new Position({ ...p, level }));
  }

  #initMonsters() {
    const level = this.map.currentLevel();
    level.spawn_points.forEach((p) => this.spawn_monster(level, p));
  }

  #initSystems() {
    this.ecs.add_system(new VisibilitySystem(this));
    this.ecs.add_system(new MonsterAISystem(this));
    this.ecs.add_system(new SamsaraSystem(this));
  }

  #initKeymap() {
    const move = (dx, dy) => new MovementAction(this, this.player, dx, dy);
    this.keymap = {
      KeyH: move(-1, 0),
      KeyJ: move(0, 1),
      KeyK: move(0, -1),
      KeyL: move(1, 0),
      ArrowLeft: move(-1, 0),
      ArrowRight: move(1, 0),
      ArrowDown: move(0, 1),
      ArrowUp: move(0, -1),
    };
  }

  constructor() {
    this.#initCanvas();
    this.#initPlayer();
    this.#initMonsters();
    this.#initSystems();
    this.#initKeymap();
  }

  handleInput(e) {
    const player = this.ecs.get_components(this.player).get(ActionQueue);
    player.nextAction = this.keymap[e.code] || new Action(this);
  }

  #draw_map() {
    const { map, ecs, ctx, camera } = this;
    const level = map.currentLevel();
    const p = ecs.get_components(g.player).get(Position);
    const [min, max] = camera.update(p);
    for (let [ty, y] = [min.y, 0]; ty <= max.y; ty++ && y++) {
      for (let [tx, x] = [min.x, 0]; tx <= max.x; tx++ && x++) {
        if (level.inBounds(tx, ty)) {
          const t = level.getTile(tx, ty);
          ctx.fillStyle = t.color;
          ctx.fillText(
            t.char,
            x * map.tileSize,
            y * map.tileSize,
            map.tileSize
          );
        } else if (camera.SHOW_BOUNDARIES) {
          ctx.fillStyle = "red";
          ctx.fillText("x", x * map.tileSize, y * map.tileSize, map.tileSize);
        }
      }
    }
  }

  #draw_actors() {
    const { ecs, map, ctx } = this;
    const level = map.currentLevel();
    const pv = ecs.get_components(this.player).get(Viewshed);
    ecs
      .get_all_components(Actor) // for now, all Actors are renderable
      .filter((c) => c.has(Position))
      .map((c) => ({ a: c.get(Actor), pos: c.get(Position) }))
      .filter((p) => pv.visible(level.getIndexFromPoint(p.pos)))
      .forEach(({ a, pos }) => {
        const [min] = this.camera.update(pos);
        const x = pos.x - min.x;
        const y = pos.y - min.y;
        if (level.inBounds(x, y)) {
          ctx.fillStyle = a.color;
          ctx.fillText(a.char, x * map.tileSize, y * map.tileSize);
        }
      });
  }

  #clear_canvas() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  draw() {
    this.#clear_canvas();
    this.#draw_map();
    this.#draw_actors();
  }

  turn = 0;
  update() {
    const actors = this.ecs
      .get_all_components(Actor)
      .filter((a) => a.has(ActionQueue));

    let q = actors[this.turn % actors.length].get(ActionQueue);
    //TODO implement energy based action activation
    while (q.nextAction) {
      q.nextAction = q.nextAction.perform();
    }
    this.turn++;
    this.ecs.update();
    this.draw();
  }
}
