declare const Bun: {
  sleep(ms: number): Promise<void>;
  serve(options: {
    port: number;
    hostname?: string;
    fetch(request: Request): Response | Promise<Response>;
  }): {
    stop(closeActiveConnections?: boolean): void;
  };
};
