const GetDiceRoll = (i) => (Math.floor(Math.random() * i)+1);
const GetRandomBetween = (l,h) => (GetDiceRoll(h-l)+h);

const MDistance = (here, there) => // simple manhattan distance
    (Math.abs(here.x - there.x)+Math.abs(here.y-there.y))

class Tile {
	static WallTile(x, y, c='#', b=true) {
		return new Tile('wall', x, y, c, b);
	}

	constructor(type, x, y, char, blocked) {
		this.type = type;
		this.x = x;
		this.y = y;
		this.char = char;
		this.blocked = blocked;
        this.seen = false;
	}

    position() { return {x: this.x, y: this.y} }

    is_wall() { return this.type === 'wall' }

	convertToFloor() {
		this.type = "floor";
		this.char = ' ';
		this.blocked = false;
	}

    distance(that) { return MDistance(this, that) }
}

class Room {

	constructor(x,y,h,w) {
		this.x = x;
		this.y = y;
		this.h = h;
		this.w = w;
	}

	center() {
		return {
			x: Math.round(this.x + (this.w/2)),
			y: Math.round(this.y + (this.h/2)),
		}
	};

	intersects(that) {
		if ((this.x + this.w) < that.x ||
		    (that.x + that.w) < this.x ||
			(this.y + this.h) < that.y ||
		    (that.y + that.h) < this.y  ) return false

		return true;
	}

}

class GameMap {
	tiles = []
	rooms = [];

	constructor(width=80,height=50,tileSize=10) {
		this.height = height;
		this.width = width;
		this.tileSize = tileSize;

		this.forEachTile(
			(i,t,p) => { this.tiles[i] = Tile.WallTile(
				p.x,
				p.y,
			)}
		);
		this.createLevelTiles()
	}

	forEachTile(f, s=0, y=0) {
		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				const p = {x,y};
				const i = this.getIndexFromXY(x,y);
				f(i, this.tiles[i], p)
			}
		}
	}

    getPointForTile(t) {

        return {
            x: t.x,
            y: t.y,
        }
    }
	getIndexFromXY(x,y) {
		return (y * this.width) + x
	}

    getIndexFromPoint(p) {
        const {x,y} = p;
        return this.getIndexFromXY(x,y);
    }

    getTile(x,y) {
        return this.tiles[this.getIndexFromXY(x,y)]
    }

	inBounds(x,y) {
		const idx = this.getIndexFromXY(x,y);
		return idx >=0 && idx < this.tiles.length;
	}

    blockTile(p) {
        this.tiles[this.getIndexFromPoint(p)].blocked = true;
    }
    unblockTile(p) {
        this.tiles[this.getIndexFromPoint(p)].blocked = false;
    }

    getTilesNear(p) {
        return [[-1,0], [1,0], [0,-1], [0,1]].map(
            n => this.getTile(p.x+n[0], p.y+n[1])
        );
    }

	addRoom(r) {
		this.rooms.push(r);
		for (let x = 0; x < r.w; x++) {
			for (let y = 0; y < r.h; y++) {
				const i = this.getIndexFromXY(r.x+x,r.y+y);
				this.tiles[i].convertToFloor();
			}
		}
	}

	createHorizontalTunnel(x1, x2, y) {
		for (let x = Math.min(x1, x2); x < Math.max(x1,x2) +1; x++) {
			if (this.inBounds(x,y))
				this.tiles[this.getIndexFromXY(x,y)].convertToFloor()
		}
	}

	createVerticalTunnel(y1, y2, x) {
		for (let y = Math.min(y1, y2); y<Math.max(y1,y2)+1; y++) {
			if (this.inBounds(x,y))
				this.tiles[this.getIndexFromXY(x,y)].convertToFloor()
		}
	}

	createLevelTiles() {
		const MIN_SIZE = 3;
		const MAX_SIZE = 10;
		const MAX_ROOMS = 40;


		for (let idx = 0; idx < MAX_ROOMS; idx++) {
			const w = GetRandomBetween(MIN_SIZE, MAX_SIZE);
			const h = GetRandomBetween(MIN_SIZE, MAX_SIZE)
			const x = GetDiceRoll(this.width - w - 1);
			const y = GetDiceRoll(this.height - h - 1);

			const new_room = new Room(x,y,h,w);

			if (!this.inBounds(x,y))
				continue;

			if (this.rooms.some(r => r.intersects(new_room)))
				continue;

			if (this.rooms.length != 0) {
				const last_room = this.rooms[this.rooms.length-1];
				this.connectRooms(last_room, new_room)
			}
			this.addRoom(new_room);
		}
	}

	connectRooms(r1, r2) {
		const c1 = r1.center();
		const c2 = r2.center();

		const coin = GetDiceRoll(2);
		if (coin == 2) {
			this.createHorizontalTunnel(c1.x, c2.x, c1.y)
			this.createVerticalTunnel(c1.y, c2.y, c2.x)
		} else {
			this.createHorizontalTunnel(c1.x, c2.x, c2.y)
			this.createVerticalTunnel(c1.y, c2.y, c1.x)
		}
	}


}

