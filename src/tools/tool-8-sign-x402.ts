import { ethers } from "ethers";
import { getSigner, logger } from "../providers/contract-provider.js";

export interface SignedPayload {
  payloadHash: string;
  signature: string;
  nonce: string;
  agentAddress: string;
  timestamp: number;
}

export async function signX402Payload(
  token: string,
  amount: bigint,
  recipient: string,
  nonce: string
): Promise<SignedPayload> {
  try {
    const signer = getSigner();
    const agentAddress = await signer.getAddress();

    const payloadHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "bytes32"],
      [token, amount, recipient, nonce]
    );

    const signature = await signer.signMessage(ethers.getBytes(payloadHash));

    logger.debug(`✅ X402 Payload Signed: ${signature.substring(0, 20)}...`);

    return {
      payloadHash,
      signature,
      nonce,
      agentAddress,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(`Failed to sign payload: ${error}`);
    throw error;
  }
}
