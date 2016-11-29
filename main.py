from flask import Flask
from flask import Markup
from flask import redirect
from flask import render_template
from flask import request
from flask import url_for

import datetime
import htmlmin
import logging
import re
import requests

from google.appengine.ext import ndb
from Crypto.Hash import SHA256

app = Flask(__name__)
app.config['DEBUG'] = True

descriptions = {}
for name, description in app.jinja_env.get_template("game-descriptions.html").blocks.iteritems():
	descriptions[name] = "".join(description({}))

page_size = 5

week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

def regex(s, find, replace=""):
	return re.sub(find, replace, s)

app.jinja_env.filters['regex'] = regex

class Game():
	def __init__(self, name, file="", extract=False, size=False, url="", description=""):
		self.name = name
		# URL defaults to lowercase with hyphens instead of spaces, eg less-than-shadows
		if url:
			self.url = url
		else:
			self.url = self.name.lower().replace(" ", "-")
		if description:
			self.description = description
		else:
			javascript_url = self.url.replace("-", "_")
			if javascript_url in descriptions:
				self.description = Markup(descriptions[javascript_url])
		# Where it's downloaded
		self.file = file

		# These arguments only used for Download Games
		# If it's a zip file
		self.zip = (self.file[-4:] == ".zip" or extract)

		# These arguments only used for Online Games
		self.size = size
		# self.file, for an online game, defaults
		if self.size:
			self.file = "/static/online-games/" + self.url + ".swf"

	name = ""
	url = ""
	description = ""
	file = ""

	download = False
	extract = False

	size = False

games = [
	Game("Flip"),
	Game("Swarm"),
	Game("Dash", "https://www.dropbox.com/s/2vynb3smhc914sn/Dash.exe?dl=1"),
	Game("Revenge", size=[800, 595]),
	Game("Parallel", "https://www.dropbox.com/s/kk4imwyd9b6hewp/Parallel.zip?dl=1", extract=True),
	Game("Less than Shadows", size=[800, 600]),
	Game("Sniper", "https://www.dropbox.com/s/ftr7hp44wsntpzx/Sniper.zip?dl=1", extract=True),
	Game("Ace Slicenick", size=[1000, 570]),
	Game("Stealth", size=[475, 600]),
	Game("Circle Wars", "https://www.dropbox.com/s/0q5zu02ybvleduj/CircleWars.exe?dl=1")
]

class Blog_Entry(ndb.Model):
	index = ndb.IntegerProperty(required=True)
	date = ndb.DateProperty(required=True, auto_now_add=True)
	title = ndb.StringProperty(required=True, indexed=False)
	author = ndb.StringProperty(required=True, indexed=False)
	post = ndb.TextProperty(required=True, indexed=False)
	@classmethod
	def get_max_index(cls):
		ordered = cls.query().order(-cls.index)
		return ordered.get().index
	@classmethod
	def query_page(cls, page, max_index):
		highest = max_index - (page - 1) * page_size
		return cls.query(cls.index <= highest).order(-cls.index)
	@classmethod
	def get_exact(cls, index):
		return cls.query(cls.index == index).get()

class Survey_Entry(ndb.Expando):
	_default_indexed = False
	date = ndb.DateTimeProperty(auto_now_add=True, indexed=True)
	@classmethod
	def query_surveys(cls):
		return cls.query().order(-cls.date)

class Flip_Data(ndb.Model):
	count = ndb.IntegerProperty(required=False)
	# Starting at 0
	level = ndb.IntegerProperty(required=True)
	time = ndb.IntegerProperty(required=True)
	moves = ndb.IntegerProperty(required=True)
	@classmethod
	def query_levels(cls):
		return cls.query().order(cls.level)

class Quote(ndb.Model):
	date = ndb.DateProperty(required=True, auto_now_add=True)
	name = ndb.StringProperty(required=True)
	quote = ndb.TextProperty(required=True)
	attribution = ndb.TextProperty(required=True)

def custom_render(*args, **kwargs):
	return htmlmin.minify(render_template(*args, **kwargs))

@app.route("/<file>")
def top_level(file):
	game = [game for game in games if game.url == file]
	if game:
		game = game[0]
		if game.size:
			return custom_render("online-game.html", game=game)
		else:
			return custom_render("download.html", game=game, user_agent=request.user_agent)
	else:
		return custom_render(file + ".html", page=file)

@app.route("/")
@app.route("/games")
def games_page():
	return custom_render("games.html", page="games", games=games)

@app.route("/old")
def old_games_page():
	return custom_render("old.html", page="games", games=games)

@app.route("/A")
def new_games_page():
	return custom_render("games.html", page="games", games=games)

@app.route("/B")
def old_games_page_B():
	return custom_render("old.html", page="games", games=games)

@app.route("/index.html")
def new_home():
	return redirect("/games")

@app.route("/download/<file>")
def download(file):
	return custom_render("download.html", game=Game(file, file))

@app.route("/flip")
def flip_game():
	return custom_render("flip.html")

@app.route("/blog/")
def blog_front_page():
	return blog_page(1)

@app.route("/blog/page/<page>/")
def blog_page(page, filled_out=False):
	page = int(page)
	max_index = Blog_Entry.get_max_index()
	q = Blog_Entry.query_page(page, max_index).fetch(page_size, keys_only=True)
	entries = [e.get() for e in q]
	return custom_render("blog.html", page="blog", entries=entries, blog_page=page, filled_out=filled_out)

@app.route("/blog/post/<index>/")
def blog_entry(index):
	index = int(index)
	q = Blog_Entry.get_exact(index)
	page = (Blog_Entry.get_max_index() - index) / page_size + 1
	return custom_render("blog.html", page="blog", entries=[q], blog_page=page, full=True)

