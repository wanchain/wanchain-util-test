#!/usr/bin/env node


var fs = require('fs');
var path = require('path');
var Web3 = require('web3');
var events = require('events');

let wanUtil = require('wanchain-util');
var ethUtil = wanUtil.ethereumUtil;
var Tx = wanUtil.ethereumTx;
let coinSCDefinition = wanUtil.coinSCAbi;
var solc = require('solc');
var keythereum = require("keythereum");

var config = require('./config');
var wanchainLog = require('./utils/wanchainLog');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
web3.wan = new wanUtil.web3Wan(web3);

var contractInstanceAddress = config.contractInstanceAddress;
let contractCoinSC = web3.eth.contract(coinSCDefinition);
let contractCoinInstance = contractCoinSC.at(contractInstanceAddress);


let keyPassword = "wanglu";
let keystoreStr = fs.readFileSync("./myKey.json","utf8");
let keystore = JSON.parse(keystoreStr);
let keyAObj = {version:keystore.version, crypto:keystore.crypto};
let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
var privKeyA = keythereum.recover(keyPassword, keyAObj);
var privKeyB = keythereum.recover(keyPassword, keyBObj);
let privateKey = privKeyA;
let myWaddr = keystore.waddress;
let myAddr = '0x'+keystore.address;
let PubKey = ethUtil.recoverPubkeyFromWaddress(myWaddr);
let pubKeyA = PubKey.A;



var from_address = myAddr;
var to_waddress = myWaddr;
var value = config.transferValue;

function getTransactionReceipt(txHash)
{
    return new Promise(function(success,fail){
        let filter = web3.eth.filter('latest');
        let blockAfter = 0;
        filter.watch(function(err,blockhash){
            if(err ){
                console.log("err:"+err);
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


async function preScTransfer(toWaddr, value){
    var otaDestAddress = ethUtil.generateOTAWaddress(toWaddr).toLowerCase();
    console.log('otaDestAddress: ', otaDestAddress);
    let payload = contractCoinInstance.buyCoinNote.getData(otaDestAddress, value);
    var serial = '0x' + web3.eth.getTransactionCount(myAddr).toString(16);
    var rawTx = {
        Txtype: '0x0',
        nonce: serial,
        gasPrice: '0x6fc23ac00',
        gasLimit: '0xf4240',
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

    let receipt = await getTransactionReceipt(hash);
		wanchainLog('receipt: ' + JSON.stringify(receipt), config.consoleColor.COLOR_FgGreen);
}
async function main(){
    await preScTransfer(to_waddress,  value);
}

main();


