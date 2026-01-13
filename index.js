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
    
    // Reverse mode logic
    if (reverseMode) {
      [card1ValueIndex, card2ValueIndex] = [card2ValueIndex, card1ValueIndex];
    }
    
    // Handle skip turn from Clubs power-up
    if (skipNextTurn) {
      setSkipNextTurn(false);
      setMyScore(prev => prev + 1);
      return { result: "Computer's turn skipped! You win!", winner: "player", isWar: false };
    }
    
    let multiplier = 1;
    
    // Fever Mode
    if (feverCount >= 3) {
      multiplier = 3;
      setFeverCount(0);
    }
    
    // Diamonds power-up
    if (suitPowerUp === 'DIAMONDS') {
      multiplier *= 2;
      setSuitPowerUp(null);
    }
    
    if (card1ValueIndex > card2ValueIndex) {
      const points = 1 * multiplier;
      setComputerScore(prev => prev + points);
      setPrisonerPile(prev => prev + 1);
      setFeverCount(0);
      
      // Spades power-up - steal point
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
      
      // Apply suit power-ups for player wins
      applySuitPowerUp(card2.suit);
      
      // Spades power-up - steal point
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
      
      // War - risk it for prisoners
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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 p-8 relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: '1s'
              }}
            >
              {['🎉', '⭐', '✨', '🎊'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-yellow-400 mb-4 drop-shadow-lg">
            {header}
          </h1>
          
          <div className="flex justify-center gap-4 items-center mb-4">
            <button
              onClick={handleNewDeck}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition"
            >
              New Deck
            </button>
            <button
              onClick={drawCards}
              disabled={drawDisabled}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition"
            >
              Draw Cards
            </button>
            <button
              onClick={() => setReverseMode(!reverseMode)}
              className={`${reverseMode ? 'bg-purple-600' : 'bg-gray-600'} hover:opacity-80 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition flex items-center gap-2`}
            >
              <RotateCcw size={20} />
              {reverseMode ? 'Reverse ON' : 'Normal'}
            </button>
          </div>
          
          <p className="text-white text-lg">Remaining cards: {remaining}</p>
        </div>

        {/* Special Indicators */}
        <div className="flex justify-center gap-6 mb-6">
          {prisonerPile > 0 && (
            <div className="bg-red-900 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Shield size={20} />
              <span className="font-semibold">Prisoners: {prisonerPile}</span>
            </div>
          )}
          
          {feverCount > 0 && (
            <div className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
              <Flame size={20} />
              <span className="font-semibold">Fever: {feverCount}/3</span>
            </div>
          )}
          
          {suitPowerUp && (
            <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Zap size={20} />
              <span className="font-semibold">Next: 2x Points!</span>
            </div>
          )}
        </div>

        {/* Cards Display */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="text-center">
            <div className={`bg-white/10 backdrop-blur rounded-xl p-6 ${cardShake ? 'animate-bounce' : ''}`}>
              <h3 className="text-2xl font-bold text-red-400 mb-4 flex items-center justify-center gap-2">
                💻 Computer
                {cards[0] && <span className="text-sm">{getSuitIcon(cards[0].suit)}</span>}
              </h3>
              {cards[0] ? (
                <img src={cards[0].image} alt="Computer card" className="w-full rounded-lg shadow-2xl" />
              ) : (
                <div className="w-full h-80 bg-green-800 rounded-lg flex items-center justify-center">
                  <span className="text-6xl">🃏</span>
                </div>
              )}
              <div className="mt-4 text-white">
                <p className="text-3xl font-bold">{computerScore}</p>
                {cards[0] && (
                  <p className="text-sm text-yellow-300">{getSuitPowerText(cards[0].suit)}</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className={`bg-white/10 backdrop-blur rounded-xl p-6 ${cardShake ? 'animate-bounce' : ''}`}>
              <h3 className="text-2xl font-bold text-blue-400 mb-4 flex items-center justify-center gap-2">
                👤 You
                {cards[1] && <span className="text-sm">{getSuitIcon(cards[1].suit)}</span>}
              </h3>
              {cards[1] ? (
                <img src={cards[1].image} alt="Your card" className="w-full rounded-lg shadow-2xl" />
              ) : (
                <div className="w-full h-80 bg-green-800 rounded-lg flex items-center justify-center">
                  <span className="text-6xl">🃏</span>
                </div>
              )}
              <div className="mt-4 text-white">
                <p className="text-3xl font-bold">{myScore}</p>
                <div className="flex justify-center gap-1 mt-2">
                  {[...Array(lives)].map((_, i) => (
                    <span key={i} className="text-red-500">❤️</span>
                  ))}
                </div>
                {cards[1] && (
                  <p className="text-sm text-yellow-300">{getSuitPowerText(cards[1].suit)}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Power-up Legend */}
        <div className="bg-white/10 backdrop-blur rounded-lg p-4 text-white text-sm">
          <h4 className="font-bold mb-2">Suit Powers:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>♥️ Hearts: +1 Life</div>
            <div>♠️ Spades: Steal 1 Point</div>
            <div>♦️ Diamonds: 2x Next Win</div>
            <div>♣️ Clubs: Skip Opponent Turn</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes victoryDance {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(5deg); }
          75% { transform: rotate(-5deg); }
        }
      `}</style>
    </div>
  );
}
