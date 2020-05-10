import Tile from './tile';
import { BACKGROUND_COLOUR, CELL_COLOUR, TILE_PADDING, TILE_SIZE, TWEEN_SPEED } from './style';

export default class Grid extends Phaser.GameObjects.Container {
  private grid: Tile[];
  private size: integer;
  private displaySize: integer;

  // TODO: this doesn't really feel like it belongs here; probably need a refactor
  private score: integer = 0;

  constructor(scene: Phaser.Scene, size: integer) {
    super(scene, 0, 0);
    this.size = size;
    this.grid = new Array<Tile>(size * size);

    // Background
    this.displaySize = TILE_PADDING + (TILE_SIZE + TILE_PADDING) * size;
    const background = new Phaser.GameObjects.Rectangle(this.scene, this.displaySize / 2, this.displaySize / 2, this.displaySize, this.displaySize, BACKGROUND_COLOUR);
    this.add(background);

    for (let i: integer = 0; i < size * size; i += 1) {
      const cell = new Phaser.GameObjects.Rectangle(
        this.scene,
        this.getCellPosition(i % this.size) + TILE_SIZE / 2,
        this.getCellPosition(Math.floor(i / this.size)) + TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE,
        CELL_COLOUR,
      );

      this.add(cell);
    }
  }

  addRandomTile() {
    const emptyPositions: integer[] = [];
    for (let i: integer = 0; i < this.grid.length; i += 1) {
      if (!this.grid[i]) {
        emptyPositions.push(i);
      }
    }

    const newPosition: integer = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];

    const tile: Tile = new Tile(this.scene, 2);
    tile.setPosition(this.getCellPosition(newPosition % this.size), this.getCellPosition(Math.floor(newPosition / this.size)));
    this.add(tile);
    this.grid[newPosition] = tile;
  }

  move(dx: integer, dy: integer): Promise<boolean> {
    const promises: Promise<void>[] = [];

    for (let i: integer = 0; i < this.size; i += 1) {
      for (let j: integer = 0; j < this.size; j += 1) {
        // If we're moving right start from right; otherwise start from left
        const xPos: integer = dx > 0 ? (this.size - 1 - i) : i;
        // If we're moving down start from bottom; otherwise start from top
        const yPos: integer = dy > 0 ? (this.size - 1 - j) : j;

        const tile: Tile = this.grid[this.getGridIndex(xPos, yPos)];
        // No tile to move so move on
        if (!tile) {
          continue;
        }

        const res = this.calculateMove(tile, xPos, yPos, dx, dy);
        if (res) {
          promises.push(res);
        }
      }
    }

    return Promise.all(promises).then(() => promises.length > 0);
  }

  moveCell(xPos: integer, yPos: integer, newXPos: integer, newYPos: integer) : Promise<void> {
    const tile = this.grid[this.getGridIndex(xPos, yPos)];
    const otherTile = this.grid[this.getGridIndex(newXPos, newYPos)];

    if (otherTile) {
      tile.markUpgrading();
      otherTile.markUpgrading();
      tile.depth = 3;
      otherTile.depth = 2;
      this.score += tile.getValue();
    }

    const tweenDuration = Math.max(Math.abs(newXPos - xPos), Math.abs(newYPos - yPos)) * TWEEN_SPEED;
    const promise = tile.tweenTo(this.getCellPosition(newXPos), this.getCellPosition(newYPos), tweenDuration, otherTile);
    this.grid[this.getGridIndex(newXPos, newYPos)] = tile;
    this.grid[this.getGridIndex(xPos, yPos)] = null;

    return promise;
  }

  calculateMove(tile : Tile, xPos : integer, yPos : integer, dx: integer, dy: integer) : Promise<void> {
    // Find how far we can move in our direction until either we're outside the bounds of our game area
    // or we're hitting another time
    let newXPos: integer = xPos + Math.sign(dx);
    let newYPos: integer = yPos + Math.sign(dy);
    while (this.withinBounds(newXPos, newYPos) && !this.grid[this.getGridIndex(newXPos, newYPos)]) {
      newXPos += Math.sign(dx);
      newYPos += Math.sign(dy);
    }

    // If we hit another tile - see if we can upgrade
    if (this.withinBounds(newXPos, newYPos)) {
      const otherTile = this.grid[this.getGridIndex(newXPos, newYPos)];
      if (otherTile.getValue() === tile.getValue() && otherTile.canUpgrade() && tile.canUpgrade()) {
        return this.moveCell(xPos, yPos, newXPos, newYPos);
      }
    }

    // We couldn't upgrade or we're hitting an edge
    newXPos -= Math.sign(dx);
    newYPos -= Math.sign(dy);

    // If we actually moved anywhere...
    if (newXPos !== xPos || newYPos !== yPos) {
      return this.moveCell(xPos, yPos, newXPos, newYPos);
    }

    return null;
  }

  getCellPosition(p: integer): integer {
    return TILE_PADDING + p * (TILE_SIZE + TILE_PADDING);
  }

  getDisplaySize(): integer {
    return this.displaySize;
  }

  getGridIndex(x: integer, y: integer): integer {
    return x + this.size * y;
  }

  getScore() {
    return this.score;
  }

  reset() {
    this.grid.filter(tile => !!tile).forEach((tile) => {
      tile.destroy();
    });

    this.grid = new Array<Tile>(this.size * this.size);
    this.score = 0;
    this.addRandomTile();
  }

  withinBounds(x: integer, y: integer): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }
}
