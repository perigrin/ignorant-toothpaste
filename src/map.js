import { GetDiceRoll, GetRandomBetween } from './dice.js'

export const EqualPositions = (n, o) => n.x === o.x && n.y === o.y

export const MDistance = (
  here,
  there // simple manhattan distance
) => Math.abs(here.x - there.x) + Math.abs(here.y - there.y)

export class Tile {
  static WallTile (x, y, c = '#', b = true) {
    return new Tile('wall', x, y, c, b, true)
  }

  constructor (type, x, y, char, blocked, obstructed) {
    this.type = type
    this.x = x
    this.y = y
    this.char = char
    this.blocked = blocked
    this.seen = false
    this.visible = false
    this.obstructed = obstructed
  }

  position () {
    return { x: this.x, y: this.y }
  }

  is_wall () {
    return this.type === 'wall'
  }

  convertToFloor () {
    this.type = 'floor'
    this.char = '.'
    this.blocked = false
    this.obstructed = false
  }

  distance (that) {
    return MDistance(this, that)
  }
}

export class Room {
  constructor (x, y, h, w) {
    this.x = x
    this.y = y
    this.h = h
    this.w = w
  }

  center () {
    return {
      x: Math.round(this.x + this.w / 2),
      y: Math.round(this.y + this.h / 2)
    }
  }

  intersects (that) {
    if (
      this.x + this.w < that.x ||
      that.x + that.w < this.x ||
      this.y + this.h < that.y ||
      that.y + that.h < this.y
    ) { return false }

    return true
  }
}

export class GameMap {
  levels = []
  constructor (width, height, tileSize = 10) {
    this.tileSize = tileSize
    this.levels.push(new SimpleLevelBuilder(width, height).level)
  }

  #level = 0
  currentLevel () {
    return this.levels[this.#level]
  }
}

export class SimpleLevelBuilder {
  rooms = []
  constructor (height, width) {
    this.level = new Level(height, width)

    this.level.forEachTile((i, t, p) => {
      this.level.tiles[i] = Tile.WallTile(p.x, p.y)
    })
    this.createLevelTiles()
    this.level.entrance = this.rooms[0].center()
    this.level.spawn_points = this.rooms
      .filter((_, i) => i !== 0)
      .map((r) => r.center())
  }

  createLevelTiles () {
    const MIN_SIZE = 3
    const MAX_SIZE = 10
    const MAX_ROOMS = 40
    const level = this.level

    for (let idx = 0; idx < MAX_ROOMS; idx++) {
      const w = GetRandomBetween(MIN_SIZE, MAX_SIZE)
      const h = GetRandomBetween(MIN_SIZE, MAX_SIZE)
      const x = GetDiceRoll(level.width - w - 1)
      const y = GetDiceRoll(level.height - h - 1)

      const newRoom = new Room(x, y, h, w)

      if (!level.inBounds(x, y)) continue

      if (this.rooms.some((r) => r.intersects(newRoom))) continue

      if (this.rooms.length !== 0) {
        const lastRoom = this.rooms[this.rooms.length - 1]
        this.connectRooms(lastRoom, newRoom)
      }

      this.addRoom(newRoom)
    }
  }

  addRoom (r) {
    this.rooms.push(r)
    for (let x = 0; x < r.w; x++) {
      for (let y = 0; y < r.h; y++) {
        const i = this.level.getIndexFromXY(r.x + x, r.y + y)
        this.level.tiles[i].convertToFloor()
      }
    }
  }

  createHorizontalTunnel (x1, x2, y) {
    for (let x = Math.min(x1, x2); x < Math.max(x1, x2) + 1; x++) {
      if (this.level.inBounds(x, y)) { this.level.tiles[this.level.getIndexFromXY(x, y)].convertToFloor() }
    }
  }

  createVerticalTunnel (y1, y2, x) {
    for (let y = Math.min(y1, y2); y < Math.max(y1, y2) + 1; y++) {
      if (this.level.inBounds(x, y)) { this.level.tiles[this.level.getIndexFromXY(x, y)].convertToFloor() }
    }
  }

  connectRooms (r1, r2) {
    const c1 = r1.center()
    const c2 = r2.center()

    const coin = GetDiceRoll(2)
    if (coin === 2) {
      this.createHorizontalTunnel(c1.x, c2.x, c1.y)
      this.createVerticalTunnel(c1.y, c2.y, c2.x)
    } else {
      this.createHorizontalTunnel(c1.x, c2.x, c2.y)
      this.createVerticalTunnel(c1.y, c2.y, c1.x)
    }
  }
}

export class Level {
  tiles = []

  constructor (width, height) {
    this.height = height
    this.width = width
  }

  forEachTile (f, s = 0, y = 0) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const p = { x, y }
        const i = this.getIndexFromXY(x, y)
        f(i, this.tiles[i], p)
      }
    }
  }

  getPointForTile ({ x, y }) {
    return { x, y }
  }

  getIndexFromXY (x, y) {
    return y * this.width + x
  }

  getIndexFromPoint ({ x, y }) {
    return this.getIndexFromXY(x, y)
  }

  getTile (x, y) {
    return this.tiles[this.getIndexFromXY(x, y)]
  }

  inBounds (x, y) {
    const idx = this.getIndexFromXY(x, y)
    return (
      x >= 0 <= this.width &&
      y >= 0 <= this.height &&
      idx >= 0 &&
      idx < this.tiles.length
    )
  }

  blockTile (p) {
    this.tiles[this.getIndexFromPoint(p)].blocked = true
  }

  unblockTile (p) {
    this.tiles[this.getIndexFromPoint(p)].blocked = false
  }

  getTilesNear (p) {
    return [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ].map((n) => this.getTile(p.x + n[0], p.y + n[1]))
  }
}
