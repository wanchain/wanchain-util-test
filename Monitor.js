#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
//const Wan = require("./web3Wan.js");
const Method = require("web3/lib/web3/method");
const BN = require('bn.js');

var keythereum = require("keythereum");
var ethUtil = require('wanchain-util').ethereumUtil;
var Tx = require('wanchain-util').ethereumTx;

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
var wanchainLog = require('./utils/wanchainLog');


var getOTAMixSet = new Method({
    name: 'getOTAMixSet',
    call: 'eth_getOTAMixSet',
    params: 2
});

getOTAMixSet.attachToObject(web3.eth);
getOTAMixSet.setRequestManager(web3.eth._requestManager);
//web3.wan = new Wan(web3);

var contractInstanceAddress = config.contractInstanceAddress;

let keyPassword = "wanglu";
let keystoreStr = fs.readFileSync("./keystore/mykeystore.json","utf8");
let keystore = JSON.parse(keystoreStr);
let keyAObj = {version:keystore.version, crypto:keystore.crypto};
let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
var privKeyA = keythereum.recover(keyPassword, keyAObj);
var privKeyB = keythereum.recover(keyPassword, keyBObj);
let myWaddr = keystore.waddress;
let PubKey = ethUtil.recoverPubkeyFromWaddress(myWaddr);
let pubKeyA = PubKey.A;

function getTransactionReceipt(txHash)
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
function generateHashforRing(fromAddr, value){
    let h = new Buffer(32);
    h.fill(0);
    let fb = new Buffer(fromAddr,'hex');
    fb.copy(h);
    h[20] = 0x02; //WANCOIN_REFUND
    let vbn = new BN(value,10);
    let vb = vbn.toBuffer();
    let vbl = vb.length;
    h[21] = vbl;
    h[22] = 0x00;
    h[23] = 132;
    return h;
}
async function otaRefund(otaSk, otaPubK, ringPubKs, value) {
    let M = generateHashforRing(keystore.address, value);// M = hash(rawTx). we need determine which item join the hash. ethUtil.otaHash??
    let payload = ethUtil.getDataForRefundWanCoin(M, otaSk,otaPubK,ringPubKs);
    var serial = '0x' + web3.eth.getTransactionCount('0x'+keystore.address).toString(16);
    var rawTx = {
        Txtype: '0x00',
        nonce: serial,
        gasPrice: '0x80000',
        gasLimit: '0x10000',
        to: contractInstanceAddress,//contract address
        value: '0x00',
        data: payload
    };
    console.log("payload: " + rawTx.data);

    var tx = new Tx(rawTx);
    tx.sign(privKeyA);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    console.log("serializeTx: " + serializedTx.toString('hex'));
    console.log('tx hash: '+hash);
    let receipt = await getTransactionReceipt(hash);
    console.log(receipt);
}

function handleTransaction(tx)
{
    web3.eth.getTransactionReceipt(tx.hash,async (err, contRect)=>{
        if(err || !contRect ){
            return;
        }

        if(tx.to === contractInstanceAddress){
            let ota = tx.input.slice(4); // the format is 1 byte cmd and  waddr followed.
            let value = tx.value.toString();
            let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
            let otaA1 = otaPub.A;
            let otaS1 = otaPub.B;
            let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

            if(A1.toString('hex') === otaA1.toString('hex')){
	              wanchainLog('======START======', config.consoleColor.COLOR_FgGreen);

	              console.log("received a privacy transaction to me: ",ota);
                console.log("the value is: ", value);
                let otaSet = web3.eth.getOTAMixSet(ota, 3);
                console.log("fetch  ota set: ",otaSet);
                let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA,privKeyB);
                let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
                //await otaRefund(otaSk,otaPub.A,otaSet,value);
                console.log("New balance of",keystore.address," is: ",web3.eth.getBalance(keystore.address).toString());

	              wanchainLog('======END======', config.consoleColor.COLOR_FgGreen);
	              console.log('\n');
            }
        }
    });
}

function syncBlockHandler(hash)
{
    web3.eth.getBlock(hash, true, async (err, block)=>{
        if(err){
            logger.error(err);
            return;
        }

        try {
            block.transactions.forEach(handleTransaction);
        }catch(err){
            logger.error(err);
        }
    });
}

let filter = web3.eth.filter("latest");
console.log("filter started");
console.log("Current balance of",keystore.address," is:",web3.eth.getBalance(keystore.address).toString());

filter.watch(function(error, result){
    if (!error){
        syncBlockHandler(result);
    }
});


//syncBlockHandler(11953);
//let rawOta = '76ee5a82703e657f1ca5a2cd59ed26c4a1f823d9ef7f51fb5de5d0dea9368a7658b370194a19e4c08403650b4bad2941c198600babf0b9ebd3ac4f57021991d4205b582b9502a3c81e1f3db1c73a3d578b920402b5b54da5518e9c0330b7ca94d7378fb1fb9c0a1f9db2858734eb721d7d2607b831f1f82f766b9fc509f24f6f';
async function testRefund() {
    let ota = config.ota;
    let value = ota.refundValue;
    let otaSet = web3.eth.getOTAMixSet(ota, 3);
    let otaSetBuf = [];
    for(let i=0; i<otaSet.length; i++){
        otaSetBuf.push(new Buffer(otaSet[i].slice(0,66),'hex'));
    }

    console.log("fetch  ota set: ",otaSet);
    let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA,privKeyB);
    let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);

    await otaRefund(otaSk,otaPub.A,otaSetBuf,value);
    console.log("New balance of",keystore.address," is: ",web3.eth.getBalance(keystore.address).toString());

}
//testRefund();