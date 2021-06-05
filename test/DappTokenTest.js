cosnt DappToken = artifacts.require("DappToken");

contract('Dapptoken', accounts=> {
	describe('Token attributes', () =>{
		it('Has the correct name', () => {
			Dapptoken.deployed().then((instance) => {
				deployedToken = instance;
				instance.name().then((n) => {
					assert.equal(n, 'Dapp Token');
				})
			})
		})
	})
});