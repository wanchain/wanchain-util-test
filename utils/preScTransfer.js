
var config = require('../config');

function getTransactionReceipt(web3, txHash)
{
	return new Promise(function(success,fail){
		let filter = web3.eth.filter('latest');
		let blockAfter = 0;
		filter.watch(function(err,blockhash){
			if(err ){
				console.log("err: "+err);
			}else{
				let receipt = web3.eth.getTransactionReceipt(txHash);
				blockAfter += 1;
				if(receipt){
					filter.stopWatching();
					success(receipt);
					return receipt;
				}else if(blockAfter > 6){
					fail("Get receipt timeout");
				}
			}
		});
	});
}

async function preScTransfer(web3, Tx, ethUtil, fromsk,fromaddress, toWaddr, contractInstanceAddress, value, wanchainLog){
	var otaDestAddress = ethUtil.generateOTAWaddress(toWaddr);
	console.log('otaDestAddress: ', otaDestAddress);
	let payload = ethUtil.getDataForSendWanCoin(otaDestAddress);
	var privateKey = new Buffer(fromsk, 'hex');//from.so_privatekey
	var serial = '0x' + web3.eth.getTransactionCount(fromaddress).toString(16);
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

	var tx = new Tx(rawTx);
	tx.sign(privateKey);
	var serializedTx = tx.serialize();
	let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));

	wanchainLog('serializeTx: ' + serializedTx.toString('hex'), config.consoleColor.COLOR_FgGreen);
	wanchainLog('tx hash: ' + hash, config.consoleColor.COLOR_FgRed);

	let receipt = await getTransactionReceipt(web3, hash);
	wanchainLog('receipt: ' + JSON.stringify(receipt), config.consoleColor.COLOR_FgGreen);
}

module.exports = preScTransfer;