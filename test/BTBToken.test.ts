import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { setupTest } from "./helpers";
import { Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BTB Token", function () {
  let btbToken: Contract;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async function () {
    const setup = await setupTest();
    btbToken = setup.btbToken;
    owner = setup.owner;
    user1 = setup.user1;
    user2 = setup.user2;
  });

  describe("Initialization", function () {
    it("Should initialize with correct name and symbol", async function () {
      expect(await btbToken.name()).to.equal("BTB Token");
      expect(await btbToken.symbol()).to.equal("BTB");
    });

    it("Should mint initial supply to deployer", async function () {
      const ownerBalance = await btbToken.balanceOf(owner.address);
      expect(ownerBalance).to.be.gt(0);
    });
  });

  describe("Token Operations", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("100");
      const initialBalance = await btbToken.balanceOf(user2.address);
      await btbToken.connect(user1).transfer(user2.address, amount);
      
      const finalBalance = await btbToken.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amount);
    });

    it("Should approve and transferFrom", async function () {
      const amount = ethers.parseEther("100");
      const initialBalance = await btbToken.balanceOf(user2.address);
      await btbToken.connect(user1).approve(user2.address, amount);
      await btbToken.connect(user2).transferFrom(user1.address, user2.address, amount);
      
      const finalBalance = await btbToken.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amount);
    });
  });

  describe("Upgradeable", function () {
    it("Should allow owner to upgrade", async function () {
      const MockERC20V2Factory = await ethers.getContractFactory("MockERC20");
      await expect(
        upgrades.upgradeProxy(await btbToken.getAddress(), MockERC20V2Factory)
      ).to.not.be.reverted;
    });

    it("Should not allow non-owner to upgrade", async function () {
      const MockERC20V2Factory = await ethers.getContractFactory("MockERC20", user1);
      await expect(
        upgrades.upgradeProxy(await btbToken.getAddress(), MockERC20V2Factory)
      ).to.be.reverted;
    });
  });
});
