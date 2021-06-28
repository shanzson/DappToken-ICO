const toWei = require('./helpers/toWei');
const toWei_BN = require('./helpers/toWei_BN');
const chai = require('chai');
const BN = require('bn.js');
const script_price = require('../scripts/price-consumer-scripts/get-latest-price.js');
const RPC_URL= process.env.RPC_URL;

Web3 = require('web3');
let web3 = new Web3("http://localhost:8545");

web3.eth.getBlockNumber()
	.then((block) => console.log('Block: ', block));

const BigNumber = web3.BigNumber;

//Helps to increase current time to test Timed ICO
function increaseTime (duration) {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1);

      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}

async function increaseTimeTo (target) {
  let now = await latestTime('latest'); //always use await when calling latestTime()
  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  let diff = target - now;
  return increaseTime(diff);
}

async function latestTime (a) {
    const t = await web3.eth.getBlock(a).then((block) => {
    	const timestamp = block.timestamp;
    	return timestamp;
    });
    return t;
}

require('chai')
	.use(require('chai-bn')(BN))
	.use(require('chai-as-promised'))
	.should();

const DappToken = artifacts.require("DappToken");
const DappTokenCrowdsale = artifacts.require("DappTokenCrowdsale.sol");
const TokenTimelock = artifacts.require("TokenTimelock.sol");
const MockPriceFeed = artifacts.require('MockV3Aggregator');
const PriceConsumerV3 = artifacts.require('PriceConsumerV3');

function days (val) { return val * 24 * 60 * 60; };
function weeks (val) { return val * 7 * 24 * 60 * 60; };
function years (val) { return val * 365 * 24 * 60 * 60; };