class Component {}

class System {
    entities = [];
    ecs = false;

	update() {}
    add(e) { this.entities.push(e) }
    remove(en) { this.entities = this.entities.filter(e => (e != en)) }
}

class ComponentContainer {
	map = {};

	add(c) { this.map[c.constructor.name] = c }
	has(Class) {
        if (this.map[Class.constructor.name] !== undefined) return true;
        return Object.values(this.map).some(c => (c instanceof Class));
    }
	has_all(comps) {
        return comps.every( C => this.has(C) );
    }
	get(Class) {
        if (this.map[Class.constructor.name] !== undefined)
            return this.map[Class]
        return Object.values(this.map).find(c => (c instanceof Class))
    }
	remove(Class) { delete this.map[Class.constructor.name] }

}

class ECS {
	systems = [];
	entities_to_destroy = [];
    entities = {};

	add_entity() {
		const e = Object.keys(this.entities).length;
		this.entities[e] = new ComponentContainer();
		return e
	}

	remove_entity(e) { delete this.entities[e] }
    get_components(e) { return this.entities[e] }
    add_component(e, c) {
        this.entities[e].add(c);
        this.checkE(e);
    }

    remove_component(e, c) {
       this.entities[e].remove(c);
       this.checkE(e);
    }

    get_all_components(c) {
        return Object.values(this.entities).filter(comp => comp.has(c));
    }

	add_system(s) {
        s.ecs = this;
		this.systems.push(s);
		Object.keys(this.entities).forEach( e => this.checkES(e, s) )
	}

	remove_system(sys) {
        this.systems = this.systems.filter(s => (s != sys))
    }

	update() {
		this.systems.forEach(s => s.update());
		this.entities_to_destroy.forEach(e => this.destroy_entity(e));
	}

	destroy_entity(e) {
		this.systems.forEach(s => s.remove_entity(e));
		this.remove_entity(e);
	}

	checkE(e) {
		this.systems.forEach(s => this.checkES(e,s))
	}

	checkES(e,s) {
		const ec = this.entities[e];
		ec.has_all(s.components_required) ? s.add(e) : s.remove(e);
	}
}

class ActionQueue extends Component {
    nextAction;
}

class Position extends Component {
	constructor(x=0,y=0,m) {
		super(x,y);
		this.x = x;
		this.y = y;
        this.map = m;
        m.blockTile(this);
	}
	move(dx,dy) {
        this.map.unblockTile(this);
		this.x += dx;
		this.y += dy;
        this.map.blockTile(this);;
	}

}

class Viewshed extends Component {
    visible_tiles = [];
    dirty = true;
    constructor(r=8) {
        super(r);
        this.range = r;
    }

    visible(idx) {
        return this.visible_tiles.find( i => (i === idx) )
    }
}

