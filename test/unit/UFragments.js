const UFragments = artifacts.require('UFragments.sol');
const _require = require('app-root-path').require;
const BlockchainCaller = _require('/util/blockchain_caller');
const chain = new BlockchainCaller(web3);
const encodeCall = require('zos-lib/lib/helpers/encodeCall').default;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const transferAmount = 10;

let uFragments, b, r, deployer;
async function setupContracts () {
  const accounts = await chain.getUserAccounts();
  deployer = accounts[0];
  uFragments = await UFragments.new();
  await uFragments.sendTransaction({
    data: encodeCall('initialize', ['address'], [deployer]),
    from: deployer
  });
}

contract('UFragments:Initialization', function (accounts) {
  before('setup UFragments contract', setupContracts);

  it('should add +1000 uFragments to the deployer', async function () {
    b = await uFragments.balanceOf.call(deployer);
    expect(b.toNumber()).to.eq(1000);
  });
  it('should set the totalSupply to 1000', async function () {
    b = await uFragments.totalSupply.call();
    expect(b.toNumber()).to.eq(1000);
  });
});

contract('UFragments:MonetaryPolicy', function (accounts) {
  const policy = accounts[1];
  const A = accounts[2];

  before('setup UFragments contract', async function () {
    await setupContracts();
    await uFragments.setMonetaryPolicy(policy, { from: deployer });
  });

  it('should NOT be set-able by non-owner', async function () {
    expect(
      await chain.isEthException(uFragments.setMonetaryPolicy(A, { from: policy }))
    ).to.be.true;
  });
});

contract('UFragments:PauseRebase', function (accounts) {
  const policy = accounts[1];
  const A = accounts[2];
  const B = accounts[3];

  before('setup UFragments contract', async function () {
    await setupContracts();
    await uFragments.setMonetaryPolicy(policy, {from: deployer});
    r = await uFragments.setRebasePaused(true);
  });

  it('should emit pause event', async function () {
    const log = r.logs[0];
    expect(log).to.exist;
    expect(log.event).to.eq('LogRebasePaused');
    expect(log.args.paused).to.be.true;
  });

  it('should not allow calling rebase', async function () {
    expect(
      await chain.isEthException(uFragments.rebase(1, 500, { from: policy }))
    ).to.be.true;
  });

  it('should allow calling transfer', async function () {
    await uFragments.transfer(A, 10, { from: deployer });
  });

  it('should allow calling approve', async function () {
    await uFragments.approve(A, 10, { from: deployer });
  });

  it('should allow calling allowance', async function () {
    await uFragments.allowance.call(deployer, A);
  });

  it('should allow calling transferFrom', async function () {
    await uFragments.transferFrom(deployer, B, 10, {from: A});
  });

  it('should allow calling increaseApproval', async function () {
    await uFragments.increaseApproval(A, 10, {from: deployer});
  });

  it('should allow calling decreaseApproval', async function () {
    await uFragments.decreaseApproval(A, 10, {from: deployer});
  });

  it('should allow calling balanceOf', async function () {
    await uFragments.balanceOf.call(deployer);
  });

  it('should allow calling totalSupply', async function () {
    await uFragments.totalSupply.call();
  });
});

contract('UFragments:PauseToken', function (accounts) {
  const policy = accounts[1];
  const A = accounts[2];
  const B = accounts[3];

  before('setup UFragments contract', async function () {
    await setupContracts();
    await uFragments.setMonetaryPolicy(policy, {from: deployer});
    r = await uFragments.setTokenPaused(true);
  });

  it('should emit pause event', async function () {
    const log = r.logs[0];
    expect(log).to.exist;
    expect(log.event).to.eq('LogTokenPaused');
    expect(log.args.paused).to.be.true;
  });

  it('should allow calling rebase', async function () {
    await uFragments.rebase(1, 500, { from: policy });
  });

  it('should not allow calling transfer', async function () {
    expect(
      await chain.isEthException(uFragments.transfer(A, 10, { from: deployer }))
    ).to.be.true;
  });

  it('should not allow calling approve', async function () {
    expect(
      await chain.isEthException(uFragments.approve(A, 10, { from: deployer }))
    ).to.be.true;
  });

  it('should allow calling allowance', async function () {
    await uFragments.allowance.call(deployer, A);
  });

  it('should not allow calling transferFrom', async function () {
    expect(
      await chain.isEthException(uFragments.transferFrom(deployer, B, 10, {from: A}))
    ).to.be.true;
  });

  it('should not allow calling increaseApproval', async function () {
    expect(
      await chain.isEthException(uFragments.increaseApproval(A, 10, {from: deployer}))
    ).to.be.true;
  });

  it('should not allow calling decreaseApproval', async function () {
    expect(
      await chain.isEthException(uFragments.decreaseApproval(A, 10, {from: deployer}))
    ).to.be.true;
  });

  it('should allow calling balanceOf', async function () {
    await uFragments.balanceOf.call(deployer);
  });

  it('should allow calling totalSupply', async function () {
    await uFragments.totalSupply.call();
  });
});

