/**
 * Unified CAPTCHA Service
 * 
 * Automatically detects and uses the appropriate CAPTCHA provider
 * based on backend configuration
 * 
 * Supports:
 * - Puzzle CAPTCHA (custom implementation)
 * - Google reCAPTCHA v3
 * 
 * @version 1.0.0
 */

import { authApi } from './auth.service';
import { puzzleCaptchaService } from './puzzle.captcha.service';
import { recaptchaService } from './recaptcha.service';

export interface CaptchaConfig {
  provider: 'puzzle' | 'recaptcha' | 'hybrid';
  enabled: boolean;
  require: {
    login: number;
    register: number;
    passwordReset: number;
    otpRequest: number;
  };
  recaptcha?: {
    siteKey: string;
    version: string;
  };
  puzzle?: {
    tolerance: number;
    maxTime: number;
  };
}

class CaptchaService {
  private config: CaptchaConfig | null = null;
  private configLoaded = false;

  /**
   * Load CAPTCHA configuration from backend
   */
  async loadConfig(): Promise<CaptchaConfig | null> {
    if (this.configLoaded && this.config) {
      return this.config;
    }

    try {
      const response = await authApi.get('/security/captcha/config');
      
      if (response.data.success) {
        const data = response.data.data ?? response.data.config ?? {};
        const siteKey = data.site_key ?? data.siteKey ?? '';
        this.config = {
          provider: 'recaptcha',
          enabled: Boolean(siteKey),
          require: { login: 0, register: 0, passwordReset: 0, otpRequest: 0 },
          recaptcha: { siteKey, version: 'turnstile' },
        };
        this.configLoaded = true;
        
        // Preload reCAPTCHA if needed
        if (this.config?.provider === 'recaptcha' || this.config?.provider === 'hybrid') {
          await recaptchaService.preload();
        }

        return this.config;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to load CAPTCHA config:', error);
      return null;
    }
  }

  /**
   * Get current provider type
   */
  async getProvider(): Promise<'puzzle' | 'recaptcha' | 'none'> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.enabled) {
      return 'none';
    }

    return this.config.provider === 'hybrid' ? 'puzzle' : this.config.provider;
  }

  /**
   * Check if CAPTCHA is required for an action based on failed attempts
   * 
   * @param action - Action type (login, register, etc.)
   * @param failedAttempts - Number of failed attempts
   * @returns boolean
   */
  async isRequired(action: string, failedAttempts: number = 0): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.enabled) {
      return false;
    }

    const thresholds = this.config.require;
    
    const actionMap: { [key: string]: keyof typeof thresholds } = {
      'login': 'login',
      'register': 'register',
      'password_reset': 'passwordReset',
      'reset_password': 'passwordReset',
      'otp_request': 'otpRequest'
    };

    const key = actionMap[action] || 'login';
    const threshold = thresholds[key] ?? 3;

    return failedAttempts >= threshold;
  }

  /**
   * Get CAPTCHA token for an action
   * 
   * Automatically chooses the right provider and returns token
   * 
   * @param action - Action type
   * @returns Promise<string | null> - CAPTCHA token or null
   */
  async getToken(action: string): Promise<string | null> {
    const provider = await this.getProvider();

    if (provider === 'none') {
      console.log('ℹ️ CAPTCHA disabled');
      return null;
    }

    try {
      if (provider === 'puzzle') {
        // For puzzle CAPTCHA, we need to show the UI component first
        // This method should not be used directly for puzzle
        console.warn('⚠️ Puzzle CAPTCHA requires user interaction. Use PuzzleCaptcha component instead.');
        return null;
      } else if (provider === 'recaptcha') {
        // For reCAPTCHA, we can get token directly
        return await recaptchaService.executeRecaptcha(action);
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get CAPTCHA token:', error);
      return null;
    }
  }

  /**
   * Check if using puzzle CAPTCHA
   */
  async isPuzzle(): Promise<boolean> {
    const provider = await this.getProvider();
    return provider === 'puzzle';
  }

  /**
   * Check if using reCAPTCHA
   */
  async isRecaptcha(): Promise<boolean> {
    const provider = await this.getProvider();
    return provider === 'recaptcha';
  }

  /**
   * Check if CAPTCHA is enabled
   */
  async isEnabled(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config?.enabled ?? false;
  }

  /**
   * Get reCAPTCHA site key (if using reCAPTCHA)
   */
  getSiteKey(): string | null {
    return this.config?.recaptcha?.siteKey || null;
  }

  /**
   * Reset configuration (force reload)
   */
  resetConfig(): void {
    this.config = null;
    this.configLoaded = false;
  }

  /**
   * Health check
   */
  async healthCheck() {
    const provider = await this.getProvider();

    if (provider === 'puzzle') {
      return await puzzleCaptchaService.healthCheck();
    } else if (provider === 'recaptcha') {
      return { healthy: recaptchaService.isEnabled() };
    }

    return { healthy: true };
  }
}

// Export singleton instance
export const captchaService = new CaptchaService();

export default captchaService;