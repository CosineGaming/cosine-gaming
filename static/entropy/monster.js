function Monster(game, x, y, key, frame)
{

	var monsters = [
		{
			health: 100,
			touchDamage: 30,
			speed: 60,
			baseHeight: 8,
			consistency: 99.7,
			shoots: false
		},
		{
			health: 75,
			touchDamage: -100,
			speed: 20,
			baseHeight: 8,
			consistency: 99.4,
			shoots: true,
			firingRate: 10,
			bulletSpeed: 250,
			bulletStrength: 4,
			inaccuracy: 40
		},
		{
			health: 300,
			touchDamage: 100,
			speed: 5,
			baseHeight: 10,
			consistency: 99.7,
			shoots: false
		},
		{
			health: 200,
			touchDamage: -200,
			speed: 100,
			baseHeight: 12,
			consistency: 0,
			shoots: true,
			firingRate: 200,
			bulletSpeed: 40,
			bulletStrength: 20,
			inaccuracy: 10
		}
	];

	this.monsterType = Math.floor(Math.random() * monsters.length);
	Phaser.Sprite.call(this, game, 0, 0, "monster" + this.monsterType);

	var config = monsters[this.monsterType];
	this.initialHealth = config.health;
	this.health = this.initialHealth;
	this.touchDamage = config.touchDamage / 60;
	this.speed = config.speed;
	this.baseHeight = config.baseHeight;
	this.shoots = config.shoots;
	this.firingRate = config.firingRate;
	this.bulletCountdown = 0;
	this.bulletSpeed = config.bulletSpeed;
	this.bulletStrength = config.bulletStrength;
	this.inaccuracy = config.inaccuracy;

	this.x = Math.random() * (320 - 64 - 3 - 3) + 3;
	this.y = Math.random() * (180 - 64 - 52) + 52;

	this.aggressive = true;
	this.confidence = Math.random() * (1-config.consistency/100) + config.consistency/100;

	this.state = game.state.getCurrentState();

	var healthBarConfig = {x: this.x, y: this.y - 6, width: this.width / 2, height: 1,
	color: "#666666", bg: {color: "#444444"}, bar: {color: "#666666"}};
	this.healthBar = new HealthBar(game, healthBarConfig);

}

Monster.prototype = Object.create(Phaser.Sprite.prototype);
Monster.prototype.constructor = Player;

Monster.prototype.moveToCurrentLevel = function()
{
	this.state.monsters.removeChild(this);
	this.healthBar.kill()
	this.state = game.state.getCurrentState();
	this.state.monsters.add(this);
	this.healthBar.drawBackground();
	this.healthBar.drawHealthBar();

}

Monster.prototype.update = function()
{

	if (typeof this.body != "undefined" && this.body.offset.y == 0 && this.baseHeight != 0)
	{
		this.body.offset.y = this.baseHeight;
		this.body.width = this.width;
		this.body.height = this.height - this.baseHeight;
	}

	if (Math.random() > this.confidence)
	{
		this.aggressive = !this.aggressive;
	}
	if (typeof this.player == "undefined")
	{
		this.player = this.state.player;
	}
	if (this.aggressive)
	{
		game.physics.arcade.moveToXY(this, this.player.x, this.player.body.y - this.body.offset.y, this.speed);
	}
	else
	{
		// Move towards the the opposite of the direction towards the player away from this.
		// AKA: Phaser hack.
		game.physics.arcade.moveToXY(this, 2 * this.x - this.player.x, 2 * this.y - this.player.y, this.speed);
	}
	if (game.physics.arcade.collide(this, this.state.walls))
	{
		this.aggressive = true;
	}
	if (this.shoots)
	{

		this.bulletCountdown -= 1;
		if (this.bulletCountdown <= 0)
		{
			this.bulletCountdown = this.firingRate;
			var bullet = this.state.enemyBullets.create(this.body.center.x, this.body.center.y, "enemyBullet");
			bullet.checkWorldBounds = true;
			bullet.outOfBoundsKill = true;
			game.physics.arcade.enable(bullet);
			var x = this.player.body.x + this.player.body.width/2 + Math.random() * this.inaccuracy - this.inaccuracy / 2;
			var y = this.player.body.y + this.player.body.height/2 + Math.random() * this.inaccuracy - this.inaccuracy / 2;
			bullet.rotation = game.physics.arcade.moveToXY(bullet, x, y, this.bulletSpeed);
			bullet.strength = this.bulletStrength;
		}

	}

	game.physics.arcade.collide(this, this.state.bullets, function(monster, bullet)
	{
		monster.health -= monster.player.bulletStrength;
		bullet.destroy();
		monster.aggressive = false;
	});
	if (this.health <= 0)
	{
		this.healthBar.kill();
		this.destroy();
	}
	this.healthBar.setPosition(this.x + this.width / 2, this.y - 6);
	this.healthBar.setPercent(100 * this.health / this.initialHealth);

}
