export interface AfterimageExample {
  pinnedSeconds: number;
  currentSeconds: number;
}

export interface AfterimagePlayerOptions {
  example?: AfterimageExample;
}

export function createAfterimagePlayer(media: HTMLVideoElement, options?: AfterimagePlayerOptions): HTMLElement;
