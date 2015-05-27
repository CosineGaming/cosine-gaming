// Inserts game into <canvas id="game"></canvas>
// @license magnet:?xt=urn:btih:0effb8f70b3b6f5f70ff270deftileHeight27c3f7705f85&dn=lgpl-3.0.txt Lesser GNU Public License 3.0

// Global Variables

var container;
var game;

var sounds = {};

var keys = new Array(256);

var lastTime = 0;

var quadrantSpeeds = [];

var levels;
var level = 0;
var levelWorlds = [];

var tileWidth = 64;
var tileHeight = 32;

var levelWidth = 18;
var levelHeight = 18;

var gravity = 0.02;

var pulse = 0;
var pulseDir = 1;

var lastSpace = false;
var resizeTimer = false;

// Entry point

window.onload = initialize;

// Fundamental Functions

function initialize()
{

	container = document.getElementById("game");
	if (!container.getContext || !container.getContext("2d"))
	{
		unsupported();
		return false;
	}
	game = container.getContext("2d");

	container.setAttribute("tabindex", "0");
	container.focus();
	container.addEventListener("mousedown", mouseDown);
	container.addEventListener("mouseup", mouseUp);
	container.addEventListener("contextmenu", function(event){event.preventDefault();});
	container.addEventListener("mousemove", mouseMove);
	container.addEventListener("keydown", keyDown);
	container.addEventListener("keyup", keyUp);

	initializeWorld();

	resizeWindow();
	window.onresize = resizeWindowCallback;

	game.font = "20px white Candara";
	game.fillStyle = "#000"

	window.requestAnimationFrame(update);

	return true;

}

function initializeWorld()
{

	levels = [

		{
			tiles : [
				"- - - - - - - - - - - - - - - - - -",
				"- - - - - - - - - - - - - - - - - -",
				"- - - - - - - i - - - - - - - - - -",
				"- g - t - - - - - - - - - - - - - -",
				"- - - m - - i - - - - - i - - - - -",
				"- i - b - - i - - - - - i - - - - i",
				"- - - - - - - - - - - - - i - - - -",
				"- - - - - - - - - - - - - - i - - -",
				"- - i - - - - - - - - - - - - t - -",
				"- - - - - - - - - l h r - - - m - -",
				"- - - - - - - - - - - - - - - m - -",
				"- - - - - - i - - - - - - - - m - -",
				"- - - - - - - - - i - - - - - b - -",
				"- - - - - - - i - - - - - - - - - -",
				"- - i - - - - - i - - - - - - - - -",
				"- - - - - - i - - - - - - - - i - -",
				"- - - l h h h r - - - - - - - - - -",
				"- - - - - - - - - - - - - - - - - -"
			],
			entities : new Object(),
			splits : 3
		}

	];

	for (var i=0; i<levels.length; i++)
	{
		for (var y=0; y<levels[i].tiles.length; y++)
		{
			levels[i].tiles[y] = (levels[i].tiles[y]).split("");
			for (var x=0; x<levels[i].tiles[y].length; x++)
			{
				if (levels[i].tiles[y][x] == " ")
				{
					levels[i].tiles[y].splice(x, 1);
					// if (Math.floor(Math.random() * 10) == 0)
					// 	levels[i].tiles[y][x] = "g"
					// else
					// 	levels[i].tiles[y][x] = "-"
				}
			}
		}
	}

	// Level 1 tiles and moving tile placement
	//

	var player = new Entity(undefined, 1, 0, 0.8, 1.6, "player");
	levels[level].entities["player"] = player;
	player.animations = new Object();
	player.loadAnimation("assets/player/right/", 3, 4);
	player.animations["right"] = player.animation;
	player.loadAnimation("assets/player/left/", 3, 4);
	player.animations["left"] = player.animation;
	player.loadAnimation("assets/player/whack/", 4, 5, undefined, false);
	player.animations["whack"] = player.animation;
	player.loadAnimation("assets/player/hangRight/", 1, 5, undefined, false);
	player.animations["hangRight"] = player.animation;
	player.loadAnimation("assets/player/hangLeft/", 1, 5, undefined, false);
	player.animations["hangLeft"] = player.animation;
	player.loadAnimation("assets/player/rest/", 3, 10, [0,1,2,1]);
	player.animations["rest"] = player.animation;

	levels[0].background = new Entity("assets/themes/grass/bg.png", 0, 0, levelWidth, levelHeight);
	add = levels[0].entities;
	add["bear"] = new Entity(undefined, 4, 7, 1, 2);
	add["bear"].loadAnimation("assets/enemies/bear/", 3, 3);
	add["g"] = new Entity("assets/themes/grass/grass.png");
	add["l"] = new Entity("assets/themes/grass/horizontal/left.png");
	add["h"] = new Entity("assets/themes/grass/horizontal/middle.png");
	add["r"] = new Entity("assets/themes/grass/horizontal/right.png");
	add["b"] = new Entity("assets/themes/grass/wall/base.png");
	add["m"] = new Entity("assets/themes/grass/wall/middle.png");
	add["t"] = new Entity("assets/themes/grass/wall/top.png");
	add["1"] = new Entity(undefined, 4, 5, 1, 1, "tile", "grass", 0.05);
	add["1"].loadAnimation("assets/themes/grass/moving/", 5, 4);
	add["e1"] = new Entity(undefined, 4, 4, 0.5167, 0.8, "enemy", "dragon");
	add["e1"].loadAnimation("assets/enemies/dragon/rest/", 5, 4, [0,1,2,3,4,3,2,1]);
	add["2"] = new Entity(undefined, 5, 11, 1, 1, "tile", "grass", 0.05);
	add["2"].animation = add["1"].animation;
	add["3"] = new Entity(undefined, 2, 10, 1, 1, "tile", "grass", 0, -0.1);
	add["3"].animation = add["1"].animation;
	add["4"] = new Entity(undefined, 7, 3, 1, 1, "tile", "grass", 0, 0.1);
	add["4"].animation = add["1"].animation;
	add["6"] = new Entity(undefined, 8, 15, 1, 1, "tile", "grass", 0.05);
	add["6"].animation = add["1"].animation;
	add["7"] = new Entity(undefined, 14, 8, 1, 1, "tile", "grass", 0, 0.05);
	add["7"].animation = add["1"].animation;
	add["8"] = new Entity(undefined, 16, 5, 1, 1, "tile", "grass", -0.05);
	add["8"].animation = add["1"].animation;
	add["9"] = new Entity(undefined, 17, 6, 1, 1, "tile", "grass", -0.05);
	add["9"].loadAnimation("assets/themes/desert/tile/", 7, 4);
	add["0"] = new Entity(undefined, 9, 4, 1, 1, "tile", "grass", 0.05);
	add["0"].animation = add["9"].animation;

	resetQuadrantSpeeds();

}

