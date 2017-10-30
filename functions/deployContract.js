#!/usr/bin/env node

const Web3 = require('web3');
const fs = require("fs");
const Tx = require('wanchain-util').ethereumTx;
const prompt = require('prompt');
const colors = require("colors/safe");
const wanUtil = require('wanchain-util');
const keythereum = require("keythereum");

const wanchainLog = require('../utils/wanchainLog');
const config = require('../config');

const web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));

web3.wan = new wanUtil.web3Wan(web3);
// Start the prompt
prompt.start();
prompt.message = colors.blue("wanWallet");
prompt.delimiter = colors.green("$");

wanchainLog('Input your keystore file name: ', config.consoleColor.COLOR_FgGreen);
prompt.get(require('../utils/schema/mykeystore'), function (err, result) {
	try {
		let filename = "./keystore/" + result.OrdinaryKeystore + ".json";
		let keystoreStr = fs.readFileSync(filename, "utf8");

		let keystore = JSON.parse(keystoreStr)[1];
		console.log('you keystore: ', keystore);

		wanchainLog('Pls input your password to unlock your wallet', config.consoleColor.COLOR_FgGreen);
		prompt.get(require('../utils/schema/keyPassword'), function (err, result) {
			wanchainLog('waiting for unlock wallet....', config.consoleColor.COLOR_FgRed);

			let keyAObj = {version:keystore.version, crypto:keystore.crypto};

			try {
				const privKeyA = keythereum.recover(result.keyPassword, keyAObj);
				const address = keystore.address;

				deployContract(privKeyA, address);

			} catch (e) {
				wanchainLog('password invalid', config.consoleColor.COLOR_FgRed);
			}
		});
	} catch (e) {
		wanchainLog('file name invalid (without file format)', config.consoleColor.COLOR_FgRed);
	}
});


function deployContract(config_privatekey, config_pubkey) {

	const content = fs.readFileSync("../sol/ERC20.sol", 'utf8');

	const solc = require('solc');
	const compiled = solc.compile(content, 1);
	// console.log(compiled);
	const myTestContract = web3.eth.contract(JSON.parse(compiled.contracts[':ERC20'].interface));

	let globalHash = "";
	var constructorInputs = [];

	constructorInputs.push({ data: compiled.contracts[':ERC20'].bytecode});
	var txData = myTestContract.new.getData.apply(null, constructorInputs);

	//TODO: replace user's private key
	var privateKey = new Buffer(config_privatekey, 'hex');
	var amount = web3.toWei(0, 'ether');
	var bn = new web3.BigNumber(amount);
	var hexValue = '0x' + bn.toString(16);
	//TODO: replace with user address
	var serial = '0x' + web3.eth.getTransactionCount(config_pubkey).toString(16);
	var rawTx = {
		Txtype: '0x1',
		nonce: serial,
		gasPrice: '0xb88745',
		gasLimit: '0x90000',
		to: '',
		value: hexValue,
		from: config_pubkey,
		data: '0x' + txData
	};
	var tx = new Tx(rawTx);
	tx.sign(privateKey);
	var serializedTx = tx.serialize();
	// console.log("serializedTx:" + serializedTx.toString('hex'));
	web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'), function(err, hash){
		if(!err){
			console.log('tx hash:'+hash);
			globalHash = hash;
			let filter = web3.eth.filter('latest');
			filter.watch(function(err,hash){
				if(err ){
					console.log("err:"+err);
				}else{
					let receipt = web3.eth.getTransactionReceipt(globalHash);
					if(receipt){
						filter.stopWatching();
						console.log("contractAddress:"+receipt.contractAddress);
						fs.writeFileSync("ERC20.addr", receipt.contractAddress);
					}
				}
			});
		}else {
			console.log(err);
		}
	});
}

