import { describe, it, expect } from '@jest/globals';
import { detectPushMode, PushMode } from '../../lib/backlog/push-engine.js';

describe('push-engine', () => {
  describe('detectPushMode', () => {
    it('should return CREATE when jira-ticketId is null', () => {
      expect(detectPushMode({ 'jira-ticketId': null })).toBe(PushMode.CREATE);
    });

    it('should return CREATE when jira-ticketId is missing', () => {
      expect(detectPushMode({})).toBe(PushMode.CREATE);
    });

    it('should return CREATE when jira-ticketId is "null" string', () => {
      expect(detectPushMode({ 'jira-ticketId': 'null' })).toBe(PushMode.CREATE);
    });

    it('should return CREATE when jira-ticketId is empty', () => {
      expect(detectPushMode({ 'jira-ticketId': '' })).toBe(PushMode.CREATE);
    });

    it('should return UPDATE when jira-ticketId has a value', () => {
      expect(detectPushMode({ 'jira-ticketId': 'DAPM-1234' })).toBe(PushMode.UPDATE);
    });
  });
});
