var container = null;
var game = null;
var size = null;
var aspectExtra;
var resizeTimer;

var papers = [];
var paperGroup;
var paperObjects = [];
var options = [];
var optionGroup;
var optionObjects = [];
var answer;
var answerGroup;
var gridGroup;
var foldLine = [[0,0],[0,0]];
var foldLineObject;
var successObject;
var restartObject;

var level = 0;
var clickLine = false;

var hashModulus = 65521;

var mode = "line";

function initialize()
{

	container = document.getElementById("game");
	container.setAttribute("tabindex", 0)
	container.addEventListener("mousedown", mouseDown);
	container.addEventListener("mouseup", mouseUp);
	container.addEventListener("mousemove", hovered);
	container.addEventListener("keydown", pressed);
	container.addEventListener("keyup", released);
	container.focus();
	container.style.backgroundColor = "#00010f";

	game = SVG("game");
	resize();
	window.onresize = resizeCallback;

	loadLevel(0, true);

}

function loadLevel(index, firstTime)
{

	if (typeof index !== 'undefined')
	{
		level = index;
	}

	if (level >= levels.length)
	{
		alert("YOU WIN!");
		return;
	}

	if (!firstTime)
	{
		papers = [];
		paperGroup.remove();
		paperObjects = [];
		options = [];
		optionGroup.remove();
		optionObjects = [];
		foldLineObject.remove();
		answerGroup.remove();
		gridGroup.remove();
		successObject.remove();
		restartObject.remove();
	}

	papers.push([[16,16], [112,16], [112,112], [16,112]]);
	paperGroup = game.group().opacity(0);
	paperObjects.push(paperGroup.polygon(papers[0]));
	optionGroup = game.group().opacity(0);
	colorLayers(false);
	foldLineObject = game.line([[0, 0], [0, 0]]).stroke({color:"#f698ec", width: 0.5});
	answerGroup = game.group();
	var gridStyle = { color: "#bbb", width: 0.1 };
	gridGroup = game.group();
	for (var i=0; i<=128; i+=8)
	{
		gridGroup.line(i, 0, i, 128).stroke(gridStyle);
		gridGroup.line(0, i, 128, i).stroke(gridStyle);
	}
	restartObject = game.image("static/creased/assets/restart.svg", 10, 10).move(5, 5);
	successObject = game.image("static/creased/assets/success.svg").opacity(0);

	answer = levels[level].hash;
	for (var layer=0; layer<levels[level].layers.length; ++layer)
	{
		var color = 255-layer*10;
		answerGroup.polygon(levels[level].layers[layer]).fill(new SVG.Color({r:color, g:color-50, b:color-50}));
	}

	setTimeout(function(){showPaper(true);}, 2500);

}

function showPaper(show)
{
	answerGroup.opacity(1.3-show);
	paperGroup.opacity(0.1+show);
	optionGroup.opacity(0.1+show);
}

function mouseDown(e)
{
	if (mode == "line")
	{
		if (!clickLine)
		{
			foldLine[0] = [Math.round(gameX(e.clientX)/8)*8, Math.round(gameY(e.clientY)/8)*8];
			e.preventDefault();
			hovered(e);
		}
	}
}
function hovered(e)
{
	if (mode == "line")
	{
		if (e.buttons || clickLine)
		{
			foldLine[1] = [gameX(e.clientX), gameY(e.clientY)];
			// If the line spans at least a square
			if (foldLine[0][0] != Math.round(gameX(e.clientX)/8)*8 || foldLine[0][1] != Math.round(gameY(e.clientY)/8)*8)
			{
				// If the button is held down long enough to move squares, and then released in the same square,
				// we can assume that they were trying to cancel their line. By setting clickLine to true,
				// it will be as if they have already clicked, so when the release the line will be canceled in mouseUp
				clickLine = true;
			}
			foldLineObject.plot(foldLine);
		}
	}
	else if (mode == "pick")
	{
		pick(e);
	}
	else
	{
		alert("Mode not specified!");
	}
}
function mouseUp(e)
{

	if (gameX(e.clientX) > 5 && gameX(e.clientX) < 15 && gameY(e.clientY) > 5 && gameY(e.clientY) < 15)
	{
		if (clickLine)
		{
			clickLine = false;
			foldLineObject.plot([[0,0],[0,0]]);
		}
		else
		{
			loadLevel(level);
		}
	}
	else if (mode == "line")
	{
		foldLine[1][0] = Math.round(gameX(e.clientX)/8)*8;
		foldLine[1][1] = Math.round(gameY(e.clientY)/8)*8;
		if (foldLine[0][0] == foldLine[1][0] && foldLine[0][1] == foldLine[1][1])
		{
			if (!clickLine)
			{
				// The mouse didn't move; they're clicking two points rather than dragging
				clickLine = true;
			}
			else
			{
				// They clicked twice in the same place; they must be trying to cancel
				clickLine = false;
				foldLineObject.plot([[0,0],[0,0]]);
			}
		}
		else
		{
			split();
			mode = "pick";
			hovered(e);
			foldLineObject.plot(foldLine);
			clickLine = false;
		}
	}
	else if (mode == "pick")
	{
		fold(pick(e));
		colorLayers();
		mode = "line";
		if (hashPaper() == answer)
		{
			successObject.opacity(1);
			setTimeout(function(){loadLevel(level+1);},2000);
		}
	}
	else
	{
		alert("Mode not set by default!")
	}

}