class AStar {
    static equal_nodes(n, o) { return n.x === o.x && n.y === o.y }

    static get_path(level, s, e) {
        const start = { position: s, f: 0, g: 0, h: 0 };
        const enp = { position: e, f: 0, g: 0, h: 0 };

        let fringe = [start];
        const closed = {};
        const id = (n) => level.getIndexFromPoint(n.position);

        while (fringe.length) {
            const current = fringe.shift();
            closed[id(current)] = current;

            if (AStar.equal_nodes(current.position, enp.position)) {
                const path = [];
                let c = current;
                do{ path.unshift(c.position) } while (c = c.parent)
                return path;
            }

            const edges = level.getTilesNear(current.position)
                               .filter(t => !t.is_wall())
                               .map(t => ({
                                   parent: current,
                                   position: t.position(),
                                   f:0, g:0, h:0
                               }));

            for (let i = 0;  i < edges.length; i++) {
                const e = edges[i];
                if (closed[id(e)]) continue;

                e.g = current.g + 1;
                e.h = MDistance(e.position, enp.position);
                e.f = e.g + e.h;

                if (fringe.some(n => e.g > n.g)) continue;
                fringe.push(e);
            };
            fringe.sort((a,b) => a.f < b.f); // keep fringe sorted by f
        }
        return [];
    }
}

class VisibilitySystem extends System {
	components_required = [Position, Viewshed];

    constructor(m, p) {
        super();
        this.map = m;
        this.player = p;
    }

	update() {
        const { ecs, entities, map } = this;
        const fov = (p, r, m) => {
            const indexes = [m.getIndexFromPoint(p)];
            for (let x = p.x - r; x < p.x + r; x++) {
                for (let y = p.y - r; y < p.y + r; y++) {
                    if (!m.inBounds(x,y))
                        continue;

                    indexes.push(m.getIndexFromXY(x,y));
                }
            }
            return indexes;
        };

		entities.forEach(e => {
            const pos = ecs.get_components(e).get(Position);
            const v = ecs.get_components(e).get(Viewshed);
               if (!v.dirty) return;// if no viewshed change, don't update

                v.visible_tiles = fov({x: pos.x, y: pos.y}, v.range, this.map);
                // update what the player can see
                if (e == this.player) {
                    v.visible_tiles.filter(i => map.tiles[i])
                                   .forEach(i => map.tiles[i].seen = true);
                    v.dirty = false;
                }
		});
	}
}

class Action {
    constructor(g) { this.game = g }
    perform() { }
}

class MovementAction extends Action {
    constructor(g, e, dx, dy) {
        super(g);
        this.entity = e;
        this.dx = dx;
        this.dy = dy;
    }
    perform () {
        const {entity, dx, dy} = this;
        const { ecs, map } = this.game;
        const pos = ecs.get_components(entity).get(Position);

        if(!map.inBounds(pos.x+dx, pos.y+dy)) return;
        if (map.getTile(pos.x+dx, pos.y+dy).blocked) return;

        pos.move(dx, dy);
        ecs.get_components(entity).get(Viewshed).dirty = true;
    }
}

class Actor   extends Component {}
class Player  extends Actor     { char = '@' }
class Monster extends Actor     { char = 'm' }

class MonsterAISystem extends System {
	components_required = [Monster];

    constructor(g) {
        super();
         this.game = g;
    }

    update() {
        const { game, entities } = this;
        const {map, ecs} = game;
        const p_pos = ecs.get_components(game.player).get(Position);
        entities.forEach(e => {
            const move = (dx,dy) => new MovementAction(game, e, dx, dy);
            const cs = ecs.get_components(e);
            const v = cs.get(Viewshed);
            const q = cs.get(ActionQueue);
            const p = cs.get(Position);
            if (v.visible(map.getIndexFromPoint(p_pos))) {
                const path = AStar.get_path(map, p, p_pos);
                if (path.length > 1) {
                    const next = map.getTile(path[1].x, path[1].y);
                    if (!next.blocked)
                        q.nextAction = move(path[1].x-p.x, path[1].y-p.y);
                }
            }
        });
    }
}

