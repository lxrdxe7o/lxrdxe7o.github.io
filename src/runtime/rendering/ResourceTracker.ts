export type ResourceKind =
  | 'texture'
  | 'render-target'
  | 'geometry'
  | 'material'
  | 'listener'
  | 'custom';

export interface DisposableResource {
  dispose(): void;
}

export interface EventTargetLike {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

export interface ResourceTrackerOptions {
  readonly onReleaseError?: (error: unknown, scopeId: string) => void;
}

export interface ResourceTrackerSnapshot {
  readonly disposed: boolean;
  readonly scopes: number;
  readonly resources: number;
  readonly byKind: Readonly<Partial<Record<ResourceKind, number>>>;
  readonly releaseFailures: number;
}

interface OwnedResource {
  readonly identity: object;
  readonly kind: ResourceKind;
  readonly release: () => void;
}

export class ResourceScope {
  private released = false;
  private readonly resources: OwnedResource[] = [];

  constructor(
    readonly id: string,
    private readonly tracker: ResourceTracker,
  ) {}

  track<T extends DisposableResource>(resource: T, kind: ResourceKind = 'custom'): T {
    this.assertActive();
    this.tracker.claim(this, resource, kind, () => resource.dispose());
    return resource;
  }

  own<T extends object>(resource: T, kind: ResourceKind, release: (resource: T) => void): T {
    this.assertActive();
    this.tracker.claim(this, resource, kind, () => release(resource));
    return resource;
  }

  defer(release: () => void): () => void {
    this.assertActive();
    const identity = { release };
    this.tracker.claim(this, identity, 'custom', release);
    return () => this.tracker.releaseIdentity(this, identity);
  }

  listen(
    target: EventTargetLike,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    this.assertActive();
    target.addEventListener(type, listener, options);
    const identity = { target, type, listener, options };
    this.tracker.claim(this, identity, 'listener', () => {
      target.removeEventListener(type, listener, options);
    });
    return () => this.tracker.releaseIdentity(this, identity);
  }

  release(): void {
    if (this.released) return;
    this.released = true;
    this.tracker.releaseScope(this);
  }

  get isReleased(): boolean {
    return this.released;
  }

  addOwnedResource(resource: OwnedResource): void {
    this.resources.push(resource);
  }

  takeOwnedResources(): OwnedResource[] {
    return this.resources.splice(0, this.resources.length);
  }

  removeOwnedResource(identity: object): OwnedResource | undefined {
    const index = this.resources.findIndex((resource) => resource.identity === identity);
    if (index < 0) return undefined;
    return this.resources.splice(index, 1)[0];
  }

  private assertActive(): void {
    if (this.released) throw new Error(`Resource scope "${this.id}" is released.`);
    this.tracker.assertActive();
  }
}

export class ResourceTracker {
  private readonly scopes = new Map<string, ResourceScope>();
  private readonly owners = new WeakMap<object, ResourceScope>();
  private disposed = false;
  private resourceCount = 0;
  private releaseFailures = 0;
  private readonly kindCounts = new Map<ResourceKind, number>();

  constructor(private readonly options: ResourceTrackerOptions = {}) {}

  createScope(id: string): ResourceScope {
    this.assertActive();
    if (!id.trim()) throw new Error('Resource scope IDs must not be empty.');
    if (this.scopes.has(id)) throw new Error(`Resource scope "${id}" already exists.`);
    const scope = new ResourceScope(id, this);
    this.scopes.set(id, scope);
    return scope;
  }

  claim(
    scope: ResourceScope,
    identity: object,
    kind: ResourceKind,
    release: () => void,
  ): void {
    this.assertActive();
    const currentOwner = this.owners.get(identity);
    if (currentOwner === scope) return;
    if (currentOwner) {
      throw new Error(
        `Resource is already owned by scope "${currentOwner.id}" and cannot be claimed by "${scope.id}".`,
      );
    }
    if (this.scopes.get(scope.id) !== scope || scope.isReleased) {
      throw new Error(`Resource scope "${scope.id}" is not active.`);
    }

    this.owners.set(identity, scope);
    scope.addOwnedResource({ identity, kind, release });
    this.resourceCount += 1;
    this.kindCounts.set(kind, (this.kindCounts.get(kind) ?? 0) + 1);
  }

  releaseIdentity(scope: ResourceScope, identity: object): void {
    const resource = scope.removeOwnedResource(identity);
    if (!resource) return;
    this.releaseResource(scope, resource);
  }

  releaseScope(scope: ResourceScope): void {
    if (this.scopes.get(scope.id) !== scope) return;
    this.scopes.delete(scope.id);
    const resources = scope.takeOwnedResources();
    for (let index = resources.length - 1; index >= 0; index -= 1) {
      this.releaseResource(scope, resources[index]);
    }
  }

  snapshot(): ResourceTrackerSnapshot {
    const byKind: Partial<Record<ResourceKind, number>> = {};
    for (const [kind, count] of this.kindCounts) {
      if (count > 0) byKind[kind] = count;
    }
    return Object.freeze({
      disposed: this.disposed,
      scopes: this.scopes.size,
      resources: this.resourceCount,
      byKind: Object.freeze(byKind),
      releaseFailures: this.releaseFailures,
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const scope of [...this.scopes.values()]) scope.release();
  }

  assertActive(): void {
    if (this.disposed) throw new Error('ResourceTracker is disposed.');
  }

  private releaseResource(scope: ResourceScope, resource: OwnedResource): void {
    this.owners.delete(resource.identity);
    this.resourceCount = Math.max(0, this.resourceCount - 1);
    const nextKindCount = Math.max(0, (this.kindCounts.get(resource.kind) ?? 1) - 1);
    if (nextKindCount === 0) this.kindCounts.delete(resource.kind);
    else this.kindCounts.set(resource.kind, nextKindCount);

    try {
      resource.release();
    } catch (error) {
      this.releaseFailures += 1;
      try {
        this.options.onReleaseError?.(error, scope.id);
      } catch {
        // Reporting cleanup failures must not interrupt cleanup of later resources.
      }
    }
  }
}
