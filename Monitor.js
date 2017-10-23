#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Web3 = require("web3");
//const Wan = require("./web3Wan.js");
const Method = require("web3/lib/web3/method");
const BN = require('bn.js')
const secp256k1 = require('secp256k1');

var keythereum = require("keythereum");
var ethUtil = require('wanchain-util').ethereumUtil;
var Tx = require('wanchain-util').ethereumTx;

const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
var getOTAMixSet = new Method({
    name: 'getOTAMixSet',
    call: 'eth_getOTAMixSet',
    params: 2
});
getOTAMixSet.attachToObject(web3.eth);
getOTAMixSet.setRequestManager(web3.eth._requestManager);
//web3.wan = new Wan(web3);

var contractInstanceAddress = "0x0000000000000000000000000000000000000006";
let keyPassword = "wanglu";
let keystoreStr = fs.readFileSync("./mykeystore.json","utf8");
let keystore = JSON.parse(keystoreStr);
let keyAObj = {version:keystore.version, crypto:keystore.crypto};
let keyBObj = {version:keystore.version, crypto:keystore.crypto2};
var privKeyA = keythereum.recover(keyPassword, keyAObj);
var privKeyB = keythereum.recover(keyPassword, keyBObj);
let myWaddr = keystore.waddress;
let PubKey = ethUtil.recoverPubkeyFromWaddress(myWaddr);
let pubKeyA = PubKey.A;

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
function generateHashforRing2(fromAddr, value){ // this function is wrong.
    let h = new Buffer(32);
    h.fill(0);
    let fb = new Buffer(fromAddr,'hex');
    fb.copy(h);
    h[20] = 0x02; //WANCOIN_REFUND
    let vbn = new BN(value,10);
    let vb = vbn.toBuffer();
    let vbl = vb.length;
    h[21] = vbl;
    h[22] = 0x00;
    h[23] = 132;
    return h;
}
function generateHashforRing(fromAddr, value){
    let h = new Buffer(32);
    h.fill(0);
    let vbn = new BN(value,10);
    let vb = vbn.toBuffer();
    let vbl = vb.length;
    vb.copy(h, 32-vbl);
    return h;
}
/* the origPayload will be attached to ringSign */
function generateOrigPayloadforRing(value){
    let vbn = new BN(value,10);
    let vb = vbn.toBuffer();
    let vbl = vb.length;
    let h = new Buffer(4+128+vbl);
    h.fill(0);
    h[0] = 0x02;
    h[1] = vbl;
    h[2] = 0;
    h[3] = 132;
    vb.copy(h,132);
    return h;
}
/* set pubkey, w, q */
function generatePubkeyWQforRing(Pubs, w, q){
    let length = Pubs.length;
    let pubsCountB = Buffer.alloc(1);
    pubsCountB[0] = length;
    let bufArr = [];
    bufArr.push(pubsCountB);
    for(let i=0; i<length; i++){
        let ilen = 1+65+1+32+1+32;
        let offset = 0;
        let bi = Buffer.alloc(ilen);
        bi.fill(0);
        bi[offset] = 65; // pubkey len
        offset += 1;
        Pubs[i].copy(bi,offset);
        offset += 65;
        bi[offset] = 32;
        offset += 1;
        w[i].copy(bi, offset);
        offset += 32;
        bi[offset] = 32;
        offset += 1;
        q[i].copy(bi, offset);
        bufArr.push(bi);
    }
    let KWQ = Buffer.concat(bufArr);
    return KWQ;
}
async function otaRefund(otaSk, otaPubK, ringPubKs, value) {
    let M = generateHashforRing(keystore.address, value);// M = hash(rawTx). we need determine which item join the hash. ethUtil.otaHash??
    let ringArgs = ethUtil.getRingSign(M, otaSk,otaPubK,ringPubKs);
    if(!ethUtil.verifyRinSign(ringArgs)){
        console.log("ring sign is wrong@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@");

        for(let i=0; i<ringPubKs.length; i++){
            console.log("pubkey ", i, " : ", ringPubKs[i].toString('hex'));
        }
        console.log("I: ", ringArgs.I.toString('hex'));
        for(let i=0; i<ringPubKs.length; i++){
            console.log("w ", i, " : ", ringArgs.w[i].toString('hex'));
        }
        for(let i=0; i<ringPubKs.length; i++){
            console.log("q ", i, " : ", ringArgs.q[i].toString('hex'));
        }
        return;
    }

    let OP = generateOrigPayloadforRing(value);
    let KWQ = generatePubkeyWQforRing(ringArgs.PubKeys, ringArgs.w, ringArgs.q);
    let IB = Buffer.alloc(1+65);
    IB[0] = 65;
    ringArgs.I.copy(IB,1);
    let MH = Buffer.alloc(1+32);
    MH[0] = 32;
    M.copy(MH,1);
    let all = Buffer.concat([OP, KWQ, IB, MH]);

    var serial = '0x' + web3.eth.getTransactionCount('0x'+keystore.address).toString(16);
    var rawTx = {
        Txtype: '0x00',
        nonce: serial,
        gasPrice: '0x40',
        gasLimit: '0x60000',
        to: contractInstanceAddress,//contract address
        value: '0x00',
        data: all
    };
    console.log("payload: " + rawTx.data.toString('hex'));

    var tx = new Tx(rawTx);
    tx.sign(privKeyA);
    var serializedTx = tx.serialize();
    let hash = web3.eth.sendRawTransaction('0x' + serializedTx.toString('hex'));
    console.log("serializeTx:" + serializedTx.toString('hex'));
    console.log('tx hash:'+hash);
    let receipt = await getTransactionReceipt(hash);
    console.log(receipt);
}

