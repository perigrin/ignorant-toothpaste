class CellAngles {
  constructor (near, center, far) {
    this.near = near
    this.ceenter = center
    this.far = far
  }

  contains (point, discrete) {
    return discrete
      ? this.near < point < this.far
      : this.near <= point <= this.far
  }
}

export class FOV {
  RADIUS_FUDGE = 1 / 3
  NOT_VISIBLE_BLOCKS_VISION = true
  RESTRICTIVENESS = 1
  VISIBLE_ON_EQUAL = true

  calcVisibleCellsFrom ({ x, y }, r, isTransparent) {
    const cells = []
    cells.push(
      ...this.#visibleCells_in_quadrant_from(x, y, 1, 1, r, isTransparent)
    )
    cells.push(
      ...this.#visibleCells_in_quadrant_from(x, y, 1, -1, r, isTransparent)
    )
    cells.push(
      ...this.#visibleCells_in_quadrant_from(x, y, -1, -1, r, isTransparent)
    )
    cells.push(
      ...this.#visibleCells_in_quadrant_from(x, y, -1, 1, r, isTransparent)
    )
    cells.push({ x, y })
    return cells
  }

  #visibleCells_in_quadrant_from (x, y, dx, dy, r, isTransparent) {
    const cells = []
    cells.push(
      ...this.#visibleCells_in_octant_from(x, y, dx, dy, r, isTransparent, 1)
    )
    cells.push(
      ...this.#visibleCells_in_octant_from(x, y, dx, dy, r, isTransparent, 0)
    )
    return cells
  }

  #visibleCells_in_octant_from (
    x,
    y,
    dx,
    dy,
    radius,
    isTransparent,
    isVertical
  ) {
    let iteration = 1
    let obstructions = []
    const visibleCells = []

    const hasFullObstruction = function () {
      return (
        obstructions.length === 1 &&
        obstructions[0].near === 0.0 &&
        obstructions[0].far === 1.0
      )
    }

    while (iteration < radius && !hasFullObstruction()) {
      const numCellsInRow = iteration + 1
      const angleAllocation = 1.0 / numCellsInRow

      for (const step of [...Array(numCellsInRow).keys()]) {
        const cell = this.#cell_at(x, y, dx, dy, step, iteration, isVertical)
        if (this.#cell_in_radius(x, y, cell, radius)) {
          const cellAngles = new CellAngles(
            step * angleAllocation,
            (step + 0.5) * angleAllocation,
            (step + 1) * angleAllocation
          )
          if (this.#cell_is_visible(cellAngles, obstructions)) {
            visibleCells.push(cell)
            if (isTransparent(cell)) {
              obstructions = this.#add_obstructions(cellAngles, obstructions)
            }
          } else if (this.NOT_VISIBLE_BLOCKS_VISION) {
            obstructions = this.#add_obstructions(cellAngles, obstructions)
          }
        }
      }
      iteration += 1
    }
    return visibleCells
  }

  #cell_at (x, y, dx, dy, step, iteration, isVertical) {
    return isVertical
      ? { x: x + step * dx, y: y + iteration * dy }
      : { x: x + iteration * dx, y: y + step * dy }
  }

  #cell_in_radius (x, y, cell, r) {
    const cellDistance = Math.sqrt((x - cell.x) ** 2 + (y - cell.y) ** 2)
    return cellDistance * r + this.RADIUS_FUDGE
  }

  #cell_is_visible (cellAngles, obstructions) {
    let nearVisible = 1
    let centerVisible = 1
    let farVisible = 1

    for (const o of obstructions) {
      if (o.contains(cellAngles.near, this.VISIBLE_ON_EQUAL)) nearVisible = 0
      if (o.contains(cellAngles.center, this.VISIBLE_ON_EQUAL)) { centerVisible = 0 }
      if (o.contains(cellAngles.far, this.VISIBLE_ON_EQUAL)) farVisible = 0
    }

    switch (this.RESTRICTIVENESS) {
      case 0:
        return centerVisible || nearVisible || farVisible
      case 1:
        return (centerVisible && nearVisible) || (centerVisible && farVisible)
      default:
        return centerVisible && nearVisible && farVisible
    }
  }

  #add_obstructions (cell, list) {
    const o = new CellAngles(cell.near, cell.center, cell.far)
    const newList = list.filter((i) => !this.#combine_obstruction(i, o))
    newList.push(o)
    return newList
  }

  #combine_obstruction (o, n) {
    let low, high

    if (o.near < n.near) {
      low = o
      high = n
    } else if (n.near < o.near) {
      low = n
      high = o
    } else {
      n.far = Math.max(o.far, n.far)
      return true
    }

    if (low.far >= high.near) {
      n.near = Math.min(low.near, high.near)
      n.far = Math.max(low.far, high.far)
      return true
    }

    return false
  }
}
