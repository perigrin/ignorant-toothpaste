export class Component {}

export class System {
  entities = []
  ecs = false

  constructor (game) {
    this.game = game
  }

  update () {}
  add (e) {
    this.entities.push(e)
  }

  remove (en) {
    this.entities = this.entities.filter((e) => e !== en)
  }
}

export class ComponentContainer {
  containers = {}

  add (c) {
    this.containers[c.constructor.name] = c
  }

  has (Class) {
    if (this.containers[Class.constructor.name] !== undefined) return true
    return Object.values(this.containers).some((c) => c instanceof Class)
  }

  has_all (comps) {
    return comps.every((C) => this.has(C))
  }

  get (Class) {
    if (this.containers[Class.constructor.name] !== undefined) { return this.containers[Class] }
    return Object.values(this.containers).find((c) => c instanceof Class)
  }

  remove (Class) {
    delete this.containers[Class.constructor.name]
  }
}

export class ECS {
  systems = []
  entities_to_destroy = []
  entities = []

  add_entity () {
    const e = Object.keys(this.entities).length
    this.entities[e] = new ComponentContainer()
    return this.entities.push(new ComponentContainer()) - 1
  }

  remove_entity (e) {
    delete this.entities[e]
  }

  get_components (e) {
    return this.entities[e]
  }

  add_component (e, c) {
    this.entities[e].add(c)
    this.checkE(e)
  }

  remove_component (e, c) {
    this.entities[e].remove(c)
    this.checkE(e)
  }

  find_entity (f) {
    return Object.keys(this.entities).find((e) => f(this.get_components(e)))
  }

  get_all_components (c) {
    return Object.values(this.entities).filter((comp) => comp.has(c))
  }

  add_system (s) {
    s.ecs = this
    this.systems.push(s)
    Object.keys(this.entities).forEach((e) => this.checkES(e, s))
  }

  remove_system (sys) {
    this.systems = this.systems.filter((s) => s !== sys)
  }

  update () {
    this.systems.forEach((s) => s.update())
    this.entities_to_destroy.forEach((e) => this.destroy_entity(e))
  }

  destroy_entity (e) {
    this.systems.forEach((s) => s.remove(e))
    this.remove_entity(e)
  }

  checkE (e) {
    this.systems.forEach((s) => this.checkES(e, s))
  }

  checkES (e, s) {
    const ec = this.entities[e]
    ec.has_all(s.components_required) ? s.add(e) : s.remove(e)
  }
}
