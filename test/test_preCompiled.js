let fs = require('fs');
let path = require('path');
let Web3 = require('web3');
let events = require('events');

let Tx = require('wanchain-util').ethereumTx;
let ethUtil = require('wanchain-util').ethereumUtil;

let solc = require('solc');

const config = require('../config');

const web3 = new Web3(new Web3.providers.HttpProvider(config.host + ':' + config.port));

const contractInstanceAddress = config.contractInstanceAddress;


function getTransactionReceipt(txHash) {
	return new Promise((success, fail) => {
		let filter = web3.eth.filter('latest');
		let blockAfter = 0;
		filter.watch(function (err, blockHash) {
			if (err) {
				console.log("err:"+err);
			} else {
				let receipt = web3.eth.getTransactionReceipt(txHash);
				blockAfter += 1;

				if (receipt) {
					filter.stopWatching();
					success(receipt);
					return receipt;
				} else if (blockAfter > 6) {
					fail("Get receipt timeout");
				}
			}
		})
	})
}

async function preScTransfer(fromsk, fromaddress, toWaddr, value) {
	var otaDestAddress = ethUtil.generateOTAWaddress(toWaddr);
	console.log('otaDestAddress', otaDestAddress);

	let payload = ethUtil.getDataForSendWanCoin(otaDestAddress);
	let privateKey = new Buffer(fromsk, 'hex');
	let serial = '0x' + web3.eth.getTransactionCount(fromaddress).toString(16);

	var rawTx = {
		Txtype: '0x0',
		nonce: serial,
		gasPrice: '0x80000',
		gasLimit: '0x10000',
		to: contractInstanceAddress,//contract address
		value: value,
		data: payload
	};

	console.log("payload: " + rawTx.data);

	let tx = new Tx(rawTx);
	tx.sign(privateKey);

	var serializedTx = tx.serialize();
	let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
	console.log("serializeTx: " + serializedTx.toString('hex'));
	console.log('tx hash: '+hash);

	let receipt = await getTransactionReceipt(hash);
	console.log('receipt: ', receipt);
}

async function main(){
	let from_sk = 'a4369e77024c2ade4994a9345af5c47598c7cfb36c65e8a4a3117519883d9014';
	let from_address = '0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e';
	let to_waddress = "0x0340721B2B6C7970A443B215951C7BAa4c41c35E2b591EA51016Eae523f5E123760354b82CccbEdC5c84F16D63414d44F595d85FD9e46C617E29e3AE2e82C5F7bDA9";
	let value = 200000000000000000;

	await preScTransfer(from_sk,from_address, to_waddress, value);
}

main();
