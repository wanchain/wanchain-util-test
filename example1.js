#!/usr/bin/env node

'use strict'

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const keythereum = require("keythereum");
let keyPassword = "wanglu";

const wanUtil = require('wanchain-util');
var Tx = wanUtil.wanchainTx;
var web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));

let keystoreStr = fs.readFileSync("./keys/myKey.json","utf8");
let keystore = JSON.parse(keystoreStr);
let keyAObj = {version:keystore.version, crypto:keystore.crypto};
var privateKey = keythereum.recover(keyPassword, keyAObj);
let myAddr = '0x'+keystore.address;
let toAddr = '0x038f88e7f0dd00325c484ebbe4d965d5e23dbacc';

let gGasLimit=22000;
let gGasPrice=200000000000; // 200G
let nonce = web3.eth.getTransactionCount(myAddr);
var rawTx = {
    Txtype: 0x01,
    nonce: nonce,
    gasPrice: gGasPrice,
    gasLimit: gGasLimit,
    to: toAddr,
    chainId: 3,
    value: '0x02'
};
const tx = new Tx(rawTx);
console.log("rawTx: ", tx);
tx.sign(privateKey);
const serializedTx = tx.serialize();
web3.eth.sendRawTransaction("0x"+serializedTx.toString('hex'), (err, hash)=>{
    if( err) {
        console.log("transfer error: ", err);
    } else {
        console.log(hash);
    }
});
