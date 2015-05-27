var Entity = (function()
{

	function Entity(image, x, y, width, height, name, type, xVelocity, yVelocity)
	{

		if (typeof image != "undefined")
		{
			this.loadImage(image);
		}
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.name = backUp(name, "none");
		this.type = backUp(type, "none");
		this.xVelocity = backUp(xVelocity, 0);
		this.yVelocity = backUp(yVelocity, 0);

	}

	Entity.prototype.render = function()
	{

		if (typeof this.x != "undefined")
		{

			var draw = false;

			if (this.animation)
			{
				var frame = this.getAnimationFrame();
				if (frame)
				{
					draw = frame;
				}
			}
			else if (this.image)
			{
				if (this.image.complete)
				{
					draw = this.image;
				}
			}

			if (draw)
			{

				var width = this.width;
				var height = this.height;
				if (!this.width)
				{
					width = this.image.width;
					height = this.image.height;
				}
				game.drawImage(draw, Math.round(this.x * tileWidth),
					Math.round(this.y * tileHeight),
					Math.round(width * tileWidth),
					Math.round(height * tileHeight));
			}

		}

	};

	Entity.prototype.loadImage = function(url)
	{
		var image = new Image();
		image.src = url;
		this.image = image;
	};

	Entity.prototype.loadAnimation = function(url, count, frameMultiplier, frames, repeat, whenDone, suffix)
	{

		frameMultiplier = backUp(frameMultiplier, 1);
		repeat = backUp(repeat, true);
		suffix = backUp(suffix, ".png");

		this.animation = new Object();
		this.animation.images = [];
		for (var frame=0; frame<count; frame++)
		{
			var image = new Image();
			if (frame == 0)
			{
				image.addEventListener("load", function() {
					this.image = new Object();
					this.image.width = image.width / tileWidth;
					this.image.height = image.height / tileHeight;
				});
			}
			image.src = url + String(frame) + suffix;
			this.animation.images.push(image);
		}

		this.animation.frameMultiplier = frameMultiplier;

		if (typeof frames != "undefined")
		{
			this.animation.frames = frames;
		}
		else
		{
			this.animation.frames = [];
			for (var frame=0; frame<count; frame++)
			{
				this.animation.frames.push(frame);
			}
		}

		this.animation.repeat = repeat;
		this.animation.whenDone = whenDone;

		this.animation.countdown = this.animation.frameMultiplier;
		this.animation.frame = this.animation.frames[0];

	};

	Entity.prototype.getAnimationFrame = function()
	{

		var anime = this.animation;

		anime.countdown -= quadrantSpeed(this.getQuadrant());
		if (anime.countdown <= 0)
		{
			anime.countdown = anime.frameMultiplier;
			anime.frame += 1;
		}

		if (anime.frame >= anime.frames.length)
		{
			if (typeof "whenDone" == "function")
			{
				anime.whenDone(anime);
			}
			anime.frame = anime.frames.length - 1;
			if (typeof anime.repeat != "undefined")
			{
				if (anime.repeat)
				{
					anime.frame = 0;
				}
			}
		}

		var frame = anime.images[anime.frames[anime.frame]];
		if (typeof frame != "undefined")
		{
			if (frame.complete)
			{
				return frame;
			}
		}

		return false;

	};

	Entity.prototype.getQuadrant = function(x, y)
	{

		if (typeof this.width == "undefined")
		{
			return false;
		}
		var eX = x;
		var eY = y;
		if (typeof x == "undefined")
		{
			if (typeof this.x == "undefined")
			{
				return false;
			}
			eX = this.x;
			eY = this.y;
		}
		if (typeof this.oldQuadrant == "undefined")
		{
			this.oldQuadrant = [-1, -1];
		}
		var newQuadrant = false;
		var oldQuadrant = false;
		var width = this.width - 0.001;
		var height = this.height - 0.001;
		for (var addWidth=0; addWidth<2; addWidth++)
		{
			for (var addHeight=0; addHeight<2; addHeight++)
			{
				var cornerQuadrant = getQuadrant(eX + width * addWidth,
					eY + height * addHeight);
				if (quadrantSpeed(cornerQuadrant) == quadrantSpeed(this.oldQuadrant))
				{
					oldQuadrant = true;
				}
				else
				{
					newQuadrant = cornerQuadrant;
				}
			}
		}
		if (oldQuadrant && newQuadrant)
		{
			return newQuadrant;
		}
		else if (newQuadrant)
		{
			this.oldQuadrant = newQuadrant;
			return newQuadrant;
		}
		else
		{
			return this.oldQuadrant;
		}

	};

	Entity.prototype.collidesTile = function(x, y)
	{

		var eX = backUp(x, this.x);
		var eY = backUp(y, this.y);

		var topLeft = tilePos(eX, eY);
		var bottomRight = tilePos(eX + this.width - 0.001, eY + this.height - 0.001);
		for (var x=topLeft[0]; x<bottomRight[0] + 1; x++)
		{
			for (var y=topLeft[1]; y<bottomRight[1] + 1; y++)
			{
				var tile = getTile([x, y]);
				if (tile != "-" && (tile != "i" || this.name == "tile"))
				{
					return new Entity(undefined, x, y, 1, 1);
				}
			}
		}
		return false;

	};

	Entity.prototype.collidesWorld = function(x, y)
	{
		for (var key in levels[level].entities)
		{
			if (levels[level].entities.hasOwnProperty(key))
			{
				other = levels[level].entities[key];
				if (other != this)
				{
					if (this.collidesOther(other, x, y))
					{
						if (other.name != "none")
						{
							return other;
						}
					}
				}
			}
		}
		return false;
	};

	Entity.prototype.collidesOther = function(other, x, y)
	{

		var eX = backUp(x, this.x);
		var eY = backUp(y, this.y);

		return (eX < other.x + other.width
			&& other.x < eX + this.width
			&& eY < other.y + other.height
			&& other.y < eY + this.height);

	};

	Entity.prototype.collides = function(x, y)
	{
		var w = this.collidesWorld(x, y);
		if (w)
		{
			return w;
		}
		var t = this.collidesTile(x, y);
		if (t)
		{
			return t;
		}
		return false;
	};

	Entity.prototype.keepInScreen = function()
	{

		if (this.x < 0)
		{
			this.x = 0;
			return true;
		}
		if (this.x >= levelWidth - this.width)
		{
			this.x = levelWidth - this.width;
			return true;
		}
		if (this.y < 0)
		{
			this.y = 0;
			return true;
		}
		if (this.y >= levelHeight - this.height)
		{
			this.y = levelHeight - this.height;
			return true;
		}
		return false;

	};

	Entity.prototype.handleCollisions = function(oldX, oldY)
	{

		var goingRight = oldX < this.x;
		var goingLeft = oldX > this.x;
		var goingUp = oldY > this.y;
		var byX = this.collides(this.x, oldY);
		var byY = this.collides(oldX, this.y + 0.1);

		if (byY)
		{
			this.yVelocity = 0;
			if (byY.xVelocity)
			{
				this.xVelocity = byY.xVelocity;
			}
			this.y = Math.floor(byY.y + byY.height * goingUp)
				- this.height * !goingUp;
		}
		if (byX)
		{
			this.x = Math.floor(byX.x + byX.width * goingLeft)
				- this.width * goingRight;
		}

	};

	return Entity;

})();
