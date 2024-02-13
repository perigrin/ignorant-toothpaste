import { GameMap } from 'https://cdn.jsdelivr.net/npm/mainloop.js@latest/build/mainloop.min.js'
import { ECS } from './ecs.js'
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
import { VisibilitySystem, MonsterAISystem, SamsaraSystem } from './systems.js'

// TODO convert this to a system that requires the Position component and is added only to the player
class Camera {
  constructor ({ ecs, ctx, map, player }) {
    this.ecs = ecs
    this.ctx = ctx
    this.map = map
    this.player = player
  }

  SHOW_BOUNDS = true
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
          if (t.visible) ctx.fillText('y', x * map.tileSize, y * map.tileSize)
          if (t.seen) ctx.fillText(t.char, x * map.tileSize, y * map.tileSize)
        } else {
          if (this.SHOW_BOUNDS) {
            ctx.fillText('x', x * map.tileSize, y * map.tileSize)
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
          ctx.fillText(a.char, x * map.tileSize, y * map.tileSize)
        }
      })
  }

  render_view () {
    const { ctx } = this
    const canvas = ctx.canvas

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    this.render_map()
    this.render_player_view()
  }
}

export class Game {
  ecs = new ECS()

  log (message) {
    const p = document.createElement('p')
    p.textContent = message
    document.querySelector('#log').prepend(p)
  }

  #initCanvas () {
    const canvas = document.querySelector('#game')
    const ctx = canvas.getContext('2d')
    const map = this.map

    ctx.font = map.tileSize + 'px monospace'

    this.ctx = ctx
    this.canvas = canvas
  }

  #init_actor (actor, position) {
    const e = this.ecs.add_entity()
    this.ecs.add_component(e, actor)
    this.ecs.add_component(e, new Health(actor.max_health()))
    this.ecs.add_component(e, position)
    this.ecs.add_component(e, new Viewshed())
    this.ecs.add_component(e, new ActionQueue())
    return e
  }

  #initPlayer () {
    const level = this.map.currentLevel()
    const { x, y } = level.entrance // TODO replace with level entrance
    this.player = this.#init_actor(new Player(), new Position(x, y, level))
  }

  spawn_monster (level, p) {
    this.#init_actor(new Monster(), new Position(p.x, p.y, level))
  }

  #initMonsters () {
    const level = this.map.currentLevel()
    level.spawn_points.forEach((p) => this.spawn_monster(level, p))
  }

  #initSystems () {
    this.ecs.add_system(new VisibilitySystem(this))
    this.ecs.add_system(new MonsterAISystem(this))
    this.ecs.add_system(new SamsaraSystem(this))
  }

  #initKeymap () {
    document.querySelector('html').onkeydown = (e) => this.handleInput(e)

    const move = (dx, dy) => new MovementAction(this, this.player, dx, dy)
    this.keymap = {
      KeyH: move(-1, 0),
      KeyJ: move(0, 1),
      KeyK: move(0, -1),
      KeyL: move(1, 0),
      ArrowLeft: move(-1, 0),
      ArrowRight: move(1, 0),
      ArrowDown: move(0, 1),
      ArrowUp: move(0, -1)
    }
  }

  constructor (w = 80, h = 50, t = 10) {
    this.map = new GameMap(w, h, t)
    this.#initCanvas()
    this.#initPlayer()
    this.#initMonsters()
    this.#initSystems()
    this.#initKeymap()
    this.camera = new Camera(this)
  }

  handleInput (e) {
    const player = this.ecs.get_components(this.player).get(ActionQueue)
    player.nextAction = this.keymap[e.code] || new Action(this)
  }

  turn = 0
  update () {
    const actors = this.ecs
      .get_all_components(Actor)
      .filter((a) => a.has(ActionQueue))

    const q = actors[this.turn % actors.length].get(ActionQueue)
    // TODO implement action points system
    while (q.nextAction) {
      q.nextAction = q.nextAction.perform()
    }
    this.turn++
    this.ecs.update()
  }

  draw () {
    this.camera.render_view()
  }

  /* global MainLoop */
  start () {
    MainLoop.setUpdate((d) => this.update(d))
      .setDraw((_) => this.draw())
      .start()
  }

  stop () {
    MainLoop.stop()
  }
}

const g = new Game(80, 50)
g.start()
