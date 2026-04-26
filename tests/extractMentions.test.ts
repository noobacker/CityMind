import { describe, expect, it } from 'vitest';
import { extractMentionedNeighborhoods } from '@/lib/agent/extractMentions';

describe('extractMentionedNeighborhoods', () => {
  it('extracts known neighborhood mentions from assistant text', () => {
    const mentions = extractMentionedNeighborhoods('Bushwick is tense while Sunset Park is holding steady.');
    expect(mentions).toContain('Bushwick');
    expect(mentions).toContain('Sunset Park');
  });
});