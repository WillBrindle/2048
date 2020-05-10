import { FONT, PRIMARY_COLOUR, TERTIARY_COLOUR } from './style';

export default class Button extends Phaser.GameObjects.Container {
  constructor(scene, label, width, height, callback) {
    super(scene, 0, 0);

    const rect = new Phaser.GameObjects.Rectangle(scene, width / 2, height / 2, width, height, PRIMARY_COLOUR);
    this.add(rect);

    const textLabel: Phaser.GameObjects.Text = new Phaser.GameObjects.Text(scene, 0, 0, label, { fontSize: '16px', fontStyle: 'bold', fontFamily: FONT, color: `#${TERTIARY_COLOUR.toString(16)}` });
    textLabel.setPosition((width - textLabel.displayWidth) / 2, (height - 16) / 2);
    this.add(textLabel);

    this.setInteractive(new Phaser.Geom.Rectangle(width / 2, height / 2, width, height), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', callback);
  }
}
