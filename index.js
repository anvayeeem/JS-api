import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Shield, Zap, RotateCcw } from 'lucide-react';

export default function WarCardGame() {
  const [deckId, setDeckId] = useState(null);
  const [computerScore, setComputerScore] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [remaining, setRemaining] = useState(52);
  const [cards, setCards] = useState([null, null]);
  const [header, setHeader] = useState("Game of War");
  const [drawDisabled, setDrawDisabled] = useState(true);
  const [prisonerPile, setPrisonerPile] = useState(0);
  const [feverCount, setFeverCount] = useState(0);
  const [reverseMode, setReverseMode] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cardShake, setCardShake] = useState(false);
  const [suitPowerUp, setSuitPowerUp] = useState(null);
  const [skipNextTurn, setSkipNextTurn] = useState(false);
  const [lives, setLives] = useState(3);

  const handleNewDeck = async () => {
    try {
      const res = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/");
      const data = await res.json();
      setDeckId(data.deck_id);
      setRemaining(data.remaining);
      setComputerScore(0);
      setMyScore(0);
      setPrisonerPile(0);
      setFeverCount(0);
      setSuitPowerUp(null);
      setSkipNextTurn(false);
      setLives(3);
      setHeader("Game of War");
      setCards([null, null]);
      setDrawDisabled(false);
      setShowConfetti(false);
    } catch (error) {
      setHeader("Error loading deck. Please try again.");
    }
  };

  const determineCardWinner = (card1, card2) => {
    const valueOptions = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "JACK", "QUEEN", "KING", "ACE"];
    let card1ValueIndex = valueOptions.indexOf(card1.value);
    let card2ValueIndex = valueOptions.indexOf(card2.value);
    
    if (reverseMode) {
      [card1ValueIndex, card2ValueIndex] = [card2ValueIndex, card1ValueIndex];
    }
    
    if (skipNextTurn) {
      setSkipNextTurn(false);
      setMyScore(prev => prev + 1);
      return { result: "Computer's turn skipped! You win!", winner: "player", isWar: false };
    }
    
    let multiplier = 1;
    
    if (feverCount >= 3) {
      multiplier = 3;
      setFeverCount(0);
    }
    
    if (suitPowerUp === 'DIAMONDS') {
      multiplier *= 2;
      setSuitPowerUp(null);
    }
    
    if (card1ValueIndex > card2ValueIndex) {
      const points = 1 * multiplier;
      setComputerScore(prev => prev + points);
      setPrisonerPile(prev => prev + 1);
      setFeverCount(0);
      
      if (card1.suit === 'SPADES' && myScore > 0) {
        setMyScore(prev => prev - 1);
        setComputerScore(prev => prev + 1);
        return { result: `Computer wins! ${multiplier > 1 ? `${multiplier}x points! ` : ''}♠️ Stole 1 point!`, winner: "computer", isWar: false };
      }
      
      return { result: `Computer wins!${multiplier > 1 ? ` ${multiplier}x POINTS!` : ''}`, winner: "computer", isWar: false };
    } else if (card1ValueIndex < card2ValueIndex) {
      const points = 1 * multiplier;
      setMyScore(prev => prev + points);
      setFeverCount(0);
      
      applySuitPowerUp(card2.suit);
      
      if (card2.suit === 'SPADES' && computerScore > 0) {
        setComputerScore(prev => prev - 1);
        setMyScore(prev => prev + 1);
        return { result: `You win! ${multiplier > 1 ? `${multiplier}x points! ` : ''}♠️ Stole 1 point!`, winner: "player", isWar: false };
      }
      
      if (multiplier > 1) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
      
      return { result: `You win!${multiplier > 1 ? ` ${multiplier}x POINTS!` : ''}`, winner: "player", isWar: false };
    } else {
      setFeverCount(prev => prev + 1);
      setCardShake(true);
      setTimeout(() => setCardShake(false), 500);
      
      if (prisonerPile > 0) {
        const freed = prisonerPile;
        setMyScore(prev => prev + freed * 2);
        setPrisonerPile(0);
        return { result: `War! Freed ${freed} prisoners for ${freed * 2} points!`, winner: "none", isWar: true };
      }
      
      return { result: `War!${feverCount >= 2 ? ' 🔥 Fever building...' : ''}`, winner: "none", isWar: true };
    }
  };

  const applySuitPowerUp = (suit) => {
    switch(suit) {
      case 'HEARTS':
        setLives(prev => Math.min(prev + 1, 5));
        break;
      case 'DIAMONDS':
        setSuitPowerUp('DIAMONDS');
        break;
      case 'CLUBS':
        setSkipNextTurn(true);
        break;
    }
  };

  const drawCards = async () => {
    try {
      const res = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=2`);
      const data = await res.json();
      setRemaining(data.remaining);
      setCards([data.cards[0], data.cards[1]]);
      
      const result = determineCardWinner(data.cards[0], data.cards[1]);
      setHeader(result.result);
      
      if (data.remaining === 0) {
        setDrawDisabled(true);
        if (computerScore > myScore) {
          setHeader("💻 The computer won the game!");
        } else if (myScore > computerScore) {
          setHeader("🎉 You won the game!");
          setShowConfetti(true);
        } else {
          setHeader("🤝 It's a tie game!");
        }
      }
    } catch (error) {
      setHeader("Error drawing cards. Please try again.");
    }
  };

  const getSuitIcon = (suit) => {
    const icons = { HEARTS: '♥️', SPADES: '♠️', DIAMONDS: '♦️', CLUBS: '♣️' };
    return icons[suit] || '';
  };

  const getSuitPowerText = (suit) => {
    const powers = {
      HEARTS: '+1 Life',
      SPADES: 'Steal Point',
      DIAMONDS: '2x Next Win',
      CLUBS: 'Skip Turn'
    };
    return powers[suit] || '';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #25344F, #617891, #632024)',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {showConfetti && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `ping 1s ease-out ${Math.random() * 0.5}s`
              }}
            >
              {['🎉', '⭐', '✨', '🎊'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#D5B893',
            marginBottom: '1rem',
            textShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            {header}
          </h1>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <button
              onClick={handleNewDeck}
              style={{
                backgroundColor: '#617891',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#25344F'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#617891'}
            >
              New Deck
            </button>
            <button
              onClick={drawCards}
              disabled={drawDisabled}
              style={{
                backgroundColor: drawDisabled ? '#6b7280' : '#632024',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                border: 'none',
                cursor: drawDisabled ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => !drawDisabled && (e.target.style.backgroundColor = '#6F4D38')}
              onMouseOut={(e) => !drawDisabled && (e.target.style.backgroundColor = '#632024')}
            >
              Draw Cards
            </button>
            <button
              onClick={() => setReverseMode(!reverseMode)}
              style={{
                backgroundColor: reverseMode ? '#9333ea' : '#6b7280',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <RotateCcw size={20} />
              {reverseMode ? 'Reverse ON' : 'Normal'}
            </button>
          </div>
          
          <p style={{ color: 'white', fontSize: '1.125rem' }}>Remaining cards: {remaining}</p>
        </div>

        {/* Special Indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {prisonerPile > 0 && (
            <div style={{
              backgroundColor: '#991b1b',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Shield size={20} />
              <span style={{ fontWeight: '600' }}>Prisoners: {prisonerPile}</span>
            </div>
          )}
          
          {feverCount > 0 && (
            <div style={{
              backgroundColor: '#ea580c',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <Flame size={20} />
              <span style={{ fontWeight: '600' }}>Fever: {feverCount}/3</span>
            </div>
          )}
          
          {suitPowerUp && (
            <div style={{
              backgroundColor: '#ca8a04',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Zap size={20} />
              <span style={{ fontWeight: '600' }}>Next: 2x Points!</span>
            </div>
          )}
        </div>

        {/* Cards Display */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              animation: cardShake ? 'bounce 0.5s' : 'none'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#ef4444',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                💻 Computer
                {cards[0] && <span style={{ fontSize: '0.875rem' }}>{getSuitIcon(cards[0].suit)}</span>}
              </h3>
              {cards[0] ? (
                <img src={cards[0].image} alt="Computer card" style={{ width: '100%', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '20rem',
                  backgroundColor: '#25344F',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '4rem' }}>🃏</span>
                </div>
              )}
              <div style={{ marginTop: '1rem', color: 'white' }}>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{computerScore}</p>
                {cards[0] && (
                  <p style={{ fontSize: '0.875rem', color: '#fcd34d' }}>{getSuitPowerText(cards[0].suit)}</p>
                )}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              animation: cardShake ? 'bounce 0.5s' : 'none'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#60a5fa',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                👤 You
                {cards[1] && <span style={{ fontSize: '0.875rem' }}>{getSuitIcon(cards[1].suit)}</span>}
              </h3>
              {cards[1] ? (
                <img src={cards[1].image} alt="Your card" style={{ width: '100%', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '20rem',
                  backgroundColor: '#25344F',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '4rem' }}>🃏</span>
                </div>
              )}
              <div style={{ marginTop: '1rem', color: 'white' }}>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{myScore}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                  {[...Array(lives)].map((_, i) => (
                    <span key={i} style={{ color: '#ef4444' }}>❤️</span>
                  ))}
                </div>
                {cards[1] && (
                  <p style={{ fontSize: '0.875rem', color: '#fcd34d' }}>{getSuitPowerText(cards[1].suit)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Power-up Legend */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '0.5rem',
          padding: '1rem',
          color: 'white',
          fontSize: '0.875rem'
        }}>
          <h4 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Suit Powers:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
            <div>♥️ Hearts: +1 Life</div>
            <div>♠️ Spades: Steal 1 Point</div>
            <div>♦️ Diamonds: 2x Next Win</div>
            <div>♣️ Clubs: Skip Opponent Turn</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(2); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}