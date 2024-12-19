import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from "ethers";

// Fusion NFT Position Manager address on OP Sepolia
const FUSION_POSITION_MANAGER = "0x80466247E0e3d56F95E0B0572f9DE6991E2772D2";

describe("Real World Tests", function () {
  let btbToken: Contract;
  let btbFinance: Contract;
  let owner: any;
  let user1: any;
  let positionManager: Contract;

  before(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    user1 = signers[1];
    console.log("Using accounts:");
    console.log("Owner:", owner.address);
    console.log("User1:", user1.address);

    // Deploy BTB Token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    btbToken = await upgrades.deployProxy(
      MockERC20Factory,
      ["BTB Token", "BTB"],
      {
        initializer: 'initialize',
        kind: 'uups'
      }
    );
    await btbToken.waitForDeployment();
    console.log("BTB Token deployed to:", btbToken.address);

    // Connect to Fusion Position Manager
    positionManager = await ethers.getContractAt("contracts/interfaces/INonfungiblePositionManager.sol:INonfungiblePositionManager", FUSION_POSITION_MANAGER);
    console.log("Connected to Fusion Position Manager at:", FUSION_POSITION_MANAGER);

    // Deploy BTBFinance
    const BTBFinanceFactory = await ethers.getContractFactory("BTBFinanceFull");
    btbFinance = await upgrades.deployProxy(
      BTBFinanceFactory,
      [
        btbToken.address,
        owner.address, // Use owner as treasury
        owner.address, // Use owner as voter reward pool
        FUSION_POSITION_MANAGER
      ],
      {
        initializer: 'initialize',
        kind: 'uups'
      }
    );
    await btbFinance.waitForDeployment();
    console.log("BTBFinance deployed to:", btbFinance.address);

    // Mint initial tokens to users for testing
    const amount = ethers.parseEther("1000");
    await btbToken.transfer(user1.address, amount);
    console.log("Transferred", ethers.formatEther(amount), "BTB tokens to user1");
  });

  describe("Real World Position Management", function () {
    it("Should stake a real Fusion NFT position", async function () {
      // First, we need a real Fusion NFT. You'll need to create one through the Fusion UI
      // and input its tokenId here
      const tokenId = 123; // Replace with your actual NFT token ID

      try {
        // Check if we own the position
        const positionOwner = await positionManager.ownerOf(tokenId);
        console.log("Position owner:", positionOwner);
        expect(positionOwner).to.equal(user1.address);

        // Get position details
        const position = await positionManager.positions(tokenId);
        console.log("Position details:", {
          token0: position.token0,
          token1: position.token1,
          fee: position.fee,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: position.liquidity
        });

        // Approve BTBFinance to transfer the NFT
        await positionManager.connect(user1).approve(btbFinance.address, tokenId);
        console.log("Approved BTBFinance to transfer NFT");

        // Stake the position
        const initialToken0Amount = ethers.parseEther("1");
        const initialToken1Amount = ethers.parseEther("1");
        await btbFinance.connect(user1).stakePosition(tokenId, initialToken0Amount, initialToken1Amount);
        console.log("Staked position in BTBFinance");

        // Verify staking
        const stakedPosition = await btbFinance.stakedPositions(tokenId);
        expect(stakedPosition.owner).to.equal(user1.address);
        expect(stakedPosition.staked).to.be.true;
        console.log("Successfully verified staking");
      } catch (error) {
        console.error("Error:", error);
        throw error;
      }
    });
  });
});
