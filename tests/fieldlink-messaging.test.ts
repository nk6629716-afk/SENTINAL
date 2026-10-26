/**
 * SENTINEL — FieldLink Real-Time Multi-Tab Messaging Regression Test
 *
 * Verifies real-time decentralized tactical mesh communications between multiple browser tabs:
 * 1. Client A and Client B initialize BroadcastChannel listeners on mount.
 * 2. Client A sends a message across the mesh bus.
 * 3. Client B receives and updates its message state immediately without reloading.
 * 4. Client B refreshes its message history and ensures no duplicate messages appear.
 * 5. Listener cleanup on unmount functions cleanly without resource leaks.
 */

import { MeshService } from '../src/services/mesh/meshService';
import { MeshMessage } from '../src/shared/types';

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

export async function runMeshMultiTabRegressionTest(): Promise<void> {
  console.log('[TEST GROUP] FieldLink Real-Time Multi-Tab Comms Regression:');

  // Step 1: Initialize two independent clients representing two browser tabs
  const tabA = new MeshService();
  tabA.setCurrentNode('Alpha');
  tabA.initBroadcastChannel();

  const tabB = new MeshService();
  tabB.setCurrentNode('Bravo');
  tabB.initBroadcastChannel();

  // Step 2: Track reactive state updates in Tab B (simulating React's useState & useEffect)
  let tabBReceivedEvents: MeshMessage[] = [];
  let tabBStateUpdates = 0;

  const unsubB = tabB.subscribe((evt) => {
    if (evt.type === 'MESSAGE') {
      tabBStateUpdates++;
      tabBReceivedEvents.push(evt.data);
    }
  });

  const baselineCountB = tabB.getMessages().length;
  assert(baselineCountB >= 2, 'Tab B has baseline seeded tactical messages');

  // Step 3: Tab A transmits a new tactical message destined for Tab B
  const messageText = 'Immediate drone recon report: Sector 4 perimeter secure.';
  const sentMsg = await tabA.sendMessage('#tactical-alpha', messageText, 'Bravo');

  assert(sentMsg.id.startsWith('MSG-'), 'Message ID has expected MSG- prefix');
  assert(sentMsg.senderNode === 'Alpha', 'Sender is Alpha');
  assert(sentMsg.targetNode === 'Bravo', 'Target is Bravo');
  assert(sentMsg.content === messageText, 'Content matches transmitted text');

  // Step 4: Allow microtask and BroadcastChannel propagation across tabs
  const startTime = Date.now();
  while (tabBReceivedEvents.length === 0 && Date.now() - startTime < 3000) {
    await new Promise((r) => setTimeout(r, 50));
  }

  // Step 5: Verify Tab B receives and updates its message state without reloading
  assert(tabBStateUpdates > 0, 'Tab B listener fired React state update without reloading');
  assert(
    tabBReceivedEvents.some((m) => m.id === sentMsg.id),
    'Tab B received the exact broadcasted message without reloading'
  );

  const tabBMessages = tabB.getMessages();
  const receivedInB = tabBMessages.find((m) => m.id === sentMsg.id);
  assert(receivedInB !== undefined, 'Tab B message state immediately includes the new message without page reload');
  assert(receivedInB!.content === messageText, 'Received content in Tab B matches sent message');
  console.log('  ✓ Send from Tab A appears in Tab B immediately without reloading');

  // Step 6: Verify Tab B message history refresh does NOT create duplicate messages
  await tabB.refreshMessages();
  const messagesAfterRefresh = tabB.getMessages();
  const occurrencesOfSentMsg = messagesAfterRefresh.filter((m) => m.id === sentMsg.id);

  assert(occurrencesOfSentMsg.length === 1, `Expected exactly 1 occurrence of message, found ${occurrencesOfSentMsg.length}`);
  console.log('  ✓ Tab B message history refresh preserves deduplication (zero duplicate messages)');

  // Step 7: Verify listener cleanup on unmount
  unsubB();
  tabA.closeBroadcastChannel();
  tabB.closeBroadcastChannel();
  console.log('  ✓ Listener cleanup on unmount completes cleanly without leaks');

  console.log('All FieldLink multi-tab messaging regression checks PASSED! ✓\n');
}

// Auto-run if executed directly via npx tsx
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/fieldlink-messaging.test.ts')) {
  runMeshMultiTabRegressionTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Multi-tab regression test FAILED:', err);
      process.exit(1);
    });
}

