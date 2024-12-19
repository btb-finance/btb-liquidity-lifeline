# BTB Liquidity Lifeline

BTB Liquidity Lifeline is a smart contract protocol designed to enhance liquidity management for Uniswap V3 positions. It provides a streamlined solution for managing and optimizing liquidity positions while offering additional features for token holders.

## Features

- **Automated Liquidity Management**: Efficiently manage Uniswap V3 liquidity positions
- **BTB Token Integration**: Native token with governance and utility features
- **Position Manager**: Smart contract interface for handling liquidity positions
- **Upgradeable Architecture**: Uses UUPS proxy pattern for future improvements

## Deployed Contracts (Optimistic Sepolia)

### Proxy Contracts (Main Interaction Points)
- **BTB Token (ERC20)**: `0x4C2A13eFCD62D9FE2c775c8c768Ee59bAD3eac67`
- **MockPositionManager**: `0x1a14eFAB6b50D9d701512207b7b83387F2F12dd3`
- **BTBFinanceFull**: `0x9F97beE160A60Bb8ddc59152c9bE04c7865BD37a`

For a complete list of deployed contracts and their implementations, see [DEPLOYED_CONTRACTS.md](./DEPLOYED_CONTRACTS.md).

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Hardhat

### Installation

1. Clone the repository:
```bash
git clone https://github.com/btb-finance/btb-liquidity-lifeline.git
cd btb-liquidity-lifeline
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```env
PRIVATE_KEY=your_private_key
OPTIMISM_SEPOLIA_RPC_URL=your_rpc_url
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Building and Testing

Compile contracts:
```bash
npm run compile
```

Run tests:
```bash
npm run test
```

Deploy contracts:
```bash
npm run deploy
```

## Development

The project uses Hardhat as the development environment and includes:

- TypeScript support
- OpenZeppelin contracts for security and standardization
- Comprehensive test suite
- Deployment scripts
- Contract verification support

### Project Structure

- `contracts/`: Smart contract source files
- `scripts/`: Deployment and utility scripts
- `test/`: Test files
- `typechain-types/`: Generated TypeScript types

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Security

If you discover a security vulnerability, please send an email to [security contact email].

## Support

For support and questions, please [open an issue](https://github.com/btb-finance/btb-liquidity-lifeline/issues) on our GitHub repository.
