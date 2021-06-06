const toWei = require('./helpers/toWei');
const EVMRevert = require('./helpers/EVMRevert');
const chai = require('chai');
const BN = require('bn.js');

require('chai')
	.use(require('chai-bn')(BN))
	.use(require('chai-as-promised'))
	.should();

const DappToken = artifacts.require("DappToken");
const DappTokenCrowdsale = artifacts.require("DappTokenCrowdsale.sol");


contract('Dapptoken Crowdsale', ([_, wallet, investor1, investor2])=> {

	beforeEach(async () => {
		this.token = await DappToken.new('Dapp Token', 'DTC', 18);
	
		//Crowdsale config
		this.rate = 500;       //rate is the conversion between wei and the smallest and indivisible token unit
		this.wallet = wallet;  // Address where funds are collected
		this.cap = toWei(100); //Total amount to be raised (100 Ether);

		this.investorMinCap = toWei(0.002);
		this.investorHardCap = toWei(50);

		this.crowdsale = await DappTokenCrowdsale.new(
			this.rate, 
			this.wallet, 
			this.token.address,
			this.cap
		);

		//Transfer token ownership to crowdsale
		await this.token.addMinter(this.crowdsale.address);
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


	describe('Minted Crowdsale', () =>{
		it('Mints tokens after purchase', async () => {
			const originalTotalSupply = await this.token.totalSupply();
				await this.crowdsale.sendTransaction({ 	 
				value: toWei(1), 
				from: investor1 
			}).should.be.fulfilled;
			const newTotalSupply = await this.token.totalSupply();
			assert.isTrue(newTotalSupply > originalTotalSupply);
		});
	});


	describe('Accepting payments', () =>{
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
		});
	});



});