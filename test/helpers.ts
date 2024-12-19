import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  MockERC20,
  MockPositionManager,
  BTBFinanceFull
} from "../typechain-types";

export async function setupTest() {
  // Get signers
  const [owner, user1, user2, treasury, voterRewardPool] = await ethers.getSigners();

  // Deploy MockPositionManager
  const MockPositionManagerFactory = await ethers.getContractFactory("MockPositionManager");
  const positionManager = await upgrades.deployProxy(MockPositionManagerFactory, [], {
    initializer: 'initialize',
    kind: 'uups'
  });
  await positionManager.waitForDeployment();

  // Deploy BTB Token
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const btbToken = await upgrades.deployProxy(
    MockERC20Factory,
    ["BTB Token", "BTB"],
    {
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  await btbToken.waitForDeployment();

  // Deploy BTBFinanceFull
  const BTBFinanceFactory = await ethers.getContractFactory("BTBFinanceFull");
  const btbFinance = await upgrades.deployProxy(
    BTBFinanceFactory,
    [
      await btbToken.getAddress(),
      treasury.address,
      voterRewardPool.address,
      await positionManager.getAddress()
    ],
    {
      initializer: 'initialize',
      kind: 'uups'
    }
  );
  await btbFinance.waitForDeployment();

  // Mint initial tokens to users for testing
  const amount = ethers.parseEther("1000");
  await btbToken.transfer(user1.address, amount);
  await btbToken.transfer(user2.address, amount);

  return {
    btbToken,
    positionManager,
    btbFinance,
    owner,
    user1,
    user2,
    treasury,
    voterRewardPool
  };
}

export async function createAndApprovePosition(
  positionManager: MockPositionManager,
  btbFinance: BTBFinanceFull,
  tokenId: number,
  owner: SignerWithAddress
) {
  // Mint position
  await positionManager.mint(owner.address, tokenId);
  
  // Approve BTBFinance to transfer the position
  await positionManager.connect(owner).approve(btbFinance.address, tokenId);
  
  return tokenId;
}

export async function moveTimeForward(seconds: number) {
  await time.increase(seconds);
}
