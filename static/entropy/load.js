function Load()
{

}

Load.prototype.preload = function()
{

	game.load.image("floor", "/static/entropy/assets/floor.png");
	game.load.image("frontWall", "/static/entropy/assets/frontWall.png");
	game.load.image("test", "/static/entropy/assets/test.png");
	game.load.image("portalUp", "/static/entropy/assets/portalUp.png");
	game.load.image("portalDown", "/static/entropy/assets/portalDown.png");
	game.load.image("cracks0", "/static/entropy/assets/cracks0.png");
	game.load.image("cracks1", "/static/entropy/assets/cracks1.png");
	game.load.image("cracks2", "/static/entropy/assets/cracks2.png");
	game.load.image("cracks3", "/static/entropy/assets/cracks3.png");
	game.load.image("bullet", "/static/entropy/assets/bullet.png");
	game.load.image("enemyBullet", "/static/entropy/assets/enemyBullet.png");
	game.load.image("arabic", "/static/entropy/assets/adobe-arabic-font.png");
	game.load.image("monster0", "/static/entropy/assets/monster0.png");
	game.load.image("monster1", "/static/entropy/assets/monster1.png");
	game.load.image("monster2", "/static/entropy/assets/monster2.png");
	game.load.image("monster3", "/static/entropy/assets/monster3.png");
    game.load.image("dpad", "/static/entropy/assets/dpad.png");

	game.load.spritesheet("player", "/static/entropy/assets/player.png", 22, 35);

}

Load.prototype.create = function()
{
	setLevel(1);
}
