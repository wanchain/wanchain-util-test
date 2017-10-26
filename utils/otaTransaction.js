#!/usr/bin/env node
var fs = require('fs');
const Method = require("web3/lib/web3/method");
const BN = require('bn.js');
const secp256k1 = require('secp256k1');

var config = require('../config');
var wanchainLog = require('./wanchainLog');


var contractInstanceAddress = config.contractInstanceAddress;

function getTransactionReceipt(web3, txHash, ota)
{
	return new Promise(function(success,fail){
		let filter = web3.eth.filter('latest');
		let blockAfter = 0;
		filter.watch(function(err,blockhash){
			if(err ){
				var data = {};
				data[ota] = 'Failed';
				var log = fs.createWriteStream('./utils/otaData/otaDataState.txt', {'flags': 'a'});
				log.end(JSON.stringify(data) + '\n');
				console.log("err: "+err);
			}else{
				let receipt = web3.eth.getTransactionReceipt(txHash);
				blockAfter += 1;
				if(receipt){
					var data = {};
					data[ota] = 'Done';
					var log = fs.createWriteStream('./utils/otaData/otaDataState.txt', {'flags': 'a'});
					log.end(JSON.stringify(data) + '\n');
					filter.stopWatching();
					success(receipt);
					return receipt;
				}else if(blockAfter > 6){
					var data = {};
					data[ota] = 'Failed';
					var log = fs.createWriteStream('./utils/otaData/otaDataState.txt', {'flags': 'a'});
					log.end(JSON.stringify(data) + '\n');
					fail("Get receipt timeout");
				}
			}
		});
	});
}

function generateHashforRing(fromAddr, value){
    let h = new Buffer(32);
    h.fill(0);
    let vbn = new BN(value,10);
    let vb = vbn.toBuffer();
    let vbl = vb.length;
    vb.copy(h, 32-vbl);
    return h;
}
/* the origPayload will be attached to ringSign */
function generateOrigPayloadforRing(value){
    let vbn = new BN(value,10);
    let vb = vbn.toBuffer();
    let vbl = vb.length;
    let h = new Buffer(4+128+vbl);
    h.fill(0);
    h[0] = 0x02;
    h[1] = vbl;
    h[2] = 0;
    h[3] = 132;
    vb.copy(h,132);
    return h;
}
/* set pubkey, w, q */
function generatePubkeyWQforRing(Pubs, w, q){
    let length = Pubs.length;
    let pubsCountB = Buffer.alloc(1);
    pubsCountB[0] = length;
    let bufArr = [];
    bufArr.push(pubsCountB);
    for(let i=0; i<length; i++){
        let ilen = 1+65+1+32+1+32;
        let offset = 0;
        let bi = Buffer.alloc(ilen);
        bi.fill(0);
        bi[offset] = 65; // pubkey len
        offset += 1;
        Pubs[i].copy(bi,offset);
        offset += 65;
        bi[offset] = 32;
        offset += 1;
        w[i].copy(bi, offset);
        offset += 32;
        bi[offset] = 32;
        offset += 1;
        q[i].copy(bi, offset);
        bufArr.push(bi);
    }
    let KWQ = Buffer.concat(bufArr);
    return KWQ;
}
async function otaRefund(web3,ethUtil, Tx,address, privKeyA, otaSk, otaPubK, ringPubKs, value, ota) {

    let M = generateHashforRing(address.slice(2), value);// M = hash(rawTx). we need determine which item join the hash. ethUtil.otaHash??
	console.log("M", M);
	console.log("otaSk", otaSk);
	console.log("otaPubK", otaPubK);
	console.log("ringPubKs", ringPubKs);
    let ringArgs = ethUtil.getRingSign(M, otaSk,otaPubK,ringPubKs);

	if(!ethUtil.verifyRinSign(ringArgs)){
        console.log("ring sign is wrong@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");

        for(let i=0; i<ringPubKs.length; i++){
            console.log("pubkey ", i, " : ", ringPubKs[i].toString('hex'));
        }
        console.log("I: ", ringArgs.I.toString('hex'));
        for(let i=0; i<ringPubKs.length; i++){
            console.log("w ", i, " : ", ringArgs.w[i].toString('hex'));
        }
        for(let i=0; i<ringPubKs.length; i++){
            console.log("q ", i, " : ", ringArgs.q[i].toString('hex'));
        }
        return;
    }

    let OP = generateOrigPayloadforRing(value);
    let KWQ = generatePubkeyWQforRing(ringArgs.PubKeys, ringArgs.w, ringArgs.q);
    let IB = Buffer.alloc(1+65);
    IB[0] = 65;
    ringArgs.I.copy(IB,1);
    let MH = Buffer.alloc(1+32);
    MH[0] = 32;
    M.copy(MH,1);
    let all = Buffer.concat([OP, KWQ, IB, MH]);

    var serial = '0x' + web3.eth.getTransactionCount('0x'+address).toString(16);

    var rawTx = {
        Txtype: '0x00',
        nonce: serial,
        gasPrice: '0x4a817c800',
        gasLimit: '0x60000',
        to: contractInstanceAddress,//contract address
        value: '0x00',
        data: all
    };
    console.log("payload: " + rawTx.data.toString('hex'));

    var tx = new Tx(rawTx);
    tx.sign(privKeyA);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    console.log("serializeTx:" + serializedTx.toString('hex'));
    console.log('tx hash:'+hash);

		wanchainLog('waiting for... ', config.consoleColor.COLOR_FgGreen);

		let receipt = await getTransactionReceipt(web3, hash, ota);
		console.log('receipt: ', receipt);
}


async function testRefund(web3,ethUtil, Tx, ota, value, privKeyA, privKeyB, address) {

		var getOTAMixSet = new Method({
			name: 'getOTAMixSet',
			call: 'eth_getOTAMixSet',
			params: 2
		});

		getOTAMixSet.attachToObject(web3.eth);
		getOTAMixSet.setRequestManager(web3.eth._requestManager);

    let otaSet = web3.eth.getOTAMixSet(ota, 3);

    let otaSetBuf = [];

    for(let i=0; i<otaSet.length; i++){
        let rpkc = new Buffer(otaSet[i].slice(0,66),'hex');
        let rpcu = secp256k1.publicKeyConvert(rpkc, false);
        otaSetBuf.push(rpcu);
    }

    console.log("fetch  ota set: ",otaSet);

    let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA,privKeyB);
    let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);

    await otaRefund(web3, ethUtil, Tx, address, privKeyA, otaSk,otaPub.A,otaSetBuf,value, ota);
}

module.exports = testRefund;