function render(updateTime)
{

	if ("game" in window)
	{
		game.clearRect(0, 0, container.width, container.height);
	}
	else
	{
		// We can't render if we don't have a game.
		return;
	}

	levels[level].background.render();

	renderQuadrants();

	everyEntity(function(entity){entity.render();});

	for (var y=0; y<levelWidth; y++)
	{
		for (var x=0; x<levelHeight; x++)
		{
			renderTile(x, y);
		}
	}

	var displayFps = true;

	if (displayFps)
	{
		game.fillText(String(Math.round(updateTime)), 20, 20);
	}

}

function update(totalTime)
{

	window.requestAnimationFrame(update);

	delta = totalTime - lastTime;

	everyEntity(function(entity)
	{

		var speedMod = quadrantSpeed(entity.getQuadrant());

		var oldX = entity.x;
		var oldY = entity.y;

		if (entity.name != "player")
		{

			if (entity.xVelocity)
			{
				entity.x += entity.xVelocity * speedMod;
			}
			if (entity.yVelocity)
			{
				entity.y += entity.yVelocity * speedMod;
			}

		}

		if (entity.name == "tile")
		{

			var hit = entity.collides();
			var direct = false;
			if (hit)
			{
				if ((entity.xVelocity > 0 && hit.x - oldX >= 0.9)
					|| (entity.xVelocity < 0 && hit.x - oldX <= -0.9)
					|| (entity.yVelocity > 0 && hit.y - oldY >= 0.9)
					|| (entity.yVelocity < 0 && hit.y - oldY <= -0.9))
				{
					direct = true;
				}
			}
			if ((direct && hit.name != "player") || entity.keepInScreen())
			{
				entity.handleCollisions(oldX, oldY);
				entity.xVelocity *= -1;
				entity.yVelocity *= -1;
				entity.x += entity.xVelocity;
				entity.y += entity.yVelocity;
			}
			else if (hit)
			{
				//alert(hit.x - oldX);
			}

		}

		if (entity.name == "enemy")
		{

			entity.yVelocity += gravity * speedMod;
			entity.handleCollisions(oldX, oldY);

		}

	});

	var player = levels[level].entities["player"];

	var speedMod = quadrantSpeed(player.getQuadrant());

	if (speedMod != 0)
	{

		var speed = 0.15 * speedMod;

		var oldX = player.x;
		var oldY = player.y;

		var hangLeft = player.collidesTile(player.x + 0.001, player.y - 0.001) ? 1 : 0;
		var hangRight = player.collidesTile(player.x - 0.001, player.y - 0.001) ? 1 : 0;

		if (key("A") && !hangLeft)
		{
			player.x -= speed;
			player.animation = player.animations["left"];
		}
		else if (key("D") && !hangRight)
		{
			player.x += speed;
			player.animation = player.animations["right"];
		}
		else
		{
			player.animation = player.animations["rest"];
		}

		var rub = player.collidesWorld();
		if (key("E"))
		{
			if (rub)
			{
				if (rub.name == "enemy")
				{
					rub.image = null;
				}
			}
			player.animation = player.animations["whack"];
		}
		else
		{
			player.animations["whack"].frame = 0;
		}

		var jumpSpeed = -0.3;
		if (hangLeft || hangRight)
		{
			if (hangLeft)
			{
				player.animation = player.animations["hangLeft"];
			}
			if (hangRight)
			{
				player.animation = player.animations["hangRight"];
			}
			player.yVelocity = 0.05;
			if (key(" W") && !lastSpace)
			{
				player.yVelocity = jumpSpeed * 1.2;
				player.xVelocity = 0.09 * (hangRight * 2 - 1);
				player.x += speed * (hangRight * 2 - 1);
			}
		}

		if ((key(" W") || keys[0]) && player.collides(player.x, player.y + 0.001) && !lastSpace)
		{
			player.yVelocity = jumpSpeed;
		}
		lastSpace = key(" W");

		player.x += player.xVelocity * speedMod;
		player.y += player.yVelocity * speedMod;
		player.xVelocity *= Math.pow(0.9, speedMod);
		player.yVelocity += gravity * speedMod;

		player.handleCollisions(oldX, oldY);

		player.keepInScreen();

	}

	pulse += 0.02 * pulseDir;
	if (pulse >= 1 || pulse <= 0)
	{
		pulseDir *= -1;
	}

	render(delta);

	lastTime = totalTime;

}

