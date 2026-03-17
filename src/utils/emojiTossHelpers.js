import { ref, set, remove } from 'firebase/database';
import { database } from '../services/firebase';

/**
 * Send an emoji toss from one participant to another
 * @param {string} roomCode - The room code
 * @param {string} from - Sender's username
 * @param {string} to - Recipient's username
 * @param {string} emoji - The emoji to send
 */
export const sendEmojiToss = async (roomCode, from, to, emoji) => {
  const timestamp = Date.now();
  const tossId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  const tossRef = ref(database, `rooms/${roomCode}/emojiTosses/${tossId}`);

  await set(tossRef, {
    from,
    to,
    emoji,
    timestamp,
    expiresAt: timestamp + 5000, // 5 seconds
  });
};

/**
 * Remove expired emoji tosses
 * @param {string} roomCode - The room code
 * @param {Object} tosses - Current tosses object from Firebase
 */
export const cleanupExpiredTosses = async (roomCode, tosses) => {
  if (!tosses) return;

  const now = Date.now();
  const expiredTosses = Object.entries(tosses)
    .filter(([_, toss]) => toss.expiresAt <= now)
    .map(([id]) => id);

  const removePromises = expiredTosses.map((tossId) => {
    const tossRef = ref(database, `rooms/${roomCode}/emojiTosses/${tossId}`);
    return remove(tossRef);
  });

  await Promise.all(removePromises);
};
