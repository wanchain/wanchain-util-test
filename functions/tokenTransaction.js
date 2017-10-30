#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const secp256k1 = require('secp256k1');
const solc = require('solc');
const keythereum = require("keythereum");

const wanUtil = require('wanchain-util');
const ethUtil = wanUtil.ethereumUtil;
const Tx = wanUtil.ethereumTx;
const prompt = require('prompt');
const colors = require("colors/safe");

const config = require('../config');

const web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
const wanchainLog = require('../utils/wanchainLog');
const stamp2json = require('../utils/stamp2json');

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


			let TokenAddress = fs.readFileSync("ERC20.addr","utf8");
			let content = fs.readFileSync(path.join("../sol", "ERC20.sol"), 'utf8');
			let compiled = solc.compile(content, 1);
			let privacyContract = web3.eth.contract(JSON.parse(compiled.contracts[':ERC20'].interface));
			let TokenInstance = privacyContract.at(TokenAddress);


			try {
				console.log('keystore', keystore);
				let keyPassword = result.keyPassword;
				keystore.address = keystore.address.slice(2);
				let keyAObj = {version:keystore.version, crypto:keystore.crypto};
				let keyBObj = {version:keystore.version, crypto:keystore.crypto2};

				const address = keystore.address;
				let privKeyA = keythereum.recover(keyPassword, keyAObj);
				let privKeyB = keythereum.recover(keyPassword, keyBObj);

				wanchainLog("Input waddress", config.consoleColor.COLOR_FgGreen);
				prompt.get(require('../utils/schema/privacyAddr'), function (err, result) {
					let waddress = result.waddress;

					wanchainLog('Input value(eth): ', config.consoleColor.COLOR_FgGreen);
					prompt.get(require('../utils/schema/theValue'), function (err, result) {
						const strSendValueInWei = web3.toWei(result.value);
						const bnSendValueInWei = new web3.BigNumber(strSendValueInWei);
						const value = '0x' + bnSendValueInWei.toString(16);

						try {
							let stampStr = fs.readFileSync('./otaData/stampData.txt', 'utf8');
							let stampTotal = stampStr.split('\n');

							try{
								let stampData = [];
								for (let i=0; i<stampTotal.length; i++) {
									if (stampTotal[i].length >0) {
										if(JSON.parse(stampTotal[i]).address === address) {
											stampData.push(stampTotal[i])
										}
									}
								}

								let stampDataStateStr = fs.readFileSync("./otaData/stampDataState.txt","utf8");
								let stampDataState = stampDataStateStr.split('\n');

								let stampDataUndo = stamp2json(stampData, stampDataState)[0];

								console.log('stampDataUndo: ', stampDataUndo);

								for (let i = 0; i<stampDataUndo.length; i++) {
									wanchainLog('address: 0x' + stampDataUndo[i].address + ' stamp: ' + stampDataUndo[i].stamp + ' value: ' + stampDataUndo[i].value + '\n', config.consoleColor.COLOR_FgYellow);
								}

								wanchainLog("Input stamp", config.consoleColor.COLOR_FgGreen);
								prompt.get(require('../utils/schema/privacyAddr'), function (err, result) {
									let stamp = result.waddress;

									tokenSend(address, privKeyA, privKeyB, waddress, stamp, value, TokenAddress, TokenInstance);

								})

							} catch (e) {
								let stampData = [];
								for (let i=0; i<stampTotal.length; i++) {
									if (stampTotal[i].length >0) {
										if(JSON.parse(stampTotal[i]).address === address) {
											stampData.push(JSON.parse(stampTotal[i]));
										}
									}
								}

								for (let i=0; i<stampData.length; i++) {
									wanchainLog('address: 0x' + stampData[i].address + ' stamp: ' + stampData[i].stamp + ' value: ' + stampData[i].value + '\n', config.consoleColor.COLOR_FgYellow);
								}

								wanchainLog("Input stamp", config.consoleColor.COLOR_FgGreen);
								prompt.get(require('../utils/schema/privacyAddr'), function (err, result) {
									let stamp = result.waddress;

									tokenSend(address, privKeyA, privKeyB, waddress, stamp, value, TokenAddress, TokenInstance);

								})
							}

						} catch (e) {
							wanchainLog('have not stampData.', config.consoleColor.COLOR_FgRed);
						}
					})

				})

			} catch (e) {
				wanchainLog('password invalid', config.consoleColor.COLOR_FgRed);
			}
		});
	} catch (e) {
		wanchainLog('file name invalid (without file format)', config.consoleColor.COLOR_FgRed);
	}
});


