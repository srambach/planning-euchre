import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import '@patternfly/react-core/dist/styles/base.css';
import Home from './pages/Home';
import VotingRoom from './pages/VotingRoom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomCode" element={<VotingRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
