const fs = require('fs');
const Web3 = require("web3");
const ethUtil = require('wanchain-util').ethereumUtil;

const config = require('./config');

let walletStr = fs.readFileSync("./walletMessage.json","utf8");
let wallet = JSON.parse(walletStr);

let privKeyA = new Buffer(wallet.privKeyA);
let privKeyB = new Buffer(wallet.privKeyB);
let myWaddr = wallet.waddress;
let pubKeyA = new Buffer(wallet.pubKeyA);
let pubKeyB = new Buffer(wallet.pubKeyB);

console.log('privKeyA', new Buffer(privKeyA));
console.log('privKeyB', new Buffer(privKeyB));
console.log('myWaddr', myWaddr);
console.log('pubKeyA', new Buffer(pubKeyA));
console.log('pubKeyB', new Buffer(pubKeyB));