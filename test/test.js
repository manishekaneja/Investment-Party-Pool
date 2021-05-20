const {expect} = require('chai');
require('@openzeppelin/test-helpers/configure')({});
const {expectRevert, time} = require('@openzeppelin/test-helpers');

// Function to deploy any Contract
async function deployContract(contractName, ...contractParams) {
  if (!contractName || typeof contractName !== 'string') {
    throw new Error('Expect contractName to be a string');
  }
  const Contract = await hre.ethers.getContractFactory(contractName);
  const contractInstance = await Contract.deploy(...contractParams);
  await contractInstance.deployed();
  return contractInstance;
}

describe('=> Party-pool Contract', function () {
  let coin1, coin2, pool, owner, addr, partyContract;
  beforeEach(async function () {
    coin1 = await deployContract('NormalCoin');
    coin2 = await deployContract('NormalCoin');
    partyContract = await ethers.getContractFactory('Party');
    pool = await deployContract('PartyPool');
    [owner, ...addr] = await ethers.getSigners();
  });

  describe('Party Pool deployment', function () {
    it('Should have no party present', async function () {
      expect((await pool.getPartyList()).length).to.equal(0);
    });
  });

  describe('Whitelist New Token', function () {
    it('Should be completed by Owner', async function () {
      expect(await pool.tokenState(coin1.address)).to.equal(false);
      await pool.approveToken(coin1.address);
      expect(await pool.tokenState(coin1.address)).to.equal(true);
    });
    it('Should revert if tried by any other', async function () {
      await expectRevert.unspecified(
        pool.connect(addr[0]).approveToken(coin1.address)
      );
    });
  });

  describe('Starting Parties', function () {
    beforeEach(async function () {
      await pool.approveToken(coin1.address);
    });
    it('Should make entry in party list', async function () {
      await pool.startParty(coin1.address);
      expect((await pool.getPartyList()).length).to.equal(1);
    });

    it('Should have multiple parties', async function () {
      await pool.startParty(coin1.address);
      await pool.startParty(coin1.address);
      expect((await pool.getPartyList()).length).to.equal(2);
    });

    it('Should revert if party is started for invalid token', async function () {
      await expectRevert.unspecified(pool.startParty(coin2.address));
    });

    it('Should have multiple parties for differnet tokens', async function () {
      await pool.approveToken(coin2.address);
      await Promise.all([
        pool.startParty(coin2.address),
        pool.startParty(coin1.address),
        pool.connect(addr[0]).startParty(coin1.address),
      ]);
      const partyList = await pool.getPartyList();
      expect(partyList.length).to.equal(3);
      expect(await partyContract.attach(partyList[0]).token()).to.equal(
        coin2.address
      );
      expect(await partyContract.attach(partyList[1]).token()).to.equal(
        coin1.address
      );
      expect(await partyContract.attach(partyList[2]).token()).to.equal(
        coin1.address
      );
    });
  });

  describe('Investment into Parties', function () {
    let partyAddress = null;
    beforeEach(async function () {
      await pool.approveToken(coin1.address);
      await pool.startParty(coin1.address);
      await pool.approveToken(coin2.address);
      await pool.connect(addr[0]).startParty(coin2.address);
      await coin1.transfer(addr[0].address, ethers.utils.parseEther('5000'));
      await coin1.transfer(addr[1].address, ethers.utils.parseEther('1000'));
      [partyAddress] = await pool.getPartyList();
    });
    it('Should should increase Contract Amount', async function () {
      const party = await partyContract.attach(partyAddress);
      await coin1.approve(partyAddress, ethers.utils.parseEther('10'));
      await pool.invest(partyAddress, ethers.utils.parseEther('10'));
      expect(await party.investment(owner.address)).to.equal(
        ethers.utils.parseEther('10')
      );
      expect(await coin1.balanceOf(partyAddress)).to.equal(
        ethers.utils.parseEther('10')
      );
    });

    it('Should increment for multiple inverters as well', async function () {
      const party = await partyContract.attach(partyAddress);
      await coin1.approve(partyAddress, ethers.utils.parseEther('10'));
      await pool.invest(partyAddress, ethers.utils.parseEther('10'));
      await coin1
        .connect(addr[0])
        .approve(partyAddress, ethers.utils.parseEther('20'));
      await pool
        .connect(addr[0])
        .invest(partyAddress, ethers.utils.parseEther('20'));
      expect(await party.investment(owner.address)).to.equal(
        ethers.utils.parseEther('10')
      );
      expect(await party.investment(addr[0].address)).to.equal(
        ethers.utils.parseEther('20')
      );
      expect(await coin1.balanceOf(partyAddress)).to.equal(
        ethers.utils.parseEther('30')
      );
    });

    it('Should fail if wrong coin is approved', async function () {
      await coin2.approve(partyAddress, ethers.utils.parseEther('10'));
      await expectRevert.unspecified(
        pool.invest(partyAddress, ethers.utils.parseEther('10'))
      );
    });

    it('Should fail if invested after expiry time', async function () {
      await coin1.approve(partyAddress, ethers.utils.parseEther('10'));
      await time.increase(time.duration.days(7));
      await expectRevert.unspecified(
        pool.invest(partyAddress, ethers.utils.parseEther('10'))
      );
    });
  });

  describe('When Claimed', function () {
    let partyAddress = null,
      party = null;
    beforeEach(async function () {
      await pool.approveToken(coin1.address);
      await pool.startParty(coin1.address);
      await pool.approveToken(coin2.address);
      await pool.connect(addr[0]).startParty(coin2.address);
      await coin1.transfer(addr[0].address, ethers.utils.parseEther('5000'));
      [partyAddress] = await pool.getPartyList();
      party = await partyContract.attach(partyAddress);
      await coin1.approve(partyAddress, ethers.utils.parseEther('10'));
      await pool.invest(partyAddress, ethers.utils.parseEther('10'));
      await coin1
        .connect(addr[0])
        .approve(partyAddress, ethers.utils.parseEther('20'));
      await pool
        .connect(addr[0])
        .invest(partyAddress, ethers.utils.parseEther('20'));
    });
    it('Should transfer contract fund to staekholders', async function () {
      await time.increase(time.duration.days(7));
      await pool.claim(partyAddress);
      expect(await coin1.balanceOf(party.address)).to.equal(
        ethers.utils.parseEther('0')
      );
      expect(await coin1.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther('5020')
      );
      expect(await coin1.balanceOf(addr[0].address)).to.equal(
        ethers.utils.parseEther('4980')
      );
      expect(await party.claimedBy()).to.equal(owner.address);
    });

    it('Should fail if claimed multiple times', async function () {
      await time.increase(time.duration.days(7));
      await pool.claim(partyAddress);
      await expectRevert.unspecified(pool.claim(partyAddress));
      await expectRevert.unspecified(pool.connect(addr[0]).claim(partyAddress));
    });

    it('Should fail if claimed before expiry time', async function () {
      await expectRevert.unspecified(pool.claim(partyAddress));
    });
  });
});
