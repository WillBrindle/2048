import 'phaser';

// TODO: where to store this?
const TILE_SIZE: integer = 100;
const TILE_PADDING: integer = 10;
const TWEEN_SPEED: integer = 100;

const COLOURS = {
  2: 0xeee4da,
  4: 0xece0ca,
  8: 0xebb382,
  16: 0xfb9565,
  32: 0xf37c65,
  64: 0xf3613c,
  128: 0xeacf76,
  256: 0xeacb62,
  512: 0xe7c763,
  1024: 0xeac256,
  2048: 0xe8bd4d,
};
const FONT = '"Open Sans Condensed", sans-serif';

class Tile extends Phaser.GameObjects.Container {
  private value: integer;
  private rect: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private upgrading: boolean = false;

  constructor(scene: Phaser.Scene, value: integer) {
    super(scene, 0, 0);
    this.value = value;

    const defaultStyle = {
      fontSize: '32px',
      fontFamily: FONT,
      fontStyle: 'bold',
      color: '#786e66',
    };

    this.rect = new Phaser.GameObjects.Rectangle(scene, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, this.getColour());
    this.text = new Phaser.GameObjects.Text(scene, 0, 0, `${value}`, defaultStyle);
    this.text.setPosition((TILE_SIZE - this.text.displayWidth) / 2, (TILE_SIZE - this.text.displayHeight) / 2);

    this.add(this.rect);
    this.add(this.text);
  }

  tweenTo(x: integer, y: integer, duration: integer, replace: Tile = null): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        x,
        y,
        duration,
        targets: [this],
        onComplete: () => {
          if (replace) {
            this.upgrade();
            replace.destroy();
          }
          resolve();
        },
      });
    });
  }

  getColour(): integer {
    // TODO: fall back to dark grey/almost black if > 2048 for infinite playability
    return COLOURS[this.value];
  }

  getValue(): integer {
    return this.value;
  }

  markUpgrading(): void {
    this.upgrading = true;
  }

  canUpgrade(): boolean {
    return !this.upgrading;
  }

  upgrade(): void {
    this.value *= 2;
    this.text.text = `${this.value}`;
    this.text.setColor(this.value <= 4 ? '#786e66' : '#f7f4f2');
    this.text.setPosition((TILE_SIZE - this.text.displayWidth) / 2, (TILE_SIZE - this.text.displayHeight) / 2);
    this.rect.fillColor = this.getColour();
    this.upgrading = false;
  }
}

class Grid extends Phaser.GameObjects.Container {
  static CELL_COLOUR: integer = 0xcbc2b3;
  static BACKGROUND_COLOUR: integer = 0xbeaea1;

  private grid: Tile[];
  private size: integer;
  private displaySize: integer;

  // TODO: this doesn't really feel like it belongs here; probably need a refactor
  private score: integer = 0;

  constructor(scene: Phaser.Scene, size: integer) {
    super(scene, 0, 0);
    this.size = size;
    this.grid = new Tile[size * size];

    // Background
    this.displaySize = TILE_PADDING + (TILE_SIZE + TILE_PADDING) * size;
    const background = new Phaser.GameObjects.Rectangle(this.scene, this.displaySize / 2, this.displaySize / 2, this.displaySize, this.displaySize, Grid.BACKGROUND_COLOUR);
    this.add(background);

    for (let i: integer = 0; i < size * size; i += 1) {
      const cell = new Phaser.GameObjects.Rectangle(
        this.scene,
        this.getCellPosition(i % this.size) + TILE_SIZE / 2,
        this.getCellPosition(Math.floor(i / this.size)) + TILE_SIZE / 2,
        TILE_SIZE,
        TILE_SIZE,
        Grid.CELL_COLOUR,
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
    let somethingMoved = false;

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
            tile.markUpgrading();
            otherTile.markUpgrading();
            this.score += tile.getValue();
            tile.depth = 3;
            otherTile.depth = 2;
            // Merge the 2
            const tweenDuration = Math.max(Math.abs(newXPos - xPos), Math.abs(newYPos - yPos)) * TWEEN_SPEED;
            promises.push(
              tile.tweenTo(this.getCellPosition(newXPos), this.getCellPosition(newYPos), tweenDuration, otherTile),
            );
            this.grid[this.getGridIndex(newXPos, newYPos)] = tile;
            this.grid[this.getGridIndex(xPos, yPos)] = null;
            somethingMoved = true;
            continue;
          }
        }

        // We couldn't upgrade or we're hitting an edge
        newXPos -= Math.sign(dx);
        newYPos -= Math.sign(dy);

        // If we actually moved anywhere...
        if (newXPos !== xPos || newYPos !== yPos) {
          const tweenDuration = Math.max(Math.abs(newXPos - xPos), Math.abs(newYPos - yPos)) * TWEEN_SPEED;
          promises.push(
            tile.tweenTo(this.getCellPosition(newXPos), this.getCellPosition(newYPos), tweenDuration),
          );
          this.grid[this.getGridIndex(newXPos, newYPos)] = tile;
          this.grid[this.getGridIndex(xPos, yPos)] = null;
          somethingMoved = true;
        }
      }
    }

    return Promise.all(promises).then(() => somethingMoved);
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

    this.grid = new Tile[this.size * this.size];
    this.score = 0;
    this.addRandomTile();
  }

  withinBounds(x: integer, y: integer): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }
}