class Game {
	ecs = new ECS();

	#initCanvas() {
		const canvas = document.querySelector('#game');
		const ctx = canvas.getContext("2d");
		const map = this.map;

		canvas.width = map.tileSize * map.width;
		canvas.height = map.tileSize * map.height;
		canvas.style.width = canvas.width + 'px' ;
		canvas.style.height = canvas.height + 'px';

		ctx.font = map.tileSize + 'px monospace';

		this.ctx = ctx;
		this.canvas = canvas;
	}

	#initPlayer() {
		this.player = this.ecs.add_entity();
		this.ecs.add_component(this.player, new Player());
		this.ecs.add_component(this.player, new Position(
			this.map.rooms[0].center().x,
			this.map.rooms[0].center().y,
            this.map,
		));
        this.ecs.add_component(this.player, new Viewshed());
        this.ecs.add_component(this.player, new ActionQueue());
	}

    #initMonsters() {
        this.map.rooms.filter((_, i) => i !== 0).forEach(r => {
            const c = r.center();
            const m = this.ecs.add_entity();
            this.ecs.add_component(m, new Monster());
            this.ecs.add_component(m, new Position(c.x, c.y, this.map));
            this.ecs.add_component(m, new Viewshed());
            this.ecs.add_component(m, new ActionQueue());
        });
    }

	#initMap () {
		this.map = new GameMap();
	}

    #initSystems() {
        this.ecs.add_system(new VisibilitySystem(this.map, this.player));
        this.ecs.add_system(new MonsterAISystem(this));
    }

    #initKeymap() {
        const move = (dx,dy) => new MovementAction(this, this.player, dx, dy);
        this.keymap = {
            "KeyH"      : move(-1,0),
            'KeyJ'      : move(0,1),
            'KeyK'      : move(0,-1),
            'KeyL'      : move(1,0),
            "ArrowLeft" : move(-1,0),
            "ArrowRight": move(1,0),
            'ArrowDown' : move(0,1),
            'ArrowUp'   : move(0,-1)
        };
    }

	constructor() {
		this.#initMap(); // TODO fix this so it's not order dependent
		this.#initCanvas()
		this.#initPlayer();
        this.#initMonsters();
        this.#initSystems();
        this.#initKeymap();
	}

	handleInput(e) {
        const player = this.ecs.get_components(this.player)
                               .get(ActionQueue);
        player.nextAction = this.keymap[e.code] || new Action(this);
	}

	draw() {
		const { ecs, map, ctx, canvas } = this;

		ctx.clearRect(0,0,canvas.width,canvas.height);

        map.forEachTile((_,t) => {
            if (t.seen) ctx.fillText(
                t.char,
                t.x*map.tileSize,
                t.y*map.tileSize
            );
        })

        const pv = ecs.get_components(this.player).get(Viewshed);
        ecs.get_all_components(Actor) // for now, Actors are renderable
            .filter(c => c.has(Position))
            .map(c => ({ a: c.get(Actor), pos: c.get(Position)}) )
            .filter(p => pv.visible(map.getIndexFromPoint(p.pos)))
            .forEach(p => {
               const {a, pos} = p;
               ctx.fillText(
                    a.char,
                    pos.x*map.tileSize,
                    pos.y*map.tileSize,
                );
            })
	}

    turn = 0;
    update() {
        const actors = this.ecs.get_all_components(Actor)
            .filter(a => a.has(ActionQueue))

        let q = actors[this.turn].get(ActionQueue)
        //TODO implement energy based action activation
        while(q.nextAction) {
            q.nextAction = q.nextAction.perform()
        }
        this.turn = (this.turn + 1) % actors.length;
        this.ecs.update();
        this.draw();
    }
}
