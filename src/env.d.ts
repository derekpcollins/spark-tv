declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

interface Window {
  /** Set once main.ts has taken over #app; index.html's watchdog checks it. */
  sparkBooted?: boolean;
}
