#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
var keythereum = require("keythereum");
var ethUtil = require('wanchain-util').ethereumUtil;

const config = require('./config');

const web3 = new Web3(new Web3.providers.HttpProvider(config.host + ':' + config.port));

var contractInstanceAddress = config.contractInstanceAddress;
let keyPassword = config.keyPassword;
let keystoreStr = fs.readFileSync("./keystore-test.json","utf8");
let keystore = JSON.parse(keystoreStr);
let keyAObj = {version:keystore.version, crypto:keystore.crypto};
let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
var privKeyB = keythereum.recover(keyPassword, keyBObj);

let myWaddr = keystore.waddress;
let PubKey = ethUtil.recoverPubkeyFromWaddress(myWaddr);
let pubKeyA = PubKey.A;

function handleTransaction(tx)
{
    web3.eth.getTransactionReceipt(tx.hash,(err, contRect)=>{
        if(err || !contRect ){
            return;
        }

        if(tx.to == contractInstanceAddress){
            let ota = tx.input.slice(4); // the format is 1 byte cmd and  waddr followed.
            let otaPub = ethUtil.recoverPubkeyFromRaw(ota);
            let otaA1 = otaPub.A;
            let otaS1 = otaPub.B;
            let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

            if(A1.toString('hex') == otaA1.toString('hex')){
                console.log("received a privacy transaction to me:",ota);
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
filter.watch(function(error, result){
    if (!error){
        syncBlockHandler(result);
    }
});

//syncBlockHandler(11953);
