// @license magnet:?xt=urn:btih:0effb8f70b3b6f5f70ff270deftileHeight27c3f7705f85&dn=lgpl-3.0.txt General GNU Public License 3.0
// Inserts game into <canvas id="game"></canvas>

// Global Variables

var CVs = [undefined, undefined];

var sounds = {};

var keys = new Array(256);
var mouse = { x:0, y:0, button:0, active:false };

var lastTime = 0;

var levels;
var level = 0;
var levelWorlds = [];

var camera = { x: 0, y : 0, old : [], lastQuadX : 1, lastQuadY : 1, changed : false };
var clears = [];

var tileSize = 128;

// var lastSpace = false;
var resizeTimer = false;

var music;

var collideKeys;
var bulletIs = [];

var controlled;

// Entry point

window.onload = initialize;

// Fundamental Functions

function initialize()
{

	var tileCont = document.getElementById("tiles");
	if (!tileCont.getContext || !tileCont.getContext("2d"))
	{
		unsupported();
		return false;
	}
	CVs[0] = tileCont.getContext("2d");
	var entCont = document.getElementById("entities");
	CVs[1] = entCont.getContext("2d");

	entCont.setAttribute("tabindex", "0");
	entCont.focus();
	entCont.addEventListener("mousedown", mouseDown);
	entCont.addEventListener("mouseup", mouseUp);
	entCont.addEventListener("contextmenu", function(event){event.preventDefault();});
	entCont.addEventListener("mousemove", mouseMove);
	entCont.addEventListener("keydown", keyDown);
	entCont.addEventListener("keyup", keyUp);

	initializeWorld();

	resizeWindow();
	window.onresize = resizeWindowCallback;

	CVs[1].font = "20px white Candara";
	CVs[1].fillStyle = "#FFF";

	window.requestAnimationFrame(update);

	return true;

}

