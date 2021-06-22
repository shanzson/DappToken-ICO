 // const BigNumber = web3.BigNumber;
const chai = require('chai');
var should = require('chai').should();
const DappToken = artifacts.require("DappToken");
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

contract('Dapptoken', accounts=> {

	beforeEach(async () => {
		this.token = await DappToken.new('Dapp Token', 'DTC', 2);
	});

	describe('Token attributes', () =>{
		it('Has the correct name', async () => {
			const name = await this.token.name();

			assert.equal(name, "Dapp Token");

		})
		it('Has the correct symbol', async () => {
			const symbol = await this.token.symbol();

			assert.equal(symbol, "DTC");

		})
		it('Has the correct decimals', async () => {
			const decimals = await this.token.decimals();
			console.log(decimals);
			const _decimals = '2';
			// _decimals.should.be.bignumber.equal(decimals);
			decimals.should.be.a.bignumber.that.equals(_decimals);

		})

	
});
})