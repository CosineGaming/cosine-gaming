function Player(portalUp, portalDown)
{

	this.portalUpHold = 0;
	this.portalDownHold = 0;
	this.bulletCharge = 0;
	this.bulletCool = 0;
	this.portalUp = portalUp;
	this.portalDown = portalDown;
	this.lastDown = false;

	this.bulletStrength = 20;

	Phaser.Sprite.call(this, game, 0, 0, "player");

	var frameRate = 10;
	this.animations.add("standLeft", [19], frameRate);
	this.animations.add("standRight", [17], frameRate);
	this.animations.add("standUp", [5], frameRate);
	this.animations.add("standDown", [11], frameRate, true);
	this.animations.add("walkLeft", [23, 22, 20, 21, 20, 22], frameRate, true);
	this.animations.add("walkRight", [13, 14, 16, 15, 16, 14], frameRate, true);
	this.animations.add("walkUp", [1, 5, 2, 5], frameRate, true);
	this.animations.add("walkDown", [7, 11, 8, 11], frameRate, true);
	this.animations.add("faceRight", [16], frameRate);
	this.animations.add("faceLeft", [20], frameRate);
	this.onStop = "standDown";

	this.maxHealth = 100;

	game.physics.arcade.enable(this);
	this.body.offset = new Phaser.Point(0, 32);
	var entrance = this.portalDown;
	if (!entrance)
	{
		entrance = this.portalUp;
	}
	// Place at just below portal
	this.x = entrance.body.center.x - this.body.width / 2;
	this.y = entrance.body.y - this.height + 5;
	this.body.width = 22;
	this.body.height = 4;

	this.state = game.state.getCurrentState();

	var healthBarConfig = {x: 38, y: 8,  width: 64, height: 4, bar: {color: "#00d2ff"}, bg: {color: "#00a2ff"}};
	var bulletBarConfig = {x: 22, y: 15, width: 32, height: 2, bar: {color: "#666666"}, bg: {color: "#444444"}};
	this.healthBar = new HealthBar(game, healthBarConfig);
	this.bulletBar = new HealthBar(game, bulletBarConfig);

}

Player.prototype = Object.create(Phaser.Sprite.prototype);
Player.prototype.constructor = Player;

