const fs = require('fs');
var keythereum = require("keythereum");
var ethUtil = require('wanchain-util').ethereumUtil;
var Tx = require('wanchain-util').ethereumTx;

var config = require('./config');

var checkBanlance = require('./utils/promptFunc/checkBanlance');
var A2B = require('./utils/A2B');
var A2OTA = require('./utils/A2OTA');
var OTA2B = require('./utils/OTA2B');


function wanWalletTransaction(prompt, web3, wanchainLog) {
	prompt.get(require('./utils/schema/choiceMethod'), function (err, result) {
		switch (result.method) {
			//todo: Ordinary Transaction (A => B)
			case '1':
				wanchainLog('You had choice 1(Ordinary Transaction)', config.consoleColor.COLOR_FgYellow);

				wanchainLog('input your keystore file name: ', config.consoleColor.COLOR_FgGreen);
				prompt.get(require('./utils/schema/mykeystore'), function (err, result) {
					try {
						var filename = "./utils/keystore/" + result.OrdinaryKeystore + ".json";
						let keystoreStr = fs.readFileSync(filename, "utf8");
						A2B(prompt, web3, keythereum, Tx, keystoreStr, wanchainLog);
					} catch (e) {
						wanchainLog('file name invalid (without file format)', config.consoleColor.COLOR_FgRed);
					}
				});
				break;

			//todo: Privacy Transaction (A => OTA)
			case '2':
				wanchainLog('You had choice 2(Privacy Transaction)', config.consoleColor.COLOR_FgYellow);

				wanchainLog('input your keystore file name: ', config.consoleColor.COLOR_FgGreen);

				prompt.get(require('./utils/schema/mykeystore'), function (err, result) {
					try {
						var filename = "./utils/keystore/" + result.OrdinaryKeystore + ".json";
						let keystoreStr = fs.readFileSync(filename, "utf8");
						A2OTA(prompt, web3, keythereum, Tx, ethUtil, keystoreStr, wanchainLog);
					} catch (e) {
						wanchainLog('file name invalid (without file format)', config.consoleColor.COLOR_FgRed);
					}
				});
				break;

			//todo: OTA Transaction (OTA => B)
			case '3':
				wanchainLog('You had choice 3(OTA Transaction)', config.consoleColor.COLOR_FgYellow);

				wanchainLog('input your keystore file name: ', config.consoleColor.COLOR_FgGreen);
				prompt.get(require('./utils/schema/mykeystore'), function (err, result) {
					try {
						var filename = "./utils/keystore/" + result.OrdinaryKeystore + ".json";
						let keystoreStr = fs.readFileSync(filename, "utf8");
						OTA2B(prompt, web3, keythereum, Tx, ethUtil, keystoreStr, wanchainLog);
					} catch (e) {
						wanchainLog('file name invalid (without file format)', config.consoleColor.COLOR_FgRed);
					}
				});
				break;

			//todo: Check the Ordinary Transaction balance
			case '4':
				wanchainLog('You had choice 4(Check the Ordinary Transaction balance)', config.consoleColor.COLOR_FgYellow);

				prompt.get(require('./utils/schema/balanceSchema'), function (err, result) {
					var weiToEth = checkBanlance(web3, result.balance);
					wanchainLog(weiToEth.toString() + ' eth', config.consoleColor.COLOR_FgGreen);
				});
				break;

			//todo: Check OTA balance
			case '5':
				wanchainLog('You had choice 5(Check OTA balance)', config.consoleColor.COLOR_FgYellow);

				try {
					let otaDataStr = fs.readFileSync("./utils/otaData/otaData.txt","utf8");
					let otaData = otaDataStr.split('\n');

					try {
						let otaDataStateStr = fs.readFileSync("./utils/otaData/otaDataState.txt","utf8");
						let otaDataState = otaDataStateStr.split('\n');

						var statTuple = [];

						var otaDict = [];
						for (var i =0; i<otaDataState.length; i++) {
							if(otaDataState[i].trim().length >0) {
								var otaState = otaDataState[i].split('{')[1].split(':')[0].split('"')[1];
								statTuple.push(otaState);
								otaDict.push(otaDataState[i].split('{')[1].split('}')[0]);
							}
						}

						var otaDictStr = '{';
						for (var i =0; i< otaDict.length; i++) {
							otaDictStr += otaDict[i];
							if (i !== otaDict.length -1) {
								otaDictStr += ',';
							}
						}

						otaDictStr += '}';

						otaDictStr = JSON.parse(otaDictStr);

						for (var i = 0; i<otaData.length; i++) {
							var index = i +1;
							if (otaData[i].trim().length >0) {
								var otaDataJson = JSON.parse(otaData[i]);

								if (statTuple.indexOf(otaDataJson.ota) === -1) {
									wanchainLog('Your otaData ' + index + ' >> '  + ' ota: ' + otaDataJson.ota + ' value: ' + otaDataJson.value + ' state: ' + otaDataJson.state, config.consoleColor.COLOR_FgGreen);
								} else {
									wanchainLog('Your otaData ' + index + ' >> '  + ' ota: ' + otaDataJson.ota + ' value: ' + otaDataJson.value + ' state: ' + otaDictStr[otaDataJson.ota], config.consoleColor.COLOR_FgGreen);
								}
							}
						}
					} catch (e) {
						for (var i = 0; i<otaData.length; i++) {
							var index = i +1;
							if (otaData[i].trim().length >0) {
								var otaDataJson = JSON.parse(otaData[i]);

								wanchainLog('Your otaData ' + index + ' >> '  + ' ota: ' + otaDataJson.ota + ' value: ' + otaDataJson.value + ' state: ' + otaDataJson.state, config.consoleColor.COLOR_FgGreen);
							}
						}
					}
				} catch (e) {
					wanchainLog('Not have otaData.', config.consoleColor.COLOR_FgRed);
				}

				break;
		}
	});
}

module.exports = wanWalletTransaction;
