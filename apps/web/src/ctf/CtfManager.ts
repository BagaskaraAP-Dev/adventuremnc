import { LunarVM } from './LunarVM';
import { TerminalModal } from './TerminalModal';
import { FlagModal } from '../ui/FlagModal';

export class CtfManager {
  public readonly terminal: TerminalModal;
  public readonly flagModal: FlagModal;

  constructor() {
    this.flagModal = new FlagModal();
    this.terminal = new TerminalModal();

    this.terminal.onFlagDecrypted = (flag: string) => {
      this.flagModal.show(flag);
    };

    this.registerDevToolsInterface();
    this.setupKeyBindings();
  }

  public isModalOpen(): boolean {
    return this.terminal.isOpen() || this.flagModal.isOpen();
  }

  public toggleTerminal(): void {
    if (this.flagModal.isOpen()) {
      this.flagModal.hide();
    }
    this.terminal.toggle();
  }

  private setupKeyBindings(): void {
    window.addEventListener('keydown', (e) => {
      // Toggle terminal on key 'T' or Backquote '~' if not typing in another input
      if ((e.code === 'KeyT' || e.code === 'Backquote') && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        this.toggleTerminal();
      }
    });
  }

  private registerDevToolsInterface(): void {
    const handleExecute = async (key: string): Promise<string> => {
      const res = await LunarVM.execute(key);
      if (res.valid && res.flag) {
        this.terminal.hide();
        this.flagModal.show(res.flag);
        return `🚩 [CTF FLAG CAPTURED]\nFlag: ${res.flag}\nStatus: Decryption successful! Popup displayed on game screen.`;
      }
      return `❌ [DECRYPTION FAILED] ${res.error ?? 'Invalid key.'}`;
    };

    const winFn = function (candidateKey?: unknown): unknown {
      if (typeof candidateKey === 'string' && candidateKey.trim().length > 0) {
        return handleExecute(candidateKey);
      }
      return [
        '🔒 [MNC-CTF ACCESS DENIED] Direct override disabled.',
        'The lunar telemetry stream is encrypted with a 128-bit SPN cipher.',
        'To solve this challenge:',
        '  1. Invert the 4-round SPN cipher (AddRoundKey -> SubBytes -> Diffuse) to find the 16-byte key.',
        '  2. Inspect MNC.dump() or press [T] in-game to open the SAT-COM Terminal.',
        '  3. Call win("16_BYTE_KEY") or MNC.execute("16_BYTE_KEY") once you calculate the key!',
        '',
        'Type MNC.help() for full cryptographic specifications.',
      ].join('\n');
    };

    winFn.toString = () => winFn() as string;

    try {
      Object.defineProperty(window, 'win', {
        get: () => winFn,
        set: () => {},
        configurable: true,
      });
    } catch {
      (window as unknown as Record<string, unknown>)['win'] = winFn;
    }

    const mncApi = {
      vm: LunarVM,
      terminal: this.terminal,
      execute: (key: string) => handleExecute(key),
      scan: () => {
        console.info(
          '%c[SCAN] TARGET 128-BIT SIGNATURE:\n%c30 36 3e 34 e1 02 ec e5 0f bf c9 7f 1d 70 a7 7a\n' +
            `%c[SCAN] CIPHERTEXT (51 bytes):\n%c${LunarVM.CIPHERTEXT_HEX}`,
          'color: #00f0ff; font-weight: bold;',
          'color: #ffd700; font-family: monospace;',
          'color: #00f0ff; font-weight: bold;',
          'color: #cfd8dc; font-family: monospace;'
        );
      },
      dump: () => {
        const d = LunarVM.dump();
        console.info('[MNC-SPN-16 CIPHER SPECIFICATIONS]', d);
        return d;
      },
      help: () => {
        console.info(
          '%c[MNC-CTF DEEP SPACE NETWORK REVERSING SUITE]\n' +
            '%cMNC.execute(key)   %c- Attempt SPN-16 verification and flag decryption\n' +
            '%cMNC.dump()         %c- Print S-Box, Round Keys, and Diffusion parameters\n' +
            '%cMNC.scan()         %c- Display target signature and ciphertext hex\n' +
            '%cMNC.terminal.show()%c- Open the in-game retro CRT terminal\n' +
            '%cwin("KEY")         %c- Direct key decryption invocation',
          'color: #00f0ff; font-weight: bold;',
          'color: #ffd700;',
          'color: #cfd8dc;',
          'color: #ffd700;',
          'color: #cfd8dc;',
          'color: #ffd700;',
          'color: #cfd8dc;',
          'color: #ffd700;',
          'color: #cfd8dc;',
          'color: #ffd700;',
          'color: #cfd8dc;'
        );
      },
    };

    (window as unknown as Record<string, unknown>)['MNC'] = mncApi;

    console.info(
      '%c🛰️ [LUNAR-DSN] ENCRYPTED TELEMETRY STREAM DETECTED\n' +
        '%cDownlink: 2.295 GHz | Transponder: MNC-SAT-4 | Status: LOCK [ENCRYPTED]\n' +
        'Telemetry Cipher: MNC-SPN-16 Custom Cryptographic Coprocessor\n' +
        'Press %c[T]%c in-game or inspect %cMNC%c in DevTools console for telemetry reversing tools.\n' +
        'Type %cMNC.help()%c for command list.',
      'color: #00f0ff; font-size: 13px; font-weight: bold;',
      'color: #cfd8dc;',
      'color: #ffd700; font-weight: bold; background: #222; padding: 1px 4px; border-radius: 2px;',
      'color: #cfd8dc;',
      'color: #ffd700; font-weight: bold; background: #222; padding: 1px 4px; border-radius: 2px;',
      'color: #cfd8dc;',
      'color: #00f0ff; font-weight: bold;',
      'color: #cfd8dc;'
    );
  }
}
