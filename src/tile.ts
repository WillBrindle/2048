import { FONT, TILE_SIZE, CELL_COLOURS } from './style';

export default class Tile extends Phaser.GameObjects.Container {
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
    return CELL_COLOURS[this.value] ? CELL_COLOURS[this.value] : CELL_COLOURS[0];
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
