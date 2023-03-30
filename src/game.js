const GetDiceRoll = (i) => (Math.floor(Math.random() * i)+1);
const GetRandomBetween = (l,h) => (GetDiceRoll(h-l)+h);

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
	}

	center() {
		return {
			x: Math.round(this.x + (this.w/2)),
			y: Math.round(this.y + (this.h/2)),
		}
	}

	convertToFloor() {
		this.type = "floor";
		this.char = ' ';
		this.blocked = false;
	}

	draw(ctx) {
		ctx.fillText(this.char, this.x, this.y)
	}
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
				p.x * tileSize,
				p.y * tileSize,
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

	getIndexFromXY(x,y) {
		return (y * this.width) + x
	}

	inBounds(x,y) {
		const idx = this.getIndexFromXY(x,y);
		return idx < this.tiles.length;
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
		for (let x = Math.min(x1, x2); x < Math.max(x1,x2); x++) {
			if (this.inBounds(x,y))
				this.tiles[this.getIndexFromXY(x,y)].convertToFloor()
		}
	}

	createVerticalTunnel(y1, y2, x) {
		for (let y = (Math.min(y1, y2)+1); y<Math.max(y1,y2); y++) {
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

	draw(ctx) {
		this.forEachTile((_,t) => t.draw(ctx))
	}
}

class Actor {

	constructor(x,y) {
		this.x = x;
		this.y = y;
	}

	move(dx,dy) {
		this.x += dx;
		this.y += dy;
	}

}

class Game {

	constructor() {
		const map = new GameMap();
		const canvas = document.querySelector('#game');
		const ctx = canvas.getContext("2d");

		canvas.width = map.tileSize * map.width;
		canvas.height = map.tileSize * map.height;
		canvas.style.width = canvas.width + 'px' ;
		canvas.style.height = canvas.height + 'px';

		ctx.font = map.tileSize + 'pt monospace';

		this.player = new Actor(
			map.rooms[0].center().x,
			map.rooms[0].center().y
		);

		this.map = map;
		this.ctx = ctx;
		this.canvas = canvas;

	}

	handleInput(e) {
		if (e.key == "h") this.player.move(-1,0);
		if (e.key == "j") this.player.move(0,1);
		if (e.key == "k") this.player.move(0,-1);
		if (e.key == "l") this.player.move(1,0);
	}

	draw() {
		const { x, y, map, ctx, canvas } = this;
		ctx.clearRect(0,0,canvas.width, canvas.height);
		map.draw(ctx)
		ctx.fillText(
			'@',
			this.player.x*map.tileSize,
			this.player.y*map.tileSize,
		);
	}
}



