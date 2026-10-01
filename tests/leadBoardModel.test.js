import test from 'node:test';
import assert from 'node:assert/strict';
import { isOverdue, phoneLinks, STAGES, localInput } from '../src/owner/components/leads/leadBoardModel.js';
test('both follow-up stages are separate and correctly ordered', () => {
  assert.deepEqual(STAGES.map(stage => stage[0]), ['NEW','PROCUREMENT','PROCUREMENT_FOLLOW_UP','PROFORMA','FOLLOW_UP','WON','LOST']);
});
test('reminders distinguish active overdue leads from terminal outcomes', () => {
  const lead={pipelineStage:'FOLLOW_UP',nextFollowUpAt:'2026-01-01T09:00:00+05:30'};
  assert.equal(isOverdue(lead,Date.parse('2026-01-01T04:00:00Z')),true);
  assert.equal(isOverdue({...lead,pipelineStage:'WON'},Date.parse('2026-01-02')),false);
  assert.equal(isOverdue({...lead,nextFollowUpAt:null}),false);
  assert.equal(isOverdue({...lead,nextFollowUpAt:'bad-date'}),false);
});
test('Indian contact numbers normalize without generating invalid contact links', () => {
  assert.deepEqual(phoneLinks('98765 43210'),{call:'tel:+919876543210',whatsapp:'https://wa.me/919876543210'});
  assert.equal(phoneLinks('Not available'),null);
  assert.equal(phoneLinks('1234'),null);
});
test('local datetime input round-trips the represented instant', () => {
  const instant='2026-10-01T15:30:00+05:30';
  assert.equal(new Date(localInput(instant)).getTime(),new Date(instant).getTime());
});
