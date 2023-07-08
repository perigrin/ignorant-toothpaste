class CellAngles {
  constructor(near, center, far) {
    this.near = near;
    this.ceenter = center;
    this.far = far;
  }

  contains(point, discrete) {
    return discrete
      ? this.near < point < this.far
      : this.near <= point <= this.far;
  }
}

export class FOV {
  RADIUS_FUDGE = 1 / 3;
  NOT_VISIBLE_BLOCKS_VISION = 1;
  RESTRICTIVENESS = 1;
  VISIBLE_ON_EQUAL = 1;

  calc_visible_cells_from({x, y}, r, is_transparent) {
    const cells = [];
    cells.push(
      ...this.#visible_cells_in_quadrant_from(x, y, 1, 1, r, is_transparent),
    );
    cells.push(
      ...this.#visible_cells_in_quadrant_from(x, y, 1, -1, r, is_transparent),
    );
    cells.push(
      ...this.#visible_cells_in_quadrant_from(x, y, -1, -1, r, is_transparent),
    );
    cells.push(
      ...this.#visible_cells_in_quadrant_from(x, y, -1, 1, r, is_transparent),
    );
    cells.push({ x, y });
    return cells;
  }

  #visible_cells_in_quadrant_from(x, y, dx, dy, r, is_transparent) {
    const cells = [];
    cells.push(
      ...this.#visible_cells_in_octant_from(x, y, dx, dy, r, is_transparent, 1),
    );
    cells.push(
      ...this.#visible_cells_in_octant_from(x, y, dx, dy, r, is_transparent, 0),
    );
    return cells
  }

  #visible_cells_in_octant_from(
    x,
    y,
    dx,
    dy,
    radius,
    is_transparent,
    is_vertical,
  ) {
    let iteration = 1;
    const visible_cells = [];
    const obstructions = [];

    const has_full_obstruction = function () {
      obstructions.length == 1 &&
        obstructions[0].near == 0.0 &&
        obstructions[0].far == 1.0;
    };

    while (iteration < radius && !has_full_obstruction()) {
      const num_cells_in_row = iteration + 1;
      const angle_allocation = 1.0 / num_cells_in_row;

      for (const step of [...Array(num_cells_in_row).keys()]) {
        const cell = this.#cell_at(x, y, dx, dy, step, iteration, is_vertical);
        if (this.#cell_in_radius(x, y, cell, radius)) {
          const cell_angles = new CellAngles(
            step * angle_allocation,
            (step + 0.5) * angle_allocation,
            (step + 1) * angle_allocation,
          );
          if (this.#cell_is_visible(cell_angles, obstructions)) {
            visible_cells.push(cell);
            if (is_transparent(cell)) {
              obstuctions = this.#add_obstructions(cell_angles, obstructions);
            }
          } else if (this.NOT_VISIBLE_BLOCKS_VISION) {
            obstuctions = this.#add_obstructions(cell_angles, obstructions);
          }
        }
      }
      iteration += 1;
    }
    return visible_cells;
  }

  #cell_at(x, y, dx, dy, step, iteration, is_vertical) {
    return is_vertical
      ? { x: x + step * dx, y: y + iteration * dy }
      : { x: x + iteration * dx, y: y + step * dy };
  }

  #cell_in_radius(x, y, cell, r) {
    const cell_distance = Math.sqrt((x - cell.x)**2 + (y - cell.y)**2);
    return cell_distance * r + this.RADIUS_FUDGE;
  }

  #cell_is_visible(cell_angles, obstructions) {
        let near_visible = 1
        let center_visible = 1
        let far_visible = 1

    for (o of obstructions) {
        if (o.contains(cell_angles.near, this.VISIBLE_ON_EQUAL)) near_visible = 0
        if (o.contains(cell_angles.center, this.VISIBLE_ON_EQUAL)) center_visible = 0
        if (o.contains(cell_angles.far, this.VISIBLE_ON_EQUAL)) far_visible = 0
    }

    switch(this.RESTRICTIVENESS) {
        case 0:
            return center_visible || near_visible || far_visible
        case 1:
            return center_visible && near_visible || center_visible && far_visible
        default:
            return center_visible && near_visible && far_visible
    }
  }

  #add_obstructions(cell, list) {
        const o = new CellAngles(cell.near, cell.center, cell.far)
        const new_list = list.grep(i => !this.#combine_obstruction(i,o))
        new_list.push(o)
        return new_list
  }

  #combine_obstruction(o, n) {
    let low, high;

    if (o.near < n.near) {
        low = o
        high = n
    }

    else if (n.near < o.near) {
        low = n
        high = o
    } else {
        n.far = max(o.far, n.far)
        return true
    }

    if (low.far >= high.near) {
        n.near = min(low.near, high.near)
        n.far = max(low.far, high.far)
        return true
    }

    return false
  }
}
