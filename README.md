wanwallet's explanation and operation： 

一. Explanation：

	1. development environment:
		node v8+ ，npm v4+
		you are better run it on linux/unix/ubuntu.

	2. main files:
		listenOTA.js: You should run it all the time first, it is used to monitor OTA transactions.
		wanWalletTest.js: This file was used to simulate the function of wanWallet.

	3. two test address:
		sender_address: {address: '0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e'}
		receiver_address: {
			address: '0x08d972cc3a0246bda92cdffb28051dd5914faeeb',
			waddress: '0x0340721B2B6C7970A443B215951C7BAa4c41c35E2b591EA51016Eae523f5E123760354b82CccbEdC5c84F16D63414d44F595d85FD9e46C617E29e3AE2e82C5F7bDA9'
		}

	4. Transaction Type:
		4.1 Ordinary Transaction:
			to: address
		4.2 Privacy Transaction:
			to: waddress

	5. Functions:
		5.1: Ordinary Transaction
		5.2: Privacy Transaction
		5.3: OTA Transaction
		5.4: Check the Ordinary Transaction balance
		5.5: Check OTA balance


二. Operation:

	1. download code:
		git clone git@github.com:wanchain/wanchain-util-test.git

	2. install modules:
		npm install

	3. node listenOTA.js (run all the time)

	4. node wanWalletTest.js (run it in a new window)
		when you run it , then will prompt you pls input:
			1 (Ordinary Transaction)
			2 (Privacy Transaction)
			3 (OTA Transaction)
			4 (Check the Ordinary Transaction balance)
			5 (Check OTA balance)

		we provide several test solutions:
			4.1: 1 => 4
				First finish a ordinary transaction, then check balance.
			4.2: 4 => 1 => 4
				First check then balance, then finish a ordinary transaction, last check balance.
			4.3: 2 => 3 => 5
				4.3.1: first finish a privacy transaction
				4.3.2: go to the listenOTA.js window and remember the 'ota' and 'value' data
				4.3.3: use the 'ota' and 'value' finish a ota transaction.
				4.3.4: check the ota balance
			4.4: 5 => 2 => 3 => 5
				4.4.1: check the ota balance
				4.4.2: first finish a privacy transaction
				4.4.3: go to the listenOTA.js window and remember the 'ota' and 'value' data
				4.4.4: use the 'ota' and 'value' finish a ota transaction.
				4.4.5: check the ota balance
			4.5: 5 => 2 => 3
				4.5.1: check the ota balance
				4.5.2: first finish a privacy transaction
				4.5.3: go to the listenOTA.js window and remember the 'ota' and 'value' data
				4.5.4: use the 'ota' and 'value' finish a ota transaction.

