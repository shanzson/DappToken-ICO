const BN = require('bn.js');

module.exports = function toWei_BN (x) {
  const result = new BN((x * 10 ** 18).toString());
  return result.toString();
}
