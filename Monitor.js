#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const BN = require('bn.js')
const secp256k1 = require('secp256k1');
const SolidityCoder = require('web3/lib/solidity/coder');

var keythereum = require("keythereum");
let wanUtil = require('wanchain-util');
var ethUtil = wanUtil.ethereumUtil;
var Tx = wanUtil.ethereumTx;
let coinSCDefinition = wanUtil.coinSCAbi;

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
var wanchainLog = require('./utils/wanchainLog');

web3.wan = new wanUtil.web3Wan(web3);
let fhs_buyCoinNote = ethUtil.sha3('buyCoinNote(string,uint256)', 256).slice(0,4).toString('hex');
var contractInstanceAddress = config.contractInstanceAddress;
let contractCoinSC = web3.eth.contract(coinSCDefinition);
let contractCoinInstance = contractCoinSC.at(contractInstanceAddress);


let keyPassword = "wanglu";
let keystoreStr = fs.readFileSync("./keystore/mykeystore2.json","utf8");
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
                console.log("err:"+err);
                fail("err:"+err);
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
async function otaRefund(otaSk, otaPubK, ringPubKs, value) {
    let M = new Buffer(keystore.address,'hex');
    let ringArgs = ethUtil.getRingSign(M, otaSk,otaPubK,ringPubKs);
    if(!ethUtil.verifyRinSign(ringArgs)){
        console.log("ring sign is wrong@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
        return;
    }
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
    let KIWQ = generatePubkeyIWQforRing(ringArgs.PubKeys,ringArgs.I, ringArgs.w, ringArgs.q);
    let all = contractCoinInstance.refundCoin.getData(KIWQ,value);

    var serial = '0x' + web3.eth.getTransactionCount('0x'+keystore.address).toString(16);
    var rawTx = {
        Txtype: '0x00',
        nonce: serial,
        gasPrice: '0x6fc23ac00',
        gasLimit: '0xf4240',
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
    let receipt = await getTransactionReceipt(hash);
    console.log(receipt);
}
function parseContractMethodPara(paraData, abi,method)
{
    var dict = {};
    var inputs = [];
    let i=0;
    for(i=abi.length-1; i>=0; i--){
        if(abi[i].name == method){
            inputs = abi[i].inputs;
            break;
        }
    }
    if(i >= 0){
        var format = [];
        for(let j=0; j<inputs.length; j++){
            format.push(inputs[j].type);
        }
        let paras = SolidityCoder.decodeParams(format,paraData);
        for(let j=0; j<inputs.length && j<paras.length; j++){
            dict[inputs[j].name] = paras[j];
        }
    }

    return dict;
}
function handleTransaction(tx)
{
    web3.eth.getTransactionReceipt(tx.hash,async (err, contRect)=>{
        if(err || !contRect ){
            return;
        }

        if(tx.to == contractInstanceAddress){
            let cmd = tx.input.slice(2,10).toString('hex');
            if(cmd != fhs_buyCoinNote){
                return;
            }
            let inputPara = tx.input.slice(10);
            let paras = parseContractMethodPara(inputPara, wanUtil.coinSCAbi, "buyCoinNote");
            let value = paras.Value;
            let ota = paras.OtaAddr;
            let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
            let otaA1 = otaPub.A;
            let otaS1 = otaPub.B;
            let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

            if(A1.toString('hex') === otaA1.toString('hex')){
	              wanchainLog('======START======', config.consoleColor.COLOR_FgGreen);

	              console.log("received a privacy transaction to me: ",ota);
                console.log("the value is: ", value.toString());
                let otaSet = web3.wan.getOTAMixSet(ota, 3);
                console.log("fetch  ota set:",otaSet);
                let otaSetBuf = [];
                for(let i=0; i<otaSet.length; i++){
                    let rpkc = new Buffer(otaSet[i].slice(0,66),'hex');
                    let rpcu = secp256k1.publicKeyConvert(rpkc, false);
                    otaSetBuf.push(rpcu);
                }
                let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA,privKeyB);
                let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
                await otaRefund(otaSk,otaPub.A,otaSetBuf,value);
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



function filterTest(){
    let filter = web3.eth.filter("latest");
    console.log("filter started");
    console.log("Current balance of",keystore.address," is:",web3.eth.getBalance(keystore.address).toString());
    filter.watch(function(error, result){
        if (!error){
            syncBlockHandler(result);
        }
    });
}
filterTest();

//syncBlockHandler(11953);
//let rawOta = '76ee5a82703e657f1ca5a2cd59ed26c4a1f823d9ef7f51fb5de5d0dea9368a7658b370194a19e4c08403650b4bad2941c198600babf0b9ebd3ac4f57021991d4205b582b9502a3c81e1f3db1c73a3d578b920402b5b54da5518e9c0330b7ca94d7378fb1fb9c0a1f9db2858734eb721d7d2607b831f1f82f766b9fc509f24f6f';
async function testRefund() {
    let ota = "0x026b56e7e469eaac147d35ccd7b0596f5ad39556858c564178a8bec07409ad31e202e7e9a71ac431008b1da165f02da1846757c0cda5edc481a8b1fc55ca489924a7";
    let value = config.refundValue;
    let otaSet = web3.wan.getOTAMixSet(ota, 3);
    let otaSetBuf = [];
    for(let i=0; i<otaSet.length; i++){
        let rpkc = new Buffer(otaSet[i].slice(0,66),'hex');
        let rpcu = secp256k1.publicKeyConvert(rpkc, false);
        otaSetBuf.push(rpcu);
    }

    console.log("fetch  ota set: ",otaSet);
    let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA,privKeyB);
    let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);

    await otaRefund(otaSk,otaPub.A,otaSetBuf,value);
    console.log("New balance of",keystore.address," is: ",web3.eth.getBalance(keystore.address).toString());

}

//testRefund();
