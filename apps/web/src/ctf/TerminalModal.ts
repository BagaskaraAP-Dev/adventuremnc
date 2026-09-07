import { LunarVM } from './LunarVM';

export class TerminalModal {
  private container: HTMLElement;
  private outputElement: HTMLElement;
  private inputElement: HTMLInputElement;
  private isVisible: boolean = false;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;

  public onFlagDecrypted?: (flag: string) => void;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'lunar-terminal-modal';
    this.container.className = 'term-modal-overlay';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="term-window">
        <div class="term-titlebar">
          <div class="term-titlebar-left">
            <span class="term-led"></span>
            <span class="term-title">MNC LUNAR TELEMETRY TERMINAL // SPN-16 CRYPTOPROCESSOR</span>
          </div>
          <div class="term-titlebar-right">
            <span class="term-shortcut-hint">[T] or [ESC]</span>
            <button id="term-close-btn" class="term-close-btn" title="Close Terminal">×</button>
          </div>
        </div>
        <div class="term-content" id="term-output"></div>
        <form id="term-form" class="term-input-line" autocomplete="off">
          <span class="term-prompt">operator@mooncrust-lunar:~$</span>
          <input
            type="text"
            id="term-input"
            class="term-input"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </form>
      </div>
    `;

    document.body.appendChild(this.container);

    this.outputElement = document.getElementById('term-output')!;
    this.inputElement = document.getElementById('term-input')! as HTMLInputElement;

    const form = document.getElementById('term-form')!;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = this.inputElement.value.trim();
      if (val.length > 0) {
        this.commandHistory.push(val);
        this.historyIndex = this.commandHistory.length;
        this.inputElement.value = '';
        void this.handleCommand(val);
      }
    });

    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.inputElement.value = this.commandHistory[this.historyIndex] ?? '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          this.inputElement.value = this.commandHistory[this.historyIndex] ?? '';
        } else {
          this.historyIndex = this.commandHistory.length;
          this.inputElement.value = '';
        }
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    const closeBtn = document.getElementById('term-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Print welcome banner
    this.printWelcome();
  }

  private printWelcome(): void {
    this.println('====================================================================', 'term-dim');
    this.println('  DEEP SPACE NETWORK • LUNAR RECON TELEMETRY TERMINAL v4.2', 'term-cyan');
    this.println('  SECURITY CLASSIFICATION: TOP SECRET // MNC CTF CHALLENGE', 'term-yellow');
    this.println('====================================================================', 'term-dim');
    this.println('Transponder carrier locked on 2.295 GHz. Payload encrypted with MNC-SPN-16.', 'term-text');
    this.println('Type "help" to list available commands, or "scan" to inspect telemetry signal.', 'term-green');
    this.println('');
  }

  public println(text: string, className = 'term-text'): void {
    const p = document.createElement('div');
    p.className = `term-line ${className}`;
    p.textContent = text;
    this.outputElement.appendChild(p);
    this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'flex';
    setTimeout(() => {
      this.inputElement.focus();
    }, 50);
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
    this.inputElement.blur();
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public async handleCommand(rawCmd: string): Promise<void> {
    this.println(`operator@mooncrust-lunar:~$ ${rawCmd}`, 'term-prompt-cmd');
    const parts = rawCmd.trim().split(/\s+/);
    const cmd = (parts[0] ?? '').toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case 'help':
        this.println('AVAILABLE TELEMETRY COMMANDS:', 'term-cyan');
        this.println('  scan            - Scan carrier wave and dump ciphertext & target signature', 'term-text');
        this.println('  status          - Display satellite link and cryptoprocessor telemetry status', 'term-text');
        this.println('  dump            - Disassemble MNC-SPN-16 cipher (S-Box, round keys, diffusion layer)', 'term-text');
        this.println('  decrypt <key>   - Submit 16-byte ASCII authorization key to decrypt telemetry', 'term-text');
        this.println('  clear           - Clear terminal window buffer', 'term-text');
        this.println('  exit            - Close terminal and resume lunar exploration', 'term-text');
        this.println('');
        this.println('NOTE: DevTools reversers can also analyze window.MNC.vm directly in F12 Console.', 'term-dim');
        break;

      case 'status':
        this.println('[STATUS] CARRIER LOCK: 99.8% (2.295 GHz S-band downlink)', 'term-green');
        this.println('[STATUS] TRANSPONDER: MNC-SAT-4 (Sector 04 Orbit, 89.9°S)', 'term-text');
        this.println('[STATUS] CIPHER ENGINE: MNC-SPN-16 128-bit 4-Round SPN', 'term-yellow');
        this.println('[STATUS] PAYLOAD SIZE: 51 bytes encrypted telemetry data', 'term-text');
        this.println('[STATUS] AUTH FORMAT: 16-byte ASCII key required', 'term-text');
        break;

      case 'scan':
        this.println('[SCAN] ANALYZING DOWNLINK STREAM...', 'term-cyan');
        this.println(`[SCAN] TARGET SIGNATURE (16 bytes):`, 'term-yellow');
        this.println('       30 36 3e 34 e1 02 ec e5 0f bf c9 7f 1d 70 a7 7a', 'term-green');
        this.println(`[SCAN] CIPHERTEXT STREAM (51 bytes):`, 'term-yellow');
        this.println(`       ${LunarVM.CIPHERTEXT_HEX}`, 'term-text');
        this.println('[SCAN] Invert the 4-round SPN cipher to recover the key, then run: decrypt <key>', 'term-dim');
        break;

      case 'dump': {
        const spec = LunarVM.dump();
        this.println('--- MNC-SPN-16 CRYPTOPROCESSOR SPECIFICATION ---', 'term-cyan');
        this.println(`Architecture: ${spec['architecture'] as string}`, 'term-text');
        this.println(`Block Size:   ${spec['blockSize'] as string}`, 'term-text');
        this.println(`Rounds:       ${spec['rounds'] as number}`, 'term-text');
        this.println(`Target Sig:   ${spec['targetSignature'] as string}`, 'term-green');
        this.println('S-Box:        AES/Rijndael standard non-linear 8-bit substitution', 'term-text');
        this.println('Diffusion:    res[i] = rotl8(b[i], 3) ^ b[(i+1)%16] ^ b[(i+5)%16]', 'term-text');
        this.println('Round Keys:', 'term-yellow');
        const keys = spec['roundKeys'] as string[];
        keys.forEach((k, idx) => {
          this.println(`  R${idx}: ${k}`, 'term-text');
        });
        this.println('Keystream:    SHA-256 counter mode keystream derived from verified key', 'term-text');
        break;
      }

      case 'decrypt': {
        if (!arg || arg.trim().length === 0) {
          this.println('[ERROR] Missing key parameter. Usage: decrypt <16-byte-key>', 'term-red');
          return;
        }
        this.println(`[VM] Executing 4-round SPN verification with key "${arg}"...`, 'term-cyan');
        const res = await LunarVM.execute(arg);
        if (!res.valid) {
          this.println(`[ERROR] ${res.error ?? 'Verification failed.'}`, 'term-red');
        } else {
          this.println('✓ [SUCCESS] 4/4 SPN ROUNDS MATCHED TARGET SIGNATURE!', 'term-green');
          this.println('✓ [SUCCESS] SHA-256 KEYSTREAM DERIVATION COMPLETE!', 'term-green');
          this.println(`✓ [SUCCESS] FLAG ACQUIRED: ${res.flag!}`, 'term-yellow');
          this.println('Launching secure telemetry modal...', 'term-cyan');
          this.hide();
          if (this.onFlagDecrypted) {
            this.onFlagDecrypted(res.flag!);
          }
        }
        break;
      }

      case 'clear':
        this.outputElement.innerHTML = '';
        break;

      case 'exit':
      case 'quit':
        this.hide();
        break;

      default:
        this.println(`[ERROR] Unknown command: "${cmd}". Type "help" for available commands.`, 'term-red');
        break;
    }
  }
}