async function tokenSend(address, privKeyA, privKeyB, token_to_waddr, stamp, value, TokenAddress, TokenInstance) {

	let token_to_ota =  ethUtil.generateOTAWaddress(token_to_waddr).toLowerCase();
	let token_to_ota_a = ethUtil.recoverPubkeyFromWaddress(token_to_ota).A;
	let token_to_ota_addr = "0x"+ethUtil.sha3(token_to_ota_a).slice(-20).toString('hex');
	console.log("token_to_ota_addr:",  token_to_ota_addr);
	console.log("token_to_ota:",token_to_ota);
	let cxtInterfaceCallData = TokenInstance.otatransfer.getData(token_to_ota_addr, token_to_ota, 888);

	let otaSet = web3.wan.getOTAMixSet(stamp, 3);
	let otaSetBuf = [];
	for(let i=0; i<otaSet.length; i++){
		let rpkc = new Buffer(otaSet[i].slice(0,66),'hex');
		let rpcu = secp256k1.publicKeyConvert(rpkc, false);
		otaSetBuf.push(rpcu);
	}

	console.log("fetch  ota stamp set: ",otaSet);
	let otaSk = ethUtil.computeWaddrPrivateKey(stamp, privKeyA,privKeyB);
	let otaPub = ethUtil.recoverPubkeyFromWaddress(stamp);

	let ringArgs = ethUtil.getRingSign(new Buffer(address,'hex'), otaSk,otaPub.A,otaSetBuf);
	if(!ethUtil.verifyRinSign(ringArgs)){
		console.log("ring sign is wrong@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
		return;
	}
	let KIWQ = generatePubkeyIWQforRing(ringArgs.PubKeys,ringArgs.I, ringArgs.w, ringArgs.q);
	let glueContractDef = web3.eth.contract([{"constant":false,"type":"function","inputs":[{"name":"RingSignedData","type":"string"},{"name":"CxtCallParams","type":"bytes"}],"name":"combine","outputs":[{"name":"RingSignedData","type":"string"},{"name":"CxtCallParams","type":"bytes"}]}]);
	let glueContract = glueContractDef.at("0x0000000000000000000000000000000000000000");
	let combinedData = glueContract.combine.getData(KIWQ, cxtInterfaceCallData);
	//let all = TokenInstance.
	var serial = '0x' + web3.eth.getTransactionCount('0x'+ address).toString(16);
	var rawTx = {
		Txtype: '0x06',
		nonce: serial,
		gasPrice: '0x6fc23ac00',
		gasLimit: '0xf4240',
		to: TokenAddress,
		value: value,
		data: combinedData
	};
	console.log("payload: " + rawTx.data.toString('hex'));

	var tx = new Tx(rawTx);
	tx.sign(privKeyA);
	var serializedTx = tx.serialize();
	let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
	console.log("serializeTx:" + serializedTx.toString('hex'));
	console.log('tx hash:'+hash);
	let receipt = await getTransactionReceipt(hash, stamp);
	console.log(receipt);
	// console.log("Token balance of ",token_to_ota_addr, " is ", TokenInstance.otabalanceOf(token_to_ota_addr).toString(), "key is ", TokenInstance.otaKey(token_to_ota_addr));

}

function getTransactionReceipt(txHash, address)
{
    return new Promise(function(success,fail){
        let filter = web3.eth.filter('latest');
        let blockAfter = 0;
        filter.watch(function(err,blockhash){
            if(err ){
	            let data = {};
	            data[address] = 'Failed';
	            let log = fs.createWriteStream('./otaData/stampDataState.txt', {'flags': 'a'});
	            log.end(JSON.stringify(data) + '\n');
                console.log("err:"+err);
                fail("err:"+err);
            }else{
                let receipt = web3.eth.getTransactionReceipt(txHash);
                blockAfter += 1;
                if(receipt){
		                let data = {};
		                data[address] = 'Done';
		                let log = fs.createWriteStream('./otaData/stampDataState.txt', {'flags': 'a'});
		                log.end(JSON.stringify(data) + '\n');

                    filter.stopWatching();
                    success(receipt);
                    return receipt;
                }else if(blockAfter > 6){
	                let data = {};
	                data[address] = 'Failed';
	                let log = fs.createWriteStream('./otaData/stampDataState.txt', {'flags': 'a'});
	                log.end(JSON.stringify(data) + '\n');
	                fail("Get receipt timeout");
                }
            }
        });
    });
}


/* set pubkey, w, q */
function generatePubkeyIWQforRing(Pubs, I, w, q){
    let length = Pubs.length;
    let sPubs  = [];
    for(let i=0; i<length; i++){
        sPubs.push(Pubs[i].toString('hex'));
    }
    let ssPubs = sPubs.join('&');
    let ssI = I.toString('hex');
    let sw  = [];
    for(let i=0; i<length; i++){
        sw.push('0x'+w[i].toString('hex').replace(/(^0*)/g,""));
    }
    let ssw = sw.join('&');
    let sq  = [];
    for(let i=0; i<length; i++){
        sq.push('0x'+q[i].toString('hex').replace(/(^0*)/g,""));
    }
    let ssq = sq.join('&');

    let KWQ = [ssPubs,ssI,ssw,ssq].join('+');
    return KWQ;
}



