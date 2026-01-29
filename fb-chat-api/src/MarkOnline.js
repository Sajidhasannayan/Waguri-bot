"use strict";

const log = require("npmlog");

module.exports = function (defaultFuncs, api, ctx) {

	function sendPresence(callback) {
		const form = {
			typ: "mark_active",
			// fb_api_req_friendly_name: "Presence",
			// extra args dileo chole
		};

		defaultFuncs
			.post("https://www.facebook.com/ajax/chat/presence.php", ctx.jar, form)
			.then(function (res) {
				if (res.error) throw res;
				return callback(null, res);
			})
			.catch(function (err) {
				log.error("sendPresence", err);
				return callback(err);
			});
	}

	return function markAsOnline(interval = 60000, callback) {
		let resolveFunc = function () {};
		let rejectFunc = function () {};
		const returnPromise = new Promise(function (resolve, reject) {
			resolveFunc = resolve;
			rejectFunc = reject;
		});

		if (!callback) callback = function (err, data) {
			if (err) return rejectFunc(err);
			resolveFunc(data);
		};

		try {
			setInterval(() => {
				sendPresence(function (err, res) {
					if (err) {
						log.error("markAsOnline", err);
					}
				});
			}, interval);

			callback(null, {
				status: "running",
				interval
			});
		} catch (err) {
			callback(err);
		}

		return returnPromise;
	};
};