function renderQuadrants()
{

	for (var x=0; x<quadrantSpeeds.length; x++)
	{
		for (var y=0; y<quadrantSpeeds[x].length; y++)
		{
			game.beginPath();
			//game.fillStyle = "rgba(0,0,0," + String(quadrantSpeed([x, y]) / 4) + ")";
			var shade = String(Math.floor(quadrantSpeed([x, y]) * 128));
			game.fillStyle = "rgba(" + shade + "," + shade + "," + shade + ",0.6)";
			var sectWidth = container.width / levels[level].splits;
			var sectHeight = container.height / levels[level].splits;
			game.rect(x * sectWidth, y * sectHeight, sectWidth, sectHeight);
			game.fill();
		}
	}

	game.strokeStyle = "rgba(0,0,0," + String(pulse) + ")";
	var xDistance = container.width / levels[level].splits;
	for (var x=1; x<levels[level].splits; x++)
	{
		game.beginPath();
		game.moveTo(x * xDistance, 0);
		game.lineTo(x * xDistance, container.height);
		game.stroke();
	}
	var yDistance = container.height / levels[level].splits;
	for (var y=1; y<levels[level].splits; y++)
	{
		game.beginPath();
		game.moveTo(0, y * yDistance);
		game.lineTo(container.width, y * yDistance);
		game.stroke();
	}

}

function renderTile(x, y)
{

	var tileType = getTile([x, y]);
	var tile = levels[level].entities[tileType];

	if (tile)
	{

		var placeX = Math.round(x * tileWidth);
		var placeY = Math.round(y * tileHeight);
		var draw = null;

		if (tile.animation)
		{
			var frame = getAnimationFrame(tile.animation,
				quadrantSpeed(getQuadrant(x, y)));
			if (frame)
			{
				draw = frame;
			}
		}
		else if (tile.image)
		{
			draw = tile.image;
		}

		if (draw)
		{
			game.drawImage(draw, placeX, placeY, tileWidth, tileHeight);
		}

	}

}

function everyEntity(what)
{
	for (var key in levels[level].entities)
	{
		if (levels[level].entities.hasOwnProperty(key))
		{
			what(levels[level].entities[key]);
		}
	}
}

// Position math

function tilePos(x, y)
{
	return [Math.floor(x), Math.floor(y)];
}

function getTile(tile)
{
	if (tile[0] >= 0 && tile[0] < levelWidth &&
		tile[1] >= 0 && tile[1] < levelHeight)
	{
		return levels[level].tiles[tile[1]][tile[0]];
	}
	else
	{
		return "-";
	}
}

function getQuadrant(x, y)
{
	return [Math.floor(x * levels[level].splits / levelWidth),
		Math.floor(y * levels[level].splits / levelHeight)];
}

function quadrantSpeed(quadrant)
{
	if (quadrant[0] >= 0 && quadrant[0] < levels[level].splits
		&& quadrant[1] >= 0 && quadrant[1] < levels[level].splits)
	{
		return quadrantSpeeds[quadrant[0]][quadrant[1]];
	}
	else
	{
		return 1;
	}
}

function resetQuadrantSpeeds()
{
	quadrantSpeeds = [];
	for (var x=0; x<levels[level].splits; ++x)
	{
		quadrantSpeeds.push([]);
		for (var y=0; y<levels[level].splits; ++y)
		{
			quadrantSpeeds[x].push(1);
		}
	}
}

// @license-end