contract('Dapptoken Crowdsale', ([_, wallet, investor1, investor2, ReserveWalletFund, InterestPayoutWalletFund, TeamsHRFund, CompanyGeneralFund, AirdropFund])=> {

	beforeEach(async () => {
		this.decimals = 18;
		this.token = await DappToken.new('Dapp Token', 'DTC', this.decimals);

		//Get Current Price
		let web3 = new Web3(RPC_URL);
	  const aggregatorV3InterfaceABI = [{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"description","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint80","name":"_roundId","type":"uint80"}],"name":"getRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"latestRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
		const addr = "0x9326BFA02ADD2366b30bacB125260Af641031331";
    const priceFeed = new web3.eth.Contract(aggregatorV3InterfaceABI, addr);


		const current_price = await priceFeed.methods.latestRoundData().call().then((roundData) => {
    // Do something with roundData
    return roundData.answer / 10**8
  	});

  	this.current_price = current_price;
    var cap = 50 * 1000000; //50 Million
    cap = cap/current_price; //Total amount to be raised in ETH
    this._cap = cap; //For pretty output and calculation

		// Crowdsale config

		this.rate = toWei_BN(this.current_price/0.001); //rate is the conversion between wei and 
																										//the smallest and indivisible token unit
		this.wallet = wallet;  // Address where funds are collected
		this.cap = toWei_BN(100); //Total amount to be raised (100 Ether);
		this.goal = toWei(50); //Goal below which Refunding to investors happens

		// Goal can be changed to $12.5 Million but is set to 50 ETH for testing all scenarios 

		const latest_time = await latestTime('latest');
		this.openingTime = weeks(1) + latest_time;
		this.closingTime = this.openingTime + days(60); 
		// As Private sale is for 15 days, Presale is for 15 days 
		// and Crowdsale is for 30 days. So 15 + 15 + 30 = 60 days

		// this.investorMinCap = toWei_BN(500/this.current_price); // MinCap is $500
		// this.investorHardCap = toWei_BN(5000000/this.current_price); //HardCap is $5 Million

		// Token Distribution
		this.TokenSalePercentage   = "25";
	  this.ReserveWalletPercentage = "30";
	  this.InterestPayoutWalletPercentage  = "20";
	  this.TeamsHRPercentage    = "10";
	  this.CompanyGeneralFundPercentage = "13";
	  this.AirdropPercentage = "2";

		this.ReserveWalletFund = ReserveWalletFund;
	  this.InterestPayoutWalletFund = InterestPayoutWalletFund;
	  this.TeamsHRFund = TeamsHRFund;
	  this.CompanyGeneralFund = CompanyGeneralFund;
	  this.AirdropFund = AirdropFund;

		// ICO Stages
		this.privateIcoStage = '0';
		this.preIcoStage = '1';
		this.icoStage = '2';

		this.crowdsale = await DappTokenCrowdsale.new(
			this.rate, 
			this.wallet, 
			this.token.address,
			this.cap,
			this.openingTime,
			this.closingTime,		
			this.goal,
			this.ReserveWalletFund,
      this.InterestPayoutWalletFund,
      this.TeamsHRFund ,
      this.CompanyGeneralFund,
      this.AirdropFund,
		);


		// Transfer token ownership to crowdsale
		await this.token.addMinter(this.crowdsale.address);
    await this.token.transferOwnership(this.crowdsale.address);

    // Transfer tokens to the crowdsale contract so that it has the token supply
    // await this.token.transfer(this.crowdsale.address, tokenSupply);
		await this.token.renounceMinter();

    // Pause the token so that investors can't transfer tokens during crowdsale
		await this.token.pause();

		// Transfer Pauser role to crowdsale contract
		await this.token.addPauser(this.crowdsale.address, {from: _});
		await this.token.renouncePauser(); //from _

		// Add investors to whitelist
    await this.crowdsale.addWhitelisted(investor1);
    await this.crowdsale.addWhitelisted(investor2);

		// Advance time to crowdsale start
		const increasedTime = await increaseTimeTo(this.openingTime + 1);

		// For Testing Price Feed
		let priceConsumerV3, mockPriceFeed;
	});

	describe('Get Latest Price', () =>{
		it('Price of ETH in USD', async () => {
			console.log(this.current_price);
		});
		it('Maximum amount to be raised or Cap', async () => {
			console.log(this._cap);
		});
	});

	describe('Crowdsale', () =>{
		it('Tracks the rate', async () => {
			const rate = await this.crowdsale.rate();
			rate.should.be.a.bignumber.that.equals(toWei_BN(this.current_price/0.001));
		});
		it('Tracks the wallet', async () => {
			const wallet = await this.crowdsale.wallet();
			wallet.should.equal((this.wallet).toString());
		})
		it('Tracks the token', async () => {
			const token = await this.crowdsale.token();
			token.should.equal(this.token.address);
		});
	});

	describe('Capped Crowdsale', () =>{
		it('Has the correct Hard Cap', async () => {
			const cap = await this.crowdsale.cap();
			cap.should.be.bignumber.equal(this.cap);
		});
	});

	describe('Timed crowdsale', () => {
    it('is open', async () => {
   		const isClosed = await this.crowdsale.hasClosed();
    	isClosed.should.be.false;
    });
  });

	describe('Whitelisted crowdsale', () => {
   it('rejects contributions from non-whitelisted investors', async () => {
     const notWhitelisted = _;
     await this.crowdsale.buyTokens(notWhitelisted,{ value: toWei(1), from: notWhitelisted}).should.be.rejectedWith('revert');
   });
  });

	describe('Minted Crowdsale', () => {
		it('Mints tokens after purchase', async () => {
			const originalTotalSupply = await this.token.totalSupply();
				await this.crowdsale.sendTransaction({ 	 
				value: toWei(1), 
				from: investor1 
			}).should.be.fulfilled;
			const newTotalSupply = await this.token.totalSupply();
			console.log("originalTotalSupply: " , originalTotalSupply.toString(10));
			console.log("newTotalSupply: " , newTotalSupply.toString(10));
			assert.isTrue(newTotalSupply > originalTotalSupply);
		});
	});

	describe('Crowdsale stages', () => {
  	it('It starts in PrivateICO', async () => {
  		const stage = await this.crowdsale.stage();
  		stage.should.be.bignumber.equal(this.privateIcoStage);
   	});

   	it('Allows Admin to update stage to Presale after 15 days', async () => {
   	  await increaseTimeTo(this.openingTime + days(15));
   		await this.crowdsale.setCrowdsaleStage(this.preIcoStage, {from: _});
  		let stage = await this.crowdsale.stage();
  		stage.should.be.bignumber.equal(this.preIcoStage);
   	});

   	it('Allows Admin to update stage to CrowdsaleICO after 15 days', async () => {
   	  await increaseTimeTo(this.openingTime + days(15));
  		await this.crowdsale.setCrowdsaleStage(this.icoStage, {from: _});
  		stage = await this.crowdsale.stage();
  		stage.should.be.bignumber.equal(this.icoStage);
   	});
   	it('Does not allow non-admin to update ICO stage', async () => {
   		await this.crowdsale.setCrowdsaleStage(this.preIcoStage, {from: investor1}).should.be.rejectedWith('revert');
   	});
  });


	describe('Accepting payments', () => {
		it('Should Accept payments', async () => {
			const value = toWei(1);
			const purchaser = investor2;
			await this.crowdsale.sendTransaction({ 	 //calls function external payable in crowdsale.sol
				value: value, 
				from: investor1 
			}).should.be.fulfilled;
			//Previously got VM Exception here as crowdsale was not the minter, _ was.
			//So added crowdsale contract address using MinterRole.sol from _ in BeforeEach.

			await this.crowdsale.buyTokens(investor1, {value: value, from: purchaser}).should.be.fulfilled;
		
		});
	});

	describe('buyTokens()', () =>{
		describe('When the contribution is less than minimum cap', () =>{
			it('Rejects the transaction', async () => {
				const value = toWei(0.0019); 	//amount less than MinCap
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2}).should.be.rejectedWith('revert'); 
			});

			it('When the investor has already met the mincap', async () => {
				//First contribution is valid
				const value = toWei(1); 	//amount greater than MinCap
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2}).should.be.fulfilled; 
				//Second transaction is less than investor cap
				const value2 = '1'; 	//wei
				await this.crowdsale.buyTokens(investor2, { value: value2, from: investor2}).should.be.fulfilled; 
			});
		});

		describe('When the contribution is more than Hard cap', () =>{
			// Commented because cannot test for 5 Million USD
			// it('Rejects the transaction', async () => {
			// 	//First contribution is valid
			// 	const value = toWei(2);     // 2 ether 	
			// 	await this.crowdsale.buyTokens(investor2, { value: value, from: investor2}).should.be.fulfilled;
			// 	const value2 = toWei(49);     // total is 2+49 = 51 ether from same investor  	
			// 	await this.crowdsale.buyTokens(investor2, { value: value2, from: investor2}).should.be.rejectedWith('revert'); 
			// });

			it('When the investor has already met the mincap', async () => {
				//First contribution is valid
				const value = toWei(1); 	//amount greater than MinCap
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2}).should.be.fulfilled; 
				//Second transaction is less than investor cap
				const value2 = '1'; 	    //wei
				await this.crowdsale.buyTokens(investor2, { value: value2, from: investor2}).should.be.fulfilled; 
			});
		});

		describe('When the contribution is within valid range', () =>{
			it('Succeeds and updates the contribution amount', async () => {
				const value = toWei(2);     // 2 ether 	
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2}).should.be.fulfilled;
				const contribution = await this.crowdsale.getUserContribution(investor2);
      			contribution.should.be.bignumber.equal(value);
			});
		});

		describe('token transfers', () => {
	    it('does not allow investors to transfer tokens during crowdsale', async () => {
	      // Buy some tokens first
	      await this.crowdsale.buyTokens(investor1, { value: toWei(1), from: investor1 });
	      const n = await this.token.totalSupply();
	      // Attempt to transfer tokens during crowdsale
	      await this.token.transfer(investor2, 1, { from: investor1 }).should.be.rejectedWith('revert');
	    });
  	});			

	  describe('finalizing the crowdsale', () => {
      describe('when the goal is reached', () => {
	      beforeEach(async () => {
	        // Meets the goal
	        await this.crowdsale.buyTokens(investor1, { value: toWei(26), from: investor1 });

    			let tokenSupply = await this.token.totalSupply();
    			console.log('tokenSupply: ', tokenSupply.toString());

	        await this.crowdsale.buyTokens(investor2, { value: toWei(26), from: investor2 });

				  // Fastforward past end time
	        await increaseTimeTo(this.closingTime + 1);
	        
	        // Finalize the crowdsale
	        await this.crowdsale.finalize({ from: _ });

					tokenSupply = await this.token.totalSupply();
    			console.log('tokenSupply: ', tokenSupply.toString());

   				//Check the token is Unpaused 
   				const paused = await this.token.paused();
   				paused.should.be.false;

   				await this.crowdsale.withdrawTokens(investor1, {from: investor1});
					let balance1 = await this.token.balanceOf(investor1);
					let balance2 = await this.token.balanceOf(investor2);
					console.log("Balance1: ", balance1.toString());
					console.log("Balance2: ", balance2.toString());

					//Enables token transfers
          await this.token.transfer(investor1, 1, { from: investor1 }).should.be.fulfilled;

					balance1 = await this.token.balanceOf(investor1);
					balance2 = await this.token.balanceOf(investor2);
					console.log("Balance1: ", balance1.toString());
					console.log("Balance2: ", balance2.toString());
	        
	      });
      	it('handles the goal reached', async () => {
        
        let totalSupply = await this.token.totalSupply();
        totalSupply = totalSupply.toString();

        //Reserve Wallet
        let ReserveWalletFundBalance = await this.token.balanceOf(this.ReserveWalletFund);
        ReserveWalletFundBalance = ReserveWalletFundBalance / (10 ** this.decimals);
        console.log("ReserveWalletFundBalance: ", ReserveWalletFundBalance);
        ReserveWalletFundBalance = ReserveWalletFundBalance.toString();

        let ReserveWalletFundAmount = (totalSupply * this.ReserveWalletPercentage)/100;
        ReserveWalletFundAmount = ReserveWalletFundAmount / (10 ** this.decimals);
        ReserveWalletFundAmount = ReserveWalletFundAmount.toString();
        console.log("ReserveWalletFundAmount: ", ReserveWalletFundAmount);

        assert.equal(ReserveWalletFundBalance.slice(0,10), ReserveWalletFundAmount.slice(0,10));

        //InterestPayout Wallet
        let InterestPayoutWalletFundBalance = await this.token.balanceOf(this.InterestPayoutWalletFund);
        InterestPayoutWalletFundBalance = InterestPayoutWalletFundBalance / (10 ** this.decimals);
        InterestPayoutWalletFundBalance = InterestPayoutWalletFundBalance.toString();
        console.log("InterestPayoutWalletFundBalance: ", InterestPayoutWalletFundBalance);

        let InterestPayoutWalletFundAmount = (totalSupply * this.InterestPayoutWalletPercentage)/100;
        InterestPayoutWalletFundAmount = InterestPayoutWalletFundAmount / (10 ** this.decimals);
        InterestPayoutWalletFundAmount = InterestPayoutWalletFundAmount.toString();
        console.log("InterestPayoutWalletFundAmount: ", InterestPayoutWalletFundAmount);

        assert.equal(InterestPayoutWalletFundBalance.slice(0,10), InterestPayoutWalletFundAmount.slice(0,10));

        //TeamsHRFund Wallet
        let TeamsHRFundBalance = await this.token.balanceOf(this.TeamsHRFund);
        TeamsHRFundBalance = TeamsHRFundBalance / (10 ** this.decimals);
        console.log("TeamsHRFundBalance: ", TeamsHRFundBalance);
        TeamsHRFundBalance = TeamsHRFundBalance.toString();

        let TeamsHRFundAmount = (totalSupply * this.TeamsHRPercentage)/100;
        TeamsHRFundAmount = TeamsHRFundAmount / (10 ** this.decimals);
        TeamsHRFundAmount = TeamsHRFundAmount.toString();
        console.log("TeamsHRFundAmount: ", TeamsHRFundAmount);

        assert.equal(TeamsHRFundBalance.slice(0,10), TeamsHRFundAmount.slice(0,10));

        //CompanyGeneralFund Wallet
        let CompanyGeneralFundBalance = await this.token.balanceOf(this.CompanyGeneralFund);
        CompanyGeneralFundBalance = CompanyGeneralFundBalance / (10 ** this.decimals);
        console.log("CompanyGeneralFundBalance: ", CompanyGeneralFundBalance);
        CompanyGeneralFundBalance = CompanyGeneralFundBalance.toString();

        let CompanyGeneralFundAmount = (totalSupply * this.CompanyGeneralFundPercentage)/100;
        CompanyGeneralFundAmount = CompanyGeneralFundAmount / (10 ** this.decimals);
        CompanyGeneralFundAmount = CompanyGeneralFundAmount.toString();
        console.log("CompanyGeneralFundAmount: ", CompanyGeneralFundAmount);

        assert.equal(CompanyGeneralFundBalance.slice(0,10), CompanyGeneralFundAmount.slice(0,10));

        //AirdropFund Wallet
        let AirdropFundBalance = await this.token.balanceOf(this.AirdropFund);
        AirdropFundBalance = AirdropFundBalance / (10 ** this.decimals);
        console.log("AirdropFundBalance: ", AirdropFundBalance);
        AirdropFundBalance = AirdropFundBalance.toString();

        let AirdropFundAmount = (totalSupply * this.AirdropPercentage)/100;
        AirdropFundAmount = AirdropFundAmount / (10 ** this.decimals);
        AirdropFundAmount = AirdropFundAmount.toString();
        console.log("AirdropFundAmount: ", AirdropFundAmount);

        assert.equal(AirdropFundBalance.slice(0,10), AirdropFundAmount.slice(0,10));
      	});

      });
	  });

	  describe('token distribution', () => {
    	it('tracks token distribution correctly', async () => {
	      const TokenSalePercentage = await this.crowdsale.TokenSalePercentage();
	      TokenSalePercentage.should.be.bignumber.eq(this.TokenSalePercentage, 'has correct TokenSalePercentage');
	      const ReserveWalletPercentage = await this.crowdsale.ReserveWalletPercentage();
	      ReserveWalletPercentage.should.be.bignumber.eq(this.ReserveWalletPercentage, 'has correct ReserveWalletPercentage');
	      const InterestPayoutWalletPercentage = await this.crowdsale.InterestPayoutWalletPercentage();
	      InterestPayoutWalletPercentage.should.be.bignumber.eq(this.InterestPayoutWalletPercentage, 'has correct InterestPayoutWalletPercentage');
	      const TeamsHRPercentage = await this.crowdsale.TeamsHRPercentage();
	      TeamsHRPercentage.should.be.bignumber.eq(this.TeamsHRPercentage, 'has correct TeamsHRPercentage');
	      const CompanyGeneralFundPercentage = await this.crowdsale.CompanyGeneralFundPercentage();
	      CompanyGeneralFundPercentage.should.be.bignumber.eq(this.CompanyGeneralFundPercentage, 'has correct CompanyGeneralFundPercentage');
	      const AirdropPercentage = await this.crowdsale.AirdropPercentage();
	      AirdropPercentage.should.be.bignumber.eq(this.AirdropPercentage, 'has correct AirdropPercentage');	      
	    });

    	it('is a valid percentage breakdown', async () => {
	      const TokenSalePercentage = await this.crowdsale.TokenSalePercentage();
	      const ReserveWalletPercentage = await this.crowdsale.ReserveWalletPercentage();    		
	      const InterestPayoutWalletPercentage = await this.crowdsale.InterestPayoutWalletPercentage();
	      const TeamsHRPercentage = await this.crowdsale.TeamsHRPercentage();
	      const CompanyGeneralFundPercentage = await this.crowdsale.CompanyGeneralFundPercentage();
	      const AirdropPercentage = await this.crowdsale.AirdropPercentage();

	      const total = TokenSalePercentage.toNumber() + ReserveWalletPercentage.toNumber() + InterestPayoutWalletPercentage.toNumber() + TeamsHRPercentage.toNumber() + CompanyGeneralFundPercentage.toNumber() + AirdropPercentage.toNumber();
	      total.should.equal(100);
    	});
    });

    describe('getLatestPrice mock test', () => {
        let price = "2000000000000000000";
        beforeEach(async () => {
            mockPriceFeed = await MockPriceFeed.new(8, price);
            priceConsumerV3 = await PriceConsumerV3.new(mockPriceFeed.address);
        })
        it('returns a price', async () => {
            assert.equal(await priceConsumerV3.getLatestPrice(), price);
        })
    })

  });

});
