import {
  AudioUtils,
  Color,
  createSystem,
  Entity,
  Mesh,
  MeshStandardMaterial,
  Pressed,
  UIKit,
  UIKitMLAsset,
} from '@iwsdk/core';
import { Firefly, RoomloomState } from './roomloom-component.js';

const PLAYING = 1;
const COMPLETE = 2;
const FIREFLY_BASE_Y = [1.12, 1.35, 0.98] as const;
const FIREFLY_BASE_SCALE = 1.15;

export class RoomloomSystem extends createSystem({
  state: { required: [RoomloomState] },
  fireflies: { required: [Firefly] },
  selectedFireflies: { required: [Firefly, Pressed] },
}) {
  private stateEntity: Entity | null = null;
  private panel: UIKitMLAsset | null = null;
  private progressText: UIKit.Text | null = null;
  private hintText: UIKit.Text | null = null;
  private storyText: UIKit.Text | null = null;
  private startLabel: UIKit.Text | null = null;
  private contrastLabel: UIKit.Text | null = null;
  private progressCard: { setProperties(properties: { backgroundColor: string }): void } | null = null;

  init(): void {
    this.stateEntity = this.queries.state.entities.values().next().value ?? null;
    this.panel = this.world.requireSceneObject<UIKitMLAsset>('roomloom-panel');
    this.progressText = this.panel.requireElementById<UIKit.Text>('ProgressText');
    this.hintText = this.panel.requireElementById<UIKit.Text>('HintText');
    this.storyText = this.panel.requireElementById<UIKit.Text>('StoryText');
    this.startLabel = this.panel.requireElementById<UIKit.Text>('StartLabel');
    this.contrastLabel = this.panel.requireElementById<UIKit.Text>('ContrastLabel');
    this.progressCard = this.panel.requireElementById('ProgressCard');
    const startButton = this.panel.requireElementById('StartButton');
    const contrastButton = this.panel.requireElementById('ContrastButton');

    startButton.name = 'RoomloomStartButton';
    contrastButton.name = 'RoomloomContrastButton';
    this.progressText.name = 'RoomloomProgressText';

    const start = () => this.startRound();
    const toggleContrast = () => this.toggleContrast();
    startButton.addEventListener('click', start);
    contrastButton.addEventListener('click', toggleContrast);

    const stopSelected = this.queries.selectedFireflies.subscribe('qualify', (entity) => {
      this.capture(entity);
    });
    this.cleanupFuncs.push(
      () => startButton.removeEventListener('click', start),
      () => contrastButton.removeEventListener('click', toggleContrast),
      stopSelected,
    );
    this.startRound();
  }

  update(_delta: number, time: number): void {
    if (this.stateEntity?.getValue(RoomloomState, 'phase') !== PLAYING) return;
    for (const entity of this.queries.fireflies.entities) {
      if (entity.getValue(Firefly, 'captured') || entity.object3D == null) continue;
      const index = entity.getValue(Firefly, 'index') ?? 0;
      const originY = FIREFLY_BASE_Y[index] ?? FIREFLY_BASE_Y[0];
      entity.object3D.position.y = originY + Math.sin(time * 2.1 + index * 1.7) * 0.035;
      entity.object3D.rotation.y = time * (0.35 + index * 0.05);
      const pulse = FIREFLY_BASE_SCALE * (1 + Math.sin(time * 3.4 + index) * 0.08);
      entity.object3D.scale.setScalar(pulse);
    }
  }

  private startRound(): void {
    if (this.stateEntity == null) return;
    this.stateEntity.setValue(RoomloomState, 'phase', PLAYING);
    this.stateEntity.setValue(RoomloomState, 'found', 0);
    this.stateEntity.setValue(RoomloomState, 'complete', false);
    for (const entity of this.queries.fireflies.entities) {
      entity.setValue(Firefly, 'captured', false);
      if (entity.object3D != null) {
        entity.object3D.visible = true;
        entity.object3D.scale.setScalar(FIREFLY_BASE_SCALE);
      }
    }
    const garden = this.stateEntity.object3D;
    for (let i = 1; i <= 3; i += 1) {
      const growth = garden?.getObjectByName(`Growth_${i}`);
      if (growth != null) growth.visible = false;
    }
    this.startLabel?.setProperties({ text: 'Garden in progress' });
    this.storyText?.setProperties({ text: 'The lights answer your attention. Find all three around the garden.' });
    this.progressText?.setProperties({ text: '0 / 3 lights guided home' });
    this.hintText?.setProperties({ text: 'Look at a glowing light and pinch. Large targets support limited reach.' });
    this.progressCard?.setProperties({ backgroundColor: '#19362e' });
  }

  private capture(entity: Entity): void {
    if (
      this.stateEntity == null ||
      this.stateEntity.getValue(RoomloomState, 'phase') !== PLAYING ||
      entity.getValue(Firefly, 'captured')
    ) return;

    entity.setValue(Firefly, 'captured', true);
    if (entity.object3D != null) entity.object3D.visible = false;
    AudioUtils.play(entity);

    const found = Math.min(
      (this.stateEntity.getValue(RoomloomState, 'found') ?? 0) + 1,
      this.stateEntity.getValue(RoomloomState, 'total') ?? 3,
    );
    this.stateEntity.setValue(RoomloomState, 'found', found);
    const growth = this.stateEntity.object3D?.getObjectByName(`Growth_${found}`);
    if (growth != null) growth.visible = true;

    if (found >= 3) {
      this.completeRound();
      return;
    }
    this.progressText?.setProperties({ text: `${found} / 3 lights guided home` });
    this.hintText?.setProperties({ text: `${3 - found} still hiding. Follow the warm pulse.` });
  }

  private completeRound(): void {
    if (this.stateEntity == null) return;
    this.stateEntity.setValue(RoomloomState, 'phase', COMPLETE);
    this.stateEntity.setValue(RoomloomState, 'complete', true);
    const streak = this.recordDailyVisit();
    this.storyText?.setProperties({ text: 'The garden remembers your room. A new seed will be waiting tomorrow.' });
    this.progressText?.setProperties({ text: 'Garden awake' });
    this.hintText?.setProperties({ text: `${streak}-day lightkeeping streak. Come back tomorrow to grow a new species.` });
    this.startLabel?.setProperties({ text: 'Play again' });
    this.progressCard?.setProperties({ backgroundColor: '#6a4d12' });
  }

  private toggleContrast(): void {
    if (this.stateEntity == null) return;
    const enabled = !this.stateEntity.getValue(RoomloomState, 'highContrast');
    this.stateEntity.setValue(RoomloomState, 'highContrast', enabled);
    this.contrastLabel?.setProperties({ text: enabled ? 'Standard color' : 'High contrast' });
    this.progressCard?.setProperties({ backgroundColor: enabled ? '#003b4d' : '#19362e' });
    for (const entity of this.queries.fireflies.entities) {
      entity.object3D?.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material instanceof MeshStandardMaterial) {
            material.emissive = new Color(enabled ? 0x5ee7ff : 0xffcb51);
            material.emissiveIntensity = enabled ? 5.2 : 3.4;
          }
        }
      });
    }
  }

  private readStreak(): number {
    try {
      return Number.parseInt(window.localStorage.getItem('roomloom.streak') ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  private recordDailyVisit(): number {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const previousDay = window.localStorage.getItem('roomloom.lastVisit');
      const previousStreak = this.readStreak();
      const streak = previousDay === today ? Math.max(previousStreak, 1) : previousStreak + 1;
      window.localStorage.setItem('roomloom.lastVisit', today);
      window.localStorage.setItem('roomloom.streak', String(streak));
      return streak;
    } catch {
      return 1;
    }
  }
}