function split()
{

	// Fold each layer of the paper
	for (var layer=0; layer<papers.length; ++layer)
	{
		var paper = papers[layer];
		var intersections = 0;
		var option = [];
		var firstPoint = paper[0];
		var m = slope(foldLine);
		var b = yIntercept(m, foldLine[0]);
		var paperUp;
		var epsilon = 0.001;
		if (m != null)
		{
			if (Math.abs(paper[0][1] - (m*paper[0][0]+b)) < epsilon)
			{
				if (Math.abs(paper[1][1] - (m*paper[1][0]+b)) < epsilon)
				{
					// Starts on the line. paperUp is the next point's paperUp value (because 2 is even)
					paperUp = paper[2][1] + epsilon > m*paper[2][0]+b;
				}
				else
				{
					// Starts on a point. paperUp is the opposite of the next point's paperUp value (because 1 is odd)
					paperUp = paper[1][1] + epsilon < m*paper[1][0]+b;
				}
			}
			else
			{
				// Starts off the point. PaperUp is the first point's paperUp value
				paperUp = paper[0][1] + epsilon > m*paper[0][0]+b;
			}
			// Lands directly on the line.
		}
		else
		{
			paperUp = firstPoint[0] - epsilon < foldLine[0][0];
			// Lands directly on the line.
			if (paperUp && firstPoint[0] + epsilon > foldLine[0][0])
			{
				paperUp = true;
			}
		}
		for (var i=0; i<paper.length; ++i)
		{
			var nextPoint;
			if (i != paper.length-1)
				nextPoint = paper[i+1]
			else
				nextPoint = firstPoint;
			intersection = intersect([paper[i], nextPoint], foldLine);
			var x = intersection[0];
			var y = intersection[1];
			// Checks if the intersect is within the bounds of both line segments
			var intersected = (
				x >= Math.min(nextPoint[0], paper[i][0]) && x <= Math.max(nextPoint[0], paper[i][0]) &&
				y >= Math.min(nextPoint[1], paper[i][1]) && y <= Math.max(nextPoint[1], paper[i][1]) &&
				x >= Math.min(foldLine[0][0], foldLine[1][0]) && x <= Math.max(foldLine[0][0], foldLine[1][0]) &&
				y >= Math.min(foldLine[0][1], foldLine[1][1]) && y <= Math.max(foldLine[0][1], foldLine[1][1]));
			var intersectVertex = x == paper[i][0] && y == paper[i][1];
			if (intersectVertex)
			{
				//alert(paperUp);
			}
			if (x == nextPoint[0] && y == nextPoint[1])
			{
				intersected = false;
			}
			if (((intersections == 1 && paperUp) || (intersections != 1 && !paperUp)) && !intersectVertex)
			{
				// It's an option vertex
				option.push(paper[i]);
				paper.splice(i--, 1);
			}
			if (intersected)
			{
				if (!intersectVertex)
				{
					paper.splice(++i, 0, [x, y]);
				}
				option.push([x, y]);
				++intersections;
			}
		}
		if (paper.length <= 2)
		{
			paperObjects[layer].remove();
			paperObjects.splice(layer, 1);
			papers.splice(layer--, 1);
		}
		else
		{
			paperObjects[layer].plot(paper);
		}
		if (option.length > 2)
		{
			optionObjects.push(optionGroup.polygon(option));
			options.push(option);
		}

	}

}

// Returns true if paper section is selected, false if option section
function pick(e)
{

	// The piece containing paper[0] is by default the bottom layer
	// Determine if this corner is above or below the line, in order to map mouse position to layer
	var m = slope(foldLine);
	var b = yIntercept(m, foldLine[0]);
	var mouseUp;
	if (m != null)
		mouseUp = gameY(e.clientY) > m*gameX(e.clientX)+b;
	else
		mouseUp = gameX(e.clientX) < foldLine[0][0];
	if (mouseUp)
	{
		colorLayers(true);
		optionGroup.fill("#fff");
		return true;
	}
	else
	{
		colorLayers(false);
		optionGroup.fill("#f698ec");
		return false;
	}

}

function fold(paperSelected)
{
	var m = slope(foldLine);
	var b = yIntercept(m, foldLine[0]); // Equation for y-intercept
	var pieces;
	if (paperSelected)
		pieces = papers;
	else
		pieces = options;
	for (var layer=0; layer<pieces.length; ++layer)
	{
		var piece = pieces[layer];
		for (var i=0; i<piece.length; ++i)
		{
			if (m != null)
			{
				// Algorithm for reflecting point across line
				var d = (piece[i][0] + (piece[i][1]-b)*m)/(1 + m*m);
				var newX = 2*d - piece[i][0];
				var newY = 2*d*m - piece[i][1] + 2*b;
				piece[i] = [newX, newY];
			}
			else
			{
				// Vertical line, just slide over
				piece[i] = [-piece[i][0]+2*foldLine[0][0], piece[i][1]];
			}
		}
	}
	for (var layer=0; layer<options.length; ++layer)
	{
		var entry = (!paperSelected)*papers.length + paperSelected*layer;
		papers.splice(entry, 0, options[layer]);
		paperObjects.splice(entry, 0, optionObjects[layer]);
		paperGroup.add(paperObjects[entry]);
	}
	for (var layer=0; layer<paperObjects.length; ++layer)
	{
		paperObjects[layer].plot(papers[layer]);
	}
	options = [];
	optionObjects = [];
}

