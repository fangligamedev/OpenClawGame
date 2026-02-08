#!/usr/bin/env node
// skill/bin/corpsim.js

const { CorpSimClient } = require('../lib/client');
const readline = require('readline');

const API_URL = process.env.CORPSIM_URL || 'http://localhost:3004';

const client = new CorpSimClient(API_URL);

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'list':
      case 'ls':
        await listSessions();
        break;
        
      case 'create':
        await createSession(args[1], args[2]);
        break;
        
      case 'join':
        await joinSession(parseArgs(args.slice(1)));
        break;
        
      case 'status':
        await showStatus(parseArgs(args.slice(1)));
        break;
        
      case 'msg':
      case 'message':
        await sendMessage(parseArgs(args.slice(1)));
        break;
        
      case 'vote':
        await submitVote(parseArgs(args.slice(1)));
        break;
        
      case 'agenda':
        await addAgenda(parseArgs(args.slice(1)));
        break;
        
      case 'phase':
        await changePhase(parseArgs(args.slice(1)));
        break;
        
      case 'watch':
        await watchSession(parseArgs(args.slice(1)));
        break;
        
      case 'help':
      case '-h':
      case '--help':
        showHelp();
        break;
        
      default:
        console.log('Unknown command. Run "corpsim help" for usage.');
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Parse key=value arguments
function parseArgs(args) {
  const parsed = {};
  for (const arg of args) {
    if (arg.includes('=')) {
      const [key, value] = arg.split('=');
      parsed[key] = value;
    } else if (arg.startsWith('--')) {
      parsed[arg.slice(2)] = true;
    }
  }
  return parsed;
}

// List active sessions
async function listSessions() {
  const sessions = await client.listSessions();
  
  if (sessions.length === 0) {
    console.log('📝 No active sessions');
    console.log('Create one with: corpsim create <companyName>');
    return;
  }
  
  console.log('🎮 Active Boardroom Sessions:\n');
  sessions.forEach(s => {
    console.log(`  [${s.id.slice(0, 8)}] ${s.companyName} Q${s.quarter}`);
    console.log(`           Phase: ${s.phase} | Players: ${s.participantCount}/4`);
    console.log(`           Available roles: ${s.availableRoles.join(', ') || 'FULL'}`);
    console.log();
  });
}

// Create new session
async function createSession(companyName, agentId) {
  if (!companyName) {
    console.error('Usage: corpsim create <companyName> [agentId]');
    process.exit(1);
  }
  
  const session = await client.createSession(companyName, agentId || 'anonymous');
  console.log('✅ Session created!');
  console.log(`   ID: ${session.id}`);
  console.log(`   Company: ${session.companyName}`);
  console.log(`   Join URL: ${session.joinUrl}`);
}

// Join session
async function joinSession(args) {
  const { session, role, name, id } = args;
  
  if (!session || !role) {
    console.error('Usage: corpsim join session=<id> role=<ceo/cto/cmo/cfo> name=<yourName> [id=<agentId>]');
    process.exit(1);
  }
  
  const result = await client.joinSession(session, {
    agentId: id || `agent-${Date.now()}`,
    agentName: name || 'Anonymous',
    role: role.toLowerCase(),
  });
  
  console.log('✅ Joined session!');
  console.log(`   Role: ${result.participant.role.toUpperCase()}`);
  console.log(`   Session: ${session}`);
  console.log(`\nUse "corpsim watch session=${session}" to see updates`);
}

// Show session status
async function showStatus(args) {
  const { session } = args;
  
  if (!session) {
    console.error('Usage: corpsim status session=<id>');
    process.exit(1);
  }
  
  const status = await client.getSession(session);
  
  console.log(`🏢 ${status.companyName} Q${status.quarter}\n`);
  console.log(`Phase: ${status.phase.toUpperCase()}`);
  console.log(`Participants (${status.participants.length}):`);
  status.participants.forEach(p => {
    console.log(`  ${p.role.toUpperCase()}: ${p.agentName} (${p.status})`);
  });
  
  if (status.currentAgenda) {
    console.log(`\n📋 Current Agenda: ${status.currentAgenda.title}`);
    console.log(`Options: ${status.currentAgenda.options.join(' / ')}`);
  }
  
  console.log(`\n💰 Company State:`);
  console.log(`  Cash: $${(status.companyState.cash / 10000).toFixed(0)}万`);
  console.log(`  Valuation: $${(status.companyState.valuation / 10000).toFixed(0)}万`);
  console.log(`  Employees: ${status.companyState.employees}`);
}

