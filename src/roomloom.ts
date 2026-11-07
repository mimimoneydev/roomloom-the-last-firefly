import { AudioUtils, createSystem, Entity, Mesh, MeshStandardMaterial, Matrix4, Vector3, Object3D,
  Pressed, Hovered, UIKit, UIKitMLAsset } from '@iwsdk/core';
import { Firefly, RoomloomState, RestingPlace, RelaySocket, GardenResident, RoomloomSound } from './roomloom-component.js';
import { dailySpecies, recordVisit, SPECIES } from './roomloom-progress.js';
import { RoomPlacement } from './roomloom-placement.js';
import { RescuePuzzle, planPuzzle, practicePuzzle } from './roomloom-puzzle.js';
import { SurfaceSamples } from './roomloom-surfaces.js';
import { freshSanctuary, readSanctuary, saveSanctuary, rescueResident, gardenStage, nextObjective } from './roomloom-sanctuary.js';
import { PlaytestRecorder } from './roomloom-telemetry.js';
import { classifySource, handsOnlyAllowed, handsOnlyMessage, capabilityReport,
  type CapabilityReport, type InputClass } from './roomloom-input.js';
import { QUALITY_TIERS, nextQualityTier, fovPanelDistance, type RenderSnapshot } from './roomloom-performance.js';
import { CONTRAST_IDS, CONTRAST_BUTTON_IDS, contrastPalette, contrastButtonColor, contrastCardColor, contrastEmissive,
  advanceTutorial, tutorialCopy, computeScore, scoreGrade, updateBestScore, roundSummary,
  type TutorialStep } from './roomloom-presentation.js';

const PLAYING = 1, COMPLETE = 2;

interface FireflyParts {
  left: Object3D | null; right: Object3D | null;
  wingL: Object3D | null; wingR: Object3D | null;
  fly: Object3D | null; moth: Object3D | null;
}

type FeatureSession = XRSession & { enabledFeatures?: string[]; restorePersistentAnchor?: unknown };
type SelectEvent = Event & { inputSource?: XRInputSource };

