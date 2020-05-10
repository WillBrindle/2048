import 'phaser';

// TODO: where to store this?
const TILE_SIZE : integer = 85;
const TILE_PADDING : integer = 5;
const TWEEN_SPEED : integer = 100;

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
    private value : integer;
    private rect : Phaser.GameObjects.Rectangle;
    private text : Phaser.GameObjects.Text;
    private upgrading : boolean = false;

    constructor(scene : Phaser.Scene, value : integer) {
        super(scene, 0, 0);
        this.value = value;

        const defaultStyle = {
            fontSize: '32px',
            fontFamily: FONT,
            fontWeight: 900,
            color: '#786e66'
        };

        this.rect = new Phaser.GameObjects.Rectangle(scene, TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, this.getColour());
        this.text = new Phaser.GameObjects.Text(scene, 0, 0, `${value}`, defaultStyle);
        this.text.setPosition((TILE_SIZE - this.text.displayWidth) / 2, (TILE_SIZE - this.text.displayHeight) / 2);

        this.add(this.rect);
        this.add(this.text);
    }

    tweenTo(x : integer, y : integer, duration : integer, replace : Tile = null) : Promise<void> {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: [ this ],
                x,
                y,
                duration,
                onComplete: () => {
                    if (replace) {
                        this.upgrade();
                        replace.destroy();
                    }
                    resolve();
                }
            });
        });
    }

    getColour() : integer {
        // TODO: fall back to dark grey/almost black if > 2048 for infinite playability
        return COLOURS[this.value];
    }

    getValue() : integer{
        return this.value;
    }

    markUpgrading() : void {
        this.upgrading = true;
    }

    canUpgrade() : boolean {
        return !this.upgrading;
    }

    upgrade() : void {
        this.value *= 2;
        this.text.text = `${this.value}`;
        this.text.setColor(this.value <= 4 ? "#786e66" : "#f7f4f2");
        this.text.setPosition((TILE_SIZE - this.text.displayWidth) / 2, (TILE_SIZE - this.text.displayHeight) / 2);
        this.rect.fillColor = this.getColour();
        this.upgrading = false;
    }
}

class Grid extends Phaser.GameObjects.Container {
    static CELL_COLOUR : integer = 0xcbc2b3;
    static BACKGROUND_COLOUR : integer = 0xbeaea1;

    private grid : Array<Tile>;
    private size : integer;

    constructor(scene : Phaser.Scene, size : integer) {
        super(scene, 0, 0);
        this.grid = new Array<Tile>(size * size);
        this.size = size;

        // Background
        const bgSize = (TILE_SIZE + TILE_PADDING) * size;
        const background = new Phaser.GameObjects.Rectangle(this.scene, bgSize / 2, bgSize / 2, bgSize, bgSize, Grid.BACKGROUND_COLOUR);
        this.add(background);
    }

    addRandomTile() {
        const emptyPositions : Array<integer> = new Array();
        for (let i : integer = 0; i < this.grid.length; i++) {
            if (!this.grid[i]) {
                emptyPositions.push(i);
            }
        }

        const newPosition : integer = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
        
        const tile : Tile = new Tile(this.scene, 2);
        tile.setPosition(this.getCellPosition(newPosition % this.size), this.getCellPosition(Math.floor(newPosition / this.size)));
        this.add(tile);
        this.grid[newPosition] = tile;
    }

    move(dx : integer, dy : integer) : Promise<boolean> {
        const promises : Array<Promise<void>> = [];
        let somethingMoved = false;

        for (let i : integer = 0; i < this.size; i++){
            for (let j : integer = 0; j < this.size; j++){
                // If we're moving right start from right; otherwise start from left
                const xPos : integer = dx > 0 ? (this.size - 1 - i) : i;
                // If we're moving down start from bottom; otherwise start from top
                const yPos : integer = dy > 0 ? (this.size - 1 - j) : j;

                const tile : Tile = this.grid[this.getGridIndex(xPos, yPos)];
                // No tile to move so move on
                if (!tile) {
                    continue;
                }

                // Find how far we can move in our direction until either we're outside the bounds of our game area
                // or we're hitting another time
                let newXPos : integer = xPos + Math.sign(dx);
                let newYPos : integer = yPos + Math.sign(dy);
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
                        tile.depth = 3;
                        otherTile.depth = 2;
                        // Merge the 2
                        const tweenDuration = Math.max(Math.abs(newXPos - xPos), Math.abs(newYPos - yPos)) * TWEEN_SPEED;
                        promises.push(
                            tile.tweenTo(this.getCellPosition(newXPos), this.getCellPosition(newYPos), tweenDuration, otherTile)
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
                        tile.tweenTo(this.getCellPosition(newXPos), this.getCellPosition(newYPos), tweenDuration)
                    );
                    this.grid[this.getGridIndex(newXPos, newYPos)] = tile;
                    this.grid[this.getGridIndex(xPos, yPos)] = null;
                    somethingMoved = true;
                }
            }
        }

        return Promise.all(promises).then(() => somethingMoved);
    }

    getCellPosition(p : integer) : integer{
        return TILE_PADDING + p * (TILE_SIZE + TILE_PADDING);
    }

    getGridIndex(x : integer, y : integer) : integer {
        return x + this.size * y;
    }

    withinBounds(x : integer, y : integer) : boolean {
        return x >= 0 && x < this.size && y >= 0 && y < this.size;
    }
}

export default class TwentyFourtyEight extends Phaser.Scene
{
    private grid : Grid;
    private moving : boolean = false;

    constructor ()
    {
        super('2048');
    }

    preload () {
    }

    create () {
        this.grid = new Grid(this, 4);
        this.add.existing(this.grid);

        this.grid.addRandomTile();
        this.input.keyboard.on("keydown", this.onKeyPress, this);
    }

    onKeyPress(e) {
        if (!this.moving) {
            switch (e.code) {
                case "ArrowUp":
                    this.gridMove(0, -1);
                    break;
                case "ArrowDown":
                    this.gridMove(0, 1);
                    break;
                case "ArrowLeft":
                    this.gridMove(-1, 0);
                    break;
                case "ArrowRight":
                    this.gridMove(1, 0);
                    break;
            }
        }
    }

    gridMove(dx : integer, dy : integer) {
        this.moving = true;
        this.grid.move(dx, dy).then((moved) => {
            this.moving = false;
            if (moved) {
                this.grid.addRandomTile();
            }
        });
    }
}

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#125555',
    width: 600,
    height: 800,
    scene: TwentyFourtyEight
};

const game = new Phaser.Game(config);
