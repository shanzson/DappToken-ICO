const toWei = require('./helpers/toWei');
const chai = require('chai');
const BN = require('bn.js');

Web3 = require('web3');
let web3 = new Web3(Web3.givenProvider || "http://localhost:8545");
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


contract('Dapptoken Crowdsale', ([_, wallet, investor1, investor2])=> {

	beforeEach(async () => {
		this.token = await DappToken.new('Dapp Token', 'DTC', 2);

		function weeks (val) { return val * 7 * 24 * 60 * 60; }

		//Crowdsale config
		this.rate = 500;       //rate is the conversion between wei and the smallest and indivisible token unit
		this.wallet = wallet;  // Address where funds are collected
		this.cap = toWei(100); //Total amount to be raised (100 Ether);
		this.goal = toWei(50); //Goal below which Refunding to investors happens

		const latest_time = await latestTime('latest');
		this.openingTime = weeks(1) + latest_time;
		this.closingTime = this.openingTime + weeks(1);

		this.investorMinCap = toWei(0.002);
		this.investorHardCap = toWei(50);

		// Token Distribution
    this.tokenSalePercentage  = "70";
    this.foundersPercentage   = "10";
    this.foundationPercentage = "10";
    this.partnersPercentage   = "10";

		//ICO Stages
		this.preIcoStage = '0';
		this.icoStage = '1';

		this.crowdsale = await DappTokenCrowdsale.new(
			this.rate, 
			this.wallet, 
			this.token.address,
			this.cap,
			this.openingTime,
			this.closingTime,		
			this.goal
		);

		//Pause the token so that investors can't transfer tokens during crowdsale
		// await this.token.pause();

		//Transfer token ownership to crowdsale
		await this.token.addMinter(this.crowdsale.address);
		await this.token.renounceMinter();


		// Add investors to whitelist
    await this.crowdsale.addWhitelisted(investor1);
    await this.crowdsale.addWhitelisted(investor2);

		//Advance time to crowdsale start
		const increasedTime = await increaseTimeTo(this.openingTime + 1);
	});

	describe('Crowdsale', () =>{
		it('Tracks the rate', async () => {
			const rate = await this.crowdsale.rate();
			rate.should.be.a.bignumber.that.equals('500');
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

  describe('Refundable crowdsale', () => {
    beforeEach( async () => {
      await this.crowdsale.buyTokens(investor1, { value: toWei(1), from: investor1 });
    });

    describe('during crowdsale', () => {
      it('prevents the investor from claiming refund', async () => {
      await this.crowdsale.claimRefund(investor1, { from: investor1 }).should.be.rejectedWith('revert');
    });
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

	// describe('Crowdsale stages', () => {
 //  	it('It starts in PreICO', async () => {
 //  		const stage = await this.crowdsale.stage();
 //  		stage.should.be.bignumber.equal(this.preIcoStage);
 //   	});

 //   	it('Allows Admin to update ICO stage', async () => {
 //   		await this.crowdsale.setCrowdsaleStage(this.icoStage, {from: _});
 //  		const stage = await this.crowdsale.stage();
 //  		stage.should.be.bignumber.equal(this.icoStage);
 //   	});

 //   	it('Does not allow non-admin to update ICO stage', async () => {
 //   		await this.crowdsale.setCrowdsaleStage(this.icoStage, {from: investor1}).should.be.rejectedWith('revert');
 //   	});
 //  });


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
			it('Rejects the transaction', async () => {
				//First contribution is valid
				const value = toWei(2);     // 2 ether 	
				await this.crowdsale.buyTokens(investor2, { value: value, from: investor2}).should.be.fulfilled;
				const value2 = toWei(49);     // total is 2+49 = 51 ether from same investor  	
				await this.crowdsale.buyTokens(investor2, { value: value2, from: investor2}).should.be.rejectedWith('revert'); 
			});

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

		// describe('token transfers', () => {
	 //    it('does not allow investors to transfer tokens during crowdsale', async () => {
	 //      // Buy some tokens first
	 //      const o = await this.token.totalSupply();
	 //      await this.crowdsale.buyTokens(investor1, { value: toWei(1), from: investor1 });
	 //      const n = await this.token.totalSupply();
	 //      console.log("originalTotalSupply: " , o.toString(10));
		// 	  console.log("newTotalSupply: " , n.toString(10));
	 //      // Attempt to transfer tokens during crowdsale
	 //      await this.token.transfer(investor2, 1, { from: investor1 }).should.be.fulfilled;
	 //    });
  // 	});			

	  describe('finalizing the crowdsale', () => {
    	describe('when the goal is not reached', () => {
	      beforeEach(async () => {
	        // Do not meet the goal
	        await this.crowdsale.buyTokens(investor2, { value: toWei(1), from: investor2 });
	        // Fastforward past end time
	        await increaseTimeTo(this.closingTime + 1);
	        // Finalize the crowdsale
	        await this.crowdsale.finalize({ from: _ });
	      });

      	it('allows the investor to claim refund', async () => {
        	await this.crowdsale.claimRefund(investor2, { from: investor2 }).should.be.fulfilled;
      	});	
      });

      describe('when the goal is reached', () => {
	      beforeEach(async () => {
	        // Meets the goal
	        await this.crowdsale.buyTokens(investor1, { value: toWei(26), from: investor1 });
	        await this.crowdsale.buyTokens(investor2, { value: toWei(26), from: investor2 });

	        // Fastforward past end time
	        await increaseTimeTo(this.closingTime + 1);
	        // Finalize the crowdsale
	        await this.crowdsale.finalize({ from: _ });
	      });
      	it('handles the goal reached', async () => {
      		const goalReached = await this.crowdsale.goalReached();
      		goalReached.should.be.true;

   				//Unpauses the token 
   				const paused = await this.token.paused();
   				paused.should.be.false;
      	});
      	it('does not allow the investor to claim refund', async () => {
        	await this.crowdsale.claimRefund(investor2, { from: investor2 }).should.be.rejectedWith('revert');
      	});	
      });
	  });

	  describe('token distribution', () => {
    	it('tracks token distribution correctly', async () => {
	      const tokenSalePercentage = await this.crowdsale.tokenSalePercentage();
	      tokenSalePercentage.should.be.bignumber.eq(this.tokenSalePercentage, 'has correct tokenSalePercentage');
	      const foundersPercentage = await this.crowdsale.foundersPercentage();
	      foundersPercentage.should.be.bignumber.eq(this.foundersPercentage, 'has correct foundersPercentage');
	      const foundationPercentage = await this.crowdsale.foundationPercentage();
	      foundationPercentage.should.be.bignumber.eq(this.foundationPercentage, 'has correct foundationPercentage');
	      const partnersPercentage = await this.crowdsale.partnersPercentage();
	      partnersPercentage.should.be.bignumber.eq(this.partnersPercentage, 'has correct partnersPercentage');
	    });

    	it('is a valid percentage breakdown', async () => {
	      const tokenSalePercentage = await this.crowdsale.tokenSalePercentage();
	      const foundersPercentage = await this.crowdsale.foundersPercentage();
	      const foundationPercentage = await this.crowdsale.foundationPercentage();
	      const partnersPercentage = await this.crowdsale.partnersPercentage();

	      const total = tokenSalePercentage.toNumber() + foundersPercentage.toNumber() + foundationPercentage.toNumber() + partnersPercentage.toNumber()
	      total.should.equal(100);
    	});
    });

  });

});
