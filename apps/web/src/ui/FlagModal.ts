export class FlagModal {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private static readonly FLAG = 'KTCG{M00nc2ust_l3v3l_b494sB3Rc4nd4_BagaskaraAP-Dev}';

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'ctf-flag-modal';
    this.container.className = 'ctf-modal-overlay';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="ctf-modal-card">
        <div class="ctf-modal-badge">🚩 MISSION ACCOMPLISHED // CTF SOLVED</div>
        <h2 class="ctf-modal-title">FLAG CAPTURED!</h2>
        <p class="ctf-modal-desc">Selamat! Kunci enkripsi telemetry satelit Bulan berhasil diekstrak:</p>
        
        <div class="ctf-flag-box">
          <code id="ctf-flag-text">${FlagModal.FLAG}</code>
          <button id="ctf-copy-btn" class="ctf-btn ctf-btn-copy" title="Copy to clipboard">COPY</button>
        </div>

        <div class="ctf-modal-actions">
          <button id="ctf-close-btn" class="ctf-btn ctf-btn-close">CONTINUE EXPLORING</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    const copyBtn = document.getElementById('ctf-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(FlagModal.FLAG).then(() => {
            copyBtn.textContent = 'COPIED! ✓';
            copyBtn.style.background = '#28a745';
            setTimeout(() => {
              copyBtn.textContent = 'COPY';
              copyBtn.style.background = '';
            }, 2000);
          }).catch(() => {
            copyBtn.textContent = 'COPIED!';
          });
        }
      });
    }

    const closeBtn = document.getElementById('ctf-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
      });
    }

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    this.registerConsoleCommand();
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'flex';
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  private registerConsoleCommand(): void {
    const trigger = () => {
      this.show();
      return `🚩 [CTF FLAG CAPTURED]\nFlag: ${FlagModal.FLAG}\nStatus: Popup displayed on game screen!`;
    };

    const winFn = function () {
      return trigger();
    };
    winFn.toString = () => trigger();

    try {
      Object.defineProperty(window, 'win', {
        get: () => {
          trigger();
          return winFn;
        },
        set: () => {},
        configurable: true,
      });
    } catch {
      (window as unknown as Record<string, unknown>)['win'] = winFn;
    }

    console.info(
      '%c[MNC-CTF] Satellite telemetry online. Type %cwin%c in console to capture flag.',
      'color: #64b5f6; font-family: monospace;',
      'color: #ffd700; font-weight: bold; background: #222; padding: 2px 6px; border-radius: 3px;',
      'color: #64b5f6; font-family: monospace;'
    );
  }
}
