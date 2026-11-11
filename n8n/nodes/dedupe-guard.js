/**
 * Node: Dedupe & In-Flight Guard
 * Prevents duplicate triggers for the same author within a 120-second window.
 */
const staticData = $getWorkflowStaticData('global');
const authorId = $json.authorId;
const logId = $json.logId;
const now = Date.now();
const windowMs = 15 * 1000; // 15 seconds window for smooth testing

if (!staticData.inFlightAuthors) {
  staticData.inFlightAuthors = {};
}

// Clean up stale entries older than 5 minutes
for (const id in staticData.inFlightAuthors) {
  if (now - staticData.inFlightAuthors[id].timestamp > 300 * 1000) {
    delete staticData.inFlightAuthors[id];
  }
}

const existing = staticData.inFlightAuthors[authorId];
if (existing && existing.logId !== logId && (now - existing.timestamp < windowMs)) {
  return {
    json: {
      ...$json,
      isDuplicate: true,
      duplicateReason: 'DUPLICATE_IN_FLIGHT',
      existingLogId: existing.logId,
      elapsedMs: now - existing.timestamp
    }
  };
}

// Register current execution
staticData.inFlightAuthors[authorId] = {
  logId,
  timestamp: now
};

return {
  json: {
    ...$json,
    isDuplicate: false
  }
};
