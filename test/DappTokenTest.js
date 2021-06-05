const DappToken = artifacts.require("DappToken");

contract('Dapptoken', accounts=> {

	beforeEach(async () => {
		this.token = await DappToken.new('Dapp Token', 'DTC', 18);
	});

	describe('Token attributes', () =>{
		it('Has the correct name', async () => {
			const name = await this.token.name();
			assert.equal(name, "Dapp Token")
		})
	
});
})