function initializeWorld()
{

	levels = [

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c f f f f f f f f f f f f f f f c",
				"c f f f f f f f f f f f f f f f c",
				"c f f g f f f f f f f f f g f f c",
				"c f f f f f f g g g f f f f f f c",
				"c f f f f f f g g g f f f f f f c",
				"c f f f f f f g g g f f f f f f c",
				"c f f g f f f f f f f f f g f f c",
				"c f f f f f f f f f f f f f f f c",
				"c f f f f f f f f f f f f f f f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c g f f f f f f f f f f f f f g c",
				"c f g f f g f f f f f g f f g f c",
				"c f f g f f f f g f f f f g f f c",
				"c f f f f f f f g f f f f f f f c",
				"c f f f f f g g g g g f f f f f c",
				"c f f f f f f f g f f f f f f f c",
				"c f f g f f f f g f f f f g f f c",
				"c f g f f g f f f f f g f f g f c",
				"c g f f f f f f f f f f f f f g c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c l l l l l l l l l l l l l l l c",
				"c l g f f f f f f f f f f f g l c",
				"c l f f f f f f f f f f f f f l c",
				"c l f f g f f l l l f f g f f l c",
				"c l f f g f f l l l f f g f f l c",
				"c l f f g f f l l l f f g f f l c",
				"c l f f f f f f f f f f f f f l c",
				"c l g f f f f f f f f f f f g l c",
				"c l l l l l l l l l l l l l l l c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c f f l f f f f f f f f f l f f c",
				"c f f l f f f f f f f f f l f f c",
				"c l l g f f g g l g g f f g l l c",
				"c f f f f f g f f f g f f f f f c",
				"c f f f f f l f f f l f f f f f c",
				"c f f f f f g f f f g f f f f f c",
				"c l l g f f g g l g g f f g l l c",
				"c f f l f f f f f f f f f l f f c",
				"c f f l f f f f f f f f f l f f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c f f f f f f f f f f f f l f g c",
				"c f f f g l f f f f f f f f f f c",
				"c f f f f f f f f f f f f f f f c",
				"c f g f f f f f g f f f g f f f c",
				"c f l f f f f f f f l f f f f f c",
				"c f f f f f f f f f f f f f f f c",
				"c f f f f l f g f f f f f f f f c",
				"c f f g f f f f f f f g f f l f c",
				"c f f f f f f f f f f f f f g f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c f g f f f f f f g f f f f g g c",
				"c f f g f f f f f g f f f g g f c",
				"c f f f g f f f f g f f g f f f c",
				"c g f f f g f f f g f g f f f f c",
				"c g f f f f f f f f f f f f f f c",
				"c g f f f f f g f f f g g g f f c",
				"c f f f g f f g f f f g f f f f c",
				"c f f f g f f g f f f g f f f f c",
				"c f f f g f f f f f f g f f f f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c l f l f f l f f f f l f f f l c",
				"c f f f f f f l f f f l f f l f c",
				"c f f f f f f f l f f f f l f f c",
				"c l f l f f f f f f f l f f l l c",
				"c f f f f l f f f f f f f f f f c",
				"c f f f f f f l f f f l l f f l c",
				"c l l f f f f f f f f f f f f f c",
				"c f f f f f f f f f f f f l f f c",
				"c f f f l f f f l f f f f f l f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c f g f f f f g f f f f l l f f c",
				"c f g f l f f f f g f f f l g f c",
				"c f f f g f f l f f g l f f f f c",
				"c f f f f f f l l f f g l f g l c",
				"c f l f f f g f f f f f g f f f c",
				"c f l f f f g f f f f f g f f f c",
				"c g l f g l f g l g g f f f l f c",
				"c f l f g f f f l f f f f g f f c",
				"c f f f g f f f l f f f l f f f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c f g l f f f f f f f f g l l l c",
				"c f g f f f f f f f f f g l f l c",
				"c f g f f g g g g g f f g f f l c",
				"c f g f f f f f f g f f g f f f c",
				"c f g l l g f f l g f f g f f f c",
				"c f g l g f f f g f f g f f f f c",
				"c f g g f f f g f f g f f f l f c",
				"c f g f f f g f f g f f f l f f c",
				"c f f f f g f f f f f f l f f f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		},

		{

			tiles : [
				"a r r r r r r r r r r r r r r r b",
				"c f f f f f f f f f f f f f f f c",
				"c f l l l l l f l l l f f l f f c",
				"c f f f f f f l f f f l f f l f c",
				"c f l l f f f f f f f f l f f l c",
				"c f l l f f f l f f f l f f f l c",
				"c f l l l l f f l l l f f f l f c",
				"c f l f f l l f f f f f f l f f c",
				"c f f f l f f l f f f l l f f f c",
				"c f f f f f f f l l l f f f f f c",
				"y r r r r r r r r r r r r r r r z"
			],
			entities : new Object()

		}

	];

	music = new Audio("assets/audio/edm-detection-mode.mp3");
	music.loop = true;
	music.play();

	initializeLevel();

}

function initializeLevel()
{

	for (var y=0; y<levels[level].tiles.length; y++)
	{
		levels[level].tiles[y] = (levels[level].tiles[y]).split("");
		for (var x=0; x<levels[level].tiles[y].length; x++)
		{
            var tile = levels[level].tiles[y][x];
			if (tile == " ")
			{
				levels[level].tiles[y].splice(x, 1);
				x -= 1;
			}
            else if (tile != "-")
            {
                levels[level].entities[tile] = new Entity("assets/" + tile + ".png");
            }
		}
	}

	var acc = 5000;
	var mil = 1000;
	var speed = acc / mil / mil;
	var resistance = 0.99
    var big = new Entity("assets/big.png", 0, 0, updateBig, "big", "big", speed, resistance);
	big.aggressive = true;
	big.maxHealth = 1000 + 373 * level;
	big.health = big.maxHealth;
	big.spawnSafe();
	levels[level].entities.big = big;

    for (var i=0; i < 10+level*4; i++)
    {

		var acc = 6000;
		var speed = acc / mil / mil;
		var resistance = 0.9925;

		e = new Entity(undefined, 0, 0, updateAI, "enemy", "swarm", speed, resistance);
		e.aggressive = true;
		e.maxHealth = 7;
		e.health = e.maxHealth;
		e.key = i;
		e.loadAnimation("assets/anim/swarm/", 10, 2, undefined, true, false);
		e.width = 50;
		e.height = 50;
		e.origin.x = 25;
		e.origin.y = 25;

		e.spawnSafe();

		levels[level].entities[i] = e;

    }

	levels[level].bullets = [];

    controlled = levels[level].entities[0];

}

