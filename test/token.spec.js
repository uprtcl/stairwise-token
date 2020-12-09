const StaircaseBondingCurve = artifacts.require("StaircaseBondingCurve");
const ERC20Mintable1 = artifacts.require("ERC20Mintable1");

const { toWei, numOf } = require("./../test/general.support");

const APPROVED_ERROR = "ERC20: transfer amount exceeds balance";

contract("StaircaseBondingCurve", (accounts) => {
  let token;
  let tokenTemp;
  const god = accounts[0];
  const execDAO = accounts[2];
  const buyer = accounts[3];

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

  it("should get contract instances", async () => {
    token = await StaircaseBondingCurve.deployed();
    dai = await ERC20Mintable1.deployed();
  });

  it("should be correctly configured", async () => {
    const stepsRead = await token.getSteps();

    assert.equal(stepsRead.length, steps.length, "length");
    steps.map((v, ix) => {
      assert.equal(stepsRead[ix].toString(), v.toString(), "value");
    });

    const pricesMRead = await token.getPricesM();

    assert.equal(pricesMRead.length, pricesM.length, "length");
    pricesM.map((v, ix) => {
      assert.equal(pricesMRead[ix].toString(), v.toString(), "value");
    });

    const supply = await token.totalSupply();
    assert.equal(supply.toString(), initSupply.toString(), "supply");

    const beneficiary = await token.beneficiary();
    assert.equal(beneficiary, execDAO, "beneficiary");

    // console.log(`supply init: ${web3.utils.fromWei(supply)}`);
    // console.log(`beneficiary: ${beneficiary}`);
  });

  it("should compute the mint cost 01", async () => {
    const amount = toWei("1 000");
    const result = await token.mintCost(amount);

    assert.equal(result[0].toString(), toWei("10"), "cost");
    assert.equal(result[1].toString(), "0", "step");
  });

  it("should compute the mint cost 02", async () => {
    const amount = toWei("10 000 000");
    const result = await token.mintCost(amount);

    assert.equal(result[0].toString(), toWei("100 000"), "cost");
    assert.equal(result[1].toString(), "0", "step");
  });

  it("should compute the mint cost 03", async () => {
    const amount = toWei("10 000 000").add(toWei("1 000"));
    const result = await token.mintCost(amount);

    assert.equal(
      result[0].toString(),
      toWei("100 000").add(toWei("100")).toString(),
      "cost"
    );
    assert.equal(result[1].toString(), "1", "step");
  });

  it("should compute the mint cost 04", async () => {
    const amount = toWei("20 000 000");
    const result = await token.mintCost(amount);

    assert.equal(
      result[0].toString(),
      toWei("100 000").add(toWei("1 000 000")).toString(),
      "cost"
    );
    assert.equal(result[1].toString(), "1", "step");
  });

  it("should compute the mint cost 05", async () => {
    const amount = toWei("20 000 000").add(toWei("1 000"));
    const result = await token.mintCost(amount);

    assert.equal(
      result[0].toString(),
      toWei("100 000").add(toWei("1 000 000")).add(toWei("1 000")).toString(),
      "cost"
    );
    assert.equal(result[1].toString(), "2", "step");
  });

  it("should compute the mint cost 05", async () => {
    const amount = toWei("20 000 000").add(toWei("80 000 000"));
    const result = await token.mintCost(amount);

    assert.equal(
      result[0].toString(),
      toWei("100 000")
        .add(toWei("1 000 000"))
        .add(toWei("80 000 000"))
        .toString(),
      "cost"
    );
    assert.equal(result[1].toString(), "2", "step");
  });

  it("should compute the mint cost rounding errors", async () => {
    const amount = web3.utils.toBN("1");
    const result = await token.mintCost(amount);

    assert.equal(result[0].toString(), "1", "cost");
    assert.equal(result[1].toString(), "0", "step");
  });

  it("should redeploy", async () => {
    tokenTemp = await StaircaseBondingCurve.new(
      dai.address,
      steps,
      pricesM,
      initSupply,
      execDAO,
      {
        from: god,
      }
    );
  });

  it("should be correctly configured", async () => {
    const stepsRead = await tokenTemp.getSteps();

    assert.equal(stepsRead.length, steps.length, "length");
    steps.map((v, ix) => {
      assert.equal(stepsRead[ix].toString(), v.toString(), "value");
    });

    const pricesMRead = await tokenTemp.getPricesM();

    assert.equal(pricesMRead.length, pricesM.length, "length");
    pricesM.map((v, ix) => {
      assert.equal(pricesMRead[ix].toString(), v.toString(), "value");
    });

    const supply = await tokenTemp.totalSupply();
    assert.equal(supply.toString(), initSupply.toString(), "supply");

    const beneficiary = await tokenTemp.beneficiary();
    assert.equal(beneficiary, execDAO, "beneficiary");
  });

  it("should not mint if not prepaid", async () => {
    const amount = toWei("1 000");

    let failed;

    failed = false;
    await tokenTemp.mint(buyer, amount, { from: buyer }).catch((error) => {
      assert.equal(error.reason, APPROVED_ERROR, "unexpected reason");
      failed = true;
    });

    assert.isTrue(failed, "minted");
  });

  it("should mint 1k", async () => {
    const amount = toWei("1 000");
    const cost = toWei("10");

    await dai.mint(buyer, cost);
    await dai.approve(tokenTemp.address, cost, { from: buyer });

    const buyerDai0 = await dai.balanceOf(buyer);
    const execDAODai0 = await dai.balanceOf(execDAO);
    const buyerCredits0 = await tokenTemp.balanceOf(buyer);
    const supply0 = await tokenTemp.totalSupply();

    assert.equal(buyerDai0.toString(), cost, "dai");
    assert.equal(execDAODai0.toString(), "0", "dai");
    assert.equal(buyerCredits0.toString(), "0", "credits");
    assert.equal(supply0.toString(), initSupply.toString(), "supply");

    await tokenTemp.mint(buyer, amount, { from: buyer });

    const buyerDai1 = await dai.balanceOf(buyer);
    const execDAODai1 = await dai.balanceOf(execDAO);
    const buyerCredits1 = await tokenTemp.balanceOf(buyer);
    const supply1 = await tokenTemp.totalSupply();
    const step = await tokenTemp.step();

    assert.equal(buyerDai1.toString(), buyerDai0.sub(cost).toString(), "dai");
    assert.equal(
      execDAODai1.toString(),
      execDAODai0.add(cost).toString(),
      "dai"
    );
    assert.equal(
      buyerCredits1.toString(),
      buyerCredits0.add(amount).toString(),
      "credits"
    );
    assert.equal(supply1.toString(), supply0.add(amount).toString(), "supply");
    assert.equal(step.toString(), "0", "step");
  });

  it("should mint step1 and 10k of step 2", async () => {
    // mint so that 10k over first step
    const amount = toWei("10 000 000").sub(toWei("1 000")).add(toWei("10 000"));
    const cost = toWei("100 000").sub(toWei("10")).add(toWei("1 000"));

    await dai.mint(buyer, cost);
    await dai.approve(tokenTemp.address, cost, { from: buyer });

    const buyerDai0 = await dai.balanceOf(buyer);
    const execDAODai0 = await dai.balanceOf(execDAO);
    const buyerCredits0 = await tokenTemp.balanceOf(buyer);
    const supply0 = await tokenTemp.totalSupply();

    await tokenTemp.mint(buyer, amount, { from: buyer });

    const buyerDai1 = await dai.balanceOf(buyer);
    const execDAODai1 = await dai.balanceOf(execDAO);
    const buyerCredits1 = await tokenTemp.balanceOf(buyer);
    const supply1 = await tokenTemp.totalSupply();
    const step = await tokenTemp.step();

    assert.equal(buyerDai1.toString(), buyerDai0.sub(cost).toString(), "dai");
    assert.equal(
      execDAODai1.toString(),
      execDAODai0.add(cost).toString(),
      "dai"
    );
    assert.equal(
      buyerCredits1.toString(),
      buyerCredits0.add(amount).toString(),
      "credits"
    );
    assert.equal(supply1.toString(), supply0.add(amount).toString(), "supply");

    assert.equal(step.toString(), "1", "step");
  });

  it("should mint 100k on step2", async () => {
    // at this point have minted 10k over second step
    // lets mint 100k on this step (price is 0.1)
    const amount = toWei("100 000");
    const cost = toWei("10 000");

    await dai.mint(buyer, cost);
    await dai.approve(tokenTemp.address, cost, { from: buyer });

    const buyerDai0 = await dai.balanceOf(buyer);
    const execDAODai0 = await dai.balanceOf(execDAO);
    const buyerCredits0 = await tokenTemp.balanceOf(buyer);
    const supply0 = await tokenTemp.totalSupply();

    await tokenTemp.mint(buyer, amount, { from: buyer });

    const buyerDai1 = await dai.balanceOf(buyer);
    const execDAODai1 = await dai.balanceOf(execDAO);
    const buyerCredits1 = await tokenTemp.balanceOf(buyer);
    const supply1 = await tokenTemp.totalSupply();
    const step = await tokenTemp.step();

    assert.equal(buyerDai1.toString(), buyerDai0.sub(cost).toString(), "dai");
    assert.equal(
      execDAODai1.toString(),
      execDAODai0.add(cost).toString(),
      "dai"
    );
    assert.equal(
      buyerCredits1.toString(),
      buyerCredits0.add(amount).toString(),
      "credits"
    );
    assert.equal(supply1.toString(), supply0.add(amount).toString(), "supply");

    assert.equal(step.toString(), "1", "step");
  });

  it("should mint the remaining step 2", async () => {
    // at this point have minted 110k over second step
    // lets mint just enough to close the step but not get into the last step
    const amount = toWei("10 000 000").sub(toWei("110 000"));
    const cost = amount.mul(web3.utils.toBN("10")).div(web3.utils.toBN("100"));

    await dai.mint(buyer, cost);
    await dai.approve(tokenTemp.address, cost, { from: buyer });

    const buyerDai0 = await dai.balanceOf(buyer);
    const execDAODai0 = await dai.balanceOf(execDAO);
    const buyerCredits0 = await tokenTemp.balanceOf(buyer);
    const supply0 = await tokenTemp.totalSupply();

    await tokenTemp.mint(buyer, amount, { from: buyer });

    const buyerDai1 = await dai.balanceOf(buyer);
    const execDAODai1 = await dai.balanceOf(execDAO);
    const buyerCredits1 = await tokenTemp.balanceOf(buyer);
    const supply1 = await tokenTemp.totalSupply();
    const step = await tokenTemp.step();

    assert.equal(buyerDai1.toString(), buyerDai0.sub(cost).toString(), "dai");
    assert.equal(
      execDAODai1.toString(),
      execDAODai0.add(cost).toString(),
      "dai"
    );
    assert.equal(
      buyerCredits1.toString(),
      buyerCredits0.add(amount).toString(),
      "credits"
    );
    assert.equal(supply1.toString(), supply0.add(amount).toString(), "supply");

    assert.equal(step.toString(), "1", "step");
  });

  it("should mint 0 with no side effects", async () => {
    // at this point supply is at the edge of step 2 and 3
    // lets mint 0 to see it has no effects

    const amount = toWei("0");
    const cost = toWei("0");

    const buyerDai0 = await dai.balanceOf(buyer);
    const execDAODai0 = await dai.balanceOf(execDAO);
    const buyerCredits0 = await tokenTemp.balanceOf(buyer);
    const supply0 = await tokenTemp.totalSupply();

    await tokenTemp.mint(buyer, amount, { from: buyer });

    const buyerDai1 = await dai.balanceOf(buyer);
    const execDAODai1 = await dai.balanceOf(execDAO);
    const buyerCredits1 = await tokenTemp.balanceOf(buyer);
    const supply1 = await tokenTemp.totalSupply();
    const step = await tokenTemp.step();

    assert.equal(buyerDai1.toString(), buyerDai0.sub(cost).toString(), "dai");
    assert.equal(
      execDAODai1.toString(),
      execDAODai0.add(cost).toString(),
      "dai"
    );
    assert.equal(
      buyerCredits1.toString(),
      buyerCredits0.add(amount).toString(),
      "credits"
    );
    assert.equal(supply1.toString(), supply0.add(amount).toString(), "supply");

    assert.equal(step.toString(), "1", "step");
  });

  it("should mint 1 wei at step 3 price", async () => {
    // at this point supply is at the edge of step 2 and 3
    // lets mint 0 to see it has no effects

    const amount = web3.utils.toBN("1");
    const cost = web3.utils.toBN("1");

    await dai.mint(buyer, cost);
    await dai.approve(tokenTemp.address, cost, { from: buyer });

    const buyerDai0 = await dai.balanceOf(buyer);
    const execDAODai0 = await dai.balanceOf(execDAO);
    const buyerCredits0 = await tokenTemp.balanceOf(buyer);
    const supply0 = await tokenTemp.totalSupply();

    await tokenTemp.mint(buyer, amount, { from: buyer });

    const buyerDai1 = await dai.balanceOf(buyer);
    const execDAODai1 = await dai.balanceOf(execDAO);
    const buyerCredits1 = await tokenTemp.balanceOf(buyer);
    const supply1 = await tokenTemp.totalSupply();
    const step = await tokenTemp.step();

    assert.equal(buyerDai1.toString(), buyerDai0.sub(cost).toString(), "dai");
    assert.equal(
      execDAODai1.toString(),
      execDAODai0.add(cost).toString(),
      "dai"
    );
    assert.equal(
      buyerCredits1.toString(),
      buyerCredits0.add(amount).toString(),
      "credits"
    );
    assert.equal(supply1.toString(), supply0.add(amount).toString(), "supply");

    assert.equal(step.toString(), "2", "step");
  });

  it("should redeploy once again", async () => {
    tokenTemp2 = await StaircaseBondingCurve.new(
      dai.address,
      steps,
      pricesM,
      initSupply,
      execDAO,
      {
        from: god,
      }
    );
  });

  it("should mint 25M, covering all steps", async () => {
    const amount = toWei("25 000 000");
    const cost = toWei("1 100 000").add(toWei("5 000 000"));

    await dai.mint(buyer, cost);
    await dai.approve(tokenTemp2.address, cost, { from: buyer });

    const buyerDai0 = await dai.balanceOf(buyer);
    const execDAODai0 = await dai.balanceOf(execDAO);
    const buyerCredits0 = await tokenTemp2.balanceOf(buyer);
    const supply0 = await tokenTemp2.totalSupply();

    await tokenTemp2.mint(buyer, amount, { from: buyer });

    const buyerDai1 = await dai.balanceOf(buyer);
    const execDAODai1 = await dai.balanceOf(execDAO);
    const buyerCredits1 = await tokenTemp2.balanceOf(buyer);
    const supply1 = await tokenTemp2.totalSupply();
    const step = await tokenTemp2.step();

    assert.equal(buyerDai1.toString(), buyerDai0.sub(cost).toString(), "dai");
    assert.equal(
      execDAODai1.toString(),
      execDAODai0.add(cost).toString(),
      "dai"
    );
    assert.equal(
      buyerCredits1.toString(),
      buyerCredits0.add(amount).toString(),
      "credits"
    );
    assert.equal(supply1.toString(), supply0.add(amount).toString(), "supply");
    assert.equal(step.toString(), "2", "step");
  });
});
