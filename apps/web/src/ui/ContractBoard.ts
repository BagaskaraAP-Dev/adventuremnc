import { CONTRACTS, missionTarget } from '@adventuremnc/engine';
import type { CloudState, MissionState, PlayerPosition } from '@adventuremnc/shared';
export class ContractBoard {
  readonly panel = document.createElement('section');
  private tracker = document.createElement('div');
  private message = document.createElement('p');
  private list = document.createElement('div');
  private rendered = '';
  onAccept: ((id: MissionState['id']) => void) | undefined;
  constructor() {
    this.panel.className = 'contract-board';
    const title = document.createElement('h3');
    title.textContent = 'HABITAT BASE // CONTRACT BOARD';
    this.panel.append(title, this.message, this.list);
    this.tracker.className = 'mission-tracker';
    document.body.append(this.tracker);
  }
  render(state: CloudState | null, nearBase: boolean, busy: boolean, connection: string): void {
    const key = JSON.stringify([state?.credits, state?.security.level, state?.missions.map(m => [m.id, m.status]), nearBase, busy, connection]);
    if (key === this.rendered) return;
    this.rendered = key;
    this.message.textContent = `${state?.credits ?? 0} credits • ${connection}${state?.security.level ? ' • Clear security at the airlock' : ''}${nearBase ? '' : ' • Return to Habitat Base to accept'}`;
    this.list.replaceChildren();
    for (const contract of CONTRACTS) {
      const row = document.createElement('article');
      const description = document.createElement('p');
      const status = state?.missions.find(m => m.id === contract.id)?.status ?? 'available';
      description.textContent = `${contract.title} — ${contract.reward} credits [${status}]\n${contract.description} Risk: ${contract.risk}`;
      const button = document.createElement('button');
      button.textContent = 'Accept Contract';
      button.disabled = !state || state.security.level > 0 || !nearBase || busy || status === 'completed' || state.missions.some(m => m.status === 'active');
      button.onclick = () => this.onAccept?.(contract.id);
      row.append(description, button);
      this.list.append(row);
    }
  }
  track(mission: MissionState | undefined, position: PlayerPosition): void {
    if (!mission) { this.tracker.textContent = 'No active contract • Habitat terminal [T]'; return; }
    const definition = CONTRACTS.find(c => c.id === mission.id);
    const target = missionTarget(mission);
    this.tracker.textContent = `${definition?.title} • ${mission.status} • ${Math.max(0, Math.ceil((definition?.duration ?? 0) - mission.elapsed))}s remaining` +
      (target && mission.status === 'active' ? `\n${target.label} • ${Math.round(Math.hypot(position.x - target.x, position.z - target.z))}m • X ${target.x}, Z ${target.z} • ${mission.objective}/${definition?.objectives.length}` : '');
  }
}
