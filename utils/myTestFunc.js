let fs = require("fs");
let path = require("path");
let Web3 = require("web3");

let Tx = require("wanchain-util").ethereumTx;
let ethUtil = require("wanchain-util").ethereumUtil;
let solc = require("solc");

let config = require("../config");
const config_address = config.pubkey;
const config_privatekey = config.privatekey;

let web3 = new Web3(new Web3.providers.HttpProvider(config.host + ':' + config.port));

const srcDir = typeof (__dirname) === 'undefined' ? '' : __dirname;
const content = fs.readFileSync(path.join(srcDir, '../PrivacyTokenBase.sol'), 'utf8');
const compiled = solc.compile(content, 1);

const privacyContract = web3.eth.contract(JSON.parse(compiled.contracts[':PrivacyTokenBase'].interface));
// console.log('privacyContract', privacyContract);

const contractInstanceAddress = fs.readFileSync("../PrivacyTokenBase.addr", "utf8");
const contractInstance = privacyContract.at(contractInstanceAddress);
// console.log('contractInstance: ', contractInstance);


// todo: 通过一个交易哈希，返回一个交易的收据
// 备注：处于pending状态的交易，收据是不可用的。
function getTransactionReceipt(txHash) {
	return new Promise((success, fail) => {
		// 监听回调返回值
		let filter = web3.eth.filter('latest');
		let blockAfter = 0;
		
		//todo: filter.watch(callback): 监听满足条件的状态变化，满足条件时调用回调
		filter.watch((err, blockHash) => {
			if (err) {
				console.log("err: "+err);
			} else {
				let receipt = web3.eth.getTransactionReceipt(txHash);
				blockAfter += 1;
				
				if (receipt) {
					filter.stopWatching();
					console.log('receipt: ', receipt);
					success(receipt);
				} else if (blockAfter > 6) {
					fail("Get receipt timeout");
				}
			}
		});
	});
}

//todo: txHash
function txHashFunc(privateKey, rawTx) {
	var tx = new Tx(rawTx);
	tx.sign(privateKey);
	var serializedTx = tx.serialize();
	let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
	// console.log("serializeTx" + serializedTx.toString('hex'));
	console.log('tx hash:'+hash);

}

function payloadPrivacyTransfer(config_privatekey) {
	var pubkeyStr = ethUtil.publicKeyFromPrivateKey(config_privatekey);

	var ota = ethUtil.generateOTAPublicKey(pubkeyStr, pubkeyStr);
	var otaDest = ethUtil.generateOTAPublicKey(pubkeyStr, pubkeyStr);
	var otaDestKeyBytesCompressed = ethUtil.pubkeyStrCompressed(otaDest.OtaA1) + ethUtil.pubkeyStrCompressed(otaDest.OtaS1).slice(2);

	var otaAddress = ethUtil.bufferToHex(ethUtil.publicToAddress('0x' + ota.OtaA1));
	var otaDestAddress = ethUtil.bufferToHex(ethUtil.publicToAddress('0x' + otaDest.OtaA1));

	var bufOTAPrivate = ethUtil.computeOTAPrivateKey(ota.OtaA1, ota.OtaS1, config_privatekey,config_privatekey);
	var senderPrivateKey = ethUtil.bufferToHex(bufOTAPrivate).slice(2);

	var hash = ethUtil.otaHash(otaAddress, otaDestAddress,
		otaDestKeyBytesCompressed, ethUtil.numberToBytes32(6666));
	var sig = ethUtil.otaSign(hash, senderPrivateKey);

	var payload = contractInstance.privacyTransfer.getData(
		otaAddress, otaDestAddress, otaDestKeyBytesCompressed, 6666,
		sig.v,
		'0x' + sig.r.toString('hex'),
		'0x' + sig.s.toString('hex'));

	return payload;
}

function main() {
	var privateKey = new Buffer(config_privatekey, 'hex'); //from.so_privatekey

	var serial = '0x' + web3.eth.getTransactionCount(config_address).toString(16);
	var payload = payloadPrivacyTransfer(config_privatekey);

	const rawTx = {
		Txtype: '0x0',
		nonce: serial,
		gasPrice: '0x88745',
		gasLimit: '0x1000000',
		to: contractInstanceAddress,//contract address
		value: '0x00',
		//from: config_address,
		data: payload
	};

	txHashFunc(privateKey, rawTx)
}

main();
