from flask import Flask
from flask import Markup
from flask import redirect
from flask import render_template
from flask import request

import datetime
import htmlmin
import logging
import re

from google.appengine.ext import ndb
from Crypto.Hash import SHA256

app = Flask(__name__)
#app.config['DEBUG'] = True

descriptions = {}
for name, description in app.jinja_env.get_template("game-descriptions.html").blocks.iteritems():
	descriptions[name] = "".join(description({}))

page_size = 5

def regex(s, find, replace=""):
	return re.sub(find, replace, s)

app.jinja_env.filters['regex'] = regex

class Game():
	def __init__(self, name, file="", size=False, url="", description=""):
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
		self.extract = self.file[-4:] == ".zip"

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
	Game("Dash", "Dash.exe"),
	Game("Revenge", size=[800, 595]),
	Game("Parallel", "Parallel.zip"),
	Game("Less than Shadows", size=[800, 600]),
	Game("Sniper", "Sniper.zip"),
	Game("Ace Slicenick", size=[1000, 570]),
	Game("Stealth", size=[475, 600]),
	Game("Circle Wars", "CircleWars.exe")
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
	level = ndb.IntegerProperty(required=True)
	time = ndb.IntegerProperty(required=True)
	moves = ndb.IntegerProperty(required=True)

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
			return custom_render("download.html", game=game)
	else:
		return custom_render(file + ".html", page=file)

@app.route("/")
@app.route("/games")
def games_page():
	return custom_render("games.html", page="games", games=games)

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
	return custom_render("blog.html", page="blog", entries=q, blog_page=page, full=True)

@app.route("/blog/write/", methods=["get"])
def blog_writer():
	return custom_render("blog-writer.html")

@app.route("/blog/write/", methods=["post"])
def submit_blog_post():
	title = request.form.get("title")
	author = request.form.get("author")
	post = request.form.get("post")
	if SHA256.new(request.form.get("password")).hexdigest() == "c54b8857ce43c002c8aaa8190543297dcaeea106632073c0c7cade424e0043ce":
		index = Blog_Entry.get_max_index() + 1
		entry = Blog_Entry(index=index, title=title, author=author, post=post)
		entry.put()
		return custom_render("blog.html", page="blog", entries=[entry], blog_page=1, full=True)
	else:
		return custom_render("blog-writer.html", title=title, author=author, post=post, failed=True)

@app.route("/contact/submit", methods=["post"])
def contact():
	entry = Survey_Entry()
	for key, value in request.form.iteritems():
		setattr(entry, key, value)
	entry.put()
	return custom_render("contact.html", page="contact", filled_out=True)

@app.route("/contact/view")
def view_results():
	entries = Survey_Entry.query_surveys().fetch()
	rv = "Survey results:<br />"
	for entry in entries:
		for key in entry._properties.iterkeys():
			rv += key + ": " + str(getattr(entry, key)) + "<br />"
		rv += "--------------<br />"
	return rv

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
		numbers[piece.level] += 1
		times[piece.level] += piece.time;
		moves[piece.level] += piece.moves;

	rv = ""
	for i in range(len(numbers)):
		if numbers[i] == 0:
			break
		time = times[i] / float(numbers[i])
		move = moves[i] / float(numbers[i])
		rv += "LEVEL " + str(i) + ":<br />Completions: " + str(numbers[i]) +\
			"<br />Average time: " + str(time) +\
			"<br />Average moves: " + str(move) + "<br />----------<br />"

	return rv

@app.route("/quote-alias")
def quote():
	class Quote:
		name = "Day"
		quote = "Quote"
		attribution = "Who said it"
		def __init__(self, name, quote, attribution):
			self.name = name
			self.quote = quote
			self.attribution = attribution
	quotes = [
		Quote("Monday", "We live in an age where lemonade is made with artificial ingredients, yet furniture polish contains real lemon.", "J.D. Behrens"),
		Quote("Tuesday", "Whoever submitted the quote \"wow,\" by Doge ...", "NO"),
		Quote("Wednesday", "This isn't your average, everyday stupid . . . this is . . . ADVANCED STUPID.", "Patrick Star"),
		Quote("Thursday", "If you would like to have your name written in Gallifreyan, leave your full name and address in the comments section above.", "QuoteMaster"),
		Quote("Friday", "My dad beats me . . . at tic-tac-toe . . . with his belt.", "James Murray")
	]
	return custom_render("quote.html", quotes=quotes)

@app.errorhandler(404)
@app.errorhandler(500)
def page_not_found(e):
    return custom_render("404.html"), 404
