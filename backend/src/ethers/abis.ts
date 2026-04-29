/// Minimal ABIs the backend needs. We only ABI-encode the functions and events
/// we actually call/listen to — the full ABIs live with the deployed artifacts.

export const FORWARDER_ABI = [
  'function execute((address from,address to,uint256 value,uint256 gas,uint48 deadline,bytes data,bytes signature) request) public payable returns (bool)',
  'function nonces(address owner) view returns (uint256)',
  'function eip712Domain() view returns (bytes1, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)',
] as const;

export const ZEROGOCHI_ABI = [
  'function mintPet(bytes[] proofs, string[] dataDescriptions, uint8 visualSeed, uint8 hungerDecayRate, uint8 moodDecayRate, uint8 energyDecayRate) external payable returns (uint256)',
  'function feed(uint256 tokenId)',
  'function play(uint256 tokenId)',
  'function logSpoke(uint256 tokenId, bytes32 dialogueHash)',
  'function statsOf(uint256 tokenId) view returns (uint8 hunger, uint8 mood, uint8 energy, bool isDead)',
  'function petOf(address who) view returns (uint256 tokenId, bool exists)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function dataHashesOf(uint256 tokenId) view returns (bytes32[])',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'event Born(uint256 indexed tokenId, address indexed owner, uint64 at, uint8 visualSeed)',
  'event Fed(uint256 indexed tokenId, uint64 at)',
  'event Played(uint256 indexed tokenId, uint64 at)',
  'event Spoke(uint256 indexed tokenId, uint64 at, bytes32 dialogueHash)',
  'event Died(uint256 indexed tokenId, uint64 at)',
] as const;
