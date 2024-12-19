import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { setupTest } from "./helpers";

describe("BTB Finance", function () {
  let btbToken: Contract;
  let btbFinance: Contract;
  let owner: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let voterRewardPool: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let mockPositionManager: Contract;

  beforeEach(async function () {
    const setup = await setupTest();
    btbToken = setup.btbToken;
    btbFinance = setup.btbFinance;
    mockPositionManager = setup.positionManager;
    owner = setup.owner;
    user1 = setup.user1;
    user2 = setup.user2;
    treasury = setup.treasury;
    voterRewardPool = setup.voterRewardPool;
  });

  describe("Token Setup", function () {
    it("Should have correct initial token setup", async function () {
      expect(await btbToken.name()).to.equal("BTB Token");
      expect(await btbToken.symbol()).to.equal("BTB");
      expect(await btbToken.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Contract Setup", function () {
    it("Should have correct initial contract setup", async function () {
      expect(await btbFinance.btbToken()).to.equal(await btbToken.getAddress());
      expect(await btbFinance.treasury()).to.equal(treasury.address);
      expect(await btbFinance.voterRewardPool()).to.equal(voterRewardPool.address);
      expect(await btbFinance.positionManager()).to.equal(await mockPositionManager.getAddress());
    });
  });

  describe("Staking", function () {
    const tokenId = 1;
    const initialToken0Amount = ethers.parseEther("1");
    const initialToken1Amount = ethers.parseEther("1");

    beforeEach(async function () {
      // Mint a position NFT to user1
      await mockPositionManager.mint(user1.address, tokenId);
      // Approve BTBFinance to transfer the NFT
      await mockPositionManager.connect(user1).approve(await btbFinance.getAddress(), tokenId);
    });

    it("Should allow staking of LP position", async function () {
      await expect(btbFinance.connect(user1).stakePosition(tokenId, initialToken0Amount, initialToken1Amount))
        .to.emit(btbFinance, "PositionStaked")
        .withArgs(user1.address, tokenId, initialToken0Amount, initialToken1Amount);

      const position = await btbFinance.stakedPositions(tokenId);
      expect(position[0]).to.equal(user1.address); // owner
      expect(position[2]).to.be.true; // staked
      expect(position[3]).to.equal(initialToken0Amount); // initialToken0Amount
      expect(position[4]).to.equal(initialToken1Amount); // initialToken1Amount
    });

    it("Should not allow staking of already staked position", async function () {
      await btbFinance.connect(user1).stakePosition(tokenId, initialToken0Amount, initialToken1Amount);
      await expect(btbFinance.connect(user1).stakePosition(tokenId, initialToken0Amount, initialToken1Amount))
        .to.be.revertedWith("Already staked");
    });
  });

  describe("Voting", function () {
    const pairId = "0x" + Buffer.from("WETH-USDC").toString("hex").padEnd(64, "0");
    const weekDuration = 7 * 24 * 60 * 60; // 1 week in seconds
    const refundBudget = ethers.parseEther("1000");

    beforeEach(async function () {
      // Add a new pair
      await btbFinance.addPair(pairId);

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
});
