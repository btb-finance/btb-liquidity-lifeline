import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { setupTest } from "./helpers";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MockPositionManager", function () {
  let positionManager: Contract;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    const setup = await setupTest();
    positionManager = setup.positionManager;
    owner = setup.owner;
    user1 = setup.user1;
    user2 = setup.user2;
  });

  describe("Position Management", function () {
    const tokenId = 1;

    it("Should mint new position", async function () {
      await positionManager.mint(user1.address, tokenId);
      expect(await positionManager.ownerOf(tokenId)).to.equal(user1.address);
    });

    it("Should set correct position parameters", async function () {
      await positionManager.mint(user1.address, tokenId);
      const position = await positionManager.positions(tokenId);
      
      expect(position.token0).to.equal("0x0000000000000000000000000000000000000001");
      expect(position.token1).to.equal("0x0000000000000000000000000000000000000002");
      expect(position.fee).to.equal(3000);
      expect(position.tickLower).to.equal(-100);
      expect(position.tickUpper).to.equal(100);
      expect(position.liquidity).to.equal(1000);
    });

    it("Should allow approval", async function () {
      await positionManager.mint(user1.address, tokenId);
      await positionManager.connect(user1).approve(user2.address, tokenId);
      expect(await positionManager.getApproved(tokenId)).to.equal(user2.address);
    });

    it("Should transfer position", async function () {
      await positionManager.mint(user1.address, tokenId);
      await positionManager.connect(user1).approve(user2.address, tokenId);
      await positionManager.connect(user2).safeTransferFrom(user1.address, user2.address, tokenId);
      expect(await positionManager.ownerOf(tokenId)).to.equal(user2.address);
    });

    it("Should not allow unauthorized transfer", async function () {
      await positionManager.mint(user1.address, tokenId);
      await expect(
        positionManager.connect(user2).safeTransferFrom(user1.address, user2.address, tokenId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Upgradeable", function () {
    it("Should allow owner to upgrade", async function () {
      const MockPositionManagerV2Factory = await ethers.getContractFactory("MockPositionManager");
      await expect(
        upgrades.upgradeProxy(await positionManager.getAddress(), MockPositionManagerV2Factory)
      ).to.not.be.reverted;
    });

    it("Should not allow non-owner to upgrade", async function () {
      const MockPositionManagerV2Factory = await ethers.getContractFactory("MockPositionManager", user1);
      await expect(
        upgrades.upgradeProxy(await positionManager.getAddress(), MockPositionManagerV2Factory)
      ).to.be.reverted;
    });
  });
});
