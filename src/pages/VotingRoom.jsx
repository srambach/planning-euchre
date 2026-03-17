import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Card,
  CardBody,
  Button,
  Grid,
  GridItem,
  Form,
  FormGroup,
  TextInput,
  List,
  ListItem,
  Label,
  Alert,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Gallery,
  Popover,
} from '@patternfly/react-core';
import { ref, onValue, update, set } from 'firebase/database';
import { database } from '../services/firebase';
import ThemeSwitcher from '../components/ThemeSwitcher';
import EmojiTossButton from '../components/EmojiTossButton';
import EmojiTossFeed from '../components/EmojiTossFeed';
import EmojiTossAnimation from '../components/EmojiTossAnimation';
import BadgeDisplay from '../components/BadgeDisplay';
import { cleanupExpiredTosses } from '../utils/emojiTossHelpers';
import { calculateBadges, updateVoteHistory } from '../utils/badgeSystem';

const FIBONACCI_VALUES = [1, 2, 3, 5, 8, 13, 21, 40, 100];
const EMOJI_OPTIONS = ['✅', '👍', '🎉', '🔥', '⭐', '💯', '🚀', '💪', '🎯', '👏', '🌟', '❤️'];

function VotingRoom() {
  const { roomCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userName = searchParams.get('user');

  const [roomData, setRoomData] = useState(null);
  const [currentIssue, setCurrentIssue] = useState('');
  const [myVote, setMyVote] = useState(null);
  const [error, setError] = useState(null);
  const [myEmoji, setMyEmoji] = useState('✅');
  const [customEmoji, setCustomEmoji] = useState('');
  const [emojiTosses, setEmojiTosses] = useState(null);
  const [issueUpdateTime, setIssueUpdateTime] = useState(Date.now());

  useEffect(() => {
    if (!userName) {
      navigate('/');
      return;
    }

    const roomRef = ref(database, `rooms/${roomCode}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setError('Room not found');
        return;
      }

      setRoomData(data);
      setCurrentIssue(data.currentIssue || '');
      setEmojiTosses(data.emojiTosses || null);

      // Add user to participants if not already there
      if (!data.participants?.[userName]) {
        const updates = {};
        updates[`rooms/${roomCode}/participants/${userName}`] = {
          name: userName,
          vote: null,
          isModerator: false,
          emoji: '✅',
          badges: [],
          voteHistory: {
            votes: [],
            totalVotes: 0,
          },
        };
        update(ref(database), updates);
      }

      // Update my vote and emoji from database
      if (data.participants?.[userName]?.vote !== undefined) {
        setMyVote(data.participants[userName].vote);
      }
      if (data.participants?.[userName]?.emoji) {
        setMyEmoji(data.participants[userName].emoji);
      }
    }, (error) => {
      console.error('Firebase error:', error);
      setError('Failed to connect to session');
    });

    // Cleanup expired tosses every second
    const cleanupInterval = setInterval(() => {
      if (emojiTosses) {
        cleanupExpiredTosses(roomCode, emojiTosses);
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [roomCode, userName, navigate]);

  const castVote = async (value) => {
    const voteTime = Date.now();
    const participant = roomData?.participants?.[userName] || {};
    const allParticipants = roomData?.participants || {};

    // Update vote history
    const newVoteHistory = updateVoteHistory(participant, value);

    // Calculate badges
    const newBadges = calculateBadges(
      userName,
      { ...participant, voteHistory: newVoteHistory },
      allParticipants,
      voteTime,
      issueUpdateTime,
      null // roundAverage not available until votes are revealed
    );

    // Update Firebase with vote, vote history, and badges
    const updates = {};
    updates[`rooms/${roomCode}/participants/${userName}/vote`] = value;
    updates[`rooms/${roomCode}/participants/${userName}/voteHistory`] = newVoteHistory;
    updates[`rooms/${roomCode}/participants/${userName}/badges`] = newBadges;

    await update(ref(database), updates);
    setMyVote(value);
  };

  const revealVotes = async () => {
    const revealRef = ref(database, `rooms/${roomCode}/votesRevealed`);
    await set(revealRef, true);
  };

  const clearVotes = async () => {
    if (!roomData?.participants) return;

    const updates = {};
    Object.keys(roomData.participants).forEach((participant) => {
      updates[`rooms/${roomCode}/participants/${participant}/vote`] = null;
      updates[`rooms/${roomCode}/participants/${participant}/badges`] = [];
    });
    updates[`rooms/${roomCode}/votesRevealed`] = false;

    await update(ref(database), updates);
    setMyVote(null);
  };

  const updateIssue = async () => {
    const issueRef = ref(database, `rooms/${roomCode}/currentIssue`);
    await set(issueRef, currentIssue);
    setIssueUpdateTime(Date.now());
  };

  const updateEmoji = async (emoji) => {
    const emojiRef = ref(database, `rooms/${roomCode}/participants/${userName}/emoji`);
    await set(emojiRef, emoji);
    setMyEmoji(emoji);
  };

  if (error) {
    return (
      <Page>
        <PageSection>
          <Stack hasGutter>
            <StackItem>
              <Alert variant="danger" title={error} />
            </StackItem>
            <StackItem>
              <Button onClick={() => navigate('/')}>Go Home</Button>
            </StackItem>
          </Stack>
        </PageSection>
      </Page>
    );
  }

  if (!roomData) {
    return (
      <Page>
        <PageSection>
          <Title headingLevel="h2">Loading...</Title>
        </PageSection>
      </Page>
    );
  }

  const participants = roomData.participants || {};
  const isModerator = participants[userName]?.isModerator;
  const allVoted = Object.values(participants).every((p) => p.vote !== null);
  const votesRevealed = roomData.votesRevealed;

  const voteStats = votesRevealed
    ? Object.values(participants)
        .map((p) => p.vote)
        .filter((v) => v !== null && v !== undefined)
    : [];

  const average = voteStats.length > 0
    ? (voteStats.reduce((a, b) => a + b, 0) / voteStats.length).toFixed(1)
    : null;

  return (
    <>
      <EmojiTossAnimation tosses={emojiTosses} />
      <Page>
        <PageSection variant="light">
        <Split hasGutter>
          <SplitItem isFilled>
            <Title headingLevel="h1" size="2xl">
              {roomData.sessionName}
            </Title>
            <p>Room Code: <strong>{roomCode}</strong></p>
          </SplitItem>
          <SplitItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Label color="blue">Logged in as: {userName}</Label>
              </FlexItem>
              <FlexItem>
                <ThemeSwitcher />
              </FlexItem>
            </Flex>
          </SplitItem>
        </Split>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          <GridItem span={8}>
            <Stack hasGutter>
              <StackItem>
                <Card>
                  <CardBody>
                    <Title headingLevel="h2" size="xl">
                      Current Issue
                    </Title>
                    <Form>
                      <FormGroup>
                        <TextInput
                          id="current-issue"
                          value={currentIssue}
                          onChange={(_e, value) => setCurrentIssue(value)}
                          placeholder="Enter issue description"
                        />
                      </FormGroup>
                      {isModerator && (
                        <Button variant="secondary" onClick={updateIssue}>
                          Update Issue
                        </Button>
                      )}
                    </Form>
                  </CardBody>
                </Card>
              </StackItem>

              <StackItem>
                <Card>
                  <CardBody>
                    <Stack hasGutter>
                      <StackItem>
                        <Title headingLevel="h3" size="lg">
                          Cast Your Vote
                        </Title>
                      </StackItem>
                      <StackItem>
                        <Grid hasGutter>
                          {FIBONACCI_VALUES.map((value) => (
                            <GridItem span={2} key={value}>
                              <Button
                                variant={myVote === value ? 'primary' : 'secondary'}
                                isBlock
                                onClick={() => castVote(value)}
                              >
                                <Title headingLevel="h2" size="2xl">{value}</Title>
                              </Button>
                            </GridItem>
                          ))}
                        </Grid>
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </StackItem>

              {votesRevealed && (
                <StackItem>
                  <Card>
                    <CardBody>
                      <Stack hasGutter>
                        <StackItem>
                          <Title headingLevel="h3" size="lg">
                            Results
                          </Title>
                        </StackItem>
                        <StackItem>
                          <Gallery hasGutter minWidths={{ default: '200px' }}>
                            {Object.values(participants).map((participant) => (
                              <Card isCompact key={participant.name}>
                                <CardBody>
                                  <Stack>
                                    <StackItem>
                                      <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                                        <FlexItem>
                                          <strong>{participant.name}</strong>
                                        </FlexItem>
                                        {participant.isModerator && (
                                          <FlexItem>
                                            <Label color="gold">Moderator</Label>
                                          </FlexItem>
                                        )}
                                      </Flex>
                                    </StackItem>
                                    {participant.badges && participant.badges.length > 0 && (
                                      <StackItem>
                                        <BadgeDisplay badges={participant.badges} />
                                      </StackItem>
                                    )}
                                    <StackItem>
                                      <Title headingLevel="h1" size="3xl">
                                        {participant.vote !== null ? participant.vote : '—'}
                                      </Title>
                                    </StackItem>
                                  </Stack>
                                </CardBody>
                              </Card>
                            ))}
                          </Gallery>
                        </StackItem>
                        {average && (
                          <StackItem>
                            <Alert variant="info" title={`Average: ${average}`} />
                          </StackItem>
                        )}
                      </Stack>
                    </CardBody>
                  </Card>
                </StackItem>
              )}
            </Stack>
          </GridItem>

          <GridItem span={4}>
            <Stack hasGutter>
              {emojiTosses && (
                <StackItem>
                  <EmojiTossFeed tosses={emojiTosses} />
                </StackItem>
              )}
              <StackItem>
                <Card>
                  <CardBody>
                    <Stack hasGutter>
                      <StackItem>
                        <Title headingLevel="h3" size="lg">
                          Participants ({Object.keys(participants).length})
                        </Title>
                      </StackItem>
                      <StackItem>
                        <List isPlain>
                          {Object.values(participants).map((participant) => (
                            <ListItem key={participant.name}>
                              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                                <FlexItem>
                                  {participant.name === userName ? (
                                    <Popover
                                      headerContent="Choose your emoji"
                                      bodyContent={
                                        <Stack hasGutter>
                                          <StackItem>
                                            <Form>
                                              <FormGroup label="Custom emoji">
                                                <Flex>
                                                  <FlexItem grow={{ default: 'grow' }}>
                                                    <TextInput
                                                      id="custom-emoji"
                                                      value={customEmoji}
                                                      onChange={(_e, value) => setCustomEmoji(value)}
                                                      placeholder="Paste any emoji"
                                                    />
                                                  </FlexItem>
                                                  <FlexItem>
                                                    <Button
                                                      variant="primary"
                                                      onClick={() => {
                                                        if (customEmoji.trim()) {
                                                          updateEmoji(customEmoji.trim());
                                                          setCustomEmoji('');
                                                        }
                                                      }}
                                                    >
                                                      Set
                                                    </Button>
                                                  </FlexItem>
                                                </Flex>
                                              </FormGroup>
                                            </Form>
                                          </StackItem>
                                          <StackItem>
                                            <strong>Quick picks:</strong>
                                          </StackItem>
                                          <StackItem>
                                            <Grid hasGutter>
                                              {EMOJI_OPTIONS.map((emoji) => (
                                                <GridItem span={3} key={emoji}>
                                                  <Button
                                                    variant="plain"
                                                    onClick={() => updateEmoji(emoji)}
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
                                      <Button variant="plain">
                                        <Title headingLevel="h3" size="xl">
                                          {participant.vote !== null ? (participant.emoji || myEmoji) : '❌'}
                                        </Title>
                                      </Button>
                                    </Popover>
                                  ) : (
                                    <Title headingLevel="h3" size="xl">
                                      {participant.vote !== null ? (participant.emoji || '✅') : '❌'}
                                    </Title>
                                  )}
                                </FlexItem>
                                <FlexItem>{participant.name}</FlexItem>
                                {participant.badges && participant.badges.length > 0 && (
                                  <FlexItem>
                                    <BadgeDisplay badges={participant.badges} />
                                  </FlexItem>
                                )}
                                {participant.name !== userName && (
                                  <FlexItem>
                                    <EmojiTossButton
                                      fromUser={userName}
                                      toUser={participant.name}
                                      roomCode={roomCode}
                                    />
                                  </FlexItem>
                                )}
                                {participant.isModerator && (
                                  <FlexItem>
                                    <Label color="gold">Moderator</Label>
                                  </FlexItem>
                                )}
                              </Flex>
                            </ListItem>
                          ))}
                        </List>
                      </StackItem>
                    </Stack>
                  </CardBody>
                </Card>
              </StackItem>

              {isModerator && (
                <StackItem>
                  <Card>
                    <CardBody>
                      <Stack hasGutter>
                        <StackItem>
                          <Title headingLevel="h3" size="lg">
                            Moderator Controls
                          </Title>
                        </StackItem>
                        <StackItem>
                          <Button
                            variant="primary"
                            isBlock
                            onClick={revealVotes}
                            isDisabled={!allVoted || votesRevealed}
                          >
                            Reveal Votes
                          </Button>
                        </StackItem>
                        <StackItem>
                          <Button
                            variant="secondary"
                            isBlock
                            onClick={clearVotes}
                          >
                            Clear Votes
                          </Button>
                        </StackItem>
                        {!allVoted && !votesRevealed && (
                          <StackItem>
                            <Alert
                              variant="warning"
                              title="Waiting for all participants to vote"
                              isInline
                            />
                          </StackItem>
                        )}
                      </Stack>
                    </CardBody>
                  </Card>
                </StackItem>
              )}
            </Stack>
          </GridItem>
        </Grid>
      </PageSection>
    </Page>
    </>
  );
}

export default VotingRoom;
