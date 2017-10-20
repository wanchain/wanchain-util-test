let fs = require('fs');
let keythereum = require("keythereum");
var ethUtil = require('wanchain-util').ethereumUtil;

let keyPassword = '123456';
let keystoreStr = fs.readFileSync("./keystore-test.json","utf8");
let keystore = JSON.parse(keystoreStr);

let keyAObj = {version:keystore.version, crypto:keystore.crypto};
var privKeyA = keythereum.recover(keyPassword, keyAObj); // privKeyA 用来提币
console.log('privKeyA', privKeyA);

let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
var privKeyB = keythereum.recover(keyPassword, keyBObj); //privKeyB 用来查询
console.log('privKeyB', privKeyB);

let myWaddr = keystore.waddress; // wanchain waddress
console.log('waddress', myWaddr);

let PubKey = ethUtil.recoverPubkeyFromWaddress(myWaddr);
let pubKeyA = PubKey.A;
console.log('pubKeyA', pubKeyA);
let pubKeyB = PubKey.B;
console.log('pubKeyB', pubKeyB);

let result = {
	privKeyA: privKeyA,
	privKeyB: privKeyB,
	waddress: myWaddr,
	pubKeyA: pubKeyA,
	pubKeyB: pubKeyB
};

fs.writeFileSync('walletMessage.json', JSON.stringify(result));
