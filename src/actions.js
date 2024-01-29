import { Actor, Position, Health, Viewshed } from './components.js'
import { GetMultiDiceRoll } from './dice.js'
import { EqualPositions } from './map.js'

export class Action {
  constructor (g, e) {
    this.game = g
    this.entity = e
  }

  perform () {}
}

export class MovementAction extends Action {
  constructor (g, e, dx, dy) {
    super(g, e)
    this.dx = dx
    this.dy = dy
  }

  perform () {
    const { entity, dx, dy } = this
    const { ecs, map } = this.game
    const pos = ecs.get_components(entity).get(Position)
    const l = map.currentLevel()

    if (!l.inBounds(pos.x + dx, pos.y + dy)) return
    const tile = l.getTile(pos.x + dx, pos.y + dy)
    if (tile.blocked) {
      // get monster at that position:
      const enemy = this.game.ecs.find_entity((e) =>
        EqualPositions(e.get(Position), tile)
      )
      if (enemy) {
        return new MeleeAttack(this.game, this.entity, enemy)
      }
      return // nothing to attack but we can't move there so  ... "bump"
    }

    pos.move(dx, dy)
    ecs.get_components(entity).get(Viewshed).dirty = true
  }
}

export class MeleeAttack extends Action {
  constructor (g, e, d) {
    super(g, e)
    this.defender = d
  }

  #actors () {
    const a = this.game.ecs.get_components(this.entity).get(Actor)
    const d = this.game.ecs.get_components(this.defender).get(Actor)
    return { a, d }
  }

  #check_for_hit () {
    const { a, d } = this.#actors()
    // TODO replace raw agility with derived attack/dodge stats
    return GetMultiDiceRoll(a.agility, 10) > GetMultiDiceRoll(d.agility, 10)
  }

  #calculate_damage () {
    const { a, d } = this.#actors()
    // TODO replace raw strenght with a derived damage roll stat
    return Math.abs(
      GetMultiDiceRoll(a.strength, 10) - GetMultiDiceRoll(d.endurance, 10)
    )
  }

  perform () {
    if (!this.#check_for_hit()) return // no hit no combat
    const { a, d } = this.#actors()
    const damage = this.#calculate_damage()
    this.game.log(`${a.char} hits ${d.char} for ${damage} points of damage`)
    const h = this.game.ecs.get_components(this.defender).get(Health)
    h.current_health -= damage
    this.game.log(`${d.char} is at ${h.current_health} health`)
  }
}
