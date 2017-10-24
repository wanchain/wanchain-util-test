#!/usr/bin/env node

const fs = require('fs');
const Web3 = require("web3");
const Method = require("web3/lib/web3/method");

var keythereum = require("keythereum");
var ethUtil = require('wanchain-util').ethereumUtil;

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider( config.host + ":8545"));

var wanchainLog = require('./utils/wanchainLog');

wanchainLog('waiting for...', config.consoleColor.COLOR_FgRed);

var contractInstanceAddress = config.contractInstanceAddress;

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

function handleTransaction(tx)
{
    web3.eth.getTransactionReceipt(tx.hash,async (err, contRect)=>{
        if(err || !contRect ){
            return;
        }

        if(tx.to === contractInstanceAddress){
            let cmd = tx.input.slice(2,4).toString('hex');
            if(cmd !== "00"){
                return;
            }
            let ota = tx.input.slice(4); // the format is 1 byte cmd and  waddr followed.
            let value = tx.value.toString();
            let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
            let otaA1 = otaPub.A;
            let otaS1 = otaPub.B;
            let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

            if(A1.toString('hex') === otaA1.toString('hex')){
	              wanchainLog('======START======', config.consoleColor.COLOR_FgGreen);

	              console.log("ota: ",ota);
                console.log("value: ", value);

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
		wanchainLog("Current balance of " + keystore.address + " is: " + web3.eth.getBalance(keystore.address).toString(), config.consoleColor.COLOR_FgYellow);
    filter.watch(function(error, result){
        if (!error){
            syncBlockHandler(result);
        }
    });
}
filterTest();

