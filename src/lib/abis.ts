/// Minimal ABIs the mini-app needs to encode calldata + read state.
/// Keep in sync with backend/src/ethers/abis.ts.

export const FORWARDER_ABI = [
  "function nonces(address owner) view returns (uint256)",
] as const;

export const ZEROGOCHI_ABI = [
  "function mintPet(bytes[] proofs, string[] dataDescriptions, uint8 visualSeed, uint8 hungerDecayRate, uint8 moodDecayRate, uint8 energyDecayRate) external payable returns (uint256)",
  "function feed(uint256 tokenId)",
  "function play(uint256 tokenId)",
  "function logSpoke(uint256 tokenId, bytes32 dialogueHash)",
  "function statsOf(uint256 tokenId) view returns (uint8 hunger, uint8 mood, uint8 energy, bool isDead)",
  "function petOf(address who) view returns (uint256 tokenId, bool exists)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function dataHashesOf(uint256 tokenId) view returns (bytes32[])",
  "function ownerOf(uint256 tokenId) view returns (address)",
] as const;
