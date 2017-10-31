#!/usr/bin/env node


var fs = require('fs');
var path = require('path');
var Web3 = require('web3');
var events = require('events');

let wanUtil = require('wanchain-util');
var ethUtil = wanUtil.ethereumUtil;
var Tx = wanUtil.ethereumTx;
let stampSCDefinition = wanUtil.stampSCAbi;
var solc = require('solc');

var config = require('./config');
var wanchainLog = require('./utils/wanchainLog');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));
web3.wan = new wanUtil.web3Wan(web3);

var contractInstanceAddress = config.contractStampAddress;
let contractStampSC = web3.eth.contract(stampSCDefinition);
let contractStampInstance = contractStampSC.at(contractInstanceAddress);


var from_sk = config.from_sk;
var from_address = config.from_address;
var to_waddress = "0x0340721B2B6C7970A443B215951C7BAa4c41c35E2b591EA51016Eae523f5E123760354b82CccbEdC5c84F16D63414d44F595d85FD9e46C617E29e3AE2e82C5F7bDA9";// yourself's waddr
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


async function preScTransfer(fromsk,fromaddress, toWaddr, value){
    var otaDestAddress = ethUtil.generateOTAWaddress(toWaddr).toLowerCase();
    console.log('otaDestAddress: ', otaDestAddress);
    //let payload = ethUtil.getDataForSendWanCoin(otaDestAddress);
    let payload = contractStampInstance.buyStamp.getData(otaDestAddress, value);
    var privateKey = new Buffer(fromsk, 'hex');//from.so_privatekey
    var serial = '0x' + web3.eth.getTransactionCount(fromaddress).toString(16);
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
    console.log("you have got a stamp, address and value are: ",otaDestAddress, web3.wan.getOTABalance(otaDestAddress));
}
async function main(){
    await preScTransfer(from_sk,from_address, to_waddress,  value);
}

main();