function render(updateTime)
{

	if ("CVs" in window)
	{
	}
	else
	{
		// We can't render if we don't have a game.
		return;
	}

	if (camera.changed)
	{

		CVs[0].clearRect(0, 0, CVs[0].canvas.width, CVs[0].canvas.height);

		for (var y=0; y<levels[level].tiles.length; y++)
		{
			for (var x=0; x<levels[level].tiles[y].length; x++)
			{
				renderTile(x, y);
			}
		}

	}

	var displayFps = false;

	for (var clear=0; clear<clears.length; clear+=4)
	{
		var x = clears[clear];
		var y = clears[clear + 1];
		var width = clears[clear + 2];
		var height = clears[clear + 3];
		CVs[1].clearRect(x, y, width, height);
	}

	if (displayFps)
	{
		CVs[1].clearRect(0, 0, 50, 50);
	}

	clears = [];

	everyEntity(function(entity){entity.render();});

	for (var i=0; i<levels[level].bullets.length; i++)
	{
		var b = levels[level].bullets[i];
		if (b)
		{
			b.render();
		}
	}

	if (displayFps)
	{
		CVs[1].fillText(String(Math.round(updateTime)), 20, 20);
	}

}

function update(totalTime)
{

	var nextFrame = window.requestAnimationFrame(update);

	delta = totalTime - lastTime;

	lastTime = totalTime;

	var x = controlled.x;
	var y = controlled.y;

    if (key("A"))
    {
        controlled.xVel -= controlled.speed * delta;
    }
    if (key("D") || key("E"))
    {
        controlled.xVel += controlled.speed * delta;
    }
    if (key("S") || key("O"))
    {
        controlled.yVel += controlled.speed * delta;
    }
    if (key("W") || keys[188])
    {
        controlled.yVel -= controlled.speed * delta;
    }
	if (key("N") && key("L") && controlled.cool <= 0)
	{
		level += 1;
		initializeLevel();
		controlled.cool = 1000;
	}
	if (keys.indexOf(true) != -1)
	{
		controlled.animation.paused = false;
	}

	controlled.xVel *= Math.pow(controlled.resistance, delta);
	controlled.yVel *= Math.pow(controlled.resistance, delta);

	x += controlled.xVel * delta;
	y += controlled.yVel * delta;

	if (mouse.active)
	{

		knockback = shoot(controlled, mouse.x + camera.x, mouse.y + camera.y, "enemy", 1, 4, 1, 5, 100);

		x += knockback[0] * delta;
		y += knockback[1] * delta;

	}
	if (typeof controlled.cool == "undefined")
	{
		controlled.cool = 0;
	}
	controlled.cool -= delta;

	controlled.handleCollisions(x, y, ["g", "c", "r", "a", "b", "y", "z"]);

	if (controlled.health <= 0)
	{

		whimper = new Audio("assets/audio/death.wav");
		whimper.play();

		delete levels[level].entities[controlled.key];
		for (var k in levels[level].entities)
		{
			if (levels[level].entities.hasOwnProperty(k))
			{
				var e = levels[level].entities[k];
				if (e.type == "enemy" && e.name != "bullet" && e.health > 0)
				{
					controlled = e;
					controlled.animation.paused = true;
					break;
				}
			}
		}
		if (controlled.health < 0)
		{
			window.location.href = "lose";
			window.cancelAnimationFrame(nextFrame);
			return;
		}

	}

	if (controlled.collideTile(controlled.x, controlled.y, ["l"]))
	{
		controlled.health -= 0.01 * delta;
	}

    everyEntity(function(e){
        if (typeof e.update != "undefined")
        {
            e.update(e, delta);
			e.keepInScreen();
			if (typeof e.health != "undefined")
			{
				e.alpha = e.health / e.maxHealth * 0.8 + 0.2;
			}
        }
    });

	for (var i=0; i<levels[level].bullets.length; i++)
	{
		var b = levels[level].bullets[i];
		if (b)
		{
			b.update(b, delta);
		}
	}

	collideKeys = undefined;

	updateCamera(delta);

	render(delta);

}

