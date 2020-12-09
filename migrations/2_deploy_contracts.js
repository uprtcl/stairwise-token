const StaircaseBondingCurve = artifacts.require("StaircaseBondingCurve");
const ERC20Mintable1 = artifacts.require("ERC20Mintable1");

const { toWei, numOf } = require("./../test/general.support");

module.exports = function (deployer, _, accounts) {
  deployer.then(async () => {
    const god = accounts[0];
    const execDAO = accounts[2];

    let dai;

    if (process.env.deploying !== "true") {
      console.log("------------------");
      console.log("------------------");
      console.log("DEPLOYING FOR TEST");
      dai = await deployer.deploy(ERC20Mintable1, { from: god });
    } else {
      dai = { address: process.env.daiAddress };

      console.log("------------------");
      console.log("------------------");
      console.log(`dai    : ${dai.address}`);
    }

    // prettier-ignore
    const steps = [
      toWei("         0"),
      toWei("10 000 000"),
      toWei("20 000 000"),

    ];
    // prettier-ignore
    /** 1 000 000 = 1 */
    const pricesM = [
      numOf("   10 000"),
      numOf("  100 000"),
      numOf("1 000 000"),
    ];

    const initSupply = toWei("1 000 000");
    const beneficiary = execDAO;

    await deployer.deploy(
      StaircaseBondingCurve,
      dai.address,
      steps,
      pricesM,
      initSupply,
      beneficiary,
      {
        from: god,
      }
    );
  });
};
