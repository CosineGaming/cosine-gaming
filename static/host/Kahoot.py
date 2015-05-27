import time
import SendKeys
import ImageGrab

file = open("LastDigit.txt", "r")
x = int(file.read()) + 1
file.close()

print "Each of these... Kahoot Games... Take about 15 seconds to get into."
print "They'll likely be \"Sit-tight\"s but you might as well leave them open."
print "Live games are not very common."
print "For every 12 or so games we get into, likely about 1 will be legit."
print "Therefore with this script it should be about 3 minutes to get a legit game."
print "I recommend opening about 5 games at a time for starting out."
times = input("How many SILLY GAMES shall we open in this session? ")
name = raw_input("What name would you like to INFILTRATE with, Goat? ")
print "OK, we're ready. You have 10 seconds to get your cursor inside the game pin."
time.sleep(10)

while times != 0:
	SendKeys.SendKeys("^a" + str(x) + "~", pause=0)
	time.sleep(0)
	screen = ImageGrab.grab()
	screen = screen.load()
	pixel = screen[200, 94]
	if pixel == (255, 255, 255):
		times -= 1
		SendKeys.SendKeys("{TAB}" + name + "~")
		print str(times) + " pages remaining before shutting down and storing guessed numbers."
		if times != 0:
			time.sleep(0)
			SendKeys.SendKeys("^t")
			time.sleep(0)
			SendKeys.SendKeys("kahoot.it~")
			changedpixel = (-1, -1, -1)
			# Wait till the page is fully loaded, we'll know when the color changes
			while changedpixel != (65, 196, 221):
				screen = ImageGrab.grab()
				screen = screen.load()
				changedpixel = screen[200,200]
				time.sleep(0)
			while changedpixel == (65, 196, 221):
				screen = ImageGrab.grab()
				screen = screen.load()
				changedpixel = screen[200,200]
				time.sleep(0)
			SendKeys.SendKeys("{TAB}")
			time.sleep(0)
	x += 1
	if x > 99999:
		x = 0

file = open("LastDigit.txt", "w")
file.write(str(x))
file.close()
