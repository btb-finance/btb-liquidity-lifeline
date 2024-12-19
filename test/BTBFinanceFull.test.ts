import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { setupTest } from "./helpers";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BTBFinanceFull", function () {
  let btbToken: Contract;
  let btbFinance: Contract;
  let positionManager: Contract;
  let owner: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let voterRewardPool: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    const setup = await setupTest();
    btbToken = setup.btbToken;
    btbFinance = setup.btbFinance;
    positionManager = setup.positionManager;
    owner = setup.owner;
    user1 = setup.user1;
    user2 = setup.user2;
    treasury = setup.treasury;
    voterRewardPool = setup.voterRewardPool;
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await btbFinance.btbToken()).to.equal(await btbToken.getAddress());
      expect(await btbFinance.treasury()).to.equal(treasury.address);
      expect(await btbFinance.voterRewardPool()).to.equal(voterRewardPool.address);
      expect(await btbFinance.positionManager()).to.equal(await positionManager.getAddress());
    });

    it("Should have correct fee distribution parameters", async function () {
      expect(await btbFinance.LP_SHARE()).to.equal(80);
      expect(await btbFinance.VOTER_SHARE()).to.equal(10);
      expect(await btbFinance.TREASURY_SHARE()).to.equal(10);
    });
  });

  describe("Position Staking", function () {
    const tokenId = 1;
    const initialToken0Amount = ethers.parseEther("1");
    const initialToken1Amount = ethers.parseEther("1");

    beforeEach(async function () {
      await positionManager.mint(user1.address, tokenId);
      await positionManager.connect(user1).approve(await btbFinance.getAddress(), tokenId);
    });

    it("Should stake position", async function () {
      await btbFinance.connect(user1).stakePosition(tokenId, initialToken0Amount, initialToken1Amount);
      
      const stakedPosition = await btbFinance.stakedPositions(tokenId);
      expect(stakedPosition.owner).to.equal(user1.address);
      expect(stakedPosition.staked).to.be.true;
      expect(stakedPosition.initialToken0Amount).to.equal(initialToken0Amount);
      expect(stakedPosition.initialToken1Amount).to.equal(initialToken1Amount);
    });

    it("Should not allow staking already staked position", async function () {
      await btbFinance.connect(user1).stakePosition(tokenId, initialToken0Amount, initialToken1Amount);
      
      await expect(
        btbFinance.connect(user1).stakePosition(tokenId, initialToken0Amount, initialToken1Amount)
      ).to.be.revertedWith("Already staked");
    });
  });

  describe("Voting System", function () {
    const pairId = "0x" + Buffer.from("WETH-USDC").toString("hex").padEnd(64, "0");
    const weekDuration = 7 * 24 * 60 * 60; // 1 week in seconds
    const refundBudget = ethers.parseEther("1000");

    beforeEach(async function () {
      // Add a new pair
      await btbFinance.connect(owner).addPair(pairId);

      // Start a new voting week
      await btbToken.approve(await btbFinance.getAddress(), refundBudget);
      await btbFinance.startWeek(weekDuration, refundBudget);
    });

    it("Should allow voting for pair", async function () {
      const voteAmount = ethers.parseEther("100");
      await btbToken.connect(user1).approve(await btbFinance.getAddress(), voteAmount);
      await btbFinance.connect(user1).voteForPair(pairId, voteAmount);

      expect(await btbFinance.validPair(pairId)).to.be.true;
    });

    it("Should end voting week correctly", async function () {
      // Move time forward by one week
      await ethers.provider.send("evm_increaseTime", [weekDuration]);
      await ethers.provider.send("evm_mine", []);

      await btbFinance.endWeek();

      // Check that voting is closed
      const voteAmount = ethers.parseEther("100");
      await btbToken.connect(user1).approve(await btbFinance.getAddress(), voteAmount);
      await expect(
        btbFinance.connect(user1).voteForPair(pairId, voteAmount)
      ).to.be.revertedWith("Voting not active");
    });
  });

  describe("Upgradeable", function () {
    it("Should allow owner to upgrade", async function () {
      const BTBFinanceV2Factory = await ethers.getContractFactory("BTBFinanceFull");
      await expect(
        upgrades.upgradeProxy(await btbFinance.getAddress(), BTBFinanceV2Factory)
      ).to.not.be.reverted;
    });

    it("Should not allow non-owner to upgrade", async function () {
      const BTBFinanceV2Factory = await ethers.getContractFactory("BTBFinanceFull", user1);
      await expect(
        upgrades.upgradeProxy(await btbFinance.getAddress(), BTBFinanceV2Factory)
      ).to.be.reverted;
    });
  });
});
