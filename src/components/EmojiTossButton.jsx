import { useState } from 'react';
import {
  Button,
  Popover,
  Grid,
  GridItem,
  Title,
  Alert,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { sendEmojiToss } from '../utils/emojiTossHelpers';

const EMOJI_OPTIONS = ['✅', '👍', '🎉', '🔥', '⭐', '💯', '🚀', '💪', '🎯', '👏', '🌟', '❤️'];

function EmojiTossButton({ fromUser, toUser, roomCode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastTossTime, setLastTossTime] = useState(0);
  const [rateLimitMessage, setRateLimitMessage] = useState('');

  const handleEmojiToss = async (emoji) => {
    const now = Date.now();
    const timeSinceLastToss = now - lastTossTime;

    // Rate limiting: 1 toss per second
    if (timeSinceLastToss < 1000) {
      setRateLimitMessage('Please wait before sending another emoji');
      setTimeout(() => setRateLimitMessage(''), 2000);
      return;
    }

    try {
      await sendEmojiToss(roomCode, fromUser, toUser, emoji);
      setLastTossTime(now);
      setIsOpen(false);
      setRateLimitMessage('');
    } catch (error) {
      console.error('Error sending emoji toss:', error);
      setRateLimitMessage('Failed to send emoji');
      setTimeout(() => setRateLimitMessage(''), 2000);
    }
  };

  return (
    <Popover
      isVisible={isOpen}
      shouldClose={() => setIsOpen(false)}
      shouldOpen={() => setIsOpen(true)}
      headerContent="Toss an emoji"
      bodyContent={
        <Stack hasGutter>
          {rateLimitMessage && (
            <StackItem>
              <Alert
                variant="warning"
                title={rateLimitMessage}
                isInline
                isPlain
              />
            </StackItem>
          )}
          <StackItem>
            <Grid hasGutter>
              {EMOJI_OPTIONS.map((emoji) => (
                <GridItem span={3} key={emoji}>
                  <Button
                    variant="plain"
                    onClick={() => handleEmojiToss(emoji)}
                  >
                    <Title headingLevel="h3" size="xl">{emoji}</Title>
                  </Button>
                </GridItem>
              ))}
            </Grid>
          </StackItem>
        </Stack>
      }
    >
      <Button variant="plain" size="sm">
        <Title headingLevel="h4" size="md">💌</Title>
      </Button>
    </Popover>
  );
}

export default EmojiTossButton;
