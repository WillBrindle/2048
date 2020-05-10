import { FONT } from './style';

export default class ScoreBox extends Phaser.GameObjects.Container {
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
