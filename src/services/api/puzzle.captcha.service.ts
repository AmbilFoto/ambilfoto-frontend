import { authApi } from './auth.service';

export interface PuzzleChallenge {
  challengeId: string;
  token: string;
  imageUrl: string;
  expiresIn: number;
  action: string;
}

export interface PuzzleSolution {
  challengeId: string;
  userPosition: number;
  action: string;
}

class PuzzleCaptchaService {
  private currentChallenge: PuzzleChallenge | null = null;
  private solvingStartTime = 0;

  async getConfig() {
    try {
      const response = await authApi.get('/captcha/config');
      return response.data?.config ?? response.data?.data ?? null;
    } catch (error) {
      console.error('Failed to get CAPTCHA config:', error);
      return null;
    }
  }

  async generateChallenge(action: string): Promise<PuzzleChallenge | null> {
    const response = await authApi.post('/captcha/challenge', { action });
    const payload = response.data?.challenge ?? response.data?.data ?? response.data;
    const challenge = payload?.challenge ?? payload;
    if (!response.data?.success || !challenge?.challengeId || !challenge?.imageUrl) {
      throw new Error(response.data?.error || 'Failed to generate challenge');
    }

    this.currentChallenge = challenge as PuzzleChallenge;
    this.solvingStartTime = Date.now();
    return this.currentChallenge;
  }

  async verifySolution(userPosition: number): Promise<string> {
    const challenge = this.currentChallenge;
    if (!challenge || this.isExpired()) {
      throw new Error('CAPTCHA challenge expired. Please try again.');
    }

    const solution: PuzzleSolution = {
      challengeId: challenge.challengeId,
      userPosition,
      action: challenge.action,
    };
    const response = await authApi.post('/captcha/puzzle/verify', solution);
    const token = response.data?.captcha_token ?? response.data?.data?.captcha_token;
    if (!response.data?.success || typeof token !== 'string' || !token) {
      throw new Error(response.data?.error || 'CAPTCHA verification failed');
    }
    return token;
  }

  clearChallenge(): void {
    this.currentChallenge = null;
    this.solvingStartTime = 0;
  }

  getCurrentChallenge(): PuzzleChallenge | null {
    return this.currentChallenge;
  }

  isExpired(): boolean {
    if (!this.currentChallenge) return true;
    return Date.now() - this.solvingStartTime > this.currentChallenge.expiresIn * 1000;
  }

  getTimeRemaining(): number {
    if (!this.currentChallenge) return 0;
    const remaining = this.currentChallenge.expiresIn * 1000 - (Date.now() - this.solvingStartTime);
    return Math.max(0, Math.floor(remaining / 1000));
  }

  async healthCheck() {
    try {
      const response = await authApi.get('/captcha/health');
      return response.data?.health ?? response.data?.data ?? { healthy: false };
    } catch (error) {
      console.error('CAPTCHA health check failed:', error);
      return { healthy: false };
    }
  }
}

export const puzzleCaptchaService = new PuzzleCaptchaService();

export default puzzleCaptchaService;
