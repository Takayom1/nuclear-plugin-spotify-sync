/** Minimal observable state container shared by the data models. */
export class Store<S extends object> {
  private readonly listeners = new Set<() => void>();

  constructor(protected _state: S) {}

  get state(): Readonly<S> {
    return this._state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected update(patch: Partial<S>) {
    this._state = { ...this._state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