function updateAI(self, delta)
{

    if (self != controlled)
    {

		if (Math.random() < 0.01)
		{
			self.aggressive = !self.aggressive;
		}

		var big = levels[level].entities.big;

		var xDist = self.x - big.x;
		var yDist = self.y - big.y;

		var close = 256;

		var variation = 0.02;

		self.xVel += (self.speed * (xDist < 0 ? 1 : -1) * (self.aggressive ? 1 : -1) + (Math.random() - 0.5) * variation) * delta;
    	self.yVel += (self.speed * (yDist < 0 ? 1 : -1) * (self.aggressive ? 1 : -1) + (Math.random() - 0.5) * variation) * delta;

		self.xVel *= Math.pow(self.resistance, delta);
		self.yVel *= Math.pow(self.resistance, delta);

		var x = self.x;
		var y = self.y;
		x += self.xVel * delta;
		y += self.yVel * delta;

		if (self.aggressive)
		{
			knockback = shoot(self, big.x, big.y, "enemy", 1, 4, 1, 10, 200);
			x += knockback[0] * delta;
			y += knockback[1] * delta;
		}
		if (typeof self.cool == "undefined")
		{
			self.cool = 0;
		}
		self.cool -= delta;

		collides = ["g", "c", "r", "a", "b", "y", "z", "l"];
		if (Math.random() < 0.001)
		{
			collides = ["g", "c", "r", "a", "b", "y", "z"];
		}
		if (self.collideTile(self.x, self.y, ["l"]))
		{
			collides = ["g", "c", "r", "a", "b", "y", "z"];
			self.health -= 0.1 * delta;
		}
		if (self.handleCollisions(x, y, collides))
		{
			self.aggressive = true;
		}

		if (self.health <= 0)
		{
			delete levels[level].entities[self.key];
		}

    }

}