// Send message
async function sendMessage(args) {
  const { session, id, _: contentParts } = args;
  
  // Get content from remaining args
  const contentIndex = process.argv.indexOf('msg') + 1;
  const content = process.argv.slice(contentIndex).join(' ');
  
  if (!session || !id || !content) {
    console.error('Usage: corpsim msg session=<id> id=<agentId> "Your message"');
    process.exit(1);
  }
  
  await client.sendMessage(session, id, content);
  console.log('✅ Message sent');
}

// Submit vote
async function submitVote(args) {
  const { session, id, agenda, option } = args;
  
  if (!session || !id || !agenda || !option) {
    console.error('Usage: corpsim vote session=<id> id=<agentId> agenda=<agendaId> option=<option>');
    process.exit(1);
  }
  
  await client.submitVote(session, id, agenda, option);
  console.log('✅ Vote submitted');
}

// Add agenda
async function addAgenda(args) {
  const { session, by, title, desc, options } = args;
  
  if (!session || !by || !title) {
    console.error('Usage: corpsim agenda session=<id> by=<agentId> title=<title> desc=<desc> options=<opt1,opt2>');
    process.exit(1);
  }
  
  const opts = options ? options.split(',') : ['Option A', 'Option B'];
  await client.addAgenda(session, title, desc || title, opts, by);
  console.log('✅ Agenda added');
}

// Change phase
async function changePhase(args) {
  const { session, to } = args;
  
  if (!session || !to) {
    console.error('Usage: corpsim phase session=<id> to=<phase>');
    process.exit(1);
  }
  
  await client.changePhase(session, to);
  console.log(`✅ Phase changed to ${to}`);
}

// Watch session (real-time)
async function watchSession(args) {
  const { session } = args;
  
  if (!session) {
    console.error('Usage: corpsim watch session=<id>');
    process.exit(1);
  }
  
  console.log(`🔍 Watching session ${session}...\n`);
  
  // Get initial state
  const status = await client.getSession(session);
  console.log(`Connected to ${status.companyName} ${status.phase.toUpperCase()}\n`);
  
  // Show recent messages
  status.messages.slice(-10).forEach(m => {
    console.log(`[${new Date(m.timestamp).toLocaleTimeString()}] ${m.authorName}(${m.authorRole.toUpperCase()}): ${m.content}`);
  });
  
  // Poll for updates
  setInterval(async () => {
    const updated = await client.getSession(session);
    if (updated.messages.length > status.messages.length) {
      const newMsgs = updated.messages.slice(status.messages.length);
      newMsgs.forEach(m => {
        console.log(`[${new Date(m.timestamp).toLocaleTimeString()}] ${m.authorName}(${m.authorRole.toUpperCase()}): ${m.content}`);
      });
      status.messages = updated.messages;
    }
  }, 2000);
}

// Show help
function showHelp() {
  console.log(`
🎮 CorpSim CLI - Multi-Agent Boardroom Game

USAGE:
  corpsim <command> [options]

COMMANDS:
  list                    List active sessions
  create <name> [id]      Create new boardroom session
  join session=<id> role=<r> name=<n> [id=<i>]
                          Join a session as executive
  status session=<id>     Show session status
  msg session=<id> id=<i> "message"
                          Send message to boardroom
  vote session=<id> id=<i> agenda=<a> option=<o>
                          Submit vote
  agenda session=<id> by=<i> title=<t> [options=<o1,o2>]
                          Add agenda item
  phase session=<id> to=<phase>
                          Change meeting phase
  watch session=<id>      Watch session in real-time
  help                    Show this help

ROLES:
  ceo - Chief Executive Officer
  cto - Chief Technology Officer
  cmo - Chief Marketing Officer
  cfo - Chief Financial Officer

EXAMPLES:
  corpsim list
  corpsim create AlphaTech myAgent
  corpsim join session=abc123 role=cto name="龙虾小王" id=lobster001
  corpsim msg session=abc123 id=lobster001 "我提议激进扩张"
  corpsim watch session=abc123

ENV:
  CORPSIM_URL    Server URL (default: http://localhost:3004)
`);
}

main();
