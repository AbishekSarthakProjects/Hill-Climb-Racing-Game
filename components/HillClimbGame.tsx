import React, { useRef, useEffect } from 'react';
import { GameStatus } from '../types';

interface HillClimbGameProps {
  gameStatus: GameStatus;
  handPositionsRef: React.MutableRefObject<any>;
  onScoreUpdate: (score: number) => void;
  onSpeedUpdate: (speed: number) => void;
  onGameOver: () => void;
}

const HillClimbGame: React.FC<HillClimbGameProps> = ({ gameStatus, handPositionsRef, onScoreUpdate, onSpeedUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    carX: 100,
    carY: 0,
    velocity: 0,
    rotation: 0,
    distance: 0,
    lastTime: 0,
    isAccelerating: false,
    isBraking: false,
    wheelRotation: 0,
  });

  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING) {
      const state = stateRef.current;
      state.carX = 100;
      state.carY = 0;
      state.velocity = 0;
      state.rotation = 0;
      state.distance = 0;
      state.lastTime = performance.now();
    }
    
    if (gameStatus !== GameStatus.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const getTerrainHeight = (x: number) => {
      const baseHeight = 400;
      const h1 = Math.sin(x * 0.005) * 80;
      const h2 = Math.sin(x * 0.011) * 40;
      const h3 = Math.sin(x * 0.023) * 20;
      const h4 = Math.sin(x * 0.002) * 120;
      return baseHeight + h1 + h2 + h3 + h4;
    };

    const update = (time: number) => {
      const dt = Math.min((time - stateRef.current.lastTime) / 1000, 0.1);
      stateRef.current.lastTime = time;

      const hands = handPositionsRef.current;
      const accel = hands.isRightFist;
      const brake = hands.isLeftFist;

      const state = stateRef.current;
      state.isAccelerating = accel;
      state.isBraking = brake;

      if (accel) state.velocity += 280 * dt;
      if (brake) {
          if (state.velocity > 10) state.velocity -= 500 * dt;
          else state.velocity -= 200 * dt;
      }
      
      const wheelBase = 35;
      const backX = state.carX - wheelBase/2;
      const frontX = state.carX + wheelBase/2;
      const backGroundY = getTerrainHeight(backX);
      const frontGroundY = getTerrainHeight(frontX);
      const targetGroundY = (backGroundY + frontGroundY) / 2 - 15;
      const targetRotation = Math.atan2(frontGroundY - backGroundY, wheelBase);

      state.carY = targetGroundY;
      state.rotation = targetRotation;
      state.velocity -= Math.sin(state.rotation) * 250 * dt;

      const isIdle = !accel && !brake;
      if (isIdle) {
          if (Math.abs(state.velocity) < 50) {
              state.velocity *= 0.7; 
              if (Math.abs(state.velocity) < 2) state.velocity = 0;
          } else {
              state.velocity *= 0.985;
          }
      }

      state.carX += state.velocity * dt;
      state.wheelRotation += (state.velocity * dt) / 10;

      // Speed capping and reporting
      const maxVelocity = 240; // Cap at 30 MPH
      if (state.velocity > maxVelocity) state.velocity = maxVelocity;
      if (state.velocity < -maxVelocity/2) state.velocity = -maxVelocity/2;

      // Convert velocity to MPH (240 / 8 = 30 MPH)
      const currentMPH = Math.floor(Math.abs(state.velocity) / 8);
      onSpeedUpdate(currentMPH);

      // Score
      const newDistance = Math.floor(state.carX / 10);
      if (newDistance > state.distance) {
          state.distance = newDistance;
      }
      onScoreUpdate(state.distance);

      render(ctx, canvas.width, canvas.height);
      animationFrameId = requestAnimationFrame(update);
    };

    const render = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const state = stateRef.current;
      const offsetX = state.carX - 200;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fef3c7';
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#fbbf24';
      ctx.beginPath();
      ctx.arc(width - 100, 100, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < width / 10; i++) {
          const worldX = offsetX + i * 10;
          const y = getTerrainHeight(worldX);
          ctx.lineTo(i * 10, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      
      const terrainGrad = ctx.createLinearGradient(0, 200, 0, height);
      terrainGrad.addColorStop(0, '#059669');
      terrainGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = terrainGrad;
      ctx.fill();

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < width / 10; i++) {
          const worldX = offsetX + i * 10;
          const y = getTerrainHeight(worldX);
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i * 10, y);
      }
      ctx.stroke();

      ctx.save();
      ctx.translate(200, state.carY);
      ctx.rotate(state.rotation);

      ctx.fillStyle = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-25, -15, 50, 15);
      ctx.fillRect(-15, -25, 30, 10);
      
      ctx.fillStyle = '#93c5fd';
      ctx.fillRect(2, -22, 10, 6);
      
      ctx.fillStyle = '#111';
      ctx.shadowBlur = 0;
      
      ctx.save();
      ctx.translate(-17, 0);
      ctx.rotate(state.wheelRotation);
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(17, 0);
      ctx.rotate(state.wheelRotation);
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      renderInputFeedback(ctx, width, height);
    };

    const renderInputFeedback = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const state = stateRef.current;
        ctx.save();
        ctx.translate(width - 100, height - 100);
        ctx.fillStyle = state.isAccelerating ? '#22c55e' : '#334155';
        ctx.globalAlpha = state.isAccelerating ? 1 : 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('ACCEL', 0, 5);
        ctx.fillText('(Right Fist)', 0, 20);
        ctx.restore();

        ctx.save();
        ctx.translate(100, height - 100);
        ctx.fillStyle = state.isBraking ? '#ef4444' : '#334155';
        ctx.globalAlpha = state.isBraking ? 1 : 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BRAKE', 0, 5);
        ctx.fillText('(Left Fist)', 0, 20);
        ctx.restore();
    };

    animationFrameId = requestAnimationFrame(update);
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
    };
  }, [gameStatus]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block"
    />
  );
};

export default HillClimbGame;