function handleTransaction(tx)
{
    web3.eth.getTransactionReceipt(tx.hash,async (err, contRect)=>{
        if(err || !contRect ){
            return;
        }

        if(tx.to == contractInstanceAddress){
            let cmd = tx.input.slice(2,4).toString('hex');
            if(cmd != "00"){
                return;
            }
            let ota = tx.input.slice(4); // the format is 1 byte cmd and  waddr followed.
            let value = tx.value.toString();
            let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
            let otaA1 = otaPub.A;
            let otaS1 = otaPub.B;
            let A1 = ethUtil.generateA1(privKeyB, pubKeyA, otaS1);

            if(A1.toString('hex') == otaA1.toString('hex')){
                console.log("received a privacy transaction to me:",ota);
                console.log("the value is ", value);
                let otaSet = web3.eth.getOTAMixSet(ota, 3);
                console.log("fetch  ota set:",otaSet);
                let otaSetBuf = [];
                for(let i=0; i<otaSet.length; i++){
                    let rpkc = new Buffer(otaSet[i].slice(0,66),'hex');
                    let rpcu = secp256k1.publicKeyConvert(rpkc, false);
                    otaSetBuf.push(rpcu);
                }
                let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA,privKeyB);
                let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);
                await otaRefund(otaSk,otaPub.A,otaSetBuf,value);
                console.log("New balance of",keystore.address," is:",web3.eth.getBalance(keystore.address).toString());
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
    console.log("filter started");
    console.log("Current balance of",keystore.address," is:",web3.eth.getBalance(keystore.address).toString());
    filter.watch(function(error, result){
        if (!error){
            syncBlockHandler(result);
        }
    });
}
filterTest();

//syncBlockHandler(11953);
//let rawOta = '76ee5a82703e657f1ca5a2cd59ed26c4a1f823d9ef7f51fb5de5d0dea9368a7658b370194a19e4c08403650b4bad2941c198600babf0b9ebd3ac4f57021991d4205b582b9502a3c81e1f3db1c73a3d578b920402b5b54da5518e9c0330b7ca94d7378fb1fb9c0a1f9db2858734eb721d7d2607b831f1f82f766b9fc509f24f6f';
async function testRefund() {
    let ota = "020c4b2f38d14da15ba34fecdd47f2ba7fcb5f559d5b0bc1b70e9474c98f71dcd2035f25e184a35dea778d984d0eba6ba81eeb9935eefa869b1ecc3dab8fd6124314";
    let value = "1000000000000000000";
    let otaSet = web3.eth.getOTAMixSet(ota, 3);
    let otaSetBuf = [];
    for(let i=0; i<otaSet.length; i++){
        let rpkc = new Buffer(otaSet[i].slice(0,66),'hex');
        let rpcu = secp256k1.publicKeyConvert(rpkc, false);
        otaSetBuf.push(rpcu);
    }
    console.log("fetch  ota set:",otaSet);
    let otaSk = ethUtil.computeWaddrPrivateKey(ota, privKeyA,privKeyB);
    let otaPub = ethUtil.recoverPubkeyFromWaddress(ota);

    await otaRefund(otaSk,otaPub.A,otaSetBuf,value);
    console.log("New balance of",keystore.address," is:",web3.eth.getBalance(keystore.address).toString());

}

//testRefund();
