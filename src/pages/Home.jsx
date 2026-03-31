import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Page,
  PageSection,
  Card,
  CardBody,
  Form,
  FormGroup,
  TextInput,
  Button,
  Split,
  SplitItem,
  Title,
  Divider,
} from '@patternfly/react-core';
import { ref, set } from 'firebase/database';
import { database, ensureAuth } from '../services/firebase';
import { generateRoomCode } from '../utils/generateRoomCode';
import ThemeSwitcher from '../components/ThemeSwitcher';

function Home() {
  const [userName, setUserName] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Prefill room code from URL if provided
  useEffect(() => {
    const roomCodeParam = searchParams.get('roomCode');
    if (roomCodeParam) {
      setJoinRoomCode(roomCodeParam.toUpperCase());
    }
  }, [searchParams]);

  const swapName = (name) => {
    // Replace "austin" with "eric" and vice versa (case-insensitive substring match)
    if (/austin/i.test(name)) {
      return name.replace(/austin/gi, 'Eric');
    } else if (/eric/i.test(name)) {
      return name.replace(/eric/gi, 'Austin');
    }
    return name;
  };

  const createSession = async () => {
    if (!userName.trim() || !sessionName.trim()) {
      alert('Please enter your name and session name');
      return;
    }

    try {
      // Ensure user is authenticated before creating room
      await ensureAuth();

      const roomCode = generateRoomCode();
      const roomRef = ref(database, `rooms/${roomCode}`);

      await set(roomRef, {
      sessionName: sessionName.trim(),
      createdAt: Date.now(),
      currentIssue: '',
      votesRevealed: false,
      participants: {
        [userName.trim()]: {
          name: userName.trim(),
          vote: null,
          isModerator: true,
          emoji: '✅',
          badges: [],
          voteHistory: {
            votes: [],
            totalVotes: 0,
          },
        },
      },
    });

      navigate(`/room/${roomCode}?user=${encodeURIComponent(userName.trim())}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. Check console for details.');
    }
  };

  const joinSession = () => {
    if (!userName.trim() || !joinRoomCode.trim()) {
      alert('Please enter your name and room code');
      return;
    }

    navigate(`/room/${joinRoomCode.trim().toUpperCase()}?user=${encodeURIComponent(userName.trim())}`);
  };

  return (
    <Page sidebar={null}>
      <PageSection variant="light">
        <Split hasGutter>
          <SplitItem isFilled>
            <Title headingLevel="h1" size="3xl">
              Planning Poker
            </Title>
            <p>Estimate story points with your agile team</p>
          </SplitItem>
          <SplitItem>
            <ThemeSwitcher />
          </SplitItem>
        </Split>
      </PageSection>
      <PageSection>
        <Split hasGutter>
          <SplitItem isFilled>
            <Card>
              <CardBody>
                <Title headingLevel="h2" size="xl">
                  Create Session
                </Title>
                <Form>
                  <FormGroup label="Your Name" isRequired>
                    <TextInput
                      id="create-user-name"
                      value={userName}
                      onChange={(_e, value) => setUserName(swapName(value))}
                      placeholder="Enter your name"
                    />
                  </FormGroup>
                  <FormGroup label="Session Name" isRequired>
                    <TextInput
                      id="session-name"
                      value={sessionName}
                      onChange={(_e, value) => setSessionName(value)}
                      placeholder="Sprint 24 Planning"
                    />
                  </FormGroup>
                  <Button variant="primary" onClick={createSession}>
                    Create Session
                  </Button>
                </Form>
              </CardBody>
            </Card>
          </SplitItem>
          <SplitItem>
            <Divider orientation={{ default: 'vertical' }} />
          </SplitItem>
          <SplitItem isFilled>
            <Card>
              <CardBody>
                <Title headingLevel="h2" size="xl">
                  Join Session
                </Title>
                <Form>
                  <FormGroup label="Your Name" isRequired>
                    <TextInput
                      id="join-user-name"
                      value={userName}
                      onChange={(_e, value) => setUserName(swapName(value))}
                      placeholder="Enter your name"
                    />
                  </FormGroup>
                  <FormGroup label="Room Code" isRequired>
                    <TextInput
                      id="room-code"
                      value={joinRoomCode}
                      onChange={(_e, value) => setJoinRoomCode(value.toUpperCase())}
                      placeholder="ABC123"
                    />
                  </FormGroup>
                  <Button variant="primary" onClick={joinSession}>
                    Join Session
                  </Button>
                </Form>
              </CardBody>
            </Card>
          </SplitItem>
        </Split>
      </PageSection>
    </Page>
  );
}

export default Home;
