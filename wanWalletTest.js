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


// Start the prompt
prompt.start();
prompt.message = colors.blue("wanWallet");
prompt.delimiter = colors.green("$");


wanchainLog('pls input 1(Ordinary Transaction), 2(Privacy Transaction), 3(Check the balance): 1 or 2 or 3', config.consoleColor.COLOR_FgYellow);

prompt.get(require('./utils/schema/choiceMethod'), function (err, result) {
	switch (result.method) {
		case '1':
			wanchainLog('input: mykeystore2', config.consoleColor.COLOR_FgGreen);
			prompt.get(require('./utils/schema/mykeystore2'), function (err, result) {
				let keystoreStr = fs.readFileSync("./mykeystore2.json","utf8");
				let keystore = JSON.parse(keystoreStr);
				console.log('you keystore: ', keystore);

				wanchainLog('Now to unlock your wallet, input your password: wanglu', config.consoleColor.COLOR_FgGreen);
				prompt.get(require('./utils/schema/keyPassword'), function (err, result) {
					wanchainLog('waiting for unlock wallet....', config.consoleColor.COLOR_FgRed);

					let keyAObj = {version:keystore.version, crypto:keystore.crypto};
					var privKeyA = keythereum.recover(result.keyPassword, keyAObj);
					var address = '0x' + keystore.address;

					wanchainLog('Perfect! Now your address had unlocked, would you want to send transaction? (y[Y]/n[N])', config.consoleColor.COLOR_FgGreen);

					prompt.get(require('./utils/schema/isOrdinaryTransaction'), function (err, result) {
						var theState = result.state.toLowerCase();
						switch (theState) {
							case 'y':
								wanchainLog('input receiver address: 0x08d972cc3a0246bda92cdffb28051dd5914faeeb', config.consoleColor.COLOR_FgGreen);
								prompt.get(require('./utils/schema/ordinaryAddr'), function (err, result) {
									var receiver = result.address;

									wanchainLog('input sender value(eth): ', config.consoleColor.COLOR_FgGreen);
									prompt.get(require('./utils/schema/ordinaryValue'), function (err, result) {
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

		case '2':
			console.log('隐私');
			break;

		case '3':
			prompt.get(require('./utils/schema/balanceSchema'), function (err, result) {
				var balance = web3.eth.getBalance(result.balance);
				var weiToEth = web3.fromWei(balance);
				wanchainLog(weiToEth.toString() + ' eth', config.consoleColor.COLOR_FgGreen);
			});
			break;
	}
});