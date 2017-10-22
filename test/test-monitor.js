const fs = require('fs');
const Web3 = require('web3');
const keythereum = require('keythereum');
const ethUtil = require('wanchain-util').ethereumUtil;

const config = require('../config');

const web3 = new Web3(new Web3.providers.HttpProvider(config.host + ':' + config.port));

const contractInstanceAddress = config.contractInstanceAddress;
const keyPassword = config.keyPassword;
const keystoreStr = fs.readFileSync("../keystore-test.json", 'utf-8');
const keystore = JSON.parse(keystoreStr);

const keyOBObj = {version:keystore.version, crypto:keystore.crypto2};
const privKeyB = keythereum.recover(keyPassword, keyOBObj);
const privKeyBstr = privKeyB.toString('hex');

console.log('privKey Buffer', privKeyB);
console.log('privKey Str', privKeyBstr);

const myWaddress = keystore.waddress;
const pubKey = ethUtil.recoverPubkeyFromWaddress(myWaddress);
const pubKeyA = pubKey.A;


handleTransaction = (tx) => {
	web3.eth.getTransactionReceipt(tx.hash, (err, contRect) => {
		if (err || contRect) {
				return;
		}

		if (tx.to === contractInstanceAddress) {
			let ota = tx.input.slice(4); // slice(start,end) 返回一个新的数组，包含从 start 到 end （不包括该元素）的 arrayObject 中的元素
			console.log('ota', ota);

			let otaPub = ethUtil.recoverPubkeyFromRaw(ota);
			console.log('otaPub', otaPub);

			let otaA1 = otaPub.A;
			let otaS1 = otaPub.B;

			let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

			if(A1.toString('hex') === otaA1.toString('hex')){
				console.log("received a privacy transaction to me:",ota);
			}
		}
	})
};


syncBlockHandler = (hash) => {
	web3.eth.getBlock(hash, true, async (err, block)=> {
		if(err){
			logger.error(err);
			return;
		}

		try {
			block.transactions.forEach(handleTransaction);
		} catch (e) {
			logger.error(e);
		}
	})
};

let filter = web3.eth.filter('latest');
filter.watch((err, result) => {
	if (!err) {
		syncBlockHandler(result);
	}
});