Player.prototype.update = function()
{

	var touchDirX = 0;
	var touchDirY = 0;
	var  leftPointer = 0;
	var rightPointer = 0;
	
	if (game.input.pointer1.x > 160)
	{
		rightPointer = game.input.pointer1;
	}
	else if (game.input.pointer1.x != -1)
	{
		leftPointer = game.input.pointer1;
	}
	// This line accounts for two pointers that are in the same half
	// If the pointer2 is on the right and it's not to the left of the first pointer OR it's to the right of the left pointer
	if ((game.input.pointer2.x > 160 && (!rightPointer || rightPointer.x < game.input.pointer2)) || (leftPointer && leftPointer.x < game.input.pointer2))
	{
		rightPointer = game.input.pointer2;
	}
	else if (game.input.pointer2.x != -1)
	{
		leftPointer = game.input.pointer2;
	}
	if (!leftPointer && !rightPointer)
	{
		rightPointer = game.input.activePointer;
	}

	var distance = 27;
	var holdFrames = 100;
	var withinDecreaseSpeed = 1;
	var decreaseSpeed = 2;
	var goingDown = false;
	var chargeKeep = 0.5;
	if (true)//actions.chargePortal.isDown)
	{
		if (Phaser.Point.distance(this.body.center, this.portalUp.body.center) < distance
			  && (Phaser.Point.distance(this.portalUp.body.center, leftPointer) < distance
				  || Phaser.Point.distance(this.portalUp.body.center, rightPointer) < distance))
		{
			this.portalUpHold++;
			if (this.portalUpHold > holdFrames)
			{
				this.portalUpHold *= chargeKeep;
				entropy += 1;
				setLevel(level + 1);
			}
		}
		else if (this.portalDown && Phaser.Point.distance(this.body.center, this.portalDown.body.center) < distance
			  && (Phaser.Point.distance(this.portalDown.body.center, leftPointer) < distance
					 || Phaser.Point.distance(this.portalDown.body.center, rightPointer) < distance))
		{
			this.portalDownHold++;
			if (this.portalDownHold > holdFrames)
			{
				this.portalDownHold *= chargeKeep;
				entropy += 1;
				setLevel(level - 1);
			}
		}
		else
		{
			goingDown = withinDecreaseSpeed;
		}
	}
	else
	{
		goingDown = decreaseSpeed;
	}
	if (goingDown)
	{
		if (this.portalUpHold > 0)
		{
			this.portalUpHold -= goingDown;
		}
		if (this.portalUpHold < 0)
		{
			this.portalUpHold = 0;
		}
		if (this.portalDownHold > 0)
		{
			this.portalDownHold -= goingDown;
		}
		if (this.portalDownHold < 0)
		{
			this.portalDownHold = 0;
		}
	}
	this.portalUp.tint = Phaser.Color.getColor(255, 255 * (1 - this.portalUpHold / holdFrames), 255 * (1 - this.portalUpHold / holdFrames));
	if (this.portalDown)
	{
		this.portalDown.tint = Phaser.Color.getColor(255, 255 * (1 - this.portalDownHold / holdFrames), 255 * (1 - this.portalDownHold / holdFrames));
	}

	//leftPointer = game.input.activePointer;
	if (leftPointer)
	{
		var dpadX = 25;
		var dpadY = 110;
		var dpadHS = 23;
		touchDirX = leftPointer.x - (dpadX + dpadHS) > 0 ? 1 : -1;
		touchDirY = leftPointer.y - (dpadY + dpadHS) > 0 ? 1 : -1;
	}

	var speed = 18;
	var friction = .85;
	if (cursors.left.isDown || actions.left.isDown || touchDirX == -1)
	{
		this.body.velocity.x -= speed;
	}
	if (cursors.right.isDown || actions.right.isDown || touchDirX == 1)
	{
		this.body.velocity.x += speed;
	}
	if (cursors.up.isDown || actions.up.isDown || touchDirY == -1)
	{
		this.body.velocity.y -= speed * perspective;
	}
	if (cursors.down.isDown || actions.down.isDown || touchDirY == 1)
	{
		this.body.velocity.y += speed * perspective;
	}
	this.body.velocity.x *= friction;
	this.body.velocity.y *= friction;
	if (Math.abs(this.body.velocity.x) > 1 || Math.abs(this.body.velocity.y) > 1)
	{
		if (Math.abs(this.body.velocity.x) > Math.abs(this.body.velocity.y))
		{
			if (this.body.velocity.x > 0)
			{
				this.animations.play("walkRight");
			}
			else
			{
				this.animations.play("walkLeft");
			}
		}
		else
		{
			if (this.body.velocity.y > 0)
			{
				this.animations.play("walkDown");
			}
			else
			{
				this.animations.play("walkUp");
			}
		}
		this.onStop = "stand" + this.animations.currentAnim.name.substr(4);
	}
	else
	{
		this.animations.play(this.onStop);
	}

	// Bullets
	var cool = 20;
	var charge = 0;
	var speed = 150;
	var mouseDown = rightPointer != -1 && rightPointer.isDown;
	if (mouseDown)
	{
		if (this.bulletCharge < 0 && this.bulletCool <= 0)
		{
			this.bulletCharge = charge;
		}
	}
	this.lastDown = mouseDown;
	// Brings to -1 after first shot
	if (this.bulletCharge > 0)
	{
		this.bulletCharge -= 1;
	}
	if (this.bulletCharge == 0)
	{
		// this.bulletCharge = rate;
		var bullet = this.state.bullets.create(this.x + 3, this.y + 26, "bullet");
		bullet.checkWorldBounds = true;
		bullet.outOfBoundsKill = true;
		game.physics.arcade.enable(bullet);
		bullet.rotation = game.physics.arcade.moveToXY(bullet, bullet.x + rightPointer.x - 273, bullet.y + rightPointer.y - 133, speed);
		this.bulletCool = cool;
		this.bulletCharge = -1;
	}
	if (this.bulletCool > 0)
	{
		this.bulletCool -= 1;
	}


	game.physics.arcade.collide(this, this.state.walls);
	game.physics.arcade.collide(this, this.portalUp);
	if (typeof this.state.portalDown != "undefned")
	{
		game.physics.arcade.collide(this, this.portalDown);
	}

	game.physics.arcade.collide(this, this.state.monsters, function(player, monster)
	{
		if (monster.touchDamage > 0)
		{
			health -= monster.touchDamage;
		}
		else
		{
			monster.health += monster.touchDamage;
		}
	});
	game.physics.arcade.overlap(this, this.state.enemyBullets, function(player, bullet)
	{
		health -= bullet.strength;
		bullet.destroy();
	});

	if (health <= 0)
	{
		health = 0;
		game.state.start("lose");
	}

	this.healthBar.setPercent(100 * health / this.maxHealth);
	var percent = 100 * (1 - (this.bulletCool / cool));
	this.bulletBar.setPercent(percent);

	this.state.sorted.sort("y", Phaser.Group.SORT_ASCENDING);

}

