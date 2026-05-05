import { TPS_WINDOW_MS } from "./constants.ts";

export class TokenSpeedEngine {
  private _isStreaming = false;
  private _tokenCount = 0;
  private _startTime = 0;
  private _tokenTimestamps: number[] = [];

  /**
   * Whether a streaming session is currently active
   */
  get isStreaming() {
    return this._isStreaming;
  }

  /**
   * Total number of tokens recorded since stream start
   */
  get tokenCount() {
    return this._tokenCount;
  }

  /**
   * Returns elapsed milliseconds since stream start (0 if not started)
   */
  get elapsedMs(): number {
    if (this._startTime === 0) return 0;
    return Date.now() - this._startTime;
  }

  /**
   * Returns elapsed seconds since stream start (0 if not started)
   */
  get elapsedSeconds(): number {
    return this.elapsedMs / 1000;
  }

  /**
   * Returns tokens-per-second based on a time-based sliding window.
   * Uses the actual span of timestamps in the window for sub-second granularity
   */
  get tps(): number {
    // While the window is still filling, use the average instead
    if (this.elapsedMs < TPS_WINDOW_MS) return this.tps_avg;

    const now = Date.now();
    const windowStart = now - TPS_WINDOW_MS;
    // Remove timestamps older than TPS_WINDOW_MS
    while (this._tokenTimestamps.length > 0 && this._tokenTimestamps[0] < windowStart) {
      this._tokenTimestamps.shift();
    }

    // Use the actual time span of tokens in the window for finer precision
    const windowDuration = (now - this._tokenTimestamps[0]) / 1000;
    if (windowDuration === 0) return 0;

    return this._tokenTimestamps.length / windowDuration;
  }

  /**
   * Returns average tokens-per-second
   */
  get tps_avg(): number {
    if (this.elapsedSeconds === 0) return 0;
    return this.tokenCount / this.elapsedSeconds;
  }

  /**
   * Starts a new streaming session.
   */
  start() {
    this._tokenCount = 0;
    this._isStreaming = true;
    this._startTime = Date.now();
    this._tokenTimestamps = [];
  }

  /**
   * Stops streaming
   */
  stop() {
    this._isStreaming = false;
  }

  /**
   * Records a token. The current time is used for the sliding window.
   */
  recordToken() {
    if (!this._isStreaming) return;

    this._tokenCount++;
    this._tokenTimestamps.push(Date.now());
  }
}
