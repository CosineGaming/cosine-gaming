function Lose()
{

}

Lose.prototype.preload = function()
{

	game.stage = new Phaser.Stage(game);

}

Lose.prototype.create = function()
{

	this.line1 = game.make.retroFont("arabic", 12, 16, Phaser.RetroFont.TEXT_SET1);
	this.line2 = game.make.retroFont("arabic", 12, 16, Phaser.RetroFont.TEXT_SET1);
	this.line3 = game.make.retroFont("arabic", 12, 16, Phaser.RetroFont.TEXT_SET1);
	this.line4 = game.make.retroFont("arabic", 12, 16, Phaser.RetroFont.TEXT_SET1);
	game.stage.addChild(game.make.image(5, 10, this.line1));
	game.stage.addChild(game.make.image(5, 75, this.line2));
	game.stage.addChild(game.make.image(5, 85, this.line3));
	game.stage.addChild(game.make.image(5, 150, this.line4));
	this.line1.text = "GAME OVER."
	this.line2.text = "FINAL ENTROPY:" + entropy;
	this.line3.text = "FINAL LEVEL:" + level;
	this.line4.text = "Click to restart."

}

Lose.prototype.update = function()
{

	if (game.input.activePointer.isDown)
	{

		level = 1;
		levels = ["levels begin at 1"]; // Levels start at 1, ironically for technical reasons

		entropy = 0;
		health = 100;

		game.state = new Phaser.StateManager(game);

		game.state.add("lose", new Lose());

		setLevel(1);

	}

}