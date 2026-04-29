// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC2771Forwarder} from "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/// @notice Thin wrapper around OpenZeppelin's audited ERC2771Forwarder so we
///         have a deployable artifact with a name we control. No customization.
///         Backend (relayer) submits ForwardRequest; user signs EIP-712 forward
///         request from their CloudStorage key. Contract sees user as _msgSender.
contract Forwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("Zerogochi Forwarder") {}
}
