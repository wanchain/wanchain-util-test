const fs = require('fs');
const Web3 = require("web3");
const ethUtil = require('wanchain-util').ethereumUtil;
const Tx = require('wanchain-util').ethereumTx;
const BN = require('bn.js');
const Method = require("web3/lib/web3/method");

const config = require('./config');


let keystoreStr = fs.readFileSync("./keystore-test.json","utf8");
let keystore = JSON.parse(keystoreStr);

let walletStr = fs.readFileSync("./walletMessage.json","utf8");
let wallet = JSON.parse(walletStr);

let privKeyA = new Buffer(wallet.privKeyA);
let privKeyB = new Buffer(wallet.privKeyB);
let myWaddr = wallet.waddress;
let pubKeyA = new Buffer(wallet.pubKeyA);
let pubKeyB = new Buffer(wallet.pubKeyB);

// console.log('privKeyA', new Buffer(privKeyA));
// console.log('privKeyB', new Buffer(privKeyB));
// console.log('myWaddr', myWaddr);
// console.log('pubKeyA', new Buffer(pubKeyA));
// console.log('pubKeyB', new Buffer(pubKeyB));


let web3 = new Web3(new Web3.providers.HttpProvider(config.host + ':' + config.port));
let getOTAMixSet = new Method({
	name: 'getOTAMixSet',
	call: 'eth_getOTAMixSet',
	params: 2
});

let contractInstanceAddress = "0x0000000000000000000000000000000000000006";


//todo: generateHashforRing
generateHashforRing = (fromAddr, value) => {
	let h = new Buffer(32);
	h.fill(0);

	let fb = new Buffer(fromAddr, 'hex');
	fb.copy(h);
	h[20] = 0x02;

	let vbn = new BN(value, 10);
	let vb = vbn.toBuffer();
	let vb1 = vb.length;
	h[21] = vb1;
	h[22] = 0x00;
	h[23] = 132;

	console.log('h', h);
	return h;
};

//todo: 通过一个交易哈希，返回一个交易的收据。
function getTransactionReceipt(txHash) {
	return new Promise((success, fail) => {
		let filter = web3.eth.filter('latest');
		let blockAfter = 0;

		filter.watch((err, blockHash) => {
			if (err) {
				console.log('err: ', err);
			} else {
				let receipt = web3.eth.getTransactionReceipt(txHash);
				blockAfter += 1;
				if (receipt) {
					filter.stopWatching();
					success(receipt);
					return receipt;
				} else if (blockAfter > 6) {
					fail('Get receipt timeout');
				}
			}
		})
	})
}

//todo: 发送交易
otaRefund = async (otaSk, otaPubK, ringPubKs, value) => {
	let M = generateHashforRing(keystore.address, value);
	let payload = ethUtil.getDataForRefundWanCoin(M, otaSk, otaPubK, ringPubKs); // otaSk 含有privateA, privateB
	let serial = '0x' + web3.eth.getTransactionCount('0x' + keystore.address).toString(16);

	let rawTx = {
		Txtype: '0x00',
		nonce: serial,
		gasPrice: '0x80000',
		gasLimit: '0x10000',
		to: contractInstanceAddress,
		value: '0x00',
		data: payload //环签名
	};

	console.log('payload: ', payload);

	let tx = new Tx(rawTx);
	tx.sign(privKeyA); //最后还是一笔普通交易

	let serializedTx = tx.serialize();
	let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
	console.log('serializedTx: ', serializedTx.toString('hex'));
	console.log('tx hash: ', hash);

	let receipt = await getTransactionReceipt(hash);

	console.log('receipt: ', receipt);

};

//todo: 处理交易收据
function handleTransaction(tx) {
	web3.eth.getTransactionReceipt(tx.hash, async (err, contRect) => {
		if (err || !contRect) {
			return;
		}

		if (tx.to === contractInstanceAddress) {

			let ota = tx.input.slice(4);
			let value = tx.value.toString();
			let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);

			let otaA1 = otaPub.A;
			let otaS1 = otaPub.B;
			let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

			console.log('A1', A1.toString('hex'));
			console.log('otaA1', otaA1.toString('hex'));

			if (A1.toString('hex') === otaA1.toString('hex')) {
				console.log("received a privacy transaction to me: ", ota);
				console.log('the value is: ', value);

				let otaSet = web3.eth.getOTAMixSet(ota, 3);
				console.log('fetch ota set: ', otaSet);

				let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA, privKeyB);
				let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
				console.log('otaSk: ', otaSk);
				console.log('otaPub: ', otaPub);

				// await otaRefund(otaSk, otaPub.A, otaSet, value);

				console.log('New balance of: ', keystore.address, " is: ", web3.eth.getBalance(keystore.address).toString());
			}
		}
	});
}

// todo: 返回块号或区块哈希值所对应的区块

asyncBlockHandler = (hash) => {
	web3.eth.getBlock(hash, true, async (err, block) => {
		if (err) {
			console.log('err: ', err);
			return;
		}
		try {
			block.transactions.forEach(handleTransaction);
		} catch (err) {
			console.log('try err: ', err);
		}
	})
};


//todo: filter started
startFilter = () => {
	let filter = web3.eth.filter('latest');
	console.log('filter started');
	console.log("Current balance of: ", keystore.address, " is ", web3.eth.getBalance(keystore.address).toString());

	filter.watch((error, result) => {
		if (!error) {
			console.log('result: ', result); // result 交易所有块的哈希
			asyncBlockHandler(result);
		}
	})
};

startFilter();