@app.route("/blog/write/", methods=["get"])
def blog_writer():
	return custom_render("blog-writer.html")

@app.route("/blog/write/", methods=["post"])
def submit_blog_post():
	title = request.form.get("title")
	author = request.form.get("author")
	post = request.form.get("post")
	if SHA256.new(request.form.get("password")).hexdigest() == "c54b8857ce43c002c8aaa8190543297dcaeea106632073c0c7cade424e0043ce":
		try:
			index = Blog_Entry.get_max_index() + 1
		except AttributeError:
			index = 0
		entry = Blog_Entry(index=index, title=title, author=author, post=post)
		entry.put()
		return custom_render("blog.html", page="blog", entries=[entry], blog_page=1, full=True)
	else:
		return custom_render("blog-writer.html", title=title, author=author, post=post, failed=True)

@app.route("/contact")
def contact():
	return custom_render("contact.html", games=games, responses={})

@app.route("/contact/submit", methods=["post"])
def contact_submit():
	if request.form["four"] in ["4", "four", "fourr", "44", "2+2"]: #Oh you're so clever, aren't you, "2+2"
		entry = Survey_Entry()
		for key, value in request.form.iteritems():
			if key != "four":
				setattr(entry, key, value)
		entry.put()
		return custom_render("contact.html", filled_out=True, games=games, responses=request.form)
	else:
		return custom_render("contact.html", captcha_failed=True, games=games, responses=request.form)

@app.route("/contact/view")
def view_results():
	entries = Survey_Entry.query_surveys().fetch()
	rv = "Survey results:<br />"
	for entry in entries:
		for key in entry._properties.iterkeys():
			rv += key + ": " + str(getattr(entry, key)) + "<br />"
		rv += "--------------<br />"
	rv += '<br /><a href="clear">Clear data</a>'
	return rv

@app.route("/contact/clear")
def clear_results():
	ndb.delete_multi(Survey_Entry.query().fetch(keys_only=True))
	return view_results()

@app.route("/flip/data", methods=["get"])
def collect_flip_data():
	data = Flip_Data(level=int(request.args.get("level")),
		time=int(request.args.get("time")), moves=int(request.args.get("moves")))
	data.put()
	return ""

@app.route("/flip/data/view")
def view_flip_data():

	data = Flip_Data.query().fetch()
	numbers = []
	times = []
	moves = []
	for piece in data:
		while len(numbers) <= piece.level:
			numbers.append(0)
			times.append(0)
			moves.append(0)
		if (piece.count):
			numbers[piece.level] += piece.count
		else:
			numbers[piece.level] += 1
		times[piece.level] += piece.time
		moves[piece.level] += piece.moves
	# Delete segmented Flip_Data. Data preserved and consolidated below
	clear_flip_data()

	levels = []
	for i in range(len(numbers)):
		if numbers[i] == 0:
			continue
		number = numbers[i]
		time = times[i] / number
		move = moves[i] / number
		gaveup = 0
		if i != 0:
			last = numbers[i - 1]
			if last != 0:
				gaveup = 100 - 100 * number / last
		madeit = 0
		if numbers[0] != 0:
			madeit = number * 100 / numbers[0]
		level = {}
		level["level"] = i+1
		level["number"] = number
		level["time"] = time
		level["moves"] = move
		level["gaveup"] = gaveup
		level["madeit"] = madeit
		levels.append(level)
		# Consolidates segmented Flip_Data for each level
		data = Flip_Data(level=i, time=int(time*number), moves=int(move*number), count=number)
		data.put()

	return custom_render("flip-data.html", levels=levels)

# Uses level starting from 0
def shift_flip_data(level, count):
	data = Flip_Data.query(Flip_Data.level >= level).fetch()
	for piece in data:
		piece.level += count
		piece.put()

# Uses level starting from 1 as displayed in view
# Adds <count> levels starting at <level>
@app.route("/flip/data/add", methods=["post"])
def shift_flip_data_page():
	shift_flip_data(int(request.form["level"]) - 1, int(request.form["count"]))
	return view_flip_data(), 201

# Uses level starting from 1 as displayed in view
# Deletes <count> levels starting at <level>
@app.route("/flip/data/delete", methods=["post"])
def delete_flip_data():
	level = int(request.form["level"]) - 1
	count = int(request.form["count"])
	ndb.delete_multi(Flip_Data.query(Flip_Data.level >= level, Flip_Data.level < level + count).fetch(keys_only=True))
	shift_flip_data(level, -count)
	return view_flip_data(), 201

def clear_flip_data():
	ndb.delete_multi(Flip_Data.query().fetch(keys_only=True))

@app.route("/flip/data/clear")
def clear_flip_data_page():
	clear_flip_data()
	return view_flip_data()

@app.route("/quote")
def quote_page():
	quotes = Quote.query().order(-Quote.date).fetch()
	return custom_render("quote.html", quotes=quotes)

@app.route("/quote/write", methods=["get"])
def write_quote():
	return custom_render("write-quote.html", week=week, wrote=request.args.get("wrote"))

@app.route("/quote/write", methods=["post"])
def write_quote_data():
	name = request.form.get("day")
	quote = request.form.get("quote")
	attribution = request.form.get("attribution")
	if quote:
		full = Quote(name=name, quote=quote, attribution=attribution)
		full.put()
	return redirect("/quote/write?wrote=True")

@app.route("/swarm/")
def swarm_title():
	return custom_render("swarm/index.html")

@app.route("/swarm/<more>")
def swarm(more):
	return custom_render("swarm/" + more + ".html")

@app.errorhandler(404)
@app.errorhandler(500)
def page_not_found(e):
    return custom_render("404.html"), 404
