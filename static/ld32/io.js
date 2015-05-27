function resizeWindow()
{

	container.width = window.innerWidth;
	container.height = window.innerHeight;
	tileWidth = Math.floor(container.width / levelWidth) + 1;
	tileHeight = Math.floor(container.height / levelHeight) + 1;

	game.imageSmoothingEnabled = false;
	game.mozImageSmoothingEnabled = false;
	game.webkitImageSmoothingEnabled = false;

	game.lineWidth = 4;

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
	container = null;
	game = null;
}

function fatalError(info)
{
	document.getElementById("error-text").innerHTML = "A fatal error has occured: " + info + " Sorry. Try playing on a different browser.";
	container = null;
	game = null;
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

	var x = event.clientX / tileWidth;
	var y = event.clientY / tileHeight;
	var direction = event.button == 0 ? 2 : 0.5;
	var quadrant = getQuadrant(x, y);

	var speed = quadrantSpeed(quadrant);

	quadrantSpeeds[quadrant[0]][quadrant[1]] *= direction;
	if (speed == 2 && direction == 2)
	{
		quadrantSpeeds[quadrant[0]][quadrant[1]] = 0.25;
	}
	if (speed == 0.25 && direction == 0.5)
	{
		quadrantSpeeds[quadrant[0]][quadrant[1]] = 2;
	}

}

function mouseUp(event)
{

}

function mouseMove(event)
{

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
