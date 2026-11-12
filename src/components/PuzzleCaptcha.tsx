import React, { useState, useEffect, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Shield, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { puzzleCaptchaService, PuzzleChallenge } from '@/services/api/puzzle.captcha.service';
import { cn } from '@/lib/utils';

interface PuzzleCaptchaProps {
  action: string;
  onComplete: (token: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const PuzzleCaptcha: React.FC<PuzzleCaptchaProps> = ({
  action,
  onComplete,
  onError,
  className
}) => {
  const [challenge, setChallenge] = useState<PuzzleChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartPosition = useRef(0);
  const timedOut = useRef(false);

  /**
   * Load challenge on mount
   */
  useEffect(() => {
    loadChallenge();
  }, [action]);

  /**
   * Timer countdown
   */
  useEffect(() => {
    if (!challenge) return;

    const interval = setInterval(() => {
      const remaining = puzzleCaptchaService.getTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0 && !completed) {
        handleTimeout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [challenge, completed]);

  /**
   * Load new challenge
   */
  const loadChallenge = async () => {
    try {
      setLoading(true);
      timedOut.current = false;
      setError(null);
      setChallenge(null);
      setCompleted(false);
      setPosition(0);
      puzzleCaptchaService.clearChallenge();

      const newChallenge = await puzzleCaptchaService.generateChallenge(action);
      
      if (!newChallenge) {
        throw new Error('Failed to generate challenge');
      }

      setChallenge(newChallenge);
      setTimeRemaining(newChallenge.expiresIn);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load CAPTCHA';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle timeout
   */
  const handleTimeout = () => {
    if (timedOut.current) return;
    timedOut.current = true;
    setError('CAPTCHA expired. Please try again.');
    onError?.('CAPTCHA expired');
    setTimeout(() => loadChallenge(), 1000);
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (completed || error) return;

    setDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    dragStartPosition.current = position;

    e.preventDefault();
  };

  /**
   * Handle drag move
   */
  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!dragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX.current;
    
    // Get slider width
    const sliderWidth = sliderRef.current?.offsetWidth || 300;
    const maxPosition = sliderWidth - 44;

    // Calculate new position
    let newPosition = dragStartPosition.current + deltaX;
    newPosition = Math.max(0, Math.min(newPosition, maxPosition));

    setPosition(newPosition);
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = async () => {
    if (!dragging) return;

    setDragging(false);

    if (position > 10) {
      await handleComplete();
    }
  };

  /**
   * Complete puzzle
   */
  const handleComplete = async () => {
    try {
      if (completed || error) return;
      const maxPosition = Math.max(1, (sliderRef.current?.offsetWidth || 300) - 44);
      const normalizedPosition = Math.round((position / maxPosition) * 1000);
      const token = await puzzleCaptchaService.verifySolution(normalizedPosition);
      
      setCompleted(true);
      onComplete(token);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to complete CAPTCHA';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  /**
   * Setup drag listeners
   */
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const handleEnd = () => { void handleDragEnd(); };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragging, position]);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading security verification...</span>
        </div>
      </Card>
    );
  }

  /**
   * Render error state
   */
  if (error && !challenge) {
    return (
      <Card className={cn('p-6', className)}>
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          onClick={loadChallenge} 
          variant="outline" 
          className="w-full mt-4"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">Security Verification</span>
        </div>
        
        {/* Timer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-muted-foreground">
        {completed ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Verified successfully!</span>
          </div>
        ) : (
          'Slide the puzzle piece to complete the image'
        )}
      </div>

      {/* Puzzle Container */}
      <div className="relative">
        {/* Background Image */}
        {challenge && (
          <div
            className="relative w-full rounded-lg overflow-hidden bg-muted"
            style={{ aspectRatio: '18 / 7' }}
          >
            <img
              src={challenge.imageUrl}
              alt="Puzzle background"
              className="w-full h-full"
              draggable={false}
            />
            <div
              aria-hidden="true"
              className={cn(
                'absolute top-[39.3%] aspect-square rounded-md border-[3px] border-white shadow-lg transition-colors',
                completed ? 'bg-green-500' : 'bg-primary'
              )}
              style={{
                width: '12.22%',
                left: `${(position / Math.max(1, (sliderRef.current?.offsetWidth || 300) - 44)) * 87.78}%`,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        {/* Slider Track */}
        <div 
          ref={sliderRef}
          className="relative w-full h-16 mt-4 bg-muted rounded-lg border-2 border-border"
        >
          {/* Track fill */}
          <div 
            className={cn(
              "absolute left-0 top-0 h-full rounded-lg transition-colors",
              completed ? "bg-green-500/20" : "bg-primary/10"
            )}
            style={{ width: `${position}px` }}
          />

          {/* Slider handle (puzzle piece) */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg shadow-lg cursor-grab active:cursor-grabbing transition-all",
              completed ? "bg-green-500" : "bg-primary",
              dragging && "scale-110 shadow-xl"
            )}
            style={{ left: `${position}px` }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            role="slider"
            aria-label="Move the puzzle piece to the matching opening"
            aria-valuemin={0}
            aria-valuemax={1000}
            aria-valuenow={Math.round((position / Math.max(1, (sliderRef.current?.offsetWidth || 300) - 44)) * 1000)}
            tabIndex={completed || error ? -1 : 0}
            onKeyDown={(e) => {
              const maxPosition = Math.max(1, (sliderRef.current?.offsetWidth || 300) - 44);
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                setPosition((current) => Math.max(0, Math.min(maxPosition, current + (e.key === 'ArrowRight' ? 5 : -5))));
              }
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void handleComplete();
              }
            }}
          >
            {/* Puzzle piece icon */}
            <div className="flex items-center justify-center h-full">
              {completed ? (
                <CheckCircle2 className="h-6 w-6 text-white" />
              ) : (
                <div className="w-8 h-8 border-4 border-white/50 rounded" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Refresh button */}
      {!completed && (
        <Button 
          onClick={loadChallenge} 
          variant="ghost" 
          size="sm"
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Get new puzzle
        </Button>
      )}
    </Card>
  );
};

export default PuzzleCaptcha;