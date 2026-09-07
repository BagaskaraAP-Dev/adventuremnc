import {
  LUNAR_GRAVITY,
  REGOLITH_ALBEDO,
  SURFACE_TEMP_PSR,
  DAY_CYCLE_COMPRESSION,
} from '@adventuremnc/shared';

function initTelemetry(): void {
  const statusElement = document.querySelector<HTMLParagraphElement>('.note');
  if (statusElement) {
    statusElement.textContent = `Telemetry synced. Gravity: ${LUNAR_GRAVITY.toFixed(3)} m/s² | Albedo: ${REGOLITH_ALBEDO.toFixed(2)} | PSR Temp: ${SURFACE_TEMP_PSR}K | Cycle Compression: ${DAY_CYCLE_COMPRESSION.toFixed(1)}x`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTelemetry();
});
