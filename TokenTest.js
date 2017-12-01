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
var Tx = wanUtil.wanchainTx;
let coinSCDefinition = wanUtil.coinSCAbi;

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
var wanchainLog = require('./utils/wanchainLog');

web3.wan = new wanUtil.web3Wan(web3);

var preStampAddress = config.contractStampAddress;
let contractStampSC = web3.eth.contract(wanUtil.stampSCAbi);
let contractStampInstance = contractStampSC.at(preStampAddress);

var content = fs.readFileSync(path.join("./sol", "ERC20.sol"), 'utf8');
var compiled = solc.compile(content, 1);
var privacyContract = web3.eth.contract(JSON.parse(compiled.contracts[':ERC20'].interface));

let TokenInstance = 0;
let TokenAddress = 0x00;

let keyPassword = "wanglu";



function parseKeystoreFile(filepath,keyPassword){
    let keystoreStr = fs.readFileSync(filepath,"utf8");
    let keystore = JSON.parse(keystoreStr);
    let keyAObj = {version:keystore.version, crypto:keystore.crypto};
    let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
    keystore.privKeyA = keythereum.recover(keyPassword, keyAObj);
    keystore.privKeyB = keythereum.recover(keyPassword, keyBObj);
    keystore.address = '0x'+keystore.address;
    let PubKey = wanUtil.recoverPubkeyFromWaddress(keystore.waddress);
    keystore.pubKeyA = PubKey.A;
    keystore.pubKeyB = PubKey.B;
    return keystore;
}
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

async function deployContract(contractName, myKey) {
    var content = fs.readFileSync(path.join(__dirname+'/sol/', contractName+".sol"), 'utf8');
    var compiled = solc.compile(content, 1);
    var myTestContract = web3.eth.contract(JSON.parse(compiled.contracts[':'+contractName].interface));

    var constructorInputs = [];
    constructorInputs.push({ data: compiled.contracts[':'+contractName].bytecode});
    var txData = myTestContract.new.getData.apply(null, constructorInputs);

    var serial = '0x' + web3.eth.getTransactionCount(myKey.address).toString(16);
    var rawTx = {
        Txtype: '0x01',
        nonce: serial,
        gasPrice: '0x30d40',
        gasLimit: '0xf4240',
        to: '',
        value: '0x00',
        from: myKey.address,
        data: '0x' + txData
    };
    var tx = new Tx(rawTx);
    tx.sign(myKey.privKeyA);
    var serializedTx = tx.serialize();
    console.log("serializedTx:" + serializedTx.toString('hex'));
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    let receipt = await getTransactionReceipt(hash);
    console.log(receipt);
    console.log("contractAddress:"+receipt.contractAddress);
    fs.writeFileSync(contractName+".addr", receipt.contractAddress);
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
async function testTokenSend(token_to_ota_addr, token_to_ota, stamp, stampHoderKeystore, tokenHoderKeystore) {
    console.log("testTokenSend...");
    let cxtInterfaceCallData = TokenInstance.otatransfer.getData(token_to_ota_addr, token_to_ota, 888);

    let otaSet = web3.wan.getOTAMixSet(stamp, 3);
    console.log("fetch  ota stamp set: ",otaSet);

    let otaSetBuf = [];
    for(let i=0; i<otaSet.length; i++){
        let rpkc = new Buffer(otaSet[i].slice(2,68),'hex');
        let rpcu = secp256k1.publicKeyConvert(rpkc, false);
        otaSetBuf.push(rpcu);
    }

    let otaSk = wanUtil.computeWaddrPrivateKey(stamp, stampHoderKeystore.privKeyA,stampHoderKeystore.privKeyB);
    let otaPub = wanUtil.recoverPubkeyFromWaddress(stamp);

    let ringArgs = wanUtil.getRingSign(new Buffer(tokenHoderKeystore.address.slice(2),'hex'), otaSk,otaPub.A,otaSetBuf);
    if(!wanUtil.verifyRinSign(ringArgs)){
        console.log("ring sign is wrong@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");
        return;
    }
    let KIWQ = generatePubkeyIWQforRing(ringArgs.PubKeys,ringArgs.I, ringArgs.w, ringArgs.q);
    let glueContractDef = web3.eth.contract([{"constant":false,"type":"function","inputs":[{"name":"RingSignedData","type":"string"},{"name":"CxtCallParams","type":"bytes"}],"name":"combine","outputs":[{"name":"RingSignedData","type":"string"},{"name":"CxtCallParams","type":"bytes"}]}]);
    let glueContract = glueContractDef.at("0x0000000000000000000000000000000000000000");
    let combinedData = glueContract.combine.getData(KIWQ, cxtInterfaceCallData);
    //let all = TokenInstance.
    var serial = '0x' + web3.eth.getTransactionCount(tokenHoderKeystore.address).toString(16);
    var rawTx = {
        Txtype: '0x06',
        nonce: serial,
        gasPrice: '0x30d40',
        gasLimit: '0xf4240',
        to: TokenAddress,
        value: '0x00',
        data: combinedData
    };
    console.log("payload: " + rawTx.data.toString('hex'));

    var tx = new Tx(rawTx);
    tx.sign(tokenHoderKeystore.privKeyA);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    console.log("serializeTx:" + serializedTx.toString('hex'));
    console.log('tx hash:'+hash);
    let receipt = await getTransactionReceipt(hash);
    console.log(receipt);
    console.log("Token balance of ",token_to_ota_addr, " is ", TokenInstance.otabalanceOf(token_to_ota_addr).toString(), "key is ", TokenInstance.otaKey(token_to_ota_addr));
}


async function testTokenInit(myKey) {
    let mintdata = TokenInstance.initPrivacyAsset.getData(myKey.address, myKey.waddress, "0xf4240");

    var serial = '0x' + web3.eth.getTransactionCount(myKey.address).toString(16);
    var rawTx = {
        Txtype: '0x00',
        nonce: serial,
        gasPrice: '0x30d40',
        gasLimit: '0xf4240',
        to: TokenAddress,
        value: '0x00',
        data: mintdata
    };
    console.log("payload: " + rawTx.data.toString('hex'));

    var tx = new Tx(rawTx);
    console.log("TX:", tx);
    tx.sign(myKey.privKeyA);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    console.log("serializeTx:" + serializedTx.toString('hex'));
    console.log('tx hash:'+hash);
    let receipt = await getTransactionReceipt(hash);
    console.log(receipt);
    console.log("Token balance of ",myKey.address, " is ");
    console.log( TokenInstance.otabalanceOf(myKey.address).toString());
    console.log("key is ", TokenInstance.otaKey(myKey.address));
}
async function buyStamp(myKey, stamp, value){
    let payload = contractStampInstance.buyStamp.getData(stamp, value);
    var serial = '0x' + web3.eth.getTransactionCount(myKey.address).toString(16);
    var rawTx = {
        Txtype: '0x0',
        nonce: serial,
        gasPrice: '0x30d40',
        gasLimit: '0xf4240',
        to: config.contractStampAddress,
        value: value,
        data: payload
    };
    console.log("payload: " + rawTx.data);
    console.log("tx: ",rawTx);
    var tx = new Tx(rawTx);
    tx.sign(myKey.privKeyA);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));

    wanchainLog('serializeTx: ' + serializedTx.toString('hex'), config.consoleColor.COLOR_FgGreen);
    wanchainLog('tx hash: ' + hash, config.consoleColor.COLOR_FgRed);

    let receipt = await getTransactionReceipt(hash);
    wanchainLog('receipt: ' + JSON.stringify(receipt), config.consoleColor.COLOR_FgGreen);
    console.log("you have got a stamp, address and value are: ",stamp, web3.wan.getOTABalance(stamp));
}

