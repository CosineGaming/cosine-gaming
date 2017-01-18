function resizeWindow()
{

	for (var i=0; i<2; i++)
	{
		CVs[i].canvas.width = window.innerWidth;
		CVs[i].canvas.height = window.innerHeight;
	}

	CVs[1].lineWidth = 4;

}

function resizeWindowCallback()
{
	if (resizeTimer)
	{
		clearTimeout(resizeTimer);
	}
	resizeTimer = setTimeout(resizeWindow, 100);
}

function unsupported()
{
	document.getElementById("error-text").innerHTML = "Sorry, but you're using an unsupported browser and can't play this game.";
	CVs[0] = null;
	CVs[1] = null;
}

function fatalError(info)
{
	document.getElementById("error-text").innerHTML = "A fatal error has occured: " + info + " Sorry. Try playing on a different browser.";
	CVs[0] = null;
	CVs[1] = null;
}

function debugLog(log)
{
	document.getElementById("error-text").innerHTML += log;
}

function key(which)
{
	for (var char=0; char<which.length; char++)
	{
		if (keys[which.charCodeAt(char)])
		{
			return true;
		}
	}
	return false;
}

// General Javascript help

function backUp(check, value)
{
	if (typeof check == "undefined")
	{
		return value;
	}
	return check;
}

// Input Handling

function mouseDown(event)
{

	// var x = event.clientX / tileWidth;
	// var y = event.clientY / tileHeight;
	// var direction = event.button == 0 ? 2 : 0.5;
	mouse.x = event.clientX;
	mouse.y = event.clientY;
	mouse.button = event.button;
	mouse.active = true;

	if (!window.haveTried)
	{
		var fullScreen = backUp(document.mozFullScreen, false);
		if (typeof document.webkitIsFullScreen != "undefined")
		{
			fullScreen = document.webkitIsFullScreen;
		}
		if (!fullScreen)
		{
			var body = document.getElementsByTagName("body")[0];
			if (body.requestFullScreen) body.requestFullScreen();
			if (body.mozRequestFullScreen) body.mozRequestFullScreen();
			window.haveTried = true;
			mouse.active = false;
		}
	}

}

function mouseUp(event)
{

	mouse.active = false;

}

function mouseMove(event)
{

	mouse.x = event.clientX;
	mouse.y = event.clientY;

}

function keyDown(event)
{
	if (!keys[event.keyCode])
	{
		// Don't act on repeats:
	}
	// Do act on repeats:
	keys[event.keyCode] = true;
}

function keyUp(event)
{
	keys[event.keyCode] = false;
}


// Rendering

function renderTile(x, y)
{

	var tileType = getTile([x, y]);
	var tile = levels[level].entities[tileType];

	if (tile)
	{

		var placeX = x * tileSize - camera.x;
		var placeY = y * tileSize - camera.y;
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
			var alpha = backUp(tile.alpha, 1);
			CVs[0].globalAlpha = alpha;
			CVs[0].drawImage(draw, Math.round(placeX), Math.round(placeY));
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

function averageEntity(weight, type)
{

    var totalX = 0;
    var totalY = 0;
    var count = 0;

    everyEntity(function(e){
        if (typeof e.x != "undefined" && typeof e.y != "undefined" &&
            typeof e.image != "undefined" && e.image.complete &&
			(typeof type == "undefined" || e.type == type)
			&& e.name != "bullet")
        {
			var power = backUp(e.power, 1);
            totalX += (e.x + e.image.width / 2) * power;
            totalY += (e.y + e.image.height / 2) * power;
            count += 1 * power;
        }
    });

    totalX += controlled.x * count * weight;
    totalY += controlled.y * count * weight;
    count += count * weight;

    totalX /= count;
    totalY /= count;

	return [totalX, totalY];

}

function updateCamera(delta)
{

	var big = levels[level].entities.big;

	var quadX = Math.max(1, Math.min(3, 2 - ~~((big.x - controlled.x) / (screenWidth() / 4))));
	var quadY = Math.max(1, Math.min(3, 2 - ~~((big.y - controlled.y) / (screenHeight() / 4))));

	var speed = 0.02;

	quadX = camera.lastQuadX + (quadX - camera.lastQuadX) * speed;
	quadY = camera.lastQuadY + (quadY - camera.lastQuadY) * speed;

    var centerX = controlled.x - screenWidth() / 4 * quadX;
    var centerY = controlled.y - screenHeight() / 4 * quadY;

	if (quadX != camera.lastQuadX || quadY != camera.lastQuadY)
	{
		camera.lastQuadX = quadX;
		camera.lastQuadY = quadY;
		camera.changed = true;
	}

	var lag = 10;

	camera.old.push({ x : centerX, y : centerY });

	if (camera.old.length > lag)
	{
		var old = camera.old.splice(0, 1)[0];
		if (old.x != camera.x || old.y != camera.y)
		{
			camera.x = old.x;
			camera.y = old.y;
			camera.changed = true;
		}
	}

}
