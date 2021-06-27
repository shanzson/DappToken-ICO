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
const TokenTimelock = artifacts.require("TokenTimelock.sol");


contract('Dapptoken Crowdsale', ([_, wallet, investor1, investor2, foundersFund, foundationFund, partnersFund])=> {

	beforeEach(async () => {
		this.decimals = 18;
		this.token = await DappToken.new('Dapp Token', 'DTC', this.decimals);

		function weeks (val) { return val * 7 * 24 * 60 * 60; }
		function years (val) { return val * 365 * 24 * 60 * 60; }

		//Crowdsale config
		this.rate = 1;       //rate is the conversion between wei and the smallest and indivisible token unit
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
    this.foundersFund = foundersFund;
    this.foundationFund = foundationFund;
    this.partnersFund = partnersFund;
    this.releaseTime  = this.closingTime + years(1);

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
			this.goal,
			this.foundersFund,
      this.foundationFund,
      this.partnersFund,
      this.releaseTime
		);


		//Transfer token ownership to crowdsale
		await this.token.addMinter(this.crowdsale.address);
    await this.token.transferOwnership(this.crowdsale.address);

    //Transfer tokens to the crowdsale contract so that it has the token supply
    // await this.token.transfer(this.crowdsale.address, tokenSupply);
		await this.token.renounceMinter();

    //Pause the token so that investors can't transfer tokens during crowdsale
		await this.token.pause();

		//Transfer Pauser role to crowdsale contract
		await this.token.addPauser(this.crowdsale.address, {from: _});
		await this.token.renouncePauser(); //from _

		// Add investors to whitelist
    await this.crowdsale.addWhitelisted(investor1);
    await this.crowdsale.addWhitelisted(investor2);

		//Advance time to crowdsale start
		const increasedTime = await increaseTimeTo(this.openingTime + 1);
	});

	describe('Crowdsale', () =>{
		it('Tracks the rate', async () => {
			const rate = await this.crowdsale.rate();
			rate.should.be.a.bignumber.that.equals('1');
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

	        const owner = await this.token.owner();

	        const result1 = await this.token.isPauser(owner);
	        const result2 = await this.token.isPauser(this.token.address);
	        const result3 = await this.token.isPauser(_);

	        console.log("Owner: ", owner);
	        console.log("isPauser: ", result1);
	        console.log("_ address: ", _);
	        console.log("isPauser: ", result3);
	        console.log("Token address: ", this.token.address);
	        console.log("isPauser: ", result2);
	        console.log("Crowdsale Add: ", this.crowdsale.address);

	        });

      	it('allows the investor to claim refund', async () => {
        	await this.crowdsale.claimRefund(investor2, { from: investor2 }).should.be.fulfilled;
      	});	
      });

      describe('when the goal is reached', () => {
	      beforeEach(async () => {
	        // Meets the goal
	        await this.crowdsale.buyTokens(investor1, { value: toWei(26), from: investor1 });

    			let tokenSupply = await this.token.totalSupply();
    			console.log('tokenSupply: ', tokenSupply.toString());

	        await this.crowdsale.buyTokens(investor2, { value: toWei(26), from: investor2 });
    			

    			let goal = await this.crowdsale.goalReached();
					console.log("Goal Reached: ", goal);

				  // Fastforward past end time
	        await increaseTimeTo(this.closingTime + 1);
	        
	        // Finalize the crowdsale
	        await this.crowdsale.finalize({ from: _ });

					tokenSupply = await this.token.totalSupply();
    			console.log('tokenSupply: ', tokenSupply.toString());

   				const goalReached = await this.crowdsale.goalReached();
      		goalReached.should.be.true;

   				//Check the token is Unpaused 
   				const paused = await this.token.paused();
   				paused.should.be.false;

   				// await this.crowdsale.withdrawTokens(investor1, {from: investor1});
					// let balance1 = await this.token.balanceOf(investor1);
					// let balance2 = await this.token.balanceOf(investor2);
					// console.log("Balance1: ", balance1.toString());
					// console.log("Balance2: ", balance2.toString());

					// Enables token transfers
          // await this.token.transfer(investor1, 1, { from: investor1 }).should.be.fulfilled;

					// balance1 = await this.token.balanceOf(investor1);
					// balance2 = await this.token.balanceOf(investor2);
					// console.log("Balance1: ", balance1.toString());
					// console.log("Balance2: ", balance2.toString());
	        
	      });
      	it('handles the goal reached', async () => {
        
        let totalSupply = await this.token.totalSupply();
        totalSupply = totalSupply.toString();

        // Founders
        const foundersTimelockAddress = await this.crowdsale.foundersTimelock();
        let foundersTimelockBalance = await this.token.balanceOf(foundersTimelockAddress);
        foundersTimelockBalance = foundersTimelockBalance.toString();
        console.log("foundersTimelockBalance: ", foundersTimelockBalance);
        foundersTimelockBalance = foundersTimelockBalance / (10 ** this.decimals);
        let foundersAmount = totalSupply / this.foundersPercentage;
        foundersAmount = foundersAmount.toString();
        console.log("foundersAmount: ", foundersAmount);
        foundersAmount = foundersAmount / (10 ** this.decimals);

        assert.equal(foundersTimelockBalance.toString(), foundersAmount.toString());

        //Foundation
				const foundationTimelockAddress = await this.crowdsale.foundationTimelock();
        let foundationTimelockBalance = await this.token.balanceOf(foundationTimelockAddress);
        foundationTimelockBalance = foundationTimelockBalance.toString();
        foundationTimelockBalance = foundationTimelockBalance / (10 ** this.decimals);

        let foundationAmount = totalSupply / this.foundationPercentage;
        foundationAmount = foundationAmount.toString();
        foundationAmount = foundationAmount / (10 ** this.decimals);

        assert.equal(foundationTimelockBalance.toString(), foundationAmount.toString());

        // Partners
        const partnersTimelockAddress = await this.crowdsale.partnersTimelock();
        let partnersTimelockBalance = await this.token.balanceOf(partnersTimelockAddress);
        partnersTimelockBalance = partnersTimelockBalance.toString();
        partnersTimelockBalance = partnersTimelockBalance / (10 ** this.decimals);

        let partnersAmount = totalSupply / this.partnersPercentage;
        partnersAmount = partnersAmount.toString();
        partnersAmount = partnersAmount / (10 ** this.decimals);

        assert.equal(partnersTimelockBalance.toString(), partnersAmount.toString());

        // Can't withdraw from timelocks
        const foundersTimelock = await TokenTimelock.at(foundersTimelockAddress);
        await foundersTimelock.release().should.be.rejectedWith('revert');

        const foundationTimelock = await TokenTimelock.at(foundationTimelockAddress);
        await foundationTimelock.release().should.be.rejectedWith('revert');

        const partnersTimelock = await TokenTimelock.at(partnersTimelockAddress);
        await partnersTimelock.release().should.be.rejectedWith('revert');

        // Can withdraw from timelocks
        await increaseTimeTo(this.releaseTime + 1);

        await foundersTimelock.release().should.be.fulfilled;
        await foundationTimelock.release().should.be.fulfilled;
        await partnersTimelock.release().should.be.fulfilled;

        // Funds now have balances

        // Founders
        let foundersBalance = await this.token.balanceOf(this.foundersFund);
        foundersBalance = foundersBalance.toString();
        foundersBalance = foundersBalance / (10 ** this.decimals);

        assert.equal(foundersBalance.toString(), foundersAmount.toString());

        // Foundation
        let foundationBalance = await this.token.balanceOf(this.foundationFund);
        foundationBalance = foundationBalance.toString();
        foundationBalance = foundationBalance / (10 ** this.decimals);

        assert.equal(foundationBalance.toString(), foundationAmount.toString());

        // Partners
        let partnersBalance = await this.token.balanceOf(this.partnersFund);
        partnersBalance = partnersBalance.toString();
        partnersBalance = partnersBalance / (10 ** this.decimals);

        assert.equal(partnersBalance.toString(), partnersAmount.toString());
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