async function main(){
    let myKey = parseKeystoreFile("./keys/myKey.json",keyPassword);
    await deployContract("ERC20", myKey);
    TokenAddress = fs.readFileSync("ERC20.addr","utf8");
    //TokenAddress = "0x7c0ec9698764435c3ab795f5debb64ab590bed7a";

    TokenInstance = privacyContract.at(TokenAddress);

    await testTokenInit(myKey);

    let stamp = wanUtil.generateOTAWaddress(myKey.waddress).toLowerCase();
    await buyStamp(myKey, stamp,  5000000000000000);
    console.log("stamp: ", stamp);

    let account2 = parseKeystoreFile("./keys/Account2.json",keyPassword);
    let token_to_ota =  wanUtil.generateOTAWaddress(account2.waddress).toLowerCase();
    let token_to_ota_a = wanUtil.recoverPubkeyFromWaddress(token_to_ota).A;
    let token_to_ota_addr = "0x"+wanUtil.sha3(token_to_ota_a.slice(1)).slice(-20).toString('hex');
    console.log("token_to_ota_addr:",  token_to_ota_addr);
    console.log("token_to_ota:",token_to_ota);
    await testTokenSend(token_to_ota_addr, token_to_ota, stamp, myKey, myKey);

    // the receiver send to another
    let stamp2 = wanUtil.generateOTAWaddress(account2.waddress).toLowerCase();
    await buyStamp(account2, stamp2,  5000000000000000);
    console.log("stamp2: ", stamp2);

    let account3 = parseKeystoreFile("./keys/Account3.json",keyPassword);
    //let token_to_ota3 =  wanUtil.generateOTAWaddress(account3.waddress).toLowerCase();
    let token_to_ota3 = account3.waddress;
    let token_to_ota_a3 = wanUtil.recoverPubkeyFromWaddress(token_to_ota3).A;
    let token_to_ota_addr3 = "0x"+wanUtil.sha3(token_to_ota_a3.slice(1)).slice(-20).toString('hex');
    console.log("token_to_ota_addr2:",  token_to_ota_addr3);
    console.log("token_to_ota2:",token_to_ota3);
    let otaKey = {};

    // caculate the private key of ota addr.
    console.log(TokenInstance.otaKey(token_to_ota_addr));
    let privateKey = wanUtil.computeWaddrPrivateKey(TokenInstance.otaKey(token_to_ota_addr).slice(2), account2.privKeyA, account2.privKeyB);
    otaKey.address =token_to_ota_addr;
    otaKey.privKeyA = privateKey;
    await testTokenSend(token_to_ota_addr3, token_to_ota3, stamp2, account2, otaKey);

}

main();
