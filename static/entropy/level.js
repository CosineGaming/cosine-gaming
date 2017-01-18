function Level()
{

	this.isNew = true;
	this.crackTypes = 2;
	this.monsterTypes = 1;
	this.lastEntropy = 0;
	this.bullets;
	this.level = level;

}

Level.prototype.makeCracks = function(cracks)
{
	for (var i=0; i<cracks; i++)
	{
		var type = "cracks" + Math.floor(Math.random() * this.crackTypes);
		var crack = this.cracks.create(0, 0, type);
		crack.x = Math.random() * (320 - 64 - 3 - 3) + 3;
		crack.y = Math.random() * (180 - 64 - 52) + 52;
	}
}

Level.prototype.create = function()
{
	game.stage = levels[level];

	var cracks = 0.5;

	if (this.isNew)
	{

		game.stage.addChild(game.make.sprite(0, 0, "floor"));

		this.walls = game.stage.addChild(game.make.group());
		this.walls.enableBody = true;
		var wall = this.walls.create(0, 0);
		wall.body.width = 320;
		wall.body.height = 26;
		wall.body.immovable = true;
		wall = this.walls.create(0, 0);
		wall.body.width = 3;
		wall.body.height = 200;
		wall.body.immovable = true;
		wall = this.walls.create(317, 0);
		wall.body.width = 3;
		wall.body.height = 200;
		wall.body.immovable = true;
		wall = this.walls.create(0, 180 - 3);
		wall.body.width = 320;
		wall.body.height = 3;
		wall.body.immovable = true;

		this.cracks = game.stage.addChild(game.make.group());

		this.sorted = game.stage.addChild(game.make.group());

		this.monsters = game.stage.addChild(game.make.group());
		this.monsters.enableBody = true;
		this.monsters.classType = Monster;

		this.makeCracks(Math.random() * level * cracks - 1);

		for (var i=0; i<Math.random() * level * cracks; i++)
		{
			var type = "monster" + Math.floor(Math.random() * this.monsterTypes);
			var monster = this.monsters.create(0, 0, type);
		}

		var portalLocations = [[80, 60],  [160, 60],  [240, 60],
		                       [80, 120], [160, 120], [240, 120]];
		// Pick a portal and remove it from the list
		var up = portalLocations.splice(Math.floor(Math.random() * 6), 1)[0];
		this.portalUp = game.stage.addChild(game.make.sprite(up[0], up[1] - 24, "portalUp"));
		game.physics.arcade.enable(this.portalUp);
		this.portalUp.body.offset = new Phaser.Point(0, 17);
		this.portalUp.body.width = 25;
		this.portalUp.body.height = 15;
		this.portalUp.body.immovable = true;
		// Prevent from going to levels[0]
		if (level != 1)
		{
			// Pick a portal from the reduced list
			var down = portalLocations[Math.floor(Math.random() * 5)];
			this.portalDown = game.stage.addChild(game.make.sprite(down[0], down[1] - 24, "portalDown"));
			game.physics.arcade.enable(this.portalDown);
			this.portalDown.body.offset = new Phaser.Point(0, 17);
			this.portalDown.body.width = 25;
			this.portalDown.body.height = 15;
			this.portalDown.body.immovable = true;
		}

		this.player = game.stage.addChild(new Player(this.portalUp, this.portalDown));

		this.bullets = game.stage.addChild(game.make.group());
		this.enemyBullets = game.stage.addChild(game.make.group());

		game.stage.addChild(game.make.sprite(0, 180 - 26, "frontWall"));

		this.font = game.make.retroFont("arabic", 12, 16, Phaser.RetroFont.TEXT_SET1);
		game.stage.addChild(game.make.image(5, 180 - 22, this.font));

		// Add objects that exist in isometric space to a group that gets sorted
		this.sorted.add(this.monsters);
		this.sorted.add(this.player);
		this.sorted.add(this.portalUp);
		if (this.portalDown)
		{
			this.sorted.add(this.portalDown);
		}

        game.stage.addChild(game.make.sprite(25,  110, "dpad"));
        game.stage.addChild(game.make.sprite(250, 110, "dpad"));

	}

	this.makeCracks(Math.random() * cracks * (entropy - this.lastEntropy) - 1);
	this.lastEntropy = entropy;

	this.font.text = "Entropy:" + (entropy + level);

	this.isNew = false;

}

Level.prototype.levelShift = function(to, direction=0)
{

	var fromIndex;
	var at;
	if (direction != -1 && levels.length > to + 1 && Math.random() < 0.5)
	{
		fromIndex = to + 1;
		at = this.portalUp;
	}
	else if (direction != 1 && to != 1)
	{
		fromIndex = to - 1;
		at = this.portalDown;
	}
	if (typeof fromIndex != "undefined")
	{
		var from = game.state.states[fromIndex].monsters;
		var monster = from.getRandom();
		if (monster)
		{
			entropy += 1;
			this.makeCracks(1);
			this.font.text = "Entropy:" + (entropy + level) + " Phase detected";
			monster.moveToCurrentLevel();
			monster.x = at.body.center.x - monster.width / 2;
			monster.y = at.body.bottom - monster.height + 5;
		}
		else
		{
			this.levelShift(fromIndex, fromIndex - to);
		}
	}

}

Level.prototype.update = function()
{

	var monsterTeleports = 100;
	if (Math.random() * ((entropy + level) / 60 / monsterTeleports + 1) > 1)
	{
		this.levelShift(level);
	}

}
