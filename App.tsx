/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GameStatus } from './types';
import { SONG_URL } from './constants';
import { useMediaPipe } from './hooks/useMediaPipe';
import HillClimbGame from './components/HillClimbGame';
import WebcamPreview from './components/WebcamPreview';
import { Play, RefreshCw, VideoOff, Hand, Car, Gauge } from 'lucide-react';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LOADING);
  const [score, setScore] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioRef.current = new Audio(SONG_URL);
    }
  }, []);  
  // Now getting lastResultsRef from the hook
  const { isCameraReady, handPositionsRef, lastResultsRef, error: cameraError } = useMediaPipe(videoRef);
  // Game Logic Handlers
  const handleGameOver = useCallback(() => {
      setTimeout(() => endGame(false), 0);
  }, []);

  const startGame = async () => {
    if (!isCameraReady) return;
    
    setScore(0);
    setCurrentSpeed(0);

    try {
      if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.loop = true;
          await audioRef.current.play();
          setGameStatus(GameStatus.PLAYING);
      }
    } catch (e) {
        console.error("Audio play failed", e);
        alert("Could not start audio. Please interact with the page first.");
    }
  };

  const endGame = (victory: boolean) => {
      setGameStatus(victory ? GameStatus.VICTORY : GameStatus.GAME_OVER);
      if (audioRef.current) {
          audioRef.current.pause();
      }
  };

  useEffect(() => {
      if (gameStatus === GameStatus.LOADING && isCameraReady) {
          setGameStatus(GameStatus.IDLE);
      }
  }, [isCameraReady, gameStatus]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* Hidden Video for Processing */}
      <video 
        ref={videoRef} 
        className="absolute opacity-0 pointer-events-none"
        playsInline
        muted
        autoPlay
        style={{ width: '640px', height: '480px' }}
      />

      {/* Game Engine */}
      {gameStatus !== GameStatus.LOADING && (
          <HillClimbGame 
            gameStatus={gameStatus}
            handPositionsRef={handPositionsRef}
            onScoreUpdate={setScore}
            onSpeedUpdate={setCurrentSpeed}
            onGameOver={handleGameOver}
          />
      )}

      {/* Webcam Mini-Map Preview */}
      <WebcamPreview 
          videoRef={videoRef} 
          resultsRef={lastResultsRef} 
          isCameraReady={isCameraReady} 
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
          
          {/* HUD (Top) */}
          <div className="flex justify-between items-start text-white w-full">
             <div className="w-1/3 p-4">
                 <div className="flex items-center gap-3">
                     <div className="p-2 bg-white/10 rounded-lg">
                         <Gauge className="w-6 h-6 text-blue-400" />
                     </div>
                     <div>
                         <div className="text-2xl font-bold font-mono">
                             {currentSpeed} <span className="text-xs opacity-50">MPH</span>
                         </div>
                         <div className="text-[10px] uppercase tracking-tighter opacity-40">
                             Max: 100 MPH
                         </div>
                     </div>
                 </div>
             </div>

             {/* Distance & Multiplier */}
             <div className="text-center">
                 <h1 className="text-5xl font-bold tracking-wider drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                     {score} <span className="text-2xl font-normal opacity-70">METERS</span>
                 </h1>
             </div>
             
             <div className="w-1/3"></div>
          </div>

          {/* Menus (Centered) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              
              {gameStatus === GameStatus.LOADING && (
                  <div className="bg-black/80 p-10 rounded-2xl flex flex-col items-center border border-blue-900/50 backdrop-blur-md">
                      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-6"></div>
                      <h2 className="text-2xl text-white font-bold mb-2">Initializing System</h2>
                      <p className="text-blue-300">{!isCameraReady ? "Waiting for camera..." : "Loading assets..."}</p>
                      {cameraError && <p className="text-red-500 mt-4 max-w-xs text-center">{cameraError}</p>}
                  </div>
              )}

              {gameStatus === GameStatus.IDLE && (
                  <div className="bg-black/80 p-12 rounded-3xl text-center border-2 border-red-500/30 backdrop-blur-xl max-w-lg">
                      <div className="mb-6 flex justify-center gap-4">
                         <Car className="w-16 h-16 text-red-500" />
                         <Gauge className="w-16 h-16 text-emerald-500" />
                      </div>
                      <h1 className="text-7xl font-black text-white mb-6 tracking-tighter italic drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]">
                          HILL <span className="text-red-500">CLIMB</span>
                      </h1>
                      <div className="space-y-4 text-gray-300 mb-8">
                          <p className="flex items-center justify-center gap-2">
                              <Hand className="w-5 h-5 text-red-400" /> 
                              <span>Control your car with hand gestures.</span>
                          </p>
                          <p>Right <span className="text-emerald-500 font-bold">FIST</span> to <span className="text-emerald-500 font-bold">ACCELERATE</span></p>
                          <p>Left <span className="text-red-500 font-bold">FIST</span> to <span className="text-red-500 font-bold">BRAKE / REVERSE</span></p>
                      </div>

                      {!isCameraReady ? (
                           <div className="flex items-center justify-center text-red-400 gap-2 bg-red-900/20 p-4 rounded-lg">
                               <VideoOff /> Camera not ready yet.
                           </div>
                      ) : (
                          <button 
                              onClick={startGame}
                              className="bg-red-600 hover:bg-red-500 text-white text-xl font-bold py-4 px-12 rounded-full transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] flex items-center justify-center mx-auto gap-3"
                          >
                              <Play fill="currentColor" /> START ENGINE
                          </button>
                      )}


                  </div>
              )}

              {(gameStatus === GameStatus.GAME_OVER || gameStatus === GameStatus.VICTORY) && (
                  <div className="bg-black/90 p-12 rounded-3xl text-center border-2 border-white/10 backdrop-blur-xl">
                      <h2 className={`text-6xl font-bold mb-4 ${gameStatus === GameStatus.VICTORY ? 'text-green-400' : 'text-red-500'}`}>
                          {gameStatus === GameStatus.VICTORY ? "SEQUENCE COMPLETE" : "SYSTEM FAILURE"}
                      </h2>
                      <p className="text-white text-3xl mb-8">Final Score: {score.toLocaleString()}</p>
                      <button 
                          onClick={() => setGameStatus(GameStatus.IDLE)}
                          className="bg-white/10 hover:bg-white/20 text-white text-xl py-3 px-8 rounded-full flex items-center justify-center mx-auto gap-2 transition-colors"
                      >
                          <RefreshCw /> Play Again
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default App;
