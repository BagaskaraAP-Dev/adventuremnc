import { describe, it, expect } from 'vitest';
import { LunarVM } from './LunarVM';

describe('LunarVM Cryptographic Challenge', () => {
  it('should reject keys with length not equal to 16', async () => {
    const resShort = await LunarVM.execute('TOO_SHORT');
    expect(resShort.valid).toBe(false);
    expect(resShort.error).toContain('INVALID KEY LENGTH');

    const resLong = await LunarVM.execute('THIS_KEY_IS_WAY_TOO_LONG_FOR_THE_CIPHER');
    expect(resLong.valid).toBe(false);
    expect(resLong.error).toContain('INVALID KEY LENGTH');
  });

  it('should reject incorrect 16-byte keys that do not match the SPN signature', async () => {
    const resWrong = await LunarVM.execute('1234567890ABCDEF');
    expect(resWrong.valid).toBe(false);
    expect(resWrong.error).toContain('SIGNATURE MISMATCH');
  });

  it('should verify the correct key and decrypt the exact target flag', async () => {
    const correctKey = 'MNC_LUNAR_2091_X';
    const res = await LunarVM.execute(correctKey);

    expect(res.valid).toBe(true);
    expect(res.roundsPassed).toBe(4);
    expect(res.outputSignature).toBe('30 36 3e 34 e1 02 ec e5 0f bf c9 7f 1d 70 a7 7a');
    expect(res.flag).toBe('KTCG{M00nc2ust_l3v3l_b494sB3Rc4nd4_BagaskaraAP-Dev}');
  });

  it('should dump valid architecture specifications for reversers', () => {
    const dump = LunarVM.dump();
    expect(dump['architecture']).toBe('MNC-SPN-16 Bytecode Virtual Machine');
    expect(dump['blockSize']).toBe('16 bytes (128-bit)');
    expect(dump['rounds']).toBe(4);
    expect(dump['targetSignature']).toBe('30 36 3e 34 e1 02 ec e5 0f bf c9 7f 1d 70 a7 7a');
    expect(dump['ciphertextHex']).toBe(LunarVM.CIPHERTEXT_HEX);
  });
});
