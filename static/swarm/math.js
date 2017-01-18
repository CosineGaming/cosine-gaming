// Positions

function tilePos(x, y)
{
	return [Math.floor(x / tileSize), Math.floor(y / tileSize)];
}

function getTile(tile)
{
	if (tile[0] >= 0 && tile[0] < levels[level].tiles[0].length &&
		tile[1] >= 0 && tile[1] < levels[level].tiles.length)
	{
		return levels[level].tiles[tile[1]][tile[0]];
	}
	else
	{
		return "-";
	}
}

// Convenience

function levelWidth()
{
    return levels[level].tiles[0].length;
}

function levelHeight()
{
    return levels[level].tiles.length;
}

function randInt(min, max)
{
	return Math.floor(Math.random() * (max - min)) + min;
}

function screenWidth()
{
	return CVs[0].canvas.width;
}

function screenHeight()
{
	return CVs[0].canvas.height;
}