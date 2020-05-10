import 'phaser';
import Button from './button';
import Grid from './grid';
import ScoreBox from './scorebox';
import { FONT } from './style';

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