contract('UFragments:Rebase:Access Controls', function (accounts) {
  const A = accounts[2];
  const policy = accounts[1];

  before('setup UFragments contract', async function () {
    await setupContracts();
    await uFragments.setMonetaryPolicy(policy, {from: deployer});
    await uFragments.transfer(A, 250, { from: deployer });
    await uFragments.rebase(1, 500, {from: policy});
  });

  it('should be callable by monetary policy', async function () {
    await uFragments.rebase(1, 10, {from: policy});
  });

  it('should not be callable by others', async function () {
    expect(
      await chain.isEthException(uFragments.rebase(1, 500, { from: deployer }))
    ).to.be.true;
  });
});

contract('UFragments:Rebase:Expansion', function (accounts) {
  // Rebase +500 (50%), with starting balances deployer:750 and A:250.
  const A = accounts[2];
  const policy = accounts[1];

  before('setup UFragments contract', async function () {
    await setupContracts();
    await uFragments.setMonetaryPolicy(policy, {from: deployer});
    await uFragments.transfer(A, 250, { from: deployer });
    r = await uFragments.rebase(1, 500, {from: policy});
  });

  it('should increase the totalSupply', async function () {
    b = await uFragments.totalSupply.call();
    expect(b.toNumber()).to.eq(1500);
  });

  it('should increase individual balances', async function () {
    b = await uFragments.balanceOf.call(deployer);
    expect(b.toNumber()).to.be.above(750).and.at.most(1125);

    b = await uFragments.balanceOf.call(A);
    expect(b.toNumber()).to.be.above(250).and.at.most(375);
  });

  it('should emit Rebase', async function () {
    const log = r.logs[0];
    expect(log).to.exist;
    expect(log.event).to.eq('LogRebase');
    expect(log.args.epoch.toNumber()).to.eq(1);
    expect(log.args.totalSupply.toNumber()).to.eq(1500);
  });
});

contract('UFragments:Rebase:Contraction', function (accounts) {
  // Rebase -500 (-50%), with starting balances deployer:750 and A:250.
  const A = accounts[2];
  const policy = accounts[1];

  before('setup UFragments contract', async function () {
    await setupContracts();
    await uFragments.setMonetaryPolicy(policy, {from: deployer});
    await uFragments.transfer(A, 250, { from: deployer });
    r = await uFragments.rebase(1, -500, {from: policy});
  });

  it('should decrease the totalSupply', async function () {
    b = await uFragments.totalSupply.call();
    expect(b.toNumber()).to.eq(500);
  });

  it('should decrease individual balances', async function () {
    b = await uFragments.balanceOf.call(deployer);
    expect(b.toNumber()).to.at.least(374).and.at.most(375);

    b = await uFragments.balanceOf.call(A);
    expect(b.toNumber()).to.at.least(124).and.at.most(125);
  });

  it('should emit Rebase', async function () {
    const log = r.logs[0];
    expect(log).to.exist;
    expect(log.event).to.eq('LogRebase');
    expect(log.args.epoch.toNumber()).to.eq(1);
    expect(log.args.totalSupply.toNumber()).to.eq(500);
  });
});

contract('UFragments:Transfer', function (accounts) {
  const A = accounts[2];
  const B = accounts[3];
  const C = accounts[4];

  before('setup UFragments contract', setupContracts);

  describe('deployer transfers 12 to A', function () {
    it('should have balances [988,12]', async function () {
      await uFragments.transfer(A, 12, { from: deployer });
      b = await uFragments.balanceOf.call(deployer);
      expect(b.toNumber()).to.eq(988);
      b = await uFragments.balanceOf.call(A);
      expect(b.toNumber()).to.eq(12);
    });
  });

  describe('deployer transfers 15 to B', async function () {
    it('should have balances [973,15]', async function () {
      await uFragments.transfer(B, 15, { from: deployer });
      b = await uFragments.balanceOf.call(deployer);
      expect(b.toNumber()).to.eq(973);
      b = await uFragments.balanceOf.call(B);
      expect(b.toNumber()).to.eq(15);
    });
  });

  describe('deployer transfers the rest to C', async function () {
    it('should have balances [0,973]', async function () {
      await uFragments.transfer(C, 973, { from: deployer });
      b = await uFragments.balanceOf.call(deployer);
      expect(b.toNumber()).to.eq(0);
      b = await uFragments.balanceOf.call(C);
      expect(b.toNumber()).to.eq(973);
    });
  });

  describe('when the recipient is the zero address', function () {
    const to = ZERO_ADDRESS;
    const owner = A;

    it('reverts on transfer', async function () {
      expect(
        await chain.isEthException(uFragments.transfer(to, transferAmount, { from: owner }))
      ).to.be.true;
    });

    it('reverts on transferFrom', async function () {
      expect(
        await chain.isEthException(uFragments.transferFrom(owner, to, transferAmount, { from: owner }))
      ).to.be.true;
    });
  });

  describe('when the recipient address is the contract address', function () {
    const owner = A;

    it('reverts on transfer', async function () {
      expect(
        await chain.isEthException(uFragments.transfer(uFragments.address, transferAmount, { from: owner }))
      ).to.be.true;
    });

    it('reverts on transferFrom', async function () {
      expect(
        await chain.isEthException(uFragments.transferFrom(owner, uFragments.address, transferAmount, { from: owner }))
      ).to.be.true;
    });
  });
});
