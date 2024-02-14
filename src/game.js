import { GameMap } from './map.js'
import { ECS } from './ecs.js'
import {
  ActionQueue,
  Actor,
  Camera,
  Health,
  Monster,
  Player,
  Position,
  Viewshed
} from './components.js'
import { Action, MovementAction } from './actions.js'
import {
  CameraSystem,
  VisibilitySystem,
  MonsterAISystem,
  SamsaraSystem
} from './systems.js'

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
    this.ecs.add_component(this.player, new Camera())
  }

  spawn_monster (level, p) {
    this.#init_actor(new Monster(), new Position(p.x, p.y, level))
  }

  #initMonsters () {
    const level = this.map.currentLevel()
    level.spawn_points.forEach((p) => this.spawn_monster(level, p))
  }

  #initSystems () {
    this.ecs.add_system(new CameraSystem(this))
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

  constructor (w = 80, h = 50, t = 64) {
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

  start () {
    /* global MainLoop */
    MainLoop.setUpdate((d) => this.update(d))
      .setDraw((_) => this.ecs.update())
      .start()
  }

  stop () {
    MainLoop.stop()
  }
}

const g = new Game(80, 50)
g.start()
