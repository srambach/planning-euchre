/**
 * Badge definitions and calculation logic for achievement system
 */

export const BADGE_DEFINITIONS = {
  'first-to-vote': {
    id: 'first-to-vote',
    label: 'First to Vote!',
    color: 'gold',
    description: 'First person to cast a vote in this round',
  },
  'speed-demon': {
    id: 'speed-demon',
    label: 'Speed Demon',
    color: 'blue',
    description: 'Voted within 3 seconds of issue update',
  },
  'consensus-builder': {
    id: 'consensus-builder',
    label: 'Consensus Builder',
    color: 'green',
    description: 'Matched the average vote 3+ times',
  },
  'optimist': {
    id: 'optimist',
    label: 'Optimist',
    color: 'purple',
    description: 'Consistently votes for higher estimates',
  },
  'minimalist': {
    id: 'minimalist',
    label: 'Minimalist',
    color: 'orange',
    description: 'Consistently votes for lower estimates',
  },
};

/**
 * Check if a participant should receive the "First to Vote" badge
 * @param {string} userName - The participant's name
 * @param {Object} participants - All participants
 * @param {number} voteTime - Timestamp when the vote was cast
 * @returns {boolean}
 */
export const checkFirstToVote = (userName, participants, voteTime) => {
  // Get all participants who have voted
  const votedParticipants = Object.entries(participants)
    .filter(([name, p]) => p.vote !== null && name !== userName)
    .map(([_, p]) => p.voteHistory?.lastVoteTime || Infinity);

  // If no one else has voted yet, or this vote is earlier than all others
  if (votedParticipants.length === 0 || votedParticipants.every(time => voteTime < time)) {
    return true;
  }

  return false;
};

/**
 * Check if a participant should receive the "Speed Demon" badge
 * @param {number} voteTime - Timestamp when the vote was cast
 * @param {number} issueUpdateTime - Timestamp when the issue was last updated
 * @returns {boolean}
 */
export const checkSpeedDemon = (voteTime, issueUpdateTime) => {
  const timeDiff = voteTime - issueUpdateTime;
  return timeDiff <= 3000; // 3 seconds
};

/**
 * Check voting consistency for Optimist/Minimalist badges
 * @param {Object} participant - The participant object
 * @param {Object} allParticipants - All participants
 * @returns {Object} - { optimist: boolean, minimalist: boolean }
 */
export const checkConsistency = (participant, allParticipants) => {
  const votes = participant.voteHistory?.votes || [];
  // Firebase stores arrays as objects, so convert to array if needed
  const voteHistory = Array.isArray(votes) ? votes : Object.values(votes);

  // Need at least 3 votes to determine consistency
  if (voteHistory.length < 3) {
    return { optimist: false, minimalist: false };
  }

  // Calculate average vote across all participants for each round
  const recentVotes = voteHistory.slice(-3); // Last 3 votes
  let higherCount = 0;
  let lowerCount = 0;

  recentVotes.forEach((vote) => {
    const roundAverage = vote.roundAverage;
    if (!roundAverage) return;

    if (vote.value > roundAverage) {
      higherCount++;
    } else if (vote.value < roundAverage) {
      lowerCount++;
    }
  });

  return {
    optimist: higherCount >= 3,
    minimalist: lowerCount >= 3,
  };
};

/**
 * Check if a participant should receive the "Consensus Builder" badge
 * @param {Object} participant - The participant object
 * @returns {boolean}
 */
export const checkConsensusBuilder = (participant) => {
  const votes = participant.voteHistory?.votes || [];
  // Firebase stores arrays as objects, so convert to array if needed
  const voteHistory = Array.isArray(votes) ? votes : Object.values(votes);

  // Count how many times the participant's vote matched the average
  let matchCount = 0;

  voteHistory.forEach((vote) => {
    if (vote.roundAverage && Math.abs(vote.value - vote.roundAverage) < 0.5) {
      matchCount++;
    }
  });

  return matchCount >= 3;
};

/**
 * Calculate which badges a participant should receive
 * @param {string} userName - The participant's name
 * @param {Object} participant - The participant object
 * @param {Object} allParticipants - All participants in the room
 * @param {number} voteTime - Timestamp when the vote was cast
 * @param {number} issueUpdateTime - Timestamp when the issue was last updated
 * @param {number} roundAverage - Average vote for the current round
 * @returns {string[]} - Array of badge IDs
 */
export const calculateBadges = (
  userName,
  participant,
  allParticipants,
  voteTime,
  issueUpdateTime,
  roundAverage
) => {
  const badges = [];

  // Check First to Vote
  if (checkFirstToVote(userName, allParticipants, voteTime)) {
    badges.push('first-to-vote');
  }

  // Check Speed Demon
  if (issueUpdateTime && checkSpeedDemon(voteTime, issueUpdateTime)) {
    badges.push('speed-demon');
  }

  // Check Consensus Builder
  if (checkConsensusBuilder(participant)) {
    badges.push('consensus-builder');
  }

  // Check Optimist/Minimalist
  const consistency = checkConsistency(participant, allParticipants);
  if (consistency.optimist) {
    badges.push('optimist');
  }
  if (consistency.minimalist) {
    badges.push('minimalist');
  }

  return badges;
};

/**
 * Update vote history for a participant
 * @param {Object} participant - The participant object
 * @param {number} vote - The vote value
 * @param {number} roundAverage - Average vote for the round (if revealed)
 * @returns {Object} - Updated voteHistory
 */
export const updateVoteHistory = (participant, vote, roundAverage = null) => {
  const voteHistory = participant.voteHistory || {
    votes: [],
    totalVotes: 0,
  };

  const voteEntry = {
    value: vote,
    timestamp: Date.now(),
  };

  // Add roundAverage if provided (when votes are revealed)
  if (roundAverage !== null) {
    voteEntry.roundAverage = roundAverage;
  }

  // Firebase stores arrays as objects, so we need to convert back to array
  const votesArray = Array.isArray(voteHistory.votes)
    ? voteHistory.votes
    : Object.values(voteHistory.votes || {});

  return {
    votes: [...votesArray, voteEntry],
    totalVotes: voteHistory.totalVotes + 1,
    lastVoteTime: Date.now(),
  };
};
