import {Component} from './ecs.js';
import {GetMultiDiceRoll} from './dice.js';


export class Actor extends Component {
  static StatsRoll = () => {
    // [lowest 2 8d10]/2 + 3
    const rolls = GetMultiDiceRoll(8, 10)
      .sort((a, b) => a < b)
      .slice(0, 2)
      .reduce((a, v) => a + v);
    return Math.round(rolls / 2) + 3;
  };

  static stat_names = ["strength", "endurance", "agility", "luck"]; // don't need SPECIAL yet

  constructor() {
    super();
    Actor.stat_names.forEach((a) => (this[a] = Actor.StatsRoll()));
  }

  max_health() {
    return this.endurance + this.luck;
  }
}

// TODO differentiate stats between Players and Monsters
export class Player extends Actor {
  char = "@";
}

export class Monster extends Actor {
  char = "m";
} // TODO different monsters

export class ActionQueue extends Component {
  nextAction = false;
}

export class Position extends Component {
  constructor(x = 0, y = 0, l) {
    super(x, y);
    this.x = x;
    this.y = y;
    this.level = l;
    l.blockTile(this);
  }

  block() {
    this.level.blockTile(this);
  }
  unblock() {
    this.level.unblockTile(this);
  }

  move(dx, dy) {
    this.unblock();
    this.x += dx;
    this.y += dy;
    this.block();
  }
}

export class Health extends Component {
  constructor(health) {
    super();
    this.current_health = health;
  }
}

export class Viewshed extends Component {
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

