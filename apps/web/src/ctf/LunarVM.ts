/**
 * Lunar Satellite Telemetry Virtual Machine (LunarVM)
 * Custom 4-round SPN (Substitution-Permutation Network) cryptographic challenge.
 */

// 8-bit non-linear substitution box
const SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);

// 16-byte Round subkeys
const ROUND_KEYS: Uint8Array[] = [
  new Uint8Array([0x3a, 0x5c, 0x71, 0x9e, 0x12, 0x44, 0x88, 0xbb, 0x23, 0x67, 0xab, 0xef, 0x01, 0x45, 0x89, 0xcd]),
  new Uint8Array([0x77, 0x19, 0x42, 0xa8, 0x53, 0xd1, 0x0f, 0x6b, 0x9c, 0x3e, 0x84, 0x2a, 0xfe, 0x61, 0xb5, 0x07]),
  new Uint8Array([0x91, 0x28, 0xfe, 0x43, 0x6a, 0x7c, 0x31, 0xd5, 0x82, 0x0b, 0x4e, 0xa9, 0x15, 0xec, 0x64, 0x3d]),
  new Uint8Array([0x4f, 0xb2, 0x06, 0x8d, 0xca, 0x39, 0x97, 0x1e, 0x58, 0xe1, 0x2c, 0x70, 0xb4, 0x63, 0xad, 0x5a]),
];

// Target 16-byte signature after 4 SPN rounds
const TARGET_SIGNATURE = new Uint8Array([
  0x30, 0x36, 0x3e, 0x34, 0xe1, 0x02, 0xec, 0xe5, 0x0f, 0xbf, 0xc9, 0x7f, 0x1d, 0x70, 0xa7, 0x7a,
]);

// Encrypted 51-byte flag payload (Never plaintext in bundle)
const CIPHERTEXT = new Uint8Array([
  249, 166, 40, 12, 180, 41, 42, 236, 128, 53, 68, 252, 212, 92, 251, 212,
  49, 114, 173, 23, 10, 142, 194, 29, 99, 128, 43, 138, 231, 73, 249, 234,
  6, 75, 2, 91, 215, 189, 210, 47, 229, 221, 103, 231, 79, 25, 59, 225, 192, 235, 146,
]);

export interface VmExecutionResult {
  valid: boolean;
  roundsPassed: number;
  outputSignature?: string;
  flag?: string;
  error?: string;
}

export class LunarVM {
  public static readonly CIPHERTEXT_HEX =
    'f9a6280cb4292aec803544fcd45cfbd43172ad170a8ec21d63802b8ae749f9ea064b025bd7bdd22fe5dd67e74f193be1c0eb92';

  /**
   * Linear bitwise diffusion layer: Rotates byte left by 3 and mixes with neighbor indices
   */
  private static diffuse(block: Uint8Array): Uint8Array {
    const res = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      const b = block[i] ?? 0;
      const bRot = ((b << 3) | (b >> 5)) & 0xff;
      const next1 = block[(i + 1) % 16] ?? 0;
      const next5 = block[(i + 5) % 16] ?? 0;
      res[i] = bRot ^ next1 ^ next5;
    }
    return res;
  }

  /**
   * Runs the 4-round SPN verification cipher on candidate key
   */
  public static transform(inputBytes: Uint8Array): Uint8Array {
    let state = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      state[i] = inputBytes[i] ?? 0;
    }

    for (let r = 0; r < 4; r++) {
      const rk = ROUND_KEYS[r]!;
      for (let i = 0; i < 16; i++) {
        state[i] = (state[i]! ^ rk[i]!);
        state[i] = SBOX[state[i]!]!;
      }
      const diffused = this.diffuse(state);
      for (let i = 0; i < 16; i++) {
        state[i] = diffused[i] ?? 0;
      }
    }
    return state;
  }

  /**
   * Attempts decryption using Web Crypto API SHA-256 counter mode keystream
   */
  public static async decryptPayload(keyBytes: Uint8Array): Promise<string> {
    const keystream: number[] = [];
    let counter = 0;

    while (keystream.length < CIPHERTEXT.length) {
      const counterBytes = new Uint8Array(4);
      counterBytes[0] = (counter >> 24) & 0xff;
      counterBytes[1] = (counter >> 16) & 0xff;
      counterBytes[2] = (counter >> 8) & 0xff;
      counterBytes[3] = counter & 0xff;

      const combined = new Uint8Array(keyBytes.length + 4);
      combined.set(keyBytes, 0);
      combined.set(counterBytes, keyBytes.length);

      const hashBuf = await crypto.subtle.digest('SHA-256', combined);
      const hashBytes = new Uint8Array(hashBuf);

      for (let i = 0; i < hashBytes.length && keystream.length < CIPHERTEXT.length; i++) {
        keystream.push(hashBytes[i]!);
      }
      counter++;
    }

    const plaintextBytes = new Uint8Array(CIPHERTEXT.length);
    for (let i = 0; i < CIPHERTEXT.length; i++) {
      plaintextBytes[i] = CIPHERTEXT[i]! ^ keystream[i]!;
    }

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(plaintextBytes);
  }

  /**
   * Main VM verification entry point
   */
  public static async execute(candidateKey: string): Promise<VmExecutionResult> {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(candidateKey.trim());

    if (keyBytes.length !== 16) {
      return {
        valid: false,
        roundsPassed: 0,
        error: `INVALID KEY LENGTH: Expected exactly 16 ASCII bytes, received ${keyBytes.length} bytes.`,
      };
    }

    const computedSignature = this.transform(keyBytes);
    let matched = true;
    for (let i = 0; i < 16; i++) {
      if (computedSignature[i] !== TARGET_SIGNATURE[i]) {
        matched = false;
        break;
      }
    }

    const hexSig = Array.from(computedSignature)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');

    if (!matched) {
      return {
        valid: false,
        roundsPassed: 0,
        outputSignature: hexSig,
        error: `SIGNATURE MISMATCH: Computed [${hexSig}] does not match target.`,
      };
    }

    // Signature matches, decrypt payload
    const decryptedFlag = await this.decryptPayload(keyBytes);
    if (
      decryptedFlag.charCodeAt(0) !== 0x4b ||
      decryptedFlag.charCodeAt(1) !== 0x54 ||
      decryptedFlag.charCodeAt(2) !== 0x43 ||
      decryptedFlag.charCodeAt(3) !== 0x47 ||
      decryptedFlag.charCodeAt(4) !== 0x7b
    ) {
      return {
        valid: false,
        roundsPassed: 4,
        error: 'DECRYPTION INTEGRITY CHECK FAILED: Header mismatch.',
      };
    }

    return {
      valid: true,
      roundsPassed: 4,
      outputSignature: hexSig,
      flag: decryptedFlag,
    };
  }

  /**
   * Disassembly / telemetry inspection method for CTF reversers in DevTools
   */
  public static dump(): Record<string, unknown> {
    return {
      architecture: 'MNC-SPN-16 Bytecode Virtual Machine',
      blockSize: '16 bytes (128-bit)',
      rounds: 4,
      targetSignature: Array.from(TARGET_SIGNATURE).map((b) => b.toString(16).padStart(2, '0')).join(' '),
      sbox: Array.from(SBOX),
      roundKeys: ROUND_KEYS.map((rk) => Array.from(rk).map((b) => b.toString(16).padStart(2, '0')).join(' ')),
      ciphertextHex: this.CIPHERTEXT_HEX,
      usage: 'MNC.vm.execute("16_BYTE_KEY_HERE")',
    };
  }
}
