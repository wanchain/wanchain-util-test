#!/usr/bin/env node

'use strict'

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
const net = require('net');
const wanUtil = require('wanchain-util');
var Tx = wanUtil.wanchainTx;
const passwd = 'wanglu';

let myAddr = "0x28261e065a7cdd5912e5591806fa9851078f52e3";
let toAddr = "0xbd100cf8286136659a7d63a38a154e28dbf3e0fd";

var tx = {
    Txtype: 0x01,
    from: myAddr,
    to: toAddr,
    chainId: 3,
    value: '0x02'
};
for(let i=0; i<10; i++){
	var web3 = new Web3(new Web3.providers.IpcProvider("/home/lzhang/.wanchain/gwan.ipc", net));
	web3.personal.sendTransaction(tx, passwd, (err, hash)=>{
		console.log("err: ",err);
		console.log("hash: ",hash);
	});
}
console.log("done");
