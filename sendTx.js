#!/usr/bin/env node

'use strict'

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const BN = require('bn.js')

const keythereum = require("keythereum");
const wanUtil = require('wanchain-util');

var Tx = wanUtil.wanchainTx;
let coinSCDefinition = wanUtil.coinSCAbi;

var config = require('./config');

var web3 = new Web3(new Web3.providers.HttpProvider("http://192.168.1.85:8545"));

web3.wan = new wanUtil.web3Wan(web3);
var contractInstanceAddress = config.contractInstanceAddress;
let contractCoinSC = web3.eth.contract(coinSCDefinition);
let contractCoinInstance = contractCoinSC.at(contractInstanceAddress);
let concurrency = 256;
let handled = 0;


let keyPassword = "wanglu";
let keystoreStr = fs.readFileSync("./keys/myKey.json","utf8");
//let keystoreStr = fs.readFileSync("./keys/Account2.json","utf8");
let keystore = JSON.parse(keystoreStr);
let keyAObj = {version:keystore.version, crypto:keystore.crypto};
let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
var privKeyA = keythereum.recover(keyPassword, keyAObj);
var privKeyB = keythereum.recover(keyPassword, keyBObj);
let privateKey = privKeyA;
let myWaddr = keystore.waddress;
let myAddr = '0x'+keystore.address;
let PubKey = wanUtil.recoverPubkeyFromWaddress(myWaddr);
let pubKeyA = PubKey.A;
let gGasLimit='0x'+(200000).toString(16);
let gGasPrice='0x'+(20000000000).toString(16);
var amount = web3.toWei(0.01, 'ether');
var bn = new web3.BigNumber(amount);
var gValue = '0x' + bn.toString(16);



let Hashs = [];


function transfer_one(toAddr, serial)
{
    var rawTx = {
        nonce: serial,
        gasPrice: gGasPrice,
        gasLimit: gGasLimit,
        to: toAddr,
        value: gValue
    };
    //console.log("typeof(gGasLimit) ", typeof(gGasLimit));
    //console.log("rawTx: ", rawTx);
    const tx = new Tx(rawTx);
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    let hash;
        web3.eth.sendRawTransaction("0x"+serializedTx.toString('hex'), (err, hash)=>{
            handled += 1;
            if( err) {
                console.log("transfer error: ", err.toString());
            } else {

                //console.log("Hash: ", hash);

                Hashs.push(hash);
            }
        });
}




function getTransactionReceipt()
{
    return new Promise(function(success, fail){
        let filter = web3.eth.filter('latest');
        let blockAfter = 0;
        filter.watch(async function(err,blockhash){
            blockAfter += 1;
            if(err ){
                console.error("filter Hashs error:"+err);
                filter.stopWatching(function(){fail("filter Hashs error:"+err);});
            }else{
                console.debug("get new block hash:",blockhash);
                for(let i=Hashs.length-1; i>=0; i--){
                    let receipt = web3.eth.getTransactionReceipt(Hashs[i]);
                    if(receipt){
                        Hashs.splice(i, 1);
                    }
                }
                if(Hashs.length == 0){
                    filter.stopWatching(function(){success(0);});
                }
                if (blockAfter > 12) {
                    filter.stopWatching(function( ) { fail('Failed to get all receipts'); } );
                }
            }
        });
    });
}


var sleep = function (time) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, time);
    })
};


async function transferAll(toAddr){
    let int_serial  = web3.eth.getTransactionCount(myAddr);
    for(var i = 0; i< concurrency; i++){
        transfer_one(toAddr, int_serial+i);
    }
    while(handled < concurrency){
        console.log("handled: ", handled);
        await sleep(1000);
    }
    console.log("concurrency, handled: ", concurrency, handled);
    console.log('try to get Receipt');
    await getTransactionReceipt();
}


transferAll('0xc5288ed027813958c6948e22816cc92070d9cbb1');
