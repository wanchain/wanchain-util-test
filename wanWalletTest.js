var prompt = require('prompt');
var colors = require("colors/safe");
var Tx = require('wanchain-util').ethereumTx;

const Web3 = require("web3");
var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
var wanchainLog = require('./utils/wanchainLog');

var isCreateKeystore = require('./utils/promptFunc/isCreateKeystore');
var recharge = require('./utils/recharge');
var wanWalletTransaction = require('./wanWalletTransaction');

// Start the prompt
prompt.start();
prompt.message = colors.blue("wanWallet");
prompt.delimiter = colors.green("$");

wanchainLog(
	'pls input: \n' + 'y[Y] (If you has create keystore , pls select this) \n' + 'n[N] (If you not has keystore and want to create one, pls select this)',
	config.consoleColor.COLOR_FgYellow);

//todo: has keystore?
prompt.get(require('./utils/schema/isTransaction'), function (err, result) {
	var theState = result.state.toLowerCase();
	switch (theState) {
		case 'y':
			//todo: go to transaction or recharge

			wanchainLog('pls input: \n ' + '1 (go to transaction) \n' + '2 (go to recharge)', config.consoleColor.COLOR_FgYellow);

			prompt.get(require('./utils/schema/rechargeORtrans'), function (err, result) {
				var rechargeORtrans = result.rechargeORtrans;
				switch (rechargeORtrans) {
					//todo: go to transaction
					case '1':
						wanchainLog(
							'pls input: \n' + '1 (Ordinary Transaction) \n' + '2 (Privacy Transaction) \n' + '3 (OTA Transaction) \n' +
							'4 (Check the Ordinary Transaction balance) \n' + '5 (Check OTA balance)',
							config.consoleColor.COLOR_FgYellow);
						wanWalletTransaction(prompt, web3, wanchainLog);
						break;

					//todo: go to recharge
					case '2':
						wanchainLog(
							'pls input your address: ', config.consoleColor.COLOR_FgYellow);
						// recharge(prompt, web3, Tx, wanchainLog);
						break;
				}
			});

			break;

		case 'n':
			//todo: go to create keystore.
			wanchainLog('go to create keystore', config.consoleColor.COLOR_FgGreen);
			isCreateKeystore(prompt, web3, wanchainLog);
			break;
	}
});