import { System } from './ecs.js'
import {
  Actor,
  Player,
  Monster,
  ActionQueue,
  Position,
  Health,
  Viewshed
} from './components.js'
import { Action, MovementAction } from './actions.js'
import { AStar } from './astar.js'
import { FOV } from './fov.js'
const fov = new FOV()

export class CameraSystem extends System {
  components_required = [Position, Viewshed]

  spritesheet = new Image()
  constructor (g) {
    super(g)
    const { ecs, ctx, map, player } = g
    this.ecs = ecs
    this.ctx = ctx
    this.map = map
    this.player = player
    this.spritesheet.src = '/assets/doodle_rogue/tiles-64.png'
  }

  SHOW_BOUNDS = false

  drawSprite (sprite, x, y) {
    this.ctx.drawImage(
      this.spritesheet,
      sprite[0] * this.map.tileSize,
      sprite[1] * this.map.tileSize,
      this.map.tileSize,
      this.map.tileSize,
      x * this.map.tileSize,
      y * this.map.tileSize,
      this.map.tileSize,
      this.map.tileSize
    )
  }

  render_map () {
    const { ctx, map } = this
    const level = map.currentLevel()
    const { min, max } = this.get_min_max()

    let y = 0
    for (let ty = min.y; ty < max.y; ty++) {
      let x = 0
      for (let tx = min.x; tx < max.x; tx++) {
        if (level.inBounds(tx, ty)) {
          const t = level.getTile(tx, ty)
          ctx.fillStyle = 'black'
          if (t.visible) { ctx.fillStyle = 'yellow' }
          // if (t.seen) ctx.fillText(t.char, x * map.tileSize, y * map.tileSize, map.tileSize)
          if (t.seen) this.drawSprite(t.sprite, x, y)
        } else {
          if (this.SHOW_BOUNDS) {
            ctx.fillText('x', x * map.tileSize, y * map.tileSize, map.tileSize)
          }
        }
        x++
      }
      y++
    }
  }

  get_min_max () {
    const { height, width } = this.get_camera_view()
    const center = {
      x: Math.round(width / 2),
      y: Math.round(height / 2)
    }
    const pos = this.ecs.get_components(this.player).get(Position)
    const min = {
      x: pos.x - center.x,
      y: pos.y - center.y
    }
    const max = {
      x: min.x + width,
      y: min.y + width
    }
    return { min, max }
  }

  get_camera_view () {
    const width = Math.round(this.ctx.canvas.width / this.map.tileSize)
    const height = Math.round(this.ctx.canvas.height / this.map.tileSize)
    return { width, height }
  }

  render_player_view () {
    const { ecs, ctx, map, player } = this
    const level = map.currentLevel()
    const pv = ecs.get_components(player).get(Viewshed)
    ecs
      .get_all_components(Actor) // for now, Actors are renderable
      .filter((c) => c.has(Position))
      .map((c) => ({ a: c.get(Actor), pos: c.get(Position) }))
      .filter((p) => pv.visible(level.getIndexFromPoint(p.pos)))
      .forEach((p) => {
        const { a, pos } = p
        const { min } = this.get_min_max()
        const x = pos.x - min.x
        const y = pos.y - min.y
        if (level.inBounds(x, y)) {
          // ctx.fillText(a.char, x * map.tileSize, y * map.tileSize)
          this.drawSprite(a.sprite, x, y)
        }
      })
  }

  update () {
    const { ctx } = this
    const canvas = ctx.canvas

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    this.render_map()
    this.render_player_view()
  }
}

export class VisibilitySystem extends System {
  components_required = [Position, Viewshed]

  constructor (g) {
    super(g)
    this.level = g.map.currentLevel()
    this.player = g.player
  }

  static fov (p, r, l) {
    // point range level
    const cells = fov.calcVisibleCellsFrom(
      p, // point
      r, // range
      ({ x, y }) => {
        return l.getTile(x, y)?.obstructed
      } // isTransparent }
    )
    const indexes = [l.getIndexFromPoint(p)]
    for (const p of cells) {
      if (l.inBounds(p.x, p.y)) indexes.push(l.getIndexFromPoint(p))
    }
    return indexes
  }

  update () {
    const { ecs, entities } = this

    entities.forEach((e) => {
      const pos = ecs.get_components(e).get(Position)
      const v = ecs.get_components(e).get(Viewshed)
      if (!v.dirty) return // if no viewshed change, don't update

      const level = this.level
      level.forEachTile((_, t) => {
        t.visible = false
      }) // reset visibility

      v.visible_tiles = VisibilitySystem.fov(
        { x: pos.x, y: pos.y },
        v.range,
        level
      )
      // update what the player can see
      if (e === this.player) {
        v.visible_tiles
          .map((i) => level.tiles[i])
          .forEach((t) => {
            t.visible = true
            t.seen = true
          })
      }
      v.dirty = false
    })
  }
}

export class MonsterAISystem extends System {
  components_required = [Monster]

  constructor (g) {
    super()
    this.game = g
  }

  update () {
    const { game, entities, ecs } = this
    const { map } = game
    const level = map.currentLevel()
    const pPos = ecs.get_components(game.player).get(Position)

    entities.forEach((e) => {
      const move = (dx, dy) => new MovementAction(game, e, dx, dy)
      const cs = ecs.get_components(e)
      const v = cs.get(Viewshed)
      const q = cs.get(ActionQueue)
      const p = cs.get(Position)
      if (v.visible(level.getIndexFromPoint(pPos))) {
        const path = AStar.get_path(level, p, pPos)
        if (path.length > 1) {
          q.nextAction = move(path[1].x - p.x, path[1].y - p.y)
        }
      } else {
        q.nextAction = new Action(this)
      }
    })
  }
}

// system of death and rebirth
export class SamsaraSystem extends System {
  components_required = [Health, Actor, Position]

  update () {
    const { ecs, entities } = this
    console.log('Checking for death and rebirth')

    entities.forEach((e) => {
      const cs = ecs.get_components(e)
      const h = cs.get(Health)
      const a = cs.get(Actor)
      if (h.current_health <= 0) {
        this.game.log(`${a.char} has died`)
        if (a instanceof Player) {
          this.game.log('Game Over.')
          this.game.stop()
          return
        }
        if (a instanceof Monster) {
          console.log('I should probably spawn another monster')
        } // TODO respawn monster
        const p = cs.get(Position)
        p.unblock() // unblock the position
        ecs.destroy_entity(e)
      }
    })
  }
} // handle death and rebirth