class ScoreBox extends Phaser.GameObjects.Container {
  private valueLabel: Phaser.GameObjects.Text;
  private boxWidth: integer;

  constructor(scene, label, width, height) {
    super(scene, 0, 0);

    this.boxWidth = width;

    const background = new Phaser.GameObjects.Rectangle(scene, width / 2, height / 2, width, height, 0xbbada0);
    this.add(background);

    const textLabel: Phaser.GameObjects.Text = new Phaser.GameObjects.Text(scene, 0, 5, label, { fontSize: '16px', fontStyle: 'bold', fontFamily: FONT, color: '#e3d9cf' });
    textLabel.x = (width - textLabel.displayWidth) / 2;
    this.add(textLabel);

    this.valueLabel = new Phaser.GameObjects.Text(scene, 0, 22, '0', { fontSize: '32px', fontStyle: 'bold', fontFamily: FONT, color: '#fbf9f6' });
    this.setValue(0);
    this.add(this.valueLabel);
  }

  setValue(value: integer): void {
    this.valueLabel.setText(`${value}`);
    this.valueLabel.x = (this.boxWidth - this.valueLabel.displayWidth) / 2;
  }
}

class Button extends Phaser.GameObjects.Container {
  constructor(scene, label, width, height, callback) {
    super(scene, 0, 0);

    const rect = new Phaser.GameObjects.Rectangle(scene, width / 2, height / 2, width, height, 0x786e66);
    this.add(rect);

    const textLabel: Phaser.GameObjects.Text = new Phaser.GameObjects.Text(scene, 0, 0, label, { fontSize: '16px', fontStyle: 'bold', fontFamily: FONT, color: '#e3d9cf' });
    textLabel.setPosition((width - textLabel.displayWidth) / 2, (height - 16) / 2);
    this.add(textLabel);

    this.setInteractive(new Phaser.Geom.Rectangle(width / 2, height / 2, width, height), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', callback);
  }
}

export default class TwentyFourtyEight extends Phaser.Scene {
  private grid: Grid;
  private moving: boolean = false;

  private scorebox: ScoreBox;
  private highScorebox: ScoreBox;
  private highscore: integer = 0;

  constructor() {
    super('2048');
  }

  preload() {
    this.highscore = localStorage.getItem('highscore') ? Number.parseInt(localStorage.getItem('highscore'), 10) : 0;
  }

  create() {
    const { width } = this.sys.game.canvas;

    // Create core game objet
    this.grid = new Grid(this, 4);
    this.add.existing(this.grid);

    const margin = (width - this.grid.getDisplaySize()) / 2;
    this.grid.x = margin;
    this.grid.y = 200;

    const title = new Phaser.GameObjects.Text(this, margin, 25, '2048', { fontSize: '64px', fontFamily: FONT, fontStyle: 'bold', color: '#786e66' });
    this.add.existing(title);

    // Hacky combination of normal and bold text; if we had to do anything more complicated then
    // this should either be refactored or use a plugin.
    const description1 = new Phaser.GameObjects.Text(this, margin, 108, 'Join the numbers and get to the ', { fontSize: '16px', fontFamily: FONT, color: '#786e66' });
    this.add.existing(description1);
    const description2 = new Phaser.GameObjects.Text(this, margin + description1.displayWidth, 108, '2048 tile!', { fontSize: '16px', fontStyle: 'bold', fontFamily: FONT, color: '#786e66' });
    this.add.existing(description2);

    this.scorebox = new ScoreBox(this, 'SCORE', 120, 60);
    this.scorebox.setPosition(width - margin - 250, 29);
    this.add.existing(this.scorebox);

    this.highScorebox = new ScoreBox(this, 'BEST', 120, 60);
    this.highScorebox.setPosition(width - margin - 120, 29);
    this.highScorebox.setValue(this.highscore);
    this.add.existing(this.highScorebox);

    const newGameButton = new Button(this, 'New Game', 150, 30, () => {
      this.grid.reset();
      this.scorebox.setValue(this.grid.getScore());
    });
    newGameButton.setPosition(width - margin - 150, 100);
    this.add.existing(newGameButton);

    this.grid.addRandomTile();
    this.input.keyboard.on('keydown', this.onKeyPress, this);
  }

  onKeyPress(e) {
    if (!this.moving) {
      switch (e.code) {
        case 'ArrowUp':
          this.gridMove(0, -1);
          break;
        case 'ArrowDown':
          this.gridMove(0, 1);
          break;
        case 'ArrowLeft':
          this.gridMove(-1, 0);
          break;
        case 'ArrowRight':
          this.gridMove(1, 0);
          break;
      }
    }
  }

  gridMove(dx: integer, dy: integer) {
    this.moving = true;
    this.grid.move(dx, dy).then((moved) => {
      this.moving = false;
      if (moved) {
        const score: integer = this.grid.getScore();
        this.scorebox.setValue(score);
        if (score > this.highscore) {
          this.highscore = score;
          localStorage.setItem('highscore', `${this.highscore}`);
          this.highScorebox.setValue(this.highscore);
        }
        this.grid.addRandomTile();
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#fbf8f1',
  width: 600,
  height: 800,
  scene: TwentyFourtyEight,
};

const game = new Phaser.Game(config);
