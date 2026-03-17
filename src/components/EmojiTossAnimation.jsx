import { useEffect, useState } from 'react';
import './EmojiTossAnimation.css';

function EmojiTossAnimation({ tosses }) {
  const [flyingEmojis, setFlyingEmojis] = useState([]);
  const [processedTosses, setProcessedTosses] = useState(new Set());

  useEffect(() => {
    if (!tosses) return;

    // Find new tosses that haven't been animated yet
    const newTosses = Object.entries(tosses)
      .filter(([id, _]) => !processedTosses.has(id))
      .map(([id, toss]) => ({ id, ...toss }));

    if (newTosses.length === 0) return;

    // Add new flying emojis
    newTosses.forEach((toss) => {
      const flyingEmoji = {
        id: toss.id,
        emoji: toss.emoji,
        from: toss.from,
        to: toss.to,
        // Random vertical starting position for variety
        startY: Math.random() * 40 + 30, // 30-70%
      };

      setFlyingEmojis((prev) => [...prev, flyingEmoji]);
      setProcessedTosses((prev) => new Set([...prev, toss.id]));

      // Remove after animation completes (2 seconds)
      setTimeout(() => {
        setFlyingEmojis((prev) => prev.filter((e) => e.id !== toss.id));
      }, 2000);
    });
  }, [tosses, processedTosses]);

  // Cleanup processed tosses that no longer exist
  useEffect(() => {
    if (!tosses) {
      setProcessedTosses(new Set());
      return;
    }

    const currentTossIds = new Set(Object.keys(tosses));
    setProcessedTosses((prev) => {
      const updated = new Set([...prev].filter((id) => currentTossIds.has(id)));
      return updated;
    });
  }, [tosses]);

  return (
    <div className="emoji-toss-animation-container">
      {flyingEmojis.map((flying) => (
        <div
          key={flying.id}
          className="flying-emoji"
          style={{ top: `${flying.startY}%` }}
        >
          <div className="flying-emoji-content">
            <span className="flying-emoji-icon">{flying.emoji}</span>
            <div className="flying-emoji-labels">
              <span className="flying-emoji-from">{flying.from}</span>
              <span className="flying-emoji-arrow">→</span>
              <span className="flying-emoji-to">{flying.to}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default EmojiTossAnimation;
