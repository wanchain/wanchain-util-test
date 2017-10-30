const exec = require('child_process').exec;
const prompt = require('prompt');
const colors = require("colors/safe");
const wanUtil = require('wanchain-util');
const Web3 = require("web3");

const config = require('../config');

const web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));

web3.wan = new wanUtil.web3Wan(web3);
const wanchainLog = require('../utils/wanchainLog');

// Start the prompt
prompt.start();
prompt.message = colors.blue("wanWallet");
prompt.delimiter = colors.green("$");

prompt.get(require('../utils/schema/balanceSchema'), function (err, result) {
	const cmdStr = 'curl -d "userAddr=' + result.balance + '" http://121.42.8.74:3000/faucet';
	// console.log(cmdStr);

	exec(cmdStr, function(err,stdout,stderr){

		if(err) {
			wanchainLog('get recharge error: '+stderr, config.consoleColor.COLOR_FgRed);

		} else {
			wanchainLog('recharge success!!! '+stdout, config.consoleColor.COLOR_FgGreen);

		}

	});
});
