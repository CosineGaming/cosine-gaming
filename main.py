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
import json

from google.appengine.ext import ndb
from Crypto.Hash import SHA256

app = Flask(__name__)
#app.config['DEBUG'] = True

descriptions = {}
descriptions_template = app.jinja_env.get_template("game-descriptions.html")
for name, description in descriptions_template.blocks.iteritems():
	descriptions[name] = "".join(description(descriptions_template.new_context()))

page_size = 5

week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

def regex(s, find, replace=""):
	return re.sub(find, replace, s)

app.jinja_env.filters['regex'] = regex

# Set if not defined
def sind(obj, key, value):
	if not key in obj:
		obj[key] = value
def game_defaults(game):
	sind(game, "url", game["name"].lower().replace(" ", "-"))
	javascript_url = game["url"].replace("-", "_")
	if javascript_url in descriptions:
		sind(game, "description", Markup(descriptions[javascript_url]))
	sind(game, "extract", False)
	if "size" in game: # Indicates uses online-game template, has swf default
		sind(game, "swf", "/static/online-games/" + game["url"] + ".swf")

games_json = app.jinja_env.get_template("games.json").render()
games = json.loads(games_json)
for game in games:
	game_defaults(game)

platform_to_string = {
	"windows" : "Windows",
	"macos" : "Mac",
	"linux" : "GNU/Linux"
}

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

class Question(ndb.Model):
	date = ndb.DateTimeProperty(required=True, auto_now_add=True, indexed=True)
	question = ndb.TextProperty(required=True)
	answer = ndb.TextProperty()
	answered = ndb.BooleanProperty(required=True, default=False, indexed=True)
	@classmethod
	def query_answered(cls):
		return cls.query().filter(cls.answered == True).order(-cls.date)
	@classmethod
	def query_unanswered(cls):
		return cls.query().filter(cls.answered == False).order(-cls.date)

class Flip_Data(ndb.Model):
	count = ndb.IntegerProperty(required=False)
	# Starting at 0
	level = ndb.IntegerProperty(required=True)
	time = ndb.IntegerProperty(required=True)
	moves = ndb.IntegerProperty(required=True)
	host = ndb.StringProperty()
	@classmethod
	def query_levels(cls):
		return cls.query().order(cls.level)

class Quote(ndb.Model):
	date = ndb.DateProperty(required=True, auto_now_add=True)
	name = ndb.StringProperty(required=True)
	quote = ndb.TextProperty(required=True)
	attribution = ndb.TextProperty(required=True)

class To_Do_List(ndb.Model):
	date = ndb.DateProperty(required=True, auto_now_add=True)
	user = ndb.StringProperty(required=True)
	tasks = ndb.StringProperty(repeated=True)
	priorities = ndb.IntegerProperty(repeated=True)
	times = ndb.IntegerProperty(repeated=True)
	@classmethod
	def get_user(cls, name):
		return cls.query(cls.user == name).get()

def custom_render(*args, **kwargs):
	return htmlmin.minify(render_template(*args, **kwargs))

@app.route("/<file>")
def top_level(file):
	game = [game for game in games if game["url"] == file]
	if game:
		game = game[0]
		if "size" in game:
			return custom_render("online-game.html", game=game)
		else:
			return custom_render("download.html", game=game, user_agent=request.user_agent, platform_to_string=platform_to_string)
	else:
		return custom_render(file + ".html", page=file)

@app.route("/<file>/<platform>")
def download_page_for_platform(file, platform):
	game = [game for game in games if game["url"] == file]
	if game:
		game = game[0]
		return custom_render("download.html", platform=platform, game=game, user_agent=request.user_agent, platform_to_string=platform_to_string)

@app.route("/")
@app.route("/games")
def games_page():
	return custom_render("games.html", page="games", games=games, platform_to_string=platform_to_string, user_agent=request.user_agent)

@app.route("/old")
def old_games_page():
	return custom_render("old.html", page="games", games=games)

@app.route("/index.html")
def new_home():
	return redirect("/games")

@app.route("/download/<file>")
def download(file):
	return custom_render("download.html", game={"name":file, "download":{"all":file}}, user_agent=request.user_agent)

@app.route("/flip")
def flip_game():
	return custom_render("flip.html")

@app.route("/entropy")
def entropy_game():
	# TODO: This is absurd. Merge with online-game.html
	return custom_render("entropy.html")

@app.route("/pale-white-dot")
def pwd_game():
	return redirect("/pale-white-dot/")

# @app.route("/pale-white-dot")
# def pwd_game():
# 	return custom_render("/static/pwd-post/index.html")

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

@app.route("/questions", methods=["get", "post"])
def questions_page():
	if request.method == "GET":
		return custom_render("questions.html", questions=Question.query_answered(), page="questions")
	else:
		question = Question(question=request.form["question"])
		question.put()
		return custom_render("questions.html", questions=Question.query_answered(), page="questions", filled_out=True)

@app.route("/questions/answer", methods=["get","post"])
def answer_questions():
	if request.method == "GET":
		return custom_render("question-answer.html", questions=Question.query_unanswered())
	else:
		if "submit" in request.form:
			question = ndb.Key(urlsafe=request.form["key"]).get()
			question.answer = request.form["answer"]
			question.answered = True
			question.put()
		else:
			question = ndb.Key(urlsafe=request.form["key"])
			question.delete()
		return custom_render("question-answer.html", questions=Question.query_unanswered(), filled_out=True)

def intlist(list):
	return [int(x) for x in list]

@app.route("/list/save", methods=["get"])
def save_to_do_list():
	to_do = To_Do_List(user=request.args.get("user"), tasks=request.args.getlist("tasks[]"),
		priorities=intlist(request.args.getlist("priorities[]")), times=intlist(request.args.getlist("times[]")))
	to_do.put()
	return ""

@app.route("/list/load/<username>", methods=["get"])
def load_to_do_list(username):
	user = To_Do_List.get_user(username)
	if user:
		to_do_list = json.dumps({"tasks":user.tasks, "priorities":user.priorities, "times":user.times})
		logging.info(to_do_list)
		return to_do_list
	else:
		return ""

@app.route("/flip/data", methods=["get"])
def collect_flip_data():
	data = Flip_Data(level=int(request.args.get("level")),
		time=int(request.args.get("time")), moves=int(request.args.get("moves")), host=request.args.get("host"))
	data.put()
	return ""

@app.route("/flip/data/view")
def view_flip_data():

	data = Flip_Data.query().fetch()
	numbers = []
	times = []
	moves = []
	hosts = {}
	for piece in data:
		while len(numbers) <= piece.level:
			numbers.append(0)
			times.append(0)
			moves.append(0)
		if piece.host:
			if not piece.host in hosts:
				hosts[piece.host] = 0
		if (piece.count):
			if piece.host:
				hosts[piece.host] += piece.count
			else:
				numbers[piece.level] += piece.count
		else:
			numbers[piece.level] += 1
			if piece.host:
				hosts[piece.host] += 1
				logging.info(hosts)
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

	return custom_render("flip-data.html", hosts=hosts, levels=levels)

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
