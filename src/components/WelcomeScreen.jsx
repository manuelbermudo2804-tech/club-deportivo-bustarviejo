import React, { useEffect, useRef } from "react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function WelcomeScreen({ onComplete }) {
  const completedRef = useRef(false);

  useEffect(() => {
    // Timer automático de 1.2 segundos
    const timer = setTimeout(() => {
      if (!completedRef.current && onComplete) {
        completedRef.current = true;
        onComplete();
      }
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleTap = () => {
    if (!completedRef.current && onComplete) {
      completedRef.current = true;
      onComplete();
    }
  };

  return (
    <div
      onClick={handleTap}
      onTouchEnd={handleTap}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #15803d 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <img 
          src={CLUB_LOGO_URL} 
          alt="CD Bustarviejo"
          style={{
            width: '160px',
            height: '160px',
            margin: '0 auto 24px',
            objectFit: 'contain'
          }}
        />
        
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          color: 'white', 
          marginBottom: '8px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          ¡Bienvenido!
        </h1>
        <p style={{ fontSize: '20px', color: 'white', fontWeight: 'bold', marginBottom: '4px' }}>
          CD Bustarviejo
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
          Fundado en 1989
        </p>

        <div style={{ marginTop: '16px', fontSize: '28px' }}>
          ⚽ 🏀 🎾
        </div>
        
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '24px' }}>
          Toca para continuar
        </p>
      </div>
    </div>
  );
}