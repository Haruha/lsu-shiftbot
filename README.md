
# LSU Shift Bot
## What is it?
Node.js project built to automatically alert a user for changes on the StaffSavvy platform. I haven't worked on it in about a year so if you're using this you'll probably have to make changes to the Telegram components, or just remove them entirely and swap out for another service such as Facebook messenger.
## Features
 - Automatic navigation of StaffSavvy site
 - Scraping of available shift tables
 - Comparison with old shift table to check for newly added shifts and removed/taken shifts
 - Alerting a given user via Telegram if there is a change
## Requirements
 - Node 8.0.0+ 
 - Telegram Bot API Token
## Usage
Using the following will start the script. By default checks every 10 minutes.

    node bot.js

Make sure you only have a single instance of a bot running at any one time.
##  Example
![](https://i.imgur.com/5FuUMLM.png)
