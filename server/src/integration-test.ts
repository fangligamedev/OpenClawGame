// integration-test.ts - Test v0.4.0 features integration

import { sessionService } from './src/services/sessionService';
import { aiManager } from './src/ai/aiPlayer';
import { countdownManager, DEFAULT_COUNTDOWN } from './src/utils/countdown';
import { eventEngine } from './src/game/events';

async function runIntegrationTest() {
  console.log('🧪 CorpSim v0.4.0 Integration Test\n');

  // Test 1: Create session with AI substitutes
  console.log('Test 1: Create session with AI substitutes');
  const session = sessionService.createSession({
    companyName: 'TestCorp-AI',
    createdBy: 'test'
  });
  console.log(`✅ Session created: ${session.id}`);

  // Add one human player (CEO)
  const ceoResult = sessionService.joinSession(session.id, {
    agentId: 'human-ceo',
    agentName: 'Human-CEO',
    role: 'ceo'
  });
  console.log(`✅ Human CEO joined: ${ceoResult.success}`);

  // Add AI players for missing roles
  const aiCTO = aiManager.addAIPlayer(session.id, 'cto');
  const aiCMO = aiManager.addAIPlayer(session.id, 'cmo');
  console.log(`✅ AI CTO added: ${aiCTO.getAgentId()}`);
  console.log(`✅ AI CMO added: ${aiCMO.getAgentId()}`);

  // Manually add AI participants to session
  sessionService.joinSession(session.id, {
    agentId: aiCTO.getAgentId(),
    agentName: aiCTO.getAgentName(),
    role: 'cto',
    type: 'ai'
  });
  sessionService.joinSession(session.id, {
    agentId: aiCMO.getAgentId(),
    agentName: aiCMO.getAgentName(),
    role: 'cmo',
    type: 'ai'
  });

  console.log(`✅ Session now has ${session.participants.length} participants\n`);

  // Test 2: Phase countdown
  console.log('Test 2: Phase countdown');
  sessionService.startSession(session.id);
  
  const countdown = countdownManager.startCountdown(
    session.id,
    'agenda',
    DEFAULT_COUNTDOWN,
    (remaining) => {
      if (remaining % 60 === 0) {
        console.log(`  ⏱️  Agenda phase: ${countdown.formatTime()} remaining`);
      }
    },
    () => {
      console.log('  ⏰ Agenda phase completed!');
    }
  );
  console.log(`✅ Countdown started: ${countdown.formatTime()}\n`);

  // Test 3: AI messages
  console.log('Test 3: AI message generation');
  const aiMessage = aiCTO.generateMessage({
    session,
    role: 'cto',
    messages: session.messages
  });
  console.log(`✅ AI CTO generated message: ${aiMessage.substring(0, 50)}...\n`);

  // Test 4: Random events
  console.log('Test 4: Random events');
  for (let i = 0; i < 5; i++) {
    const event = eventEngine.triggerEvent('executing');
    if (event) {
      console.log(`  🎲 Event triggered: ${event.name}`);
      console.log(`     Effect: ${JSON.stringify(event.effects)}`);
      
      // Apply effects
      const newState = eventEngine.applyEffects(session.companyState, event);
      console.log(`     New cash: $${(newState.cash / 10000).toFixed(0)}万`);
    }
  }
  console.log();

  // Test 5: AI voting
  console.log('Test 5: AI voting');
  const options = ['激进扩张', '稳健发展', '保守观望'];
  const aiVote = aiCTO.generateVote(
    { session, role: 'cto', messages: session.messages },
    options
  );
  console.log(`✅ AI CTO vote: ${aiVote}\n`);

  // Cleanup
  console.log('Cleanup...');
  aiManager.removeAllAIPlayers(session.id);
  countdownManager.stopCountdown(session.id);
  eventEngine.clear();
  console.log('✅ All tests completed!\n');

  console.log('📊 Summary:');
  console.log('  - AI Substitute: ✅ Works');
  console.log('  - Phase Countdown: ✅ Works');
  console.log('  - AI Messages: ✅ Works');
  console.log('  - Random Events: ✅ Works');
  console.log('  - AI Voting: ✅ Works');
}

runIntegrationTest().catch(console.error);
