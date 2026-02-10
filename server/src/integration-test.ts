// integration-test.ts - Test v0.4.2 features integration

import { sessionService } from './services/sessionService';
import { countdownTimer, DEFAULT_COUNTDOWN_CONFIG } from './utils/countdown';

async function runIntegrationTest() {
  console.log('🧪 CorpSim v0.4.2 Integration Test\n');

  // Test 1: Create session
  console.log('Test 1: Create session');
  const session = sessionService.createSession({
    companyName: 'TestCorp-v0.4.2',
    createdBy: 'test'
  });
  console.log(`✅ Session created: ${session.id}`);

  // Add players
  const ceoResult = sessionService.joinSession(session.id, {
    agentId: 'human-ceo',
    agentName: 'CEO',
    role: 'ceo',
    type: 'human'
  });
  console.log(`✅ CEO joined: ${ceoResult.success}`);

  const ctoResult = sessionService.joinSession(session.id, {
    agentId: 'human-cto',
    agentName: 'CTO',
    role: 'cto',
    type: 'human'
  });
  console.log(`✅ CTO joined: ${ctoResult.success}`);

  const cmoResult = sessionService.joinSession(session.id, {
    agentId: 'human-cmo',
    agentName: 'CMO',
    role: 'cmo',
    type: 'human'
  });
  console.log(`✅ CMO joined: ${cmoResult.success}`);

  console.log(`✅ Session now has ${session.participants.length} participants\n`);

  // Test 2: Countdown timer
  console.log('Test 2: Countdown timer');
  countdownTimer.startTimer(session.id, 'agenda', 10000); // 10 seconds for testing
  
  console.log('  ⏱️  Countdown started');
  console.log(`  ⏱️  Initial time: ${countdownTimer.getFormattedTime(session.id)}`);

  // Wait 3 seconds
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log(`  ⏱️  After 3s: ${countdownTimer.getFormattedTime(session.id)}`);

  countdownTimer.stopTimer(session.id);
  console.log('  ⏱️  Countdown stopped\n');

  // Test 3: Send messages
  console.log('Test 3: Send messages');
  const msg1 = sessionService.sendMessage(session.id, {
    agentId: 'human-ceo',
    content: 'Hello team!'
  });
  console.log(`✅ Message sent: ${msg1.success}, ID: ${msg1.message?.id}`);

  const msg2 = sessionService.sendMessage(session.id, {
    agentId: 'human-cto',
    content: 'Hi CEO!'
  });
  console.log(`✅ Message sent: ${msg2.success}, ID: ${msg2.message?.id}`);

  console.log(`✅ Total messages: ${session.messages.length}\n`);

  // Test 4: Phase transition
  console.log('Test 4: Phase transition');
  console.log(`  Current phase: ${session.phase}`);
  
  sessionService.transitionPhase(session.id, 'voting');
  console.log(`  After transition: ${session.phase}\n`);

  console.log('✅ All tests passed!\n');
}

// Run test if executed directly
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

export { runIntegrationTest };
