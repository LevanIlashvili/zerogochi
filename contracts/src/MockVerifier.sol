// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IERC7857DataVerifier,
    PreimageProofOutput,
    TransferValidityProofOutput
} from "./erc7857/interfaces/IERC7857DataVerifier.sol";

/// @title MockVerifier
/// @notice Hash-only ERC-7857 verifier. Treats each proof as a 32-byte
///         dataHash (the trivial path the upstream Verifier.sol also
///         supports). Used to ship the iNFT shape on 0G mainnet before
///         the real TEE attestation oracle is available. Replace by
///         pointing the Zerogochi contract at the real Verifier later.
contract MockVerifier is IERC7857DataVerifier {
    error InvalidProofLength();

    function verifyPreimage(bytes[] calldata _proofs)
        external
        pure
        returns (PreimageProofOutput[] memory out)
    {
        out = new PreimageProofOutput[](_proofs.length);
        for (uint256 i = 0; i < _proofs.length; i++) {
            if (_proofs[i].length != 32) revert InvalidProofLength();
            out[i] = PreimageProofOutput({
                dataHash: bytes32(_proofs[i]),
                isValid: true
            });
        }
    }

    function verifyTransferValidity(bytes[] calldata _proofs)
        external
        pure
        returns (TransferValidityProofOutput[] memory out)
    {
        // Not used in MVP — pets aren't transferable yet.
        out = new TransferValidityProofOutput[](_proofs.length);
    }
}
