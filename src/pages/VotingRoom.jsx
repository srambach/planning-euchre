import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import logo from '../assets/allycat-emoji-256.png';
import { CopyIcon } from '@patternfly/react-icons';
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
  FormSelect,
  FormSelectOption,
  List,
  ListItem,
  Label,
  Alert,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Gallery,
  Popover,
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Masthead,
  MastheadMain,
  MastheadBrand,
  MastheadLogo,
  MastheadContent,
} from '@patternfly/react-core';
import { ref, onValue, update, set, remove } from 'firebase/database';
import { database, ensureAuth } from '../services/firebase';
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
  const [issueUpdateTime, setIssueUpdateTime] = useState(() => Date.now());
  const [newUserName, setNewUserName] = useState('');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedNewModerator, setSelectedNewModerator] = useState('');
  const isLeavingRef = useRef(false);

  // Generate shareable room URL
  const shareUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/planning-euchre/room/${roomCode}`;
  }, [roomCode]);

  // Memoized values for moderator logic
  const isModerator = useMemo(
    () => roomData?.participants?.[userName]?.isModerator || false,
    [roomData, userName]
  );

  const otherParticipants = useMemo(
    () => Object.keys(roomData?.participants || {}).filter(name => name !== userName),
    [roomData, userName]
  );

  const needsModeratorSelection = useMemo(
    () => isModerator && otherParticipants.length > 0,
    [isModerator, otherParticipants]
  );

  // Modal close handler
  const handleCloseLeaveModal = useCallback(() => {
    setIsLeaveModalOpen(false);
    setSelectedNewModerator('');
  }, []);

  useEffect(() => {
    if (!userName) {
      navigate(`/?roomCode=${roomCode}`);
      return;
    }

    let unsubscribe;

    // Ensure authentication before setting up room listener
    ensureAuth().then(() => {
      const roomRef = ref(database, `rooms/${roomCode}`);

      unsubscribe = onValue(roomRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setError('Room not found');
          return;
        }

        setRoomData(data);
        setCurrentIssue(data.currentIssue || '');
        setEmojiTosses(data.emojiTosses || null);

        // Add user to participants if not already there (but not if they're leaving)
        if (!data.participants?.[userName] && !isLeavingRef.current) {
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
          await update(ref(database), updates);
        }

      // Update my vote from database (sync with Firebase, including null)
      if (data.participants?.[userName]) {
        setMyVote(data.participants[userName].vote ?? null);
      }
        if (data.participants?.[userName]?.emoji) {
          setMyEmoji(data.participants[userName].emoji);
        }
      }, (error) => {
        console.error('Firebase error:', error);
        setError('Failed to connect to session');
      });
    }).catch((error) => {
      console.error('Authentication error:', error);
      setError('Failed to authenticate');
    });

    // Cleanup expired tosses every second
    const cleanupInterval = setInterval(() => {
      if (emojiTosses) {
        cleanupExpiredTosses(roomCode, emojiTosses);
      }
    }, 1000);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearInterval(cleanupInterval);
    };
  }, [roomCode, userName, navigate, emojiTosses]);

  const castVote = async (value) => {
    // Prevent voting if votes are already revealed
    if (roomData?.votesRevealed) {
      return;
    }

    // eslint-disable-next-line react-hooks/purity
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

  const swapName = (name) => {
    // Replace "austin" with "eric" and vice versa (case-insensitive substring match)
    if (/austin/i.test(name)) {
      return name.replace(/austin/gi, 'Eric');
    } else if (/eric/i.test(name)) {
      return name.replace(/eric/gi, 'Austin');
    }
    return name;
  };

  const changeName = async () => {
    const trimmedName = newUserName.trim();
    if (!trimmedName || trimmedName === userName) {
      setNewUserName('');
      return;
    }

    // Check if name already exists
    if (roomData?.participants?.[trimmedName]) {
      alert('This name is already in use');
      return;
    }

    try {
      const currentParticipant = roomData?.participants?.[userName];
      if (!currentParticipant) return;

      const updates = {};
      // Add new participant with current data
      updates[`rooms/${roomCode}/participants/${trimmedName}`] = {
        ...currentParticipant,
        name: trimmedName,
      };
      // Remove old participant
      updates[`rooms/${roomCode}/participants/${userName}`] = null;

      await update(ref(database), updates);

      // Update URL with new name
      navigate(`/room/${roomCode}?user=${encodeURIComponent(trimmedName)}`, { replace: true });
      setNewUserName('');
    } catch (error) {
      console.error('Error changing name:', error);
      alert('Failed to change name');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      console.log('Leaving room:', roomCode, 'User:', userName);

      // Set ref to prevent re-adding during leave process
      isLeavingRef.current = true;

      // Check if this is the last participant
      const isLastParticipant = otherParticipants.length === 0;
      console.log('Is last participant?', isLastParticipant);

      if (isLastParticipant) {
        // Delete the entire room when the last person leaves
        console.log('Deleting entire room');
        const roomRef = ref(database, `rooms/${roomCode}`);
        await remove(roomRef);
        console.log('Room deleted successfully');
      } else {
        const updates = {};

        // Transfer moderator status if needed (validated by UI, not here)
        if (isModerator && selectedNewModerator) {
          console.log('Transferring moderator to:', selectedNewModerator);
          updates[`rooms/${roomCode}/participants/${selectedNewModerator}/isModerator`] = true;
        }

        // Remove current user from participants using null value
        console.log('Removing participant:', userName);
        updates[`rooms/${roomCode}/participants/${userName}`] = null;

        // Execute all updates in a single atomic operation
        await update(ref(database), updates);
        console.log('Participant removed successfully');
      }

      // Close modal and navigate
      handleCloseLeaveModal();
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      alert('Failed to leave room: ' + error.message);
    }
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
      <Page
        sidebar={null}
        masthead={
          <Masthead>
            <MastheadMain>
              <MastheadBrand>
                <MastheadLogo component="div">
                  <img src={logo} alt="Planning Euchre Logo"  />
                </MastheadLogo>
              </MastheadBrand>
            </MastheadMain>
            <MastheadContent>
              <Flex alignItems={{ default: 'alignItemsCenter' }} justifyContent={{ default: 'justifyContentSpaceBetween' }} style={{ width: '100%' }}>
                <FlexItem>
                  <Title headingLevel="h1" size="2xl">
                    {roomData.sessionName}
                  </Title>
                </FlexItem>
                <FlexItem>
                  <Toolbar>
                    <ToolbarContent>
                      <ToolbarItem>
                        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                          <FlexItem>
                            <strong>Room Code: {roomCode}</strong>
                          </FlexItem>
                          <FlexItem>
                            <Button
                              variant="plain"
                              onClick={() => {
                                navigator.clipboard.writeText(shareUrl);
                              }}
                              aria-label="Copy share link"
                            >
                              <CopyIcon />
                            </Button>
                          </FlexItem>
                        </Flex>
                      </ToolbarItem>
                      <ToolbarItem>
                        <Popover
                      headerContent="Change your name"
                      bodyContent={
                        <Form>
                          <FormGroup label="New name">
                            <Flex>
                              <FlexItem grow={{ default: 'grow' }}>
                                <TextInput
                                  id="new-user-name"
                                  value={newUserName}
                                  onChange={(_e, value) => setNewUserName(swapName(value))}
                                  placeholder="Enter new name"
                                />
                              </FlexItem>
                              <FlexItem>
                                <Button
                                  variant="primary"
                                  onClick={changeName}
                                >
                                  Change
                                </Button>
                              </FlexItem>
                            </Flex>
                          </FormGroup>
                        </Form>
                      }
                    >
                      <Button variant="secondary">
                        Logged in as: {userName}
                      </Button>
                    </Popover>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button variant="danger" onClick={() => setIsLeaveModalOpen(true)}>
                      Leave Room
                    </Button>
                  </ToolbarItem>
                      <ToolbarItem>
                        <ThemeSwitcher />
                      </ToolbarItem>
                    </ToolbarContent>
                  </Toolbar>
                </FlexItem>
              </Flex>
            </MastheadContent>
          </Masthead>
        }
      >
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
                      {votesRevealed && (
                        <StackItem>
                          <Alert
                            variant="info"
                            title="Voting is locked until votes are cleared"
                            isInline
                          />
                        </StackItem>
                      )}
                      <StackItem>
                        <Grid hasGutter>
                          {FIBONACCI_VALUES.map((value) => (
                            <GridItem span={2} key={value}>
                              <Button
                                variant={myVote === value ? 'primary' : 'secondary'}
                                isBlock
                                onClick={() => castVote(value)}
                                isDisabled={votesRevealed}
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
    {isLeaveModalOpen && (
      <Modal
        variant={ModalVariant.small}
        isOpen={isLeaveModalOpen}
        onClose={handleCloseLeaveModal}
      >
        <ModalHeader title="Leave Room" />
        <ModalBody>
          <Stack hasGutter>
            <StackItem>
              Are you sure you want to leave this room? You will be removed from the session.
            </StackItem>
            {needsModeratorSelection && (
              <StackItem>
                <Form>
                  <FormGroup label="Select New Moderator" isRequired>
                    <FormSelect
                      value={selectedNewModerator}
                      onChange={(_event, value) => setSelectedNewModerator(value)}
                      aria-label="Select new moderator"
                    >
                      <FormSelectOption value="" label="Choose a participant..." isDisabled />
                      {otherParticipants.map((participantName) => (
                        <FormSelectOption
                          key={participantName}
                          value={participantName}
                          label={participantName}
                        />
                      ))}
                    </FormSelect>
                  </FormGroup>
                </Form>
              </StackItem>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            key="leave"
            variant="danger"
            onClick={handleLeaveRoom}
            isDisabled={needsModeratorSelection && !selectedNewModerator}
          >
            Leave
          </Button>
          <Button
            key="cancel"
            variant="link"
            onClick={handleCloseLeaveModal}
          >
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    )}
    </>
  );
}

export default VotingRoom;