function colorLayers(paperHighlighted)
{
	// Highlight color
	var highlightColor = {r: 246, g: 153, b: 236};
	var baseColor = {r: 211, g: 228, b: 249};
	var per = 10;
	var paperColor;
	var optionColor;
	if (paperHighlighted)
	{
		paperColor = highlightColor;
		optionColor = baseColor;
	}
	else
	{
		paperColor = baseColor;
		optionColor = highlightColor;
	}
	for (var layer=0; layer<paperObjects.length; ++layer)
	{
		var grey = per*layer;
		paperObjects[layer].fill(new SVG.Color({r: paperColor.r-grey, g: paperColor.g-grey, b: paperColor.b-grey}));
		// Order elements to ensure proper display order
		paperObjects[layer].remove();
		paperGroup.add(paperObjects[layer]);
	}
	for (var layer=0; layer<optionObjects.length; ++layer)
	{
		var grey = per*layer;
		optionObjects[layer].fill(new SVG.Color({r: optionColor.r-grey, g: optionColor.g-grey, b: optionColor.b-grey}));
	}
}

// Returs [x, y]. Returns [null, null] if lines are parallel
function intersect(line1, line2)
{
	var m = slope(line2); // Slope
	var b = yIntercept(m, line2[0]); // Equation for y-intercept
	var n = slope(line1);
	var x;
	var y;
	if (n != null)
	{
		var c = yIntercept(n, line1[0]);
		if (m != null)
		{
			if (m-n == 0)
			{
				if (c == b)
				{
					// Exact same line. Return the first point
					return line1[0];
				}
				else
				{
					// Parallel lines
					return [null, null];
				}
			}
			x = (c-b)/(m-n); // Equation for intersection of a line
			y = m*x+b;
		}
		else
		{
			x = line2[0][0];
			y = n*x+c;
		}
	}
	else if (m != null)
	{
		x = line1[0][0]; // Vertical line: x is any point on it
		y = m*x+b;
	}
	return [x, y];
}

function yIntercept(m, point)
{
	return point[1] - m*point[0];
}

function hashPaper()
{
	var hash = 0;
	for (var layer=0; layer<papers.length; ++layer)
	{
		for (var point=0; point<papers[layer].length; ++point)
		{
			hash += papers[layer][point][0] + papers[layer][point][1];
			hash %= hashModulus;
		}
	}
	return hash;
}

function pressed(e)
{

	if (e.keyCode == ' '.charCodeAt(0))
	{
		showPaper(false);
	}

}

function released(e)
{

	if (e.keyCode == ' '.charCodeAt(0))
	{
		showPaper(true);
	}
	if (e.keyCode == 'R'.charCodeAt(0))
	{
		loadLevel(level);
	}
	if (e.keyCode == '0'.charCodeAt(0))
	{
		loadLevel(level+1);
	}
	if (e.keyCode == '9'.charCodeAt(0))
	{
		loadLevel(level-1);
	}

	if (e.keyCode == '='.charCodeAt(0))
	{
		document.write("{layers:[")
		for (var layer=0; layer<papers.length; ++layer)
		{
			document.write("[");
			for (var point=0; point<papers[layer].length; ++point)
			{
				document.write("[")
				document.write(papers[layer][point]);
				document.write("]")
				if (point != papers[layer].length - 1)
				{
					document.write(",")
				}
			}
			document.write("]");
			if (layer != papers.length-1)
			{
				document.write(",");
			}
		}
		document.write("],hash:");
		document.write(hashPaper());
		document.write("}")
	}

}

function slope(line)
{
	var dx = line[1][0] - line[0][0];
	if (dx == 0)
		return null;
	else
		return (line[1][1] - line[0][1]) / dx;
}

function gameX(windowX)
{
	return (windowX - window.innerWidth / 2) / size * 128 + 64;
}
function gameY(windowY)
{
	return windowY / size * 128;
}

function resize()
{
	size = Math.min(window.innerWidth, window.innerHeight);
	aspectExtra = (window.innerWidth - window.innerHeight) / 2; // TODO: Make axis-independent
	//game.viewbox(-aspectExtra,128+aspectExtra,128,128);
	game.viewbox(0,0,128,128);
	container.style.width = window.innerWidth + "px";
	container.style.height = window.innerHeight + "px";
}

function resizeCallback()
{
	if (resizeTimer)
	{
		clearTimeout(resizeTimer);
	}
	resizeTimer = setTimeout(resize, 250);
}

onload = initialize;

