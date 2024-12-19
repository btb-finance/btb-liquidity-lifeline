import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy mock Position Manager first
  const MockPositionManager = await ethers.getContractFactory("MockPositionManager");
  const mockPositionManager = await upgrades.deployProxy(MockPositionManager, [], { kind: 'uups' });
  await mockPositionManager.waitForDeployment();
  console.log("MockPositionManager proxy deployed to:", await mockPositionManager.getAddress());

  // Deploy mock BTB token
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const btbToken = await upgrades.deployProxy(MockERC20, ["BTB Token", "BTB"], { kind: 'uups' });
  await btbToken.waitForDeployment();
  console.log("BTB Token proxy deployed to:", await btbToken.getAddress());

  // Deploy the main contract
  const BTBFinance = await ethers.getContractFactory("BTBFinanceFull");
  const btbFinance = await upgrades.deployProxy(BTBFinance, [
    await btbToken.getAddress(),
    deployer.address,             // Treasury address
    deployer.address,             // Voter reward pool address
    await mockPositionManager.getAddress()  // Using our mock Position Manager
  ], { kind: 'uups' });
  
  await btbFinance.waitForDeployment();
  
  const contractAddress = await btbFinance.getAddress();
  console.log("BTBFinanceFull proxy deployed to:", contractAddress);

  // Get implementation addresses
  const mockPositionManagerImpl = await upgrades.erc1967.getImplementationAddress(await mockPositionManager.getAddress());
  const btbTokenImpl = await upgrades.erc1967.getImplementationAddress(await btbToken.getAddress());
  const btbFinanceImpl = await upgrades.erc1967.getImplementationAddress(contractAddress);

  console.log("\nImplementation addresses:");
  console.log("MockPositionManager implementation:", mockPositionManagerImpl);
  console.log("BTB Token implementation:", btbTokenImpl);
  console.log("BTBFinanceFull implementation:", btbFinanceImpl);

  // Verify implementations
  console.log("\nWaiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds for block confirmations

  console.log("\nVerifying contracts...");
  
  try {
    await run("verify:verify", {
      address: mockPositionManagerImpl,
      constructorArguments: []
    });
    console.log("MockPositionManager implementation verified successfully");
  } catch (error) {
    console.log("Error verifying MockPositionManager implementation:", error);
  }

  try {
    await run("verify:verify", {
      address: btbTokenImpl,
      constructorArguments: ["BTB Token", "BTB"]
    });
    console.log("BTB Token implementation verified successfully");
  } catch (error) {
    console.log("Error verifying BTB Token implementation:", error);
  }

  try {
    await run("verify:verify", {
      address: btbFinanceImpl,
      constructorArguments: [
        await btbToken.getAddress(),
        deployer.address,
        deployer.address,
        await mockPositionManager.getAddress()
      ]
    });
    console.log("BTBFinanceFull implementation verified successfully");
  } catch (error) {
    console.log("Error verifying BTBFinanceFull implementation:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
