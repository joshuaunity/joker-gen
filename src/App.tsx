import { useState } from 'react';
import type { CSSProperties } from 'react';
import './App.css'; // Make sure you have this file with the keyframes animation

// --- CONFIGURATION ---
const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: { [key: string]: number } = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

interface CardType {
  rank: string;
  suit: string;
  color: string;
  isJoker: boolean;
}

interface TaskParams {
  count?: number | number[];
  royalRanks?: string[];
  sum?: number | number[];
  rank?: string | string[];
  blackSuits?: string[];
  [key: string]: any;
}

interface TaskTemplate {
  template: string;
  params?: TaskParams;
  check: (hand: CardType[], params?: any) => boolean;
}

// --- DYNAMIC TASK GENERATION ---

// Task templates with placeholders that will be filled dynamically
const TASK_TEMPLATES: TaskTemplate[] = [
  {
    template: "Find a Pair of Even Ranks",
    check: (hand: CardType[]) => {
      const evenRanks = RANKS.filter(rank => RANK_VALUES[rank] % 2 === 0);
      return hand.some(card => card.isJoker === false && evenRanks.includes(card.rank)) &&
             hand.filter(card => card.isJoker === false && evenRanks.includes(card.rank)).length >= 2;
    }
  },
  {
    template: "Find exactly {{count}} Heart cards",
    params: { count: [3] },
    check: (hand: CardType[], params: any) => {
      return hand.filter(card => card.suit === '♥').length === params.count;
    }
  },
  {
    template: "Find a Joker",
    check: (hand: CardType[]) => {
      return hand.some(card => card.isJoker);
    }
  },
  {
    template: "Find a Royal Pair ({{royalRanks}})",
    params: { royalRanks: ['J', 'Q', 'K', 'A'] },
    check: (hand: CardType[], params: any) => {
      const royalCards = hand.filter(card => card.isJoker === false && params.royalRanks.includes(card.rank));
      return royalCards.length >= 2;
    }
  },
  {
    template: "Find two cards that add up to {{sum}}",
    params: { sum: [10, 12, 15, 16] }, // Example sums
    check: (hand: CardType[], params: any) => {
      const cardsWithValue = hand.filter(card => card.isJoker === false);
      for (let i = 0; i < cardsWithValue.length; i++) {
        for (let j = i + 1; j < cardsWithValue.length; j++) {
          if (RANK_VALUES[cardsWithValue[i].rank] + RANK_VALUES[cardsWithValue[j].rank] === params.sum) {
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    template: "Find a Flush ({{count}} cards of the same suit)",
    params: { count: [3, 4] },
    check: (hand: CardType[], params: any) => {
      const suitCounts: { [key: string]: number } = {};
      for (const card of hand) {
        if (card.isJoker === false) {
          suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
        }
      }
      return Object.values(suitCounts).some((count: any) => count >= params.count);
    }
  },
  {
    template: "Find a pair of {{rank}}s",
    params: { rank: RANKS.filter(r => r !== 'Joker' && r !== 'A' && r !== 'K' && r !== 'Q') }, // Exclude face cards and Jokers for "pair" tasks
    check: (hand: CardType[], params: any) => {
      return hand.filter(card => card.rank === params.rank).length >= 2;
    }
  },
  {
    template: "Find a Black Jack (a Jack of {{blackSuits}})",
    params: { blackSuits: ['♣', '♠'] },
    check: (hand: CardType[], params: any) => {
      return hand.some(card => card.rank === 'J' && params.blackSuits.includes(card.suit));
    }
  },
  {
    template: "Find a Red Queen",
    check: (hand: CardType[]) => {
      return hand.some(card => card.rank === 'Q' && (card.suit === '♥' || card.suit === '♦'));
    }
  },
  {
    template: "Find {{count}} Odd numbered cards",
    params: { count: [3] },
    check: (hand: CardType[], params: any) => {
      const oddRanks = RANKS.filter(rank => RANK_VALUES[rank] % 2 !== 0);
      return hand.filter(card => card.isJoker === false && oddRanks.includes(card.rank)).length >= params.count;
    }
  },
  // Add more templates here!
  // Example: "Find a card with rank {{rank}}"
  // Example: "Find {{count}} cards of the same color"
];

function App() {
  const [hand, setHand] = useState<CardType[]>([]);
  const [currentTask, setCurrentTask] = useState<{ text: string, checkFn: (hand: CardType[], params?: any) => boolean, params: any }>({ text: "Click 'New Mission' to start!", checkFn: () => false, params: {} });
  const [isShuffling, setIsShuffling] = useState(false);

  // Helper: Generate a fresh 54-card deck
  const getFreshDeck = () => {
    let deck: CardType[] = [];
    SUITS.forEach(suit => {
      RANKS.forEach(rank => {
        deck.push({
          rank,
          suit,
          color: (suit === '♥' || suit === '♦') ? 'red' : 'black',
          isJoker: false
        });
      });
    });
    deck.push({ rank: 'Joker', suit: '★', color: 'purple', isJoker: true });
    deck.push({ rank: 'Joker', suit: '★', color: 'purple', isJoker: true });
    return deck;
  };

  // Helper: Fisher-Yates Shuffle Algorithm
  const shuffleDeck = (deck: CardType[]) => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  };

  // Function to pick a random element from an array, handling nested arrays for params
  const getRandomParamValue = (param: any) => {
    if (Array.isArray(param)) {
      // If it's an array, pick one random element from it
      return param[Math.floor(Math.random() * param.length)];
    }
    return param; // If not an array, return as is
  };

  // Action: Pick a new Task
  const generateTask = () => {
    setIsShuffling(true); // Briefly disable button while generating task
    setHand([]); // Clear hand when getting a new task

    setTimeout(() => {
      const templateItem = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)];
      let taskText = templateItem.template;
      let taskParams: any = {};

      // Process placeholders if they exist
      if (templateItem.params) {
        for (const paramKey in templateItem.params) {
          const randomValue = getRandomParamValue(templateItem.params[paramKey]);
          taskParams[paramKey] = randomValue;
          // Replace placeholders like {{key}} in the template string
          const regex = new RegExp(`{{${paramKey}}}`, 'g');
          taskText = taskText.replace(regex, randomValue);
        }
      }
      
      // Handle special cases for display (e.g., join arrays for display)
      if (taskText.includes("Royal Pair") && taskParams.royalRanks) {
          taskText = taskText.replace('{{royalRanks}}', taskParams.royalRanks.join(', '));
      }
      if (taskText.includes("Flush") && taskParams.count) {
          taskText = taskText.replace('{{count}}', taskParams.count);
      }
      if (taskText.includes("add up to") && taskParams.sum) {
          taskText = taskText.replace('{{sum}}', taskParams.sum);
      }
      if (taskText.includes("Odd numbered cards") && taskParams.count) {
           taskText = taskText.replace('{{count}}', taskParams.count);
      }
      if (taskText.includes("pair of") && taskParams.rank) {
          taskText = taskText.replace('{{rank}}', taskParams.rank);
      }
      if (taskText.includes("Black Jack") && taskParams.blackSuits) {
          taskText = taskText.replace('{{blackSuits}}', taskParams.blackSuits.join(', '));
      }
      if (taskText.includes("Heart cards") && taskParams.count) {
           taskText = taskText.replace('{{count}}', taskParams.count);
      }


      // Update state with the new task text, its check function, and its parameters
      setCurrentTask({
        text: taskText,
        checkFn: templateItem.check,
        params: taskParams
      });
      setIsShuffling(false); // Re-enable button
    }, 300); // Small delay for visual effect
  };

  // Action: Deal random number of cards (2 to 5)
  const dealHand = () => {
    setIsShuffling(true);
    setHand([]); // Clear board momentarily

    setTimeout(() => {
      const deck = shuffleDeck(getFreshDeck());
      const numCardsToDeal = Math.floor(Math.random() * 4) + 2; // Random number between 2 and 5
      const newHand = deck.slice(0, numCardsToDeal);
      setHand(newHand);
      setIsShuffling(false);
    }, 400); // Small delay for visual effect
  };

  // Function to check if the current hand satisfies the current task
  const checkHandForTask = () => {
    if (!currentTask.checkFn || hand.length === 0) return false;
    return currentTask.checkFn(hand, currentTask.params);
  };

  const isTaskCompleted = checkHandForTask();

  return (
    <div style={styles.table}>
      <div style={styles.header}>
        <h1 style={styles.title}>Card Scavenger Hunt</h1>
        
        <div style={styles.taskBox}>
          <div style={styles.taskLabel}>CURRENT MISSION:</div>
          <div style={styles.taskText}>{currentTask.text}</div>
          <button onClick={generateTask} style={styles.smallButton} disabled={isShuffling}>
            🔄 New Mission
          </button>
        </div>
      </div>

      <div style={styles.handContainer}>
        {hand.length === 0 && !isShuffling && (
          <div style={styles.placeholderText}>Deal cards to attempt the mission...</div>
        )}
        
        {hand.map((card, index) => (
          <Card key={index} card={card} index={index} />
        ))}
      </div>

      <div style={styles.controls}>
        <button 
          onClick={dealHand} 
          style={{
            ...styles.dealButton,
            backgroundColor: isTaskCompleted ? '#34d399' : '#fbbf24', // Green if completed, gold otherwise
            color: isTaskCompleted ? '#1c3b2f' : '#451a03',
            boxShadow: isTaskCompleted ? '0 6px 0 #10b981, 0 10px 10px rgba(0,0,0,0.3)' : '0 6px 0 #b45309, 0 10px 10px rgba(0,0,0,0.3)'
          }}
          disabled={isShuffling}
        >
          {isShuffling ? 'Shuffling...' : `Deal Cards`}
        </button>
        {isTaskCompleted && hand.length > 0 && (
            <div style={styles.completionMessage}>✅ Mission Accomplished!</div>
        )}
      </div>
    </div>
  );
}

// Sub-component for a single card
const Card = ({ card, index }: { card: CardType, index: number }) => {
  return (
    <div 
      style={{
        ...styles.card, 
        color: card.color,
        animation: `slideIn 0.3s ease-out ${index * 0.1}s backwards` 
      }}
    >
      <div style={styles.cardTop}>{card.rank}</div>
      <div style={styles.cardSuit}>{card.suit}</div>
      <div style={styles.cardBottom}>{card.rank}</div>
    </div>
  );
};

// --- CSS Styles (JS Objects) ---
const styles: { [key: string]: CSSProperties } = {
  table: {
    minHeight: '100vh',
    backgroundColor: '#0f5132', // Classic Poker Table Green
    backgroundImage: 'radial-gradient(#146c43, #0f5132)',
    fontFamily: 'Segoe UI, Roboto, Helvetica, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    color: 'white',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    width: '100%',
    maxWidth: '600px',
  },
  title: {
    margin: '0 0 20px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  },
  taskBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '20px',
    borderRadius: '15px',
    border: '2px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
  },
  taskLabel: {
    fontSize: '0.9rem',
    color: '#86efac', // Light green
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: 'bold',
  },
  taskText: {
    fontSize: '1.2rem', // Slightly smaller font for longer tasks
    fontWeight: 'bold',
    textAlign: 'center',
    minHeight: '40px', // Ensure consistent height for text to prevent layout shifts
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: {
    marginTop: '10px',
    padding: '5px 15px',
    fontSize: '0.9rem',
    background: 'transparent',
    border: '1px solid white',
    color: 'white',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  smallButtonHover: { // For hover effect on small button
    backgroundColor: 'white',
    color: '#0f5132',
  },
  handContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '15px',
    minHeight: '220px', 
    marginBottom: '30px',
    perspective: '1000px',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    marginTop: '80px',
  },
  card: {
    width: '100px',
    height: '150px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '8px',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    position: 'relative',
    userSelect: 'none',
  },
  cardTop: {
    alignSelf: 'flex-start',
    lineHeight: '1',
  },
  cardSuit: {
    alignSelf: 'center',
    fontSize: '3rem',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  cardBottom: {
    alignSelf: 'flex-end',
    transform: 'rotate(180deg)',
    lineHeight: '1',
  },
  controls: {
    marginTop: 'auto',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
  },
  dealButton: {
    padding: '15px 40px',
    fontSize: '1.3rem', // Slightly smaller for more card flexibility
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'transform 0.1s, box-shadow 0.1s, background 0.3s, color 0.3s',
    minWidth: '200px', // Ensure button doesn't shrink too much
  },
  completionMessage: {
    color: '#34d399', // Green
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginTop: '10px',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  }
};

export default App;