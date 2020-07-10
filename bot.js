const puppeteer = require('puppeteer');
const chalk = require('chalk');
const Tgfancy = require("tgfancy");
const fs = require("fs");
const config = require("./config");
const checker = require("./equals");

const userName = config.data.userName;
const userPass = config.data.userPass;
const botToken = config.data.telegramToken;
const refreshRate = config.data.refreshRate;

const logMarkup = chalk.hex("ecf0f1");
const logMarkupNew = chalk.hex("2ecc71");
const logMarkupTaken = chalk.hex("e74c3c");

const bot = new Tgfancy(botToken, {
	tgfancy: {
		chatIdResolution: "true",
	},
});

const devMode = true;

var resultsTable = [];

logMessage("Init");

async function getData() {
	try {

		//TODO: Single browser with refreshing rather than closing and opening each time
		const browser = await puppeteer.launch({
			headless: true,
			slowMo: 0
		});
		const page = await browser.newPage();

		logMessage("Started puppet browser");

		//Login
		await page.goto('https://lsu.staffsavvy.me/covershifts.php');

		await page.type('#login_email', userName);
		await page.type('#login_password', userPass);

		await page.click('.btn-login');

		await page.waitForNavigation;

		//Account for StaffSavvy wait times for cover shifts page loading
		//Takes 12 seconds but set to 20 just to be safe
		await new Promise(resolve => setTimeout(resolve, 20000));

		const allResultsSelector = '.show-for-large-up';
		await page.waitForSelector(allResultsSelector);

		logMessage("Logged into StaffSavvy");
		logMessage("Requesting shift data");

		//Scrape covershifts
		const result = await page.evaluate(() => {
			let elements = document.querySelectorAll('.show-for-large-up > table:nth-child(1) > tbody');

			console.log(elements);

			let arr = Array.prototype.slice.call(elements);
			let text_arr = [];

			let shifttable = arr[0].children;

			for (let i = 1; i < shifttable.length; i += 1) {
				let row = shifttable[i];

				let rowData = {
					date: row.children[0].innerText,
					time: row.children[1].innerText.replace(" to ", "-"),
					staff: row.children[2].innerText,
					skill: row.children[3].innerText,
					department: row.children[4].innerText,
					info: row.children[5].innerText
				};

				if (text_arr.some(e => (rowData.date === e.date) && (rowData.time === e.time) && (rowData.staff === e.staff) && (rowData.skill === e.skill) && (rowData.department === e.department) && (rowData.info === e.info))) {
					console.log("Ignoring duplicate shift - already logged");
				} else {
					text_arr.push(rowData);
				}
			}

			return text_arr;
		});

		resultsTable = result;

		for (let i = 1; i < result.length; i += 1) {
			logMessage("Logged shift: " + result[i].date + " - " + result[i].time);
		}

		logMessage("Finished logging shifts");
		logMessage("Closing puppet browser");

		await browser.close();

		return result;

	} catch (error) {
		console.log(error)
	}
}

function logMessage(msg, markup) {
	if (!devMode) return;

	if (markup === undefined) {
		markup = logMarkup;
	}

	var date = new Date();
	var format = "";

	format = format + "[";

	var hour = date.getHours();
	format = format + ((hour < 10 ? "0" : "") + hour) + ":";

	var min = date.getMinutes();
	format = format + ((min < 10 ? "0" : "") + min) + ":";

	var sec = date.getSeconds();
	format = format + ((sec < 10 ? "0" : "") + sec);

	format = format + "] " + msg;

	console.log(markup(format));
}

bot.onText(/\/compare/, (msg, match) => {
	compareShifts();
});

function comparer(otherArray) {
	return function (e1) {
		return otherArray.filter(function (e2) {
			return e1.date === e2.date && e1.time === e2.time && e1.staff === e2.staff && e1.skill === e2.skill && e1.department === e2.department && e1.info === e2.info
		}).length === 0;
	}
}

setInterval(compareShifts, refreshRate * 60 * 1000);

async function compareShifts() {
	try {
		let results = await getData();

		let oldshifts = fs.readFileSync("oldshifts.json");
		oldshifts = JSON.parse(oldshifts)

		if (checker.equals(oldshifts, results)) {
			logMessage("No changes detected - ignoring");
			return;
		}

		const objMap = [];
		var count = 0

		//Cross-reference shifts
		oldshifts.forEach((e1) => results.forEach((e2) => {
			if ((e1.date === e2.date) && (e1.time === e2.time) && (e1.staff === e2.staff) && (e1.skill === e2.skill) && (e1.department === e2.department) && (e1.info === e2.info)) {
				objMap[count] = e1;
				count = count + 1;
			}
		}));

		logMessage("Total cover shifts: " + objMap.length);
		logMessage("Total new shifts: " + oldshifts.length);
		logMessage("Total taken shifts: " + results.length);

		logMessage("Detected a change, finding exact shift(s)");

		let onlyInA = objMap.filter(comparer(results));
		let onlyInB = results.filter(comparer(objMap));
		const newShiftsToSend = onlyInA.concat(onlyInB);

		onlyInA = objMap.filter(comparer(oldshifts));
		onlyInB = oldshifts.filter(comparer(objMap));
		const takenShiftsToSend = onlyInA.concat(onlyInB);

		for (let i = 0; i < takenShiftsToSend.length; i += 1) {
			logMessage("De-logged " + takenShiftsToSend[i].staff + ": " + takenShiftsToSend[i].date + " - " + takenShiftsToSend[i].time, logMarkupTaken);
		}

		for (let i = 0; i < newShiftsToSend.length; i += 1) {
			logMessage("Logged " + newShiftsToSend[i].staff + ": " + newShiftsToSend[i].date + " - " + newShiftsToSend[i].time, logMarkupNew);
		}

		let toSend = "";

		if (newShiftsToSend.length > 0) {
			toSend = toSend + "The following shifts have been added:";
			for (let i = 0; i < newShiftsToSend.length; i += 1) {
				toSend = (toSend +
					"\n\n✔️\nDate: " + newShiftsToSend[i].date +
					"\nTime: " + newShiftsToSend[i].time +
					"\nStaff: " + newShiftsToSend[i].staff +
					"\nSkill: " + newShiftsToSend[i].skill +
					"\nDepartment: " + newShiftsToSend[i].department +
					"\nInfo: " + newShiftsToSend[i].info);
			}
			logMessage(newShiftsToSend.length + " shifts have been added");
		}


		if (takenShiftsToSend.length > 0) {
			if (toSend.length != 0) {
				toSend = toSend + "\n\n";
			}
			toSend = toSend + "The following shifts have been taken/removed:";
			for (let i = 0; i < takenShiftsToSend.length; i += 1) {
				toSend = (toSend +
					"\n\n⭕\nDate: " + takenShiftsToSend[i].date +
					"\nTime: " + takenShiftsToSend[i].time +
					"\nStaff: " + takenShiftsToSend[i].staff +
					"\nSkill: " + takenShiftsToSend[i].skill +
					"\nDepartment: " + takenShiftsToSend[i].department +
					"\nInfo: " + takenShiftsToSend[i].info);
			}
			logMessage(takenShiftsToSend.length + " shifts have been taken/removed");
		}

		//bot.sendMessage('', toSend); //If you would like to send Telegram messages, insert conversation ID here

		fs.writeFile("oldshifts.json", JSON.stringify(results, null, 2), "utf8", function (err) {
			if (err) throw err;
			logMessage("Updated shift file");
		});

	} catch (error) {
		console.log(error)
	}
}

compareShifts()