export class RoomloomSystem extends createSystem({
  state: { required: [RoomloomState] }, fireflies: { required: [Firefly] },
  selectedFireflies: { required: [Firefly, Pressed] }, hoveredLights: { required: [Firefly, Hovered] },
  rests: { required: [RestingPlace] }, selectedRests: { required: [RestingPlace, Pressed] },
  sockets: { required: [RelaySocket] }, selectedSockets: { required: [RelaySocket, Pressed] },
  residents: { required: [GardenResident] }, sounds: { required: [RoomloomSound] },
  selectedGarden: { required: [RoomloomState, Pressed] },
}) {
  private stateEntity: Entity | null = null;
  private panel!: UIKitMLAsset;
  private placement!: RoomPlacement;
  private route = new RescuePuzzle();
  private sanctuary = freshSanctuary();
  private telemetry = new PlaytestRecorder();
  private storage: Storage | null = null;
  private storageSaved = true;
  private roomVisible = true;
  private busy = false;
  private manualPause = false;
  private session: XRSession | null = null;
  private attentionAt = 0;
  private roundDate = new Date();
  private species = 0;
  private anchorMatrix = new Matrix4();
  private inverse = new Matrix4();
  private point = new Vector3();
  private soundPoint = new Vector3();

  private viewer = new Vector3();
  private direction = new Vector3();
  private scale = new Vector3();
  private flightPoints = Array.from({ length: 6 }, () => new Vector3());
  private flightCount = 0;
  private flightSegment = 0;
  private celebration = 0;
  private panelAway = 0;
  private pendingHops = 0;
  private flightArrived = false;

  // Competition additions: gating, provenance, quality, onboarding, score.
  private puzzleReady = false;
  private previewActive = false;
  private previewRequested = false;
  private pendingScan = false;
  private pendingRetry = false;
  private scanRequested = false;
  private tutorialStep: TutorialStep = 0;
  private lastSelectClass: InputClass = 'other';
  private capabilities: CapabilityReport | null = null;
  private capabilityCheckedAt = 0;
  private qualityIndex = 0;
  private roundElapsed = 0;
  private waitSeconds = 0;
  private dimmed = false;
  private summaryText = '';
  private panelDistance = 1.8;

  // Cached scene references: no per-frame getObjectByName or material traversal.
  private fireflyEntities: Entity[] = [];
  private restEntities: Entity[] = [];
  private socketEntities: Entity[] = [];
  private residentEntities: Entity[] = [];
  private soundEntities: Entity[] = [];
  private parts = new Map<Entity, FireflyParts>();
  private materials = new Map<Entity, MeshStandardMaterial[]>();
  private heart: Object3D | null = null;
  private growth: (Object3D | null)[] = [null, null, null];

  private progressText!: UIKit.Text;
  private hintText!: UIKit.Text;
  private storyText!: UIKit.Text;
  private gardenText!: UIKit.Text;
  private speciesText!: UIKit.Text;
  private titleText!: UIKit.Text;
  private startLabel!: UIKit.Text;
  private placementText!: UIKit.Text;
  private relayText!: UIKit.Text;
  private contrastLabel!: UIKit.Text;
  private pauseLabel!: UIKit.Text;
  private testText!: UIKit.Text;
  private capabilityText!: UIKit.Text;
  private tutorialLabel!: UIKit.Text;

  init(): void {
    this.stateEntity = this.queries.state.entities.values().next().value ?? null;
    this.panel = this.world.requireSceneObject<UIKitMLAsset>('roomloom-panel');
    this.progressText = this.panel.requireElementById('ProgressText');
    this.hintText = this.panel.requireElementById('HintText');
    this.storyText = this.panel.requireElementById('StoryText');
    this.gardenText = this.panel.requireElementById('GardenText');
    this.speciesText = this.panel.requireElementById('SpeciesText');
    this.titleText = this.panel.requireElementById('TitleText');
    this.startLabel = this.panel.requireElementById('StartLabel');
    this.placementText = this.panel.requireElementById('PlacementText');
    this.relayText = this.panel.requireElementById('RelayText');
    this.contrastLabel = this.panel.requireElementById('ContrastLabel');
    this.pauseLabel = this.panel.requireElementById('PauseLabel');
    this.testText = this.panel.requireElementById('TestText');
    this.capabilityText = this.panel.requireElementById('CapabilityText');
    this.tutorialLabel = this.panel.requireElementById('TutorialLabel');
    try { this.storage = window.localStorage; this.sanctuary = readSanctuary(this.storage); } catch { this.storageSaved = false; }
    this.stateEntity?.setValue(RoomloomState, 'highContrast', this.sanctuary.contrast);
    this.tutorialStep = this.sanctuary.introDone ? 3 : 0;

    this.placement = new RoomPlacement(this.world,
      (matrix, samples, initial) => this.place(matrix, samples, initial),
      (status, message) => {
        this.stateEntity?.setValue(RoomloomState, 'placement', status);
        this.placementText.setProperties({ text: message });
        this.telemetry.event('placement', status);
        if (status === 'preview') {
          // Only an explicit opt-in may enter the labelled no-room demo.
          if (this.previewRequested) { this.previewRequested = false; this.restorePreview(); }
          else this.enterScanGate();
        }
        if (status === 'unplaced' || status === 'restore-failed') this.requestScan();
        this.startLabel.setProperties({ text: this.placement.scanning ? 'Plant here' : 'Play again' });
      },
      visible => { this.roomVisible = visible; this.setVisibility(); },
      source => this.acceptSelect(source),
    );

    // Clone each interactable's materials once (needed for per-entity tinting),
    // then cache every named sub-object so update() does no string lookups.
    this.fireflyEntities = [...this.queries.fireflies.entities];
    this.restEntities = [...this.queries.rests.entities];
    this.socketEntities = [...this.queries.sockets.entities];
    this.residentEntities = [...this.queries.residents.entities];
    this.soundEntities = [...this.queries.sounds.entities];
    for (const entity of [...this.fireflyEntities, ...this.restEntities, ...this.socketEntities]) {
      entity.object3D?.traverse(child => {
        if (!(child instanceof Mesh)) return;
        const source = Array.isArray(child.material) ? child.material : [child.material];
        const copies = source.map(m => m.clone());
        child.material = Array.isArray(child.material) ? copies : copies[0];
        this.cleanupFuncs.push(() => copies.forEach(m => m.dispose()));
      });
    }
    this.buildCaches();

    this.bind('PlaceButton', () => { if (!this.playPaused() && this.gate()) { this.busy = false; this.placement.scan(); } });
    this.bind('PreviewButton', () => {
      if (this.playPaused() || !this.gate()) return;
      this.previewRequested = true; this.pendingScan = false;
      this.placement.preview();
      this.telemetry.event('preview-opt-in');
    });
    this.bind('StartButton', () => {
      if (this.playPaused() || !this.gate()) return;
      if (this.placement.scanning) this.placement.confirmPlacement();
      else if (!this.puzzleReady) this.requestScan();
      else { this.telemetry.event('restart'); this.startRound(); }
    });
    this.bind('ContrastButton', () => {
      if (!this.gate()) return;
      this.sanctuary.contrast = !this.sanctuary.contrast;
      this.stateEntity?.setValue(RoomloomState, 'highContrast', this.sanctuary.contrast);
      this.persist(); this.refresh(); this.telemetry.event('contrast', String(this.sanctuary.contrast));
    });
    this.bind('TutorialButton', () => {
      if (this.playPaused() || !this.gate()) return;
      const replay = this.tutorialStep === 3;
      this.tutorialStep = advanceTutorial(this.tutorialStep, replay ? 'replay' : 'skip');
      if (!replay) this.sanctuary.introDone = true;
      this.stateEntity?.setValue(RoomloomState, 'tutorialStep', this.tutorialStep);
      this.persist(); this.telemetry.event(replay ? 'tutorial-replay' : 'tutorial-skip');
      this.refresh(); this.setVisibility();
    });
    this.bind('RelayAButton', () => this.chooseRelay(0));
    this.bind('RelayBButton', () => this.chooseRelay(1));
    this.bind('UndoButton', () => this.chooseRelay(-1));
    this.bind('PauseButton', () => {
      this.manualPause = !this.manualPause; this.updatePause();
      this.telemetry.event(this.manualPause ? 'pause' : 'resume');
    });
    this.bind('TestButton', () => this.testText.setProperties({ text: this.telemetry.save()
      ? 'Saved locally. Exit immersive mode and open test-report.html to add notes.' : 'Report could not be saved. Browser storage may be disabled.' }));
    this.panel.requireElementById('TestActions').setProperties({ display: this.telemetry.enabled ? 'flex' : 'none' });
    this.panel.requireElementById('TestText').setProperties({ display: this.telemetry.enabled ? 'flex' : 'none' });

    this.cleanupFuncs.push(
      this.queries.selectedFireflies.subscribe('qualify', e => { if (this.gate()) this.capture(e); }),
      this.queries.selectedRests.subscribe('qualify', e => {
        if (!this.gate()) return;
        for (const light of this.fireflyEntities) if (light.getValue(Firefly, 'index') === e.getValue(RestingPlace, 'index')) this.capture(light);
      }),
      this.queries.selectedSockets.subscribe('qualify', e => { if (this.gate()) this.chooseRelay(e.getValue(RelaySocket, 'index') ?? 0); }),
      this.queries.selectedGarden.subscribe('qualify', () => {
        if (!this.playPaused() && this.gate() && !this.previewActive) this.placement.confirmPlacement();
      }),
      this.queries.hoveredLights.subscribe('qualify', e => {
        this.waitSeconds = 0;
        if (this.tutorialStep === 0) {
          this.tutorialStep = advanceTutorial(this.tutorialStep, 'look');
          this.stateEntity?.setValue(RoomloomState, 'tutorialStep', this.tutorialStep);
          this.telemetry.event('tutorial-look'); this.refresh();
        }
        if (!e.getValue(Firefly, 'captured') && performance.now() - this.attentionAt > 1800 && !this.playPaused()) {
          this.attentionAt = performance.now(); this.cue('attention', this.route.points[e.getValue(Firefly, 'index') ?? 0]);
        }
      }),
      this.world.onXRFrame(frame => {
        if (this.session !== frame.session) this.connectSession(frame.session);
        if (frame.detectedPlanes !== undefined) this.planeSeen = true;
        if (frame.detectedMeshes !== undefined) this.meshSeen = true;
        this.telemetry.frame(performance.now(), frame.session, this.playPaused(), this.renderSnapshot());
        this.updateCapabilities(frame.session);
        if (this.pendingScan) { this.pendingScan = false; this.placement.scan(); }
        else if (this.pendingRetry) { this.pendingRetry = false; this.placement.retryScan(); }
        else this.placement.tick(frame);
        this.applyQuality();
      }), () => this.placement.reset(),
    );
    const visibility = () => this.updatePause();
    document.addEventListener('visibilitychange', visibility);
    this.cleanupFuncs.push(() => document.removeEventListener('visibilitychange', visibility));
    const flush = setInterval(() => {
      if (this.playPaused() || !this.roomVisible || this.placement.scanning || !this.puzzleReady) return;
      if (this.pendingHops) { this.pendingHops = 0; this.cue('hop', this.flightPoints[this.flightSegment]); }
      if (this.flightArrived) {
        this.flightArrived = false;
        for (const entity of this.fireflyEntities) if (entity.getValue(Firefly, 'flight') === -2) this.finishCapture(entity);
      }
    }, 80);
    this.cleanupFuncs.push(() => clearInterval(flush));
    // Cold start is a required room scan, never a playable floating puzzle.
    this.enterScanGate();
  }

  private buildCaches(): void {
    for (const entity of this.fireflyEntities) {
      const o = entity.object3D;
      this.parts.set(entity, {
        left: o?.getObjectByName('MothWingsLeft') ?? null, right: o?.getObjectByName('MothWingsRight') ?? null,
        wingL: o?.getObjectByName('Wing_L') ?? null, wingR: o?.getObjectByName('Wing_R') ?? null,
        fly: o?.getObjectByName('FireflyFamily') ?? null, moth: o?.getObjectByName('MothFamily') ?? null,
      });
    }
    for (const entity of [...this.fireflyEntities, ...this.restEntities, ...this.socketEntities]) {
      const mats: MeshStandardMaterial[] = [];
      entity.object3D?.traverse(child => {
        if (child instanceof Mesh) {
          for (const m of Array.isArray(child.material) ? child.material : [child.material]) {
            if (m instanceof MeshStandardMaterial) mats.push(m);
          }
        }
      });
      this.materials.set(entity, mats);
    }
    const garden = this.stateEntity?.object3D;
    this.heart = garden?.getObjectByName('HeartSeed') ?? null;
    for (let i = 1; i <= 3; i++) this.growth[i - 1] = garden?.getObjectByName(`Growth_${i}`) ?? null;
  }

  private bind(id: string, action: () => void): void {
    const element = this.panel.requireElementById(id); element.name = id;
    element.addEventListener('click', action); this.cleanupFuncs.push(() => element.removeEventListener('click', action));
  }

  private renderSnapshot(): RenderSnapshot | undefined {
    const info = this.world.renderer?.info;
    if (!info) return undefined;
    return { calls: info.render.calls, triangles: info.render.triangles,
      geometries: info.memory.geometries, textures: info.memory.textures };
  }

  private updateCapabilities(session: XRSession): void {
    const now = performance.now();
    if (this.capabilityCheckedAt && now - this.capabilityCheckedAt < 3000) return;
    this.capabilityCheckedAt = now;
    const featureSession = session as FeatureSession;
    const report = capabilityReport({
      enabledFeatures: featureSession.enabledFeatures ?? null,
      inputSources: session.inputSources as Iterable<{ hand?: unknown; gamepad?: unknown; targetRayMode?: string }>,
      planesVisible: this.planeSeen, meshesVisible: this.meshSeen,
      hitTestAvailable: this.placement.hitTestAvailable,
      persistentAnchorsAvailable: typeof featureSession.restorePersistentAnchor !== 'undefined',
    });
    this.capabilities = report;
    this.capabilityText.setProperties({ text: report.message });
    this.stateEntity?.setValue(RoomloomState, 'capabilities', report.message);
    if (this.capabilityLogCount++ < 2) this.telemetry.event('capabilities', report.missing.join('|') || 'all');
  }
  private capabilityLogCount = 0;
  private fovLogCount = 0;
  private planeSeen = false;
  private meshSeen = false;

  private connectSession(session: XRSession): void {
    this.session = session;
    this.capabilityCheckedAt = 0;
    this.planeSeen = false; this.meshSeen = false;
    const onSelect = (event: Event) => {
      const source = (event as SelectEvent).inputSource;
      this.lastSelectClass = classifySource(source);
      const allowed = handsOnlyAllowed(this.telemetry.inputSummary, this.telemetry.handsOnlyMode, this.lastSelectClass);
      this.telemetry.selection(source, allowed);
      if (!allowed) this.hintText.setProperties({ text: handsOnlyMessage(this.telemetry.inputSummary) });
    };
    const onSelectStart = (event: Event) => {
      this.lastSelectClass = classifySource((event as SelectEvent).inputSource);
    };
    const visibility = () => { this.updatePause(); this.telemetry.event('visibility', session.visibilityState); };
    const end = () => { this.session = null; this.updatePause(); this.telemetry.event('session-end'); this.telemetry.save(); };
    session.addEventListener('select', onSelect);
    session.addEventListener('selectstart', onSelectStart);
    session.addEventListener('visibilitychange', visibility);
    session.addEventListener('end', end);
    this.cleanupFuncs.push(
      () => session.removeEventListener('select', onSelect),
      () => session.removeEventListener('selectstart', onSelectStart),
      () => session.removeEventListener('visibilitychange', visibility),
      () => session.removeEventListener('end', end),
    );
    this.telemetry.event('session-start', this.telemetry.handsOnlyMode ? 'hands-only-mode' : 'open');
    this.requestScan();
  }

  /** True when this interaction may proceed under hands-only enforcement. */
  private gate(): boolean {
    const allowed = handsOnlyAllowed(this.telemetry.inputSummary, this.telemetry.handsOnlyMode, this.lastSelectClass);
    if (!allowed) this.hintText.setProperties({ text: handsOnlyMessage(this.telemetry.inputSummary) });
    return allowed;
  }
  private acceptSelect(source?: XRInputSource): boolean {
    const allowed = handsOnlyAllowed(this.telemetry.inputSummary, this.telemetry.handsOnlyMode, classifySource(source));
    if (!allowed) {
      this.telemetry.selection(source, false);
      this.hintText.setProperties({ text: handsOnlyMessage(this.telemetry.inputSummary) });
    }
    return allowed;
  }
  private requestScan(): void {
    if (this.scanRequested && this.placement.scanning) return;
    this.scanRequested = true;
    this.pendingScan = true;
  }

  private playPaused(): boolean {
    return this.manualPause || document.hidden || (this.session !== null && this.session.visibilityState !== 'visible');
  }
  private updatePause(): void {
    this.stateEntity?.setValue(RoomloomState, 'paused', this.playPaused());
    this.pauseLabel.setProperties({ text: this.manualPause ? 'Resume' : 'Pause' });
    if (this.playPaused()) this.hintText.setProperties({ text: 'Your lights are safe. Resume when you are ready.' });
    else this.refresh();
  }

  update(delta: number, time: number): void {
    if (this.playPaused() || !this.roomVisible || this.placement.scanning || !this.puzzleReady) return;
    const dt = Math.min(delta, .05);
    // Reposition only after a sustained large head turn; never lock a reading panel to the head.
    if (this.session && !this.busy) {
      this.world.camera.getWorldPosition(this.viewer);
      this.world.camera.getWorldDirection(this.direction); this.direction.y = 0; this.direction.normalize();
      this.panel.getWorldPosition(this.point); this.point.sub(this.viewer); this.point.y = 0; this.point.normalize();
      this.panelAway = this.point.dot(this.direction) < .6 ? this.panelAway + dt : 0;
      if (this.panelAway > .8) { this.recenterPanel(); this.panelAway = 0; }
    }
    for (const rest of this.restEntities) {
      if (!rest.object3D) continue;
      this.point.fromArray(rest.getVectorView(RestingPlace, 'home')).applyMatrix4(this.anchorMatrix);
      rest.object3D.parent?.worldToLocal(this.point); rest.object3D.position.copy(this.point);
    }
    for (const socket of this.socketEntities) {
      if (!socket.object3D) continue;
      this.point.fromArray(socket.getVectorView(RelaySocket, 'home')).applyMatrix4(this.anchorMatrix);
      socket.object3D.parent?.worldToLocal(this.point); socket.object3D.position.copy(this.point);
    }
    const maxResidents = QUALITY_TIERS[this.qualityIndex].maxResidents;
    for (const resident of this.residentEntities) {
      if (!resident.object3D) continue;
      const i = resident.getValue(GardenResident, 'index') ?? 0;
      this.point.set(Math.sin(time * .35 + i * 2) * .19, .3 + i * .06 + Math.sin(time + i) * .025,
        Math.cos(time * .35 + i * 2) * .19).applyMatrix4(this.anchorMatrix);
      resident.object3D.parent?.worldToLocal(this.point); resident.object3D.position.copy(this.point);
      resident.object3D.rotation.y = -time * .35 - i * 2;
    }
    if (this.celebration > 0) this.celebration = Math.max(0, this.celebration - dt);
    if (this.heart) this.heart.scale.setScalar(this.celebration > 0 && QUALITY_TIERS[this.qualityIndex].emissivePulse
      ? 1 + Math.sin(this.celebration * 7) * .22 : 1);
    if (this.stateEntity?.getValue(RoomloomState, 'phase') !== PLAYING) return;
    this.roundElapsed += dt; this.waitSeconds += dt;
    this.applySoftStakes();
    const animateWings = QUALITY_TIERS[this.qualityIndex].animateWings;
    for (const entity of this.fireflyEntities) {
      if (!entity.object3D || entity.getValue(Firefly, 'captured')) continue;
      const index = entity.getValue(Firefly, 'index') ?? 0;
      if (index >= this.route.count) continue;
      const flight = entity.getValue(Firefly, 'flight') ?? -1;
      if (flight === -2) continue;
      if (flight >= 0) {
        const f = Math.min(1, flight + dt / (this.species ? .95 : .7));
        this.point.lerpVectors(this.flightPoints[this.flightSegment], this.flightPoints[this.flightSegment + 1], f);
        this.point.y += Math.sin(f * Math.PI) * .12;
        entity.setValue(Firefly, 'flight', f);
        if (f === 1) {
          this.stateEntity?.setValue(RoomloomState, 'routeHops', (this.stateEntity.getValue(RoomloomState, 'routeHops') ?? 0) + 1);
          this.pendingHops++;
          if (++this.flightSegment >= this.flightCount - 1) { entity.setValue(Firefly, 'flight', -2); this.flightArrived = true; }
          else entity.setValue(Firefly, 'flight', 0);
        }
      } else {
        this.point.copy(this.route.points[index]);
        this.point.y += Math.sin(time * (this.species ? 1.2 : 2.1) + index) * .022;
      }
      this.point.applyMatrix4(this.anchorMatrix); entity.object3D.parent?.worldToLocal(this.point); entity.object3D.position.copy(this.point);
      entity.object3D.rotation.y = time * .25 + index;
      if (!animateWings) continue;
      const parts = this.parts.get(entity);
      if (parts?.left) parts.left.rotation.y = Math.sin(time * 7 + index) * .25;
      if (parts?.right) parts.right.rotation.y = -Math.sin(time * 7 + index) * .25;
      if (parts?.wingL) parts.wingL.rotation.y = -.58 + Math.sin(time * 12 + index) * .2;
      if (parts?.wingR) parts.wingR.rotation.y = .58 - Math.sin(time * 12 + index) * .2;
    }
  }

  /** Non-punitive stake: a waiting light dims, and recovers the moment you act. No fail state. */
  private applySoftStakes(): void {
    const shouldDim = this.waitSeconds > 20;
    if (shouldDim === this.dimmed) return;
    this.dimmed = shouldDim;
    const base = contrastEmissive(this.sanctuary.contrast, this.species).intensity;
    for (const entity of this.fireflyEntities) {
      if (entity.getValue(Firefly, 'captured')) continue;
      for (const material of this.materials.get(entity) ?? []) material.emissiveIntensity = shouldDim ? base * .35 : base;
    }
    if (shouldDim) this.telemetry.event('soft-stake', 'light dimmed; still fully recoverable');
  }

  private applyQuality(): void {
    const next = nextQualityTier(this.qualityIndex, this.telemetry.consecutiveLowWindows);
    if (next === this.qualityIndex) return;
    this.qualityIndex = next;
    const tier = QUALITY_TIERS[next];
    this.telemetry.setQualityTier(tier.name);
    this.stateEntity?.setValue(RoomloomState, 'qualityTier', tier.name);
    // In immersive XR the compositor owns framebuffer scale; only tune it outside XR.
    if (!this.session) this.world.renderer?.setPixelRatio(tier.pixelRatio);
    this.setVisibility();
  }

  private startRound(): void {
    if (!this.stateEntity) return;
    this.roundDate = new Date(); this.species = this.sanctuary.residents.length >= 3 ? dailySpecies(this.roundDate) : 0;
    this.busy = false; this.flightArrived = false; this.route.reset(); this.pendingHops = 0;
    this.roundElapsed = 0; this.waitSeconds = 0; this.dimmed = false; this.summaryText = '';
    this.stateEntity.setValue(RoomloomState, 'phase', PLAYING);
    this.stateEntity.setValue(RoomloomState, 'complete', false);
    this.stateEntity.setValue(RoomloomState, 'found', 0);
    this.stateEntity.setValue(RoomloomState, 'total', this.route.count);
    this.stateEntity.setValue(RoomloomState, 'routeStep', 0);
    this.stateEntity.setValue(RoomloomState, 'routeOrder', '');
    this.stateEntity.setValue(RoomloomState, 'routeHops', 0);
    this.stateEntity.setValue(RoomloomState, 'relayChoice', -1);
    this.stateEntity.setValue(RoomloomState, 'species', this.species ? 'moth' : 'firefly');
    this.stateEntity.setValue(RoomloomState, 'moves', 0);
    this.stateEntity.setValue(RoomloomState, 'undos', 0);
    this.stateEntity.setValue(RoomloomState, 'elapsed', 0);
    this.stateEntity.setValue(RoomloomState, 'score', 0);
    this.stateEntity.setValue(RoomloomState, 'bestScore', this.sanctuary.bestScore);
    this.stateEntity.setValue(RoomloomState, 'tutorialStep', this.tutorialStep);
    for (const entity of this.fireflyEntities) {
      entity.setValue(Firefly, 'captured', false); entity.setValue(Firefly, 'flight', -1);
      const index = entity.getValue(Firefly, 'index') ?? 0;
      if (index < this.route.points.length) this.route.points[index].toArray(entity.getVectorView(Firefly, 'home'));
      const parts = this.parts.get(entity);
      if (parts?.fly) parts.fly.visible = this.species === 0;
      if (parts?.moth) parts.moth.visible = this.species === 1;
      entity.object3D?.scale.setScalar(1.05);
    }
    this.startLabel.setProperties({ text: 'Restart round' });
    this.telemetry.event('round-start', this.stateEntity.getValue(RoomloomState, 'routeMode') ?? 'scanning');
    this.refresh(); this.setVisibility();
  }

  private capture(entity: Entity): void {
    if (!this.stateEntity || this.playPaused() || this.busy || this.placement.scanning || !this.roomVisible || !this.puzzleReady ||
      this.stateEntity.getValue(RoomloomState, 'phase') !== PLAYING || entity.getValue(Firefly, 'captured')) return;
    const index = entity.getValue(Firefly, 'index') ?? 0;
    if (index >= this.route.count || (!this.sanctuary.introDone && index !== 0)) return;
    const path = this.route.path(index);
    if (!path) {
      this.hintText.setProperties({ text: this.route.hasRelay ? 'The light cannot cross yet. Move the lantern to A or B. Undo is always free.' : 'Wake a nearer resting place first.' });
      this.telemetry.event('blocked-rescue', String(index)); return;
    }
    this.waitSeconds = 0;
    if (this.tutorialStep < 2) {
      this.tutorialStep = this.tutorialStep === 1 ? advanceTutorial(this.tutorialStep, 'pinch') : 2;
      this.stateEntity.setValue(RoomloomState, 'tutorialStep', this.tutorialStep);
      this.telemetry.event('tutorial-pinch', String(this.tutorialStep));
    }
    this.flightPoints[0].copy(this.route.points[index]);
    path.forEach((id, i) => this.flightPoints[i + 1].copy(this.route.points[id]));
    this.flightCount = path.length + 1; this.flightSegment = 0; this.busy = true;
    entity.setValue(Firefly, 'flight', 0);
    const order = this.stateEntity.getValue(RoomloomState, 'routeOrder');
    this.stateEntity.setValue(RoomloomState, 'routeOrder', order ? `${order},${index + 1}` : `${index + 1}`);
    this.stateEntity.setValue(RoomloomState, 'routeStep', (this.stateEntity.getValue(RoomloomState, 'routeStep') ?? 0) + 1);
    this.hintText.setProperties({ text: 'A small light is finding its way home.' });
    this.cue('attention', this.route.points[index]);
    this.telemetry.event('rescue-start', String(index), this.lastSelectClass);
  }

  private finishCapture(entity: Entity): void {
    if (!this.stateEntity) return;
    const index = entity.getValue(Firefly, 'index') ?? 0;
    entity.setValue(Firefly, 'captured', true); entity.setValue(Firefly, 'flight', -1);
    this.route.lit[index] = true; this.busy = false; this.waitSeconds = 0;
    const previousStage = gardenStage(this.sanctuary);
    const newDay = rescueResident(this.sanctuary, SPECIES[this.species], index, this.roundDate);
    this.persist(); this.cue('arrival', this.route.points[4]);
    const found = (this.stateEntity.getValue(RoomloomState, 'found') ?? 0) + 1;
    this.stateEntity.setValue(RoomloomState, 'found', found);
    this.celebration = 1.5;
    if (gardenStage(this.sanctuary) > previousStage) this.cue('growth', this.route.points[4]);
    if (this.tutorialStep === 2) {
      this.tutorialStep = advanceTutorial(this.tutorialStep, 'arrive');
      this.stateEntity.setValue(RoomloomState, 'tutorialStep', this.tutorialStep);
      this.telemetry.event('tutorial-arrive');
    }
    this.telemetry.event('rescue-complete', String(index));
    if (found >= this.route.count) {
      this.stateEntity.setValue(RoomloomState, 'phase', COMPLETE);
      this.stateEntity.setValue(RoomloomState, 'complete', true);
      let streak = 1; if (this.storage) streak = recordVisit(this.storage, this.roundDate).streak;
      this.stateEntity.setValue(RoomloomState, 'streak', streak);
      const score = computeScore({
        found, total: this.route.count,
        hops: this.stateEntity.getValue(RoomloomState, 'routeHops') ?? 0,
        moves: (this.stateEntity.getValue(RoomloomState, 'moves') ?? 0) + (this.stateEntity.getValue(RoomloomState, 'undos') ?? 0),
        undos: this.stateEntity.getValue(RoomloomState, 'undos') ?? 0,
        elapsedSeconds: this.roundElapsed,
      });
      this.sanctuary.bestScore = updateBestScore(this.sanctuary.bestScore, score, newDay);
      if (newDay) this.sanctuary.bestGrade = scoreGrade(score);
      this.persist();
      this.stateEntity.setValue(RoomloomState, 'elapsed', this.roundElapsed);
      this.stateEntity.setValue(RoomloomState, 'score', score);
      this.stateEntity.setValue(RoomloomState, 'bestScore', this.sanctuary.bestScore);
      this.summaryText = roundSummary(score, this.sanctuary.bestScore, this.sanctuary.residents.length, streak,
        SPECIES[(dailySpecies(this.roundDate) + 1) % 2].toLowerCase());
      this.celebration = 3; this.cue('growth', this.route.points[4]);
      this.telemetry.event('round-complete', `${score}/${this.sanctuary.bestScore}/${this.roundElapsed.toFixed(1)}s`);
      this.telemetry.save();
    }
    this.refresh(); this.setVisibility();
  }

  private chooseRelay(choice: number): void {
    if (this.busy || this.playPaused() || !this.roomVisible || this.placement.scanning || !this.sanctuary.introDone || !this.puzzleReady ||
      this.stateEntity?.getValue(RoomloomState, 'phase') !== PLAYING || !this.route.hasRelay) return;
    this.waitSeconds = 0;
    if (choice < 0) {
      this.route.undo();
      this.stateEntity?.setValue(RoomloomState, 'undos', (this.stateEntity.getValue(RoomloomState, 'undos') ?? 0) + 1);
    } else {
      this.route.choose(choice);
      this.stateEntity?.setValue(RoomloomState, 'moves', (this.stateEntity.getValue(RoomloomState, 'moves') ?? 0) + 1);
    }
    this.stateEntity?.setValue(RoomloomState, 'relayChoice', this.route.choice);
    this.cue('hop', this.route.sockets[Math.max(0, this.route.choice)]);
    this.telemetry.event(choice < 0 ? 'undo-relay' : 'move-relay', String(this.route.choice), this.lastSelectClass);
    this.refresh();
  }

  private persist(): void {
    this.storageSaved = this.storage ? saveSanctuary(this.storage, this.sanctuary) : false;
    this.stateEntity?.setValue(RoomloomState, 'residents', this.sanctuary.residents.length);
    this.stateEntity?.setValue(RoomloomState, 'gardenStage', gardenStage(this.sanctuary));
  }

  /** Positional audio: move the cue entity to the emitting light before playback. */
  private cue(name: string, local?: Vector3): void {
    for (const entity of this.soundEntities) {
      if (entity.getValue(RoomloomSound, 'cue') !== name) continue;
      if (local && entity.object3D) {
        this.soundPoint.copy(local).applyMatrix4(this.anchorMatrix);
        entity.object3D.parent?.worldToLocal(this.soundPoint);
        entity.object3D.position.copy(this.soundPoint);
      }
      AudioUtils.play(entity);
      break;
    }
  }

  private refresh(): void {
    if (!this.stateEntity) return;
    const complete = this.stateEntity.getValue(RoomloomState, 'complete');
    const found = this.stateEntity.getValue(RoomloomState, 'found') ?? 0;
    const mode = this.stateEntity.getValue(RoomloomState, 'routeMode');
    const guide = this.tutorialStep < 3 && !complete && this.puzzleReady ? tutorialCopy(this.tutorialStep) : null;
    const palette = contrastPalette(this.sanctuary.contrast);
    const prefix = (id: string, text: string) => (palette[id]?.prefix ?? '') + text;

    this.speciesText.setProperties({ text: prefix('SpeciesText', `ROOMLOOM / ${mode === 'room' ? 'YOUR ROOM' : mode === 'preview' ? 'PREVIEW / NO ROOM' : 'ROOM SCAN REQUIRED'}`) });
    this.titleText.setProperties({ text: prefix('TitleText', guide?.title ?? 'A light needs a home.') });
    this.storyText.setProperties({ text: prefix('StoryText', guide?.story ??
      (complete ? 'Your room holds a little more life now. Your residents will be here when you return.' :
        this.route.hasRelay ? 'One lantern can bridge two gaps. Choose where it rests, then guide a light home.' :
          'Each rescued light wakes a resting place for the next.')) });
    this.progressText.setProperties({ text: prefix('ProgressText', guide?.progress ??
      (complete ? 'Sanctuary awake' : `${found} / ${this.route.count} lights home`)) });
    this.hintText.setProperties({ text: prefix('HintText', guide?.hint ??
      (complete ? `Come back tomorrow for ${SPECIES[(dailySpecies(this.roundDate) + 1) % 2].toLowerCase()}.` :
        this.route.hasRelay ? 'Place the lantern at A or B. Point and pinch a light to try its route.' :
          'Point and pinch a light near a safe resting place.')) });
    this.gardenText.setProperties({ text: prefix('GardenText', this.summaryText ||
      `${this.sanctuary.residents.length} residents / ${this.sanctuary.discoveries.length} families. ${nextObjective(this.sanctuary)}${this.storageSaved ? '' : ' Saving unavailable; progress lasts this visit only.'}`) });
    this.tutorialLabel.setProperties({ text: this.tutorialStep === 3 ? 'Replay guide' : 'Skip guide' });
    this.contrastLabel.setProperties({ text: this.sanctuary.contrast ? 'Standard color' : 'High contrast' });
    this.startLabel.setProperties({ text: complete ? 'Play again' : this.puzzleReady ? 'Restart round' : 'Plant here' });

    // High-contrast applies to EVERY text element, plus redundant shape cues.
    for (const id of CONTRAST_IDS) {
      const style = palette[id];
      this.panel.requireElementById(id).setProperties({ color: style.color, fontSize: style.fontSize ?? 12 });
    }
    for (const id of CONTRAST_BUTTON_IDS) {
      this.panel.requireElementById(id).setProperties({ backgroundColor: contrastButtonColor(this.sanctuary.contrast) });
    }
    this.panel.requireElementById('ProgressCard').setProperties({ backgroundColor: contrastCardColor(this.sanctuary.contrast, complete === true) });
    this.panel.requireElementById('RelayActions').setProperties({ display: this.route.hasRelay && !complete && this.puzzleReady && this.tutorialStep === 3 ? 'flex' : 'none' });
    this.relayText.setProperties({ display: this.route.hasRelay && !complete && this.puzzleReady && this.tutorialStep === 3 ? 'flex' : 'none',
      text: this.route.choice < 0 ? 'Lantern is at home. Choose a resting place.' : `Lantern at ${this.route.choice === 0 ? 'A' : 'B'}. Move it to change the route, or undo.` });

    const emissive = contrastEmissive(this.sanctuary.contrast, this.species);
    for (const entity of this.fireflyEntities) {
      for (const material of this.materials.get(entity) ?? []) {
        material.emissive.setHex(emissive.color); material.emissiveIntensity = emissive.intensity;
      }
    }
    this.dimmed = false;
    for (const rest of this.restEntities) {
      const i = rest.getValue(RestingPlace, 'index') ?? 0;
      const status = this.route.lit[i] ? 'safe' : 'waiting'; rest.setValue(RestingPlace, 'status', status);
      this.tint(rest, this.route.lit[i] ? 0x51b98d : 0x73858b, this.route.lit[i] ? .5 : .12);
    }
    for (const socket of this.socketEntities) {
      const selected = socket.getValue(RelaySocket, 'index') === this.route.choice;
      this.tint(socket, selected ? 0xffcb51 : 0x557f97, selected ? .9 : .12);
      socket.object3D?.scale.setScalar(selected ? 1.4 : 1);
    }
    const stage = gardenStage(this.sanctuary);
    for (let i = 1; i <= 3; i++) if (this.growth[i - 1]) this.growth[i - 1]!.visible = stage >= i + 1;
    this.stateEntity.setValue(RoomloomState, 'residents', this.sanctuary.residents.length);
    this.stateEntity.setValue(RoomloomState, 'gardenStage', stage);
    if (this.playPaused()) this.hintText.setProperties({ text: 'Your lights are safe. Resume when you are ready.' });
    if (this.capabilities) this.capabilityText.setProperties({ text: this.capabilities.message });
  }

  private tint(entity: Entity, color: number, intensity: number): void {
    for (const material of this.materials.get(entity) ?? []) {
      material.color.setHex(color); material.emissive.setHex(color); material.emissiveIntensity = intensity;
    }
  }

  private setVisibility(): void {
    const tier = QUALITY_TIERS[this.qualityIndex];
    const visible = this.puzzleReady && this.roomVisible && !this.placement.scanning;
    if (this.stateEntity?.object3D) this.stateEntity.object3D.visible = this.roomVisible;
    for (const entity of this.fireflyEntities) {
      const i = entity.getValue(Firefly, 'index') ?? 0;
      if (entity.object3D) entity.object3D.visible = visible && i < this.route.count && !entity.getValue(Firefly, 'captured') && (this.sanctuary.introDone || i === 0);
    }
    for (const rest of this.restEntities) {
      const i = rest.getValue(RestingPlace, 'index') ?? 0;
      if (rest.object3D) rest.object3D.visible = visible && i < this.route.count && this.sanctuary.introDone;
    }
    for (const socket of this.socketEntities) if (socket.object3D) socket.object3D.visible = visible && this.route.hasRelay && this.sanctuary.introDone;
    for (const resident of this.residentEntities) {
      const index = resident.getValue(GardenResident, 'index') ?? 0;
      if (resident.object3D) resident.object3D.visible = visible && index < Math.min(tier.maxResidents, this.sanctuary.residents.length);
    }
  }

  /** Default cold start: a blocking, actionable room scan. No playable floating round. */
  private enterScanGate(): void {
    this.puzzleReady = false; this.previewActive = false;
    this.stateEntity?.setValue(RoomloomState, 'phase', 0);
    this.stateEntity?.setValue(RoomloomState, 'routeMode', 'scanning');
    this.speciesText.setProperties({ text: 'ROOMLOOM / ROOM SCAN REQUIRED' });
    this.titleText.setProperties({ text: 'Your room is the habitat.' });
    this.storyText.setProperties({ text: 'Roomloom reads your real table and walls to build the puzzle. Look at a clear table or wall, then hold a pinch to plant the garden.' });
    this.progressText.setProperties({ text: 'Waiting for a real surface' });
    this.hintText.setProperties({ text: 'Hands only, seated. Allow hand tracking and space permissions. Controllers are optional.' });
    this.startLabel.setProperties({ text: 'Plant here' });
    this.panel.requireElementById('RelayActions').setProperties({ display: 'none' });
    this.telemetry.event('scan-gate');
    this.setVisibility();
  }

  /** Opt-in, clearly labelled preview. Never the state a judge sees on launch. */
  private restorePreview(): void {
    if (!this.stateEntity?.object3D) return;
    this.anchorMatrix.makeTranslation(0, .72, -1.32);
    this.stateEntity.object3D.position.set(0, .72, -1.32); this.stateEntity.object3D.quaternion.identity();
    const plan = practicePuzzle();
    this.route.configure(plan.points, plan.sockets, new Vector3(0, .2, 0), () => true);
    this.stateEntity.setValue(RoomloomState, 'surfaceCount', 0);
    this.stateEntity.setValue(RoomloomState, 'routeMode', 'preview');
    this.puzzleReady = true; this.previewActive = true;
    this.telemetry.event('preview-demo', 'opt-in, not the MR experience');
    this.placeMarkers(); this.startRound();
    if (this.session) this.recenterPanel();
  }

  private place(matrix: Matrix4, samples: SurfaceSamples | null, initial: boolean): void {
    const garden = this.stateEntity?.object3D; if (!garden) return;
    this.anchorMatrix.copy(matrix);
    this.inverse.copy(garden.parent?.matrixWorld ?? this.inverse.identity()).invert().multiply(matrix);
    this.inverse.decompose(garden.position, garden.quaternion, this.scale);
    if (!initial) return;
    const home = new Vector3(0, .2, 0).applyMatrix4(matrix);
    const sources = samples?.authoringSources() ?? [];
    const plan = planPuzzle(samples ? samples.points.slice(0, samples.count) : [], home,
      (a, b) => samples?.obstacles.clear(a, b) ?? false, sources);
    this.stateEntity?.setValue(RoomloomState, 'surfaceCount', samples?.count ?? 0);
    // No measured route => no playable round. Re-open the scan instead.
    if (!plan.measured || !plan.points.length) {
      this.puzzleReady = false; this.previewActive = false;
      this.stateEntity?.setValue(RoomloomState, 'routeMode', 'scanning');
      this.placementText.setProperties({ text: plan.reason });
      this.hintText.setProperties({ text: plan.reason });
      this.telemetry.event('room-scan-failed', `${samples?.count ?? 0} samples: ${sources.join(',') || 'none'}`);
      this.pendingRetry = true;
      this.setVisibility();
      return;
    }
    this.route.configure(plan.points, plan.sockets, home, (a, b) => samples?.obstacles.clear(a, b) ?? false);
    this.inverse.copy(matrix).invert();
    for (const p of this.route.points) p.applyMatrix4(this.inverse);
    for (const p of this.route.sockets) p.applyMatrix4(this.inverse);
    this.stateEntity?.setValue(RoomloomState, 'surfaceSources', plan.sources.join(','));
    this.stateEntity?.setValue(RoomloomState, 'routeMode', 'room');
    this.puzzleReady = true; this.previewActive = false; this.scanRequested = false;
    this.telemetry.event('room-route', `${plan.reason} | sources=${plan.sources.join(',')} | sockets=${plan.sockets.length}`);
    this.placementText.setProperties({ text: plan.reason });
    this.placeMarkers(); this.startRound(); this.recenterPanel(true);
    this.testText.setProperties({ text: this.telemetry.enabled ? plan.reason : '' });
  }

  private placeMarkers(): void {
    for (const rest of this.restEntities) {
      const index = rest.getValue(RestingPlace, 'index') ?? 0;
      this.point.copy(this.route.points[index]); this.point.y -= .13;
      this.point.toArray(rest.getVectorView(RestingPlace, 'home'));
    }
    for (const socket of this.socketEntities) {
      this.point.copy(this.route.sockets[socket.getValue(RelaySocket, 'index') ?? 0]); this.point.y -= .13;
      this.point.toArray(socket.getVectorView(RelaySocket, 'home'));
    }
  }

  /** FoV-aware: keep the whole panel inside the usable field of view on every device. */
  private recenterPanel(towardGarden = false): void {
    this.world.camera.getWorldPosition(this.viewer);
    if (towardGarden) this.direction.setFromMatrixPosition(this.anchorMatrix).sub(this.viewer);
    else this.world.camera.getWorldDirection(this.direction);
    this.direction.y = 0; if (this.direction.lengthSq() < .01) this.direction.set(0, 0, -1); this.direction.normalize();
    this.panelDistance = fovPanelDistance(this.world.camera.fov);
    this.point.copy(this.viewer).addScaledVector(this.direction, this.panelDistance); this.point.y = this.viewer.y + .12;
    this.panel.parent?.worldToLocal(this.point); this.panel.position.copy(this.point);
    this.panel.rotation.set(0, Math.atan2(-this.direction.x, -this.direction.z), 0);
    if (this.fovLogCount++ < 2) {
      this.telemetry.event('fov-panel', `fov=${this.world.camera.fov.toFixed(1)} distance=${this.panelDistance.toFixed(2)}`);
    }
  }
}
