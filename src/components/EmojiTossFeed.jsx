import { useEffect, useRef, useState } from 'react';
import {
  Card,
  CardBody,
  Title,
  Stack,
  StackItem,
  List,
  ListItem,
} from '@patternfly/react-core';
import './EmojiTossFeed.css';

function EmojiTossFeed({ tosses }) {
  const [activeTosses, setActiveTosses] = useState([]);
  const feedEndRef = useRef(null);

  useEffect(() => {
    if (!tosses) {
      setActiveTosses([]);
      return;
    }

    const now = Date.now();
    const active = Object.entries(tosses)
      .filter(([_, toss]) => toss.expiresAt > now)
      .map(([id, toss]) => ({
        id,
        ...toss,
        // Calculate opacity based on time remaining
        timeRemaining: toss.expiresAt - now,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    setActiveTosses(active);

    // Auto-scroll to bottom when new tosses arrive
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tosses]);

  if (activeTosses.length === 0) {
    return null;
  }

  return (
    <Card isCompact>
      <CardBody>
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h3" size="lg">
              Emoji Tosses
            </Title>
          </StackItem>
          <StackItem>
            <div className="emoji-toss-feed-container">
              <List isPlain>
                {activeTosses.map((toss) => {
                  // Calculate fade based on time remaining (fade in last 1.5 seconds)
                  const fadeClass = toss.timeRemaining < 1500 ? 'fading-out' : 'visible';

                  return (
                    <ListItem key={toss.id} className={`emoji-toss-item ${fadeClass}`}>
                      <span className="emoji-toss-content">
                        <span className="emoji-toss-emoji">{toss.emoji}</span>
                        <span className="emoji-toss-text">
                          <strong>{toss.from}</strong> → <strong>{toss.to}</strong>
                        </span>
                      </span>
                    </ListItem>
                  );
                })}
                <div ref={feedEndRef} />
              </List>
            </div>
          </StackItem>
        </Stack>
      </CardBody>
    </Card>
  );
}

export default EmojiTossFeed;
