declare module 'bootstrap' {
  export class Tooltip {
    constructor(element: HTMLElement, options?: any);
    dispose(): void;
  }

  export class Popover {
    constructor(element: HTMLElement, options?: any);
    dispose(): void;
  }
}

