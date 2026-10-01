export const STAGES = [
  ['NEW', 'New', 'blue'], ['PROCUREMENT', 'Procurement', 'orange'],
  ['PROCUREMENT_FOLLOW_UP', 'Follow-up · procurement', 'amber'],
  ['PROFORMA', 'Proforma', 'purple'], ['FOLLOW_UP', 'Follow-up · proforma', 'amber'],
  ['WON', 'Won', 'green'], ['LOST', 'Lost', 'red'],
];
export const isTerminal = lead => ['WON', 'LOST', 'CLOSED'].includes(lead.pipelineStage);
export const isOverdue = (lead, now = Date.now()) => !isTerminal(lead) && Boolean(lead.nextFollowUpAt) && new Date(lead.nextFollowUpAt).getTime() < now;
export const money = value => value == null ? 'Not quoted' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
export const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Not scheduled';
export const localInput = value => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export const phoneLinks = phone => {
  const digits = String(phone || '').replace(/\D/g, '');
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return normalized.length >= 11 && normalized.length <= 15 ? { call: `tel:+${normalized}`, whatsapp: `https://wa.me/${normalized}` } : null;
};
export const vehicle = lead => [...new Set((lead.items || []).map(item => item.vehicleDescription).filter(Boolean))].join(', ') || 'Vehicle not specified';
