var prompt = require('prompt');
var colors = require("colors/safe");

const fs = require('fs');
const Web3 = require("web3");
var keythereum = require("keythereum");
var ethUtil = require('wanchain-util').ethereumUtil;
var Tx = require('wanchain-util').ethereumTx;

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
var wanchainLog = require('./utils/wanchainLog');
var sendTransaction = require('./utils/sendTransaction');
var preScTransfer = require('./utils/preScTransfer');
var otaTransaction = require('./utils/otaTransaction');

// Start the prompt
prompt.start();
prompt.message = colors.blue("wanWallet");
prompt.delimiter = colors.green("$");



wanchainLog(
	`pls input: 
	1 (Ordinary Transaction) 
	2 (Privacy Transaction)		
	3 (OTA Transaction)
	4 (Check the Ordinary Transaction balance)
	5 (Check OTA balance)`, config.consoleColor.COLOR_FgYellow);


prompt.get(require('./utils/schema/choiceMethod'), function (err, result) {
	switch (result.method) {
		//todo: Ordinary Transaction (A => B)
		case '1':
			wanchainLog('You had choice 1(Ordinary Transaction)', config.consoleColor.COLOR_FgYellow);

			wanchainLog('input: mykeystore', config.consoleColor.COLOR_FgGreen);
			prompt.get(require('./utils/schema/mykeystore'), function (err, result) {
				let keystoreStr = fs.readFileSync("./keystore/mykeystore.json","utf8");
				let keystore = JSON.parse(keystoreStr);
				console.log('you keystore: ', keystore);

				wanchainLog('Now to unlock your wallet, input your password: wanglu', config.consoleColor.COLOR_FgGreen);
				prompt.get(require('./utils/schema/keyPassword'), function (err, result) {
					wanchainLog('waiting for unlock wallet....', config.consoleColor.COLOR_FgRed);

					let keyAObj = {version:keystore.version, crypto:keystore.crypto};
					var privKeyA = keythereum.recover(result.keyPassword, keyAObj);
					var address = '0x' + keystore.address;

					wanchainLog('Perfect! Now your address had unlocked, would you want to send transaction? (y[Y]/n[N])', config.consoleColor.COLOR_FgGreen);

					prompt.get(require('./utils/schema/isTransaction'), function (err, result) {
						var theState = result.state.toLowerCase();
						switch (theState) {
							case 'y':
								wanchainLog('input receiver address: 0x08d972cc3a0246bda92cdffb28051dd5914faeeb', config.consoleColor.COLOR_FgGreen);
								prompt.get(require('./utils/schema/ordinaryAddr'), function (err, result) {
									var receiver = result.address;

									wanchainLog('input sender value(eth): ', config.consoleColor.COLOR_FgGreen);
									prompt.get(require('./utils/schema/theValue'), function (err, result) {
										var strSendValueInWei = web3.toWei(result.value);
										var bnSendValueInWei = new web3.BigNumber(strSendValueInWei);
										var value = '0x' + bnSendValueInWei.toString(16);

										sendTransaction(web3, Tx, receiver, address, privKeyA, value, wanchainLog);
									});
								});
								break;

							case 'n':
								wanchainLog('Bye!', config.consoleColor.COLOR_FgGreen);
								break;
						}
					});
				});
			});
			break;

		//todo: Privacy Transaction (A => OTA)
		case '2':
			wanchainLog('You had choice 2(Privacy Transaction)', config.consoleColor.COLOR_FgYellow);

			wanchainLog('input: mykeystore', config.consoleColor.COLOR_FgGreen);
			prompt.get(require('./utils/schema/mykeystore'), function (err, result) {
				let keystoreStr = fs.readFileSync("./keystore/mykeystore.json","utf8");
				let keystore = JSON.parse(keystoreStr);
				console.log('you keystore: ', keystore);

				wanchainLog('Now to unlock your wallet, input your password: wanglu', config.consoleColor.COLOR_FgGreen);
				prompt.get(require('./utils/schema/keyPassword'), function (err, result) {
					wanchainLog('waiting for unlock wallet....', config.consoleColor.COLOR_FgRed);

					let keyAObj = {version:keystore.version, crypto:keystore.crypto};
					var privKeyA = keythereum.recover(result.keyPassword, keyAObj);
					var address = '0x' + keystore.address;

					wanchainLog('Perfect! Now your address had unlocked, would you want to send transaction? (y[Y]/n[N])', config.consoleColor.COLOR_FgGreen);

					prompt.get(require('./utils/schema/isTransaction'), function (err, result) {
						var theState = result.state.toLowerCase();
						switch (theState) {
							case 'y':
								wanchainLog('input receiver waddress: 0x0340721B2B6C7970A443B215951C7BAa4c41c35E2b591EA51016Eae523f5E123760354b82CccbEdC5c84F16D63414d44F595d85FD9e46C617E29e3AE2e82C5F7bDA9', config.consoleColor.COLOR_FgGreen);
								prompt.get(require('./utils/schema/privacyAddr'), function (err, result) {
									var to_waddress = result.waddress;

									var contractInstanceAddress = config.contractInstanceAddress;

									wanchainLog('input sender value(eth): ', config.consoleColor.COLOR_FgGreen);
									prompt.get(require('./utils/schema/theValue'), function (err, result) {
										var strSendValueInWei = web3.toWei(result.value);
										var bnSendValueInWei = new web3.BigNumber(strSendValueInWei);
										var value = '0x' + bnSendValueInWei.toString(16);

										preScTransfer(web3, Tx, ethUtil, privKeyA,address, to_waddress, contractInstanceAddress, value, result.value, wanchainLog);
									});
								});
								break;

							case 'n':
								wanchainLog('Bye!', config.consoleColor.COLOR_FgGreen);
								break;
						}
					});
				});
			});
			break;

		//todo: OTA Transaction (OTA => B)
		case '3':
			wanchainLog('You had choice 3(OTA Transaction)', config.consoleColor.COLOR_FgYellow);

			wanchainLog('input: mykeystore2', config.consoleColor.COLOR_FgGreen);
			prompt.get(require('./utils/schema/mykeystore2'), function (err, result) {
				let keystoreStr = fs.readFileSync("./keystore/mykeystore2.json","utf8");
				let keystore = JSON.parse(keystoreStr);
				console.log('you keystore: ', keystore);

				wanchainLog('Now to unlock your wallet, input your password: wanglu', config.consoleColor.COLOR_FgGreen);
				prompt.get(require('./utils/schema/keyPassword'), function (err, result) {
					wanchainLog('waiting for unlock wallet....', config.consoleColor.COLOR_FgRed);

					let keyAObj = {version:keystore.version, crypto:keystore.crypto};
					let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
					var privKeyA = keythereum.recover(result.keyPassword, keyAObj);
					var privKeyB = keythereum.recover(result.keyPassword, keyBObj);
					let address = keystore.address;

					wanchainLog('Perfect! Now your address had unlocked, would you want to send transaction? (y[Y]/n[N])', config.consoleColor.COLOR_FgGreen);

					prompt.get(require('./utils/schema/isTransaction'), function (err, result) {
						var theState = result.state.toLowerCase();
						switch (theState) {
							case 'y':
								wanchainLog('input ota ', config.consoleColor.COLOR_FgGreen);
								prompt.get(require('./utils/schema/otaAddress'), function (err, result) {
									var ota = result.address;

									wanchainLog('input value (eth) ', config.consoleColor.COLOR_FgGreen);
									prompt.get(require('./utils/schema/theValue'), function (err, result) {
										var value = result.value;

										otaTransaction(web3,ethUtil, Tx, ota, value, privKeyA, privKeyB, address);
									});
								});
								break;

							case 'n':
								wanchainLog('Bye!', config.consoleColor.COLOR_FgGreen);
								break;
						}
					});
				});
			});
			break;

		//todo: Check the Ordinary Transaction balance
		case '4':
			wanchainLog('You had choice 4(Check the Ordinary Transaction balance)', config.consoleColor.COLOR_FgYellow);

			prompt.get(require('./utils/schema/balanceSchema'), function (err, result) {
				var balance = web3.eth.getBalance(result.balance);
				var weiToEth = web3.fromWei(balance);
				wanchainLog(weiToEth.toString() + ' eth', config.consoleColor.COLOR_FgGreen);
			});
			break;

		//todo: Check OTA balance
		case '5':
			wanchainLog('You had choice 5(Check OTA balance)', config.consoleColor.COLOR_FgYellow);

			wanchainLog('This modules build soon...', config.consoleColor.COLOR_FgRed);
			break;
	}
});