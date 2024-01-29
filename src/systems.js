import { System } from './ecs.js'
import { Actor, Player, Monster, ActionQueue, Position, Health, Viewshed } from './components.js'
import { Action, MovementAction } from './actions.js'
import { AStar } from './astar.js'
import { FOV } from './fov.js'

export class VisibilitySystem extends System {
  components_required = [Position, Viewshed]

  constructor (g) {
    super(g)
    this.level = g.map.currentLevel()
    this.player = g.player
  }

  static fov (p, r, l) {
    const cells = new FOV().calc_visible_cells_from(p, r, ({ x, y }) => l.getTile(x, y).obstructed)
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
      level.forEachTile((_, t) => { t.visible = false }) // reset visibility

      v.visible_tiles = VisibilitySystem.fov(
        { x: pos.x, y: pos.y },
        v.range,
        level
      )
      // update what the player can see
      if (e === this.player) {
        v.visible_tiles
          .filter((i) => level.tiles[i])
          .forEach((i) => (level.tiles[i].seen = true))
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
        if (a instanceof Monster) { console.log('I should probably spawn another monster') } // TODO respawn monster
        const p = cs.get(Position)
        p.unblock() // unblock the position
        ecs.destroy_entity(e)
      }
    })
  }
} // handle death and rebirth
