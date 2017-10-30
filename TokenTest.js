#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const BN = require('bn.js')
const secp256k1 = require('secp256k1');
const SolidityCoder = require('web3/lib/solidity/coder');

var solc = require('solc');

var keythereum = require("keythereum");
let wanUtil = require('wanchain-util');
var ethUtil = wanUtil.ethereumUtil;
var Tx = wanUtil.ethereumTx;
let coinSCDefinition = wanUtil.coinSCAbi;

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
var wanchainLog = require('./utils/wanchainLog');

web3.wan = new wanUtil.web3Wan(web3);

var preStampAddress = config.contractStampAddress;
let contractStampSC = web3.eth.contract(wanUtil.stampSCAbi);
let contractStampInstance = contractStampSC.at(preStampAddress);

var TokenAddress = fs.readFileSync("ERC20.addr","utf8");
var content = fs.readFileSync(path.join("./sol", "ERC20.sol"), 'utf8');
var compiled = solc.compile(content, 1);
var privacyContract = web3.eth.contract(JSON.parse(compiled.contracts[':ERC20'].interface));
var TokenInstance = privacyContract.at(TokenAddress);


let keyPassword = "wanglu";
let keystoreStr = fs.readFileSync("./myKey.json","utf8");
let keystore = JSON.parse(keystoreStr);
let keyAObj = {version:keystore.version, crypto:keystore.crypto};
let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
var privKeyA = keythereum.recover(keyPassword, keyAObj);
var privKeyB = keythereum.recover(keyPassword, keyBObj);
let myWaddr = keystore.waddress;
let PubKey = ethUtil.recoverPubkeyFromWaddress(myWaddr);
let pubKeyA = PubKey.A;
let stamp = "";

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


//syncBlockHandler(11953);
//let rawOta = '76ee5a82703e657f1ca5a2cd59ed26c4a1f823d9ef7f51fb5de5d0dea9368a7658b370194a19e4c08403650b4bad2941c198600babf0b9ebd3ac4f57021991d4205b582b9502a3c81e1f3db1c73a3d578b920402b5b54da5518e9c0330b7ca94d7378fb1fb9c0a1f9db2858734eb721d7d2607b831f1f82f766b9fc509f24f6f';
async function testTokenSend() {
    // generate reciver addr
    let token_to_waddr = "035c6f2618a476792c14a5959e418c9038c0b347fca40403326f818c2ed5dbdba503248e9f0357b49950fbd3929c698869352aa49a7c8efda91c4811cb15831348df";
    let token_to_ota =  ethUtil.generateOTAWaddress(token_to_waddr).toLowerCase();
    let token_to_ota_a = ethUtil.recoverPubkeyFromWaddress(token_to_ota).A
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

    let ringArgs = ethUtil.getRingSign(new Buffer(keystore.address,'hex'), otaSk,otaPub.A,otaSetBuf);
    if(!ethUtil.verifyRinSign(ringArgs)){
        console.log("ring sign is wrong@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
        return;
    }
    let KIWQ = generatePubkeyIWQforRing(ringArgs.PubKeys,ringArgs.I, ringArgs.w, ringArgs.q);
    let glueContractDef = web3.eth.contract([{"constant":false,"type":"function","inputs":[{"name":"RingSignedData","type":"string"},{"name":"CxtCallParams","type":"bytes"}],"name":"combine","outputs":[{"name":"RingSignedData","type":"string"},{"name":"CxtCallParams","type":"bytes"}]}]);
    let glueContract = glueContractDef.at("0x0000000000000000000000000000000000000000");
    let combinedData = glueContract.combine.getData(KIWQ, cxtInterfaceCallData);
    //let all = TokenInstance.
    var serial = '0x' + web3.eth.getTransactionCount('0x'+keystore.address).toString(16);
    var rawTx = {
        Txtype: '0x06',
        nonce: serial,
        gasPrice: '0x6fc23ac00',
        gasLimit: '0xf4240',
        to: TokenAddress,
        value: '0x00',
        data: combinedData
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
    console.log("Token balance of ",token_to_ota_addr, " is ", TokenInstance.otabalanceOf(token_to_ota_addr).toString(), "key is ", TokenInstance.otaKey(token_to_ota_addr));

}


async function testTokenInit() {
    let mintdata = TokenInstance.initPrivacyAsset.getData('0x'+keystore.address, keystore.waddress, "0xf4240");

    var serial = '0x' + web3.eth.getTransactionCount('0x'+keystore.address).toString(16);
    var rawTx = {
        Txtype: '0x00',
        nonce: serial,
        gasPrice: '0x6fc23ac00',
        gasLimit: '0xf4240',
        to: TokenAddress,
        value: '0x00',
        data: mintdata
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
    console.log("Token balance of 0x",keystore.address, " is ", TokenInstance.otabalanceOf('0x'+keystore.address).toString(), "key is ", TokenInstance.otaKey('0x'+keystore.address));
}
async function buyStamp(privateKey,fromaddress, toWaddr, value){
    stamp = ethUtil.generateOTAWaddress(toWaddr).toLowerCase();
    console.log('stamp: ', stamp);
    let payload = contractStampInstance.buyStamp.getData(stamp, value);
    var serial = '0x' + web3.eth.getTransactionCount('0x'+fromaddress).toString(16);
    var rawTx = {
        Txtype: '0x0',
        nonce: serial,
        gasPrice: '0x6fc23ac00',
        gasLimit: '0xf4240',
        to: preStampAddress,//contract address
        value: value,
        data: payload
    };
    console.log("payload: " + rawTx.data);
    console.log("tx: ",rawTx);
    var tx = new Tx(rawTx);
    tx.sign(privateKey);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));

    wanchainLog('serializeTx: ' + serializedTx.toString('hex'), config.consoleColor.COLOR_FgGreen);
    wanchainLog('tx hash: ' + hash, config.consoleColor.COLOR_FgRed);

    let receipt = await getTransactionReceipt(hash);
    wanchainLog('receipt: ' + JSON.stringify(receipt), config.consoleColor.COLOR_FgGreen);
    console.log("you have got a stamp, address and value are: ",stamp, web3.wan.getOTABalance(stamp));
}

async function main(){
    await buyStamp(privKeyA,keystore.address, keystore.waddress,  1000000000000000000);
    //stamp = "0x022fc442e14425383f5ed45effcd46fc7c3e462392ae00556a335c5d3ada66a819028dbf948558852a7e5b8575ca0058967cc10d6b869e97b788b517afac0de412c3";
    await testTokenInit();
    await testTokenSend();
}

main();
