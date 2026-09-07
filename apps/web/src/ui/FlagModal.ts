export class FlagModal {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private currentFlag: string = '';

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'ctf-flag-modal';
    this.container.className = 'ctf-modal-overlay';
    this.container.style.display = 'none';

    this.container.innerHTML = `
      <div class="ctf-modal-card">
        <div class="ctf-modal-badge">🚩 MISSION ACCOMPLISHED // CTF SOLVED</div>
        <h2 class="ctf-modal-title">FLAG CAPTURED!</h2>
        <p class="ctf-modal-desc">Selamat! Kunci enkripsi telemetry satelit Bulan berhasil didekripsi:</p>
        
        <div class="ctf-flag-box">
          <code id="ctf-flag-text">-- DECRYPTING --</code>
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
        if (navigator.clipboard && this.currentFlag) {
          navigator.clipboard
            .writeText(this.currentFlag)
            .then(() => {
              copyBtn.textContent = 'COPIED! ✓';
              copyBtn.style.background = '#28a745';
              setTimeout(() => {
                copyBtn.textContent = 'COPY';
                copyBtn.style.background = '';
              }, 2000);
            })
            .catch(() => {
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
  }

  public show(flag: string): void {
    this.currentFlag = flag;
    const flagText = document.getElementById('ctf-flag-text');
    if (flagText) {
      flagText.textContent = flag;
    }
    this.isVisible = true;
    this.container.style.display = 'flex';
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  public isOpen(): boolean {
    return this.isVisible;
  }
}