function updateBig(self, delta)
{

	if (Math.random() < 0.01)
	{
		self.aggressive = !self.aggressive;
	}

	var center = averageEntity(2, "enemy");

	var dX = center[0];
	var dY = center[1];

	if (Math.random() < 0.5)
	{

		var target;
		var count = 0;
		if (Math.random() < 0.5)
		{
			target = controlled;
		}
		else
		{
			for (var e in levels[level].entities)
			{
				if (Math.random() < 1/++count)
				{
					target = e;
				}
			}
		}
		dX = target.x;
		dY = target.y;

	}

	self.xVel += (self.x < dX ? -1 : 1) * (self.aggressive ? -1 : 1) * self.speed * delta;
	self.yVel += (self.y < dY ? -1 : 1) * (self.aggressive ? -1 : 1) * self.speed * delta;

	self.xVel *= Math.pow(self.resistance, delta);
	self.yVel *= Math.pow(self.resistance, delta);

	var x = self.x;
	var y = self.y;

	if (self.aggressive)
	{
		if (Math.random() < 0.75)
		{

			knockback = shoot(self, dX, dY, "big", 1, 2, 1, 7, 150);
			// x += knockback[0] * delta;
			// y += knockback[1] * delta;

		}
	}
	if (typeof self.cool == "undefined")
	{
		self.cool = 0;
	}
	self.cool -= delta;

	x += self.xVel * delta;
	y += self.yVel * delta;

	collides = ["g", "c", "r", "a", "b", "y", "z", "l"]
	if (Math.random() < 0.01)
	{
		collides = ["g", "c", "r", "a", "b", "y", "z"]
	}
	if (self.collideTile(self.x, self.y, ["l"]))
	{
		collides = ["g", "c", "r", "a", "b", "y", "z"]
		self.health -= 0.1 * delta;
	}
	if (self.handleCollisions(x, y, collides))
	{
		if (Math.random() < 0.1)
		{
			self.aggressive = true;
		}
	}

	if (self.health <= 0)
	{
		self.alpha = 0;
		if (level + 1 < levels.length)
		{
			win = new Audio("assets/audio/win.wav");
			win.play()
			level += 1;
			initializeLevel();
		}
		else
		{
			window.location.href = "win";
			return;
		}
	}

	music.volume = 1 - self.health / self.maxHealth * 0.9;

}

function updateBullet(self, delta)
{

	var x = self.x;
	var y = self.y;
	x += self.xVel * delta;
	y += self.yVel * delta;
	self.power *= Math.pow(self.resistance, delta);
	self.alpha = self.power / self.maxPower;

	var other = "enemy"
	if (self.type == "enemy")
	{
		other = "big";
	}

	other = self.collideWorld(x, y, [other]);

	if (other)
	{

		other.health -= self.power;
		if (Math.random() < 0.5)
		{
			other.aggressive = false;
		}

	}

	var solids = ["g", "c", "r", "a", "b", "y", "z"];
	var tile = self.collideTile(x, y, solids);

	if (other || self.alpha <= 0 || tile)
	{

		delete levels[level].bullets[self.key];
		bulletIs.push(self.key);

	}

	self.x = x;
	self.y = y;

}

function shoot(entity, towardsX, towardsY, type, speed, accuracy, knockback, power, cool)
{

	if (entity.cool <= 0)
	{

		var startX = entity.x + entity.origin.x + entity.width / 2;
		var startY = entity.y + entity.origin.y + entity.height / 2;

		var dX = (towardsX - startX);
		var dY = (towardsY - startY);
		var length = Math.sqrt(dX*dX + dY*dY) / speed;
		dX /= length;
		dY /= length;
		dX += (Math.random() - 0.5) / accuracy;
		dY += (Math.random() - 0.5) / accuracy;

		var bullet = new Entity(undefined, startX, startY, updateBullet, type, "bullet", 0, 0.996, dX, dY);

		var image = "assets/bullet.png";
		var setWidth = false;
		if (type == "big")
		{
			image = "assets/big-bullet.png";
			bullet.origin.x = 6;
			bullet.origin.y = 6;
			bullet.width = 20;
			bullet.height = 20;
			setWidth = true;
		}
		bullet.loadImage(image, setWidth);

		bullet.maxPower = power;
		bullet.power = bullet.maxPower;
		var key = Math.random();
		bullet.key = key;

		if (bulletIs.length)
		{
			var i = bulletIs.splice(0, 1)[0];
			bullet.key = i;
			levels[level].bullets[i] = bullet;
		}
		else
		{
			bullet.key = levels[level].bullets.length;
			levels[level].bullets.push(bullet);
		}

		entity.cool = cool;

		if (entity == controlled)
		{
			var bang = new Audio("assets/audio/bang.wav");
			bang.volume = 0.1;
			bang.play();
		}

		return [-1 * dX * knockback, -1 * dY * knockback];

	}

	return [0, 0];

}


// @license-end
