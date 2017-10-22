# wanchain-util-test
wanchain util js package test project

一、development environment：
	node v8+ ，npm v4+
 
	1. download code: 
	git clone git@github.com:wanchain/wanchain-util-test.git
 
	2. install modules:
	npm install
 
	3. main files:
		Monitor.js: search test account
		preCompiled.js：send transaction to test account
		
	4. Configuration parameter file
		config.js: configuration parameters
	
	5. run code：
		5.1 node Monitor.js 
			Real time monitoring transaction status of test accounts
	
		5.2 node preCompiled.js
			Every time you run it, you start a transaction with the test account

