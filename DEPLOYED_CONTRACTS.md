# Deployed Contracts (Optimistic Sepolia)

This document contains information about the deployed smart contracts on the Optimistic Sepolia testnet.

## Proxy Contracts (Use these addresses for interactions)

These are the main contract addresses you should use when interacting with the protocol:

- **BTB Token (ERC20)**: `0x4C2A13eFCD62D9FE2c775c8c768Ee59bAD3eac67`
- **MockPositionManager**: `0x1a14eFAB6b50D9d701512207b7b83387F2F12dd3`
- **BTBFinanceFull**: `0x9F97beE160A60Bb8ddc59152c9bE04c7865BD37a`

## Implementation Contracts

These are the implementation contracts behind the proxies. You don't need to interact with these directly:

- **BTB Token Implementation**: `0x5C0ecd60e573D7790d12b792650c162B38B74F4c`
- **MockPositionManager Implementation**: `0xEFBd6f522c095e4B18102083fc6eDBB5420b3751`
- **BTBFinanceFull Implementation**: `0x3D50Aa0C307bB4d437b19BC0C5F32b06F867304F`

## Verified Contracts

The following contracts have been verified on Optimistic Sepolia Etherscan:

- [MockPositionManager Implementation](https://sepolia-optimistic.etherscan.io/address/0xEFBd6f522c095e4B18102083fc6eDBB5420b3751#code)

## Notes

- All contracts are upgradeable using the UUPS proxy pattern
- The proxy admin is the deployer account
- Contract verification for BTB Token and BTBFinanceFull implementations had some issues but the contracts are fully functional
- Deployment date: December 19, 2024

## How to Use

1. When interacting with the protocol, always use the proxy addresses
2. The BTB Token has been pre-minted with 1,000,000 tokens to the deployer address
3. The MockPositionManager can be used to simulate Uniswap V3 positions
4. The BTBFinanceFull contract handles staking, voting, and IL protection mechanics
