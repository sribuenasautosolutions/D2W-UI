import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getLeadBoard, getLeadBoardOptions, getLeadById, updateLeadBoard, createLeadProforma, getLeadProforma } from '../../../services/leadService';
import { STAGES, isTerminal, isOverdue, money, dateTime, localInput, phoneLinks, vehicle } from './leadBoardModel';
import './LeadBoard.css';

const message = error => error?.response?.data?.message || error?.response?.data?.detail || error?.response?.data?.error || error.message || 'Unable to save. Please try again.';
const CLOSED_STAGE = ['CLOSED', 'Closed', 'gray'];
const EMPTY_FILTERS = { search: '', salespersonId: '', storeId: '', source: '', from: '', to: '' };

function LeadColumn({ stage, filters, revision, onOpen, now }) {
  const [data, setData] = useState({ content: [], totalElements: 0, last: true });
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError('');
    getLeadBoard({ ...filters, stage: stage[0], page, size: 20 }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(previous => ({ ...result, content: page ? [...previous.content, ...result.content] : result.content })); })
      .catch(err => { if (!controller.signal.aborted) setError(message(err)); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [filters, stage, page, revision, retry]);
  return <section className={`d2w-column tone-${stage[2]}`} aria-label={stage[1]} aria-busy={busy}>
    <header><h2>{stage[1]}</h2><span aria-label={`${data.totalElements} leads`}>{data.totalElements}</span></header>
    <div className="d2w-column-cards">
      {data.content.map(lead => <button className="d2w-lead-card" data-lead-id={lead.id} key={lead.id} onClick={() => onOpen(lead)}>
        <small>{lead.leadNumber || `Lead #${lead.id}`}</small>
        <strong>{lead.customerName || 'Customer unavailable'}</strong>
        <span>{lead.customerPhone || 'Phone unavailable'}</span>
        <span className="d2w-vehicle">{vehicle(lead)}</span>
        <div className="d2w-card-bottom"><b>{money(lead.quotationAmount)}</b><span>{lead.salespersonName || 'Unassigned'}</span></div>
        <span className={`d2w-followup ${isOverdue(lead, now) ? 'overdue' : ''}`}>
          {isTerminal(lead) ? 'Completed' : `${isOverdue(lead, now) ? 'Overdue · ' : 'Next · '}${dateTime(lead.nextFollowUpAt)}`}
        </span>
      </button>)}
      {!busy && !error && !data.content.length && <p className="d2w-muted">No leads in this stage</p>}
      {error && <div role="alert"><p>{error}</p><button onClick={() => setRetry(value => value + 1)}>Retry</button></div>}
      {busy && <p role="status" className="d2w-muted">Loading leads…</p>}
      {!busy && !error && !data.last && <button className="d2w-more" onClick={() => setPage(value => value + 1)}>Load more ({data.totalElements - data.content.length})</button>}
    </div>
  </section>;
}

function LeadSheet({ id, onClose, onChanged, onEdit, now }) {
  const location = useLocation();
  const base = location.pathname.startsWith('/owner') ? '/owner/sales' : '/store/sales';
  const dialog = useRef(null);
  const busyRef = useRef(false);
  const [lead, setLead] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [next, setNext] = useState('');
  const [stage, setStage] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [gst, setGst] = useState('');
  const requestKey = useRef(null);
  useEffect(() => {
    let active = true;
    setError('');
    getLeadById(id).then(result => {
      if (!active) return;
      setLead(result); setNext(localInput(result.nextFollowUpAt)); setStage(result.pipelineStage);
    }).catch(err => { if (active) setError(message(err)); });
    return () => { active = false; };
  }, [id, refresh]);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.focus();
    const keyboard = event => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const targets = [...element.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')].filter(node => node.getClientRects().length);
      const first = targets[0], last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', keyboard);
    return () => { element.removeEventListener('keydown', keyboard); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus(); else (document.querySelector(`[data-lead-id="${id}"]`) || document.querySelector(".d2w-kanban"))?.focus(); };
  }, [onClose, id]);
  const save = async payload => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await updateLeadBoard(id, { ...payload, expectedUpdatedAt: lead.updatedAt });
      setLead(result); setStage(result.pipelineStage); setNext(localInput(result.nextFollowUpAt));
      if (payload.note) setNote('');
      setReason(''); setNotice('Lead updated'); onChanged();
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  };
  const openQuote = async () => {
    setQuoteOpen(true); setError('');
    if (!lead.proformaId) return;
    setBusy(true);
    try { setQuote(await getLeadProforma(id)); } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  };
  const createQuote = async event => {
    event.preventDefault(); setBusy(true); setError('');
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    try {
      const result = await createLeadProforma(id, { requestKey: requestKey.current, itemIds: selectedItems, gstType: gst });
      setQuote(result); const updated = await getLeadById(id); setLead(updated); setStage(updated.pipelineStage); onChanged(); setNotice('Proforma created');
    } catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  };
  const links = phoneLinks(lead?.customerPhone);
  const terminal = lead && isTerminal(lead);
  return <div className="d2w-sheet-backdrop" onClick={() => { if (!busy) onClose(); }}>
    <aside ref={dialog} tabIndex={-1} className="d2w-sheet" role="dialog" aria-modal="true" aria-labelledby="d2w-sheet-title" onClick={event => event.stopPropagation()}>
      <header className="d2w-sheet-header"><div><small>LEAD DETAILS</small><h2 id="d2w-sheet-title">{lead?.leadNumber || `Lead #${id}`}</h2></div><button disabled={busy} onClick={onClose} aria-label="Close lead details">✕</button></header>
      {error && <div className="d2w-error" role="alert">{error}<button disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh details</button></div>}
      {notice && <p role="status" className="d2w-notice">{notice}</p>}
      {!lead ? <p role="status">Loading lead details…</p> : <>
        <section className="d2w-sheet-section"><h3>{lead.customerName}</h3><p>{lead.customerPhone || 'Phone unavailable'}</p><p>{vehicle(lead)}</p>
          <div className="d2w-actions">{links ? <><a href={links.call}>Call</a><a href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a></> : <span className="d2w-muted">Add a valid customer phone to enable contact actions.</span>}
            <button disabled={busy || lead.status !== 'NEW'} onClick={() => onEdit(lead)}>Edit lead</button>
          </div>
          <dl className="d2w-facts"><div><dt>Salesperson</dt><dd>{lead.salespersonName || 'Unassigned'}</dd></div><div><dt>Store</dt><dd>{lead.storeName}</dd></div><div><dt>Source</dt><dd>{lead.source || '—'}</dd></div><div><dt>Quotation amount</dt><dd>{money(lead.quotationAmount)}</dd></div></dl>
          <p className="d2w-preserve">{lead.customerRequirement}</p>
        </section>
        <section className="d2w-sheet-section"><h3>Next follow-up</h3>
          <p className={isOverdue(lead, now) ? 'overdue' : 'd2w-muted'}>{isOverdue(lead, now) ? 'Overdue · ' : ''}{dateTime(lead.nextFollowUpAt)}</p>
          <form onSubmit={event => { event.preventDefault(); save({ nextFollowUpAt: new Date(next).toISOString() }); }}>
            <label>Follow-up date and time (your local time)<input type="datetime-local" required value={next} disabled={busy || terminal} onChange={event => setNext(event.target.value)} /></label>
            <div className="d2w-actions"><button disabled={busy || terminal || !next}>Save follow-up</button><button type="button" disabled={busy || !lead.nextFollowUpAt} onClick={() => save({ clearFollowUp: true })}>Clear reminder</button></div>
          </form>
        </section>
        <section className="d2w-sheet-section"><h3>Pipeline status</h3>
          <form onSubmit={event => { event.preventDefault(); save({ stage, reason }); }}>
            <label>Stage<select value={stage} disabled={busy} onChange={event => setStage(event.target.value)}>{[...STAGES, ['CLOSED','Closed']].map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            {stage === 'LOST' && <label>Reason for loss<textarea required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>}
            <button disabled={busy || stage === lead.pipelineStage}>Update status</button>
          </form>
          <div className="d2w-actions"><button disabled={busy || terminal} onClick={() => { setNotice(lead.proformaId ? 'Won is recorded when all accepted items are sold. Open the sales workflow below to complete the sale.' : 'Complete procurement and create a Proforma before completing the sale.'); if (lead.proformaId) openQuote(); }}>Mark Won</button><button disabled={busy || terminal} onClick={() => setStage('LOST')}>Mark Lost</button><button disabled={busy || !terminal || lead.pipelineStage === 'CLOSED'} onClick={() => save({ stage: 'CLOSED' })}>Mark Closed</button></div>
          {lead.lostReason && <p>Lost reason: {lead.lostReason}</p>}
        </section>
        <section className="d2w-sheet-section"><h3>Quotation / proforma</h3>
          <div className="d2w-actions"><button disabled={busy || (!lead.proformaId && (terminal || lead.status !== 'PROCUREMENT_COMPLETED'))} onClick={openQuote}>{lead.proformaId ? 'View quotation' : 'Create quotation'}</button><a href={`${base}/leads/${id}`} target="_blank" rel="noreferrer">Open procurement ↗</a></div>
          {!lead.proformaId && lead.status !== 'PROCUREMENT_COMPLETED' && <p className="d2w-muted">Complete procurement before creating the quotation.</p>}
          {quoteOpen && !lead.proformaId && <form onSubmit={createQuote}>
            <fieldset disabled={busy}><legend>Items to quote</legend>{(lead.items || []).filter(item => item.availabilityStatus && item.availabilityStatus !== 'NOT_AVAILABLE' && item.sellingQuantity > 0).map(item => <label className="d2w-checkbox" key={item.id}><input type="checkbox" checked={selectedItems.includes(item.id)} onChange={event => setSelectedItems(previous => event.target.checked ? [...previous,item.id] : previous.filter(value => value !== item.id))} />{item.partNumber || item.requirement} · {item.sellingQuantity} × {money(item.quotedSellingPrice)}</label>)}</fieldset>
            <label>GST treatment<select required value={gst} onChange={event => setGst(event.target.value)}><option value="">Select GST treatment</option>{['NONE','GST_5','GST_12','GST_18','GST_28','IGST_5','IGST_12','IGST_18','IGST_28'].map(value => <option key={value}>{value}</option>)}</select></label>
            <button disabled={busy || !selectedItems.length || !gst}>Create proforma</button>
          </form>}
          {quoteOpen && lead.proformaId && <div>{quote && <><p><b>{quote.proformaNumber}</b> · {quote.status}</p><p>Total: {money(quote.netPayable)}</p>{(quote.items || []).map((item,index) => <article className="d2w-item" key={item.id || index}><strong>{item.productName || item.partNumber || 'Quoted item'}</strong><span>{item.quantity} × {money(item.sellingPrice)} · Line total {money(item.lineTotal)}</span></article>)}</>}<a href={`${base}/proforma/${lead.proformaId}/lead`} target="_blank" rel="noreferrer">Open quotation and sales workflow ↗</a><p className="d2w-muted">Complete acceptance and fulfillment in the existing sales workflow. Refresh this lead after finishing.</p></div>}
        </section>
        <section className="d2w-sheet-section"><h3>Requested items ({lead.items?.length || 0})</h3>{(lead.items || []).map(item => <article className="d2w-item" key={item.id}><strong>{item.partNumber || item.requirement}</strong><span>{item.vehicleDescription}</span><span>Requested: {item.requestedQuantity} · Offered: {item.sellingQuantity ?? '—'}</span><span>{item.availabilityStatus || 'Pending procurement'} · {money(item.quotedSellingPrice)}</span>{item.notes && <p>{item.notes}</p>}</article>)}</section>
        <section className="d2w-sheet-section"><h3>Notes</h3><p className="d2w-preserve">{lead.notes || 'No notes yet.'}</p><form onSubmit={event => { event.preventDefault(); save({ note }); }}><label>Add a note<textarea required maxLength={2000} value={note} disabled={busy} onChange={event => setNote(event.target.value)} /></label><button disabled={busy || !note.trim()}>Add note</button></form></section>
      </>}
    </aside>
  </div>;
}

export default function LeadBoard({ revision, onCreate, onEdit }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [query, setQuery] = useState(EMPTY_FILTERS);
  const [options, setOptions] = useState({});
  const [optionsError, setOptionsError] = useState('');
  const [selected, setSelected] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [closed, setClosed] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setTimeout(() => setQuery(filters), 300); return () => clearTimeout(timer); }, [filters]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const controller = new AbortController();
    getLeadBoardOptions(controller.signal).then(result => { setOptions(result); setOptionsError(''); }).catch(error => { if (!controller.signal.aborted) setOptionsError(message(error)); });
    return () => controller.abort();
  }, [revision, refresh]);
  const set = (key, value) => setFilters(previous => ({ ...previous, [key]: value }));
  const closeSheet = useCallback(() => setSelected(null), []);
  const version = `${revision}-${refresh}`;
  const invalidDates = filters.from && filters.to && filters.from > filters.to;
  return <section className="d2w-board-page">
    <header className="d2w-board-header"><div><small>DEALS2WHEELS · SALES</small><h1>Lead pipeline</h1><p>Every enquiry. A clear next step.</p></div><div className="d2w-actions"><button onClick={() => setRefresh(value => value + 1)}>Refresh</button><button className="d2w-primary" onClick={onCreate}>+ New lead</button></div></header>
    <div className="d2w-board-filters"><label className="d2w-search">Search<input type="search" placeholder="Customer, phone, vehicle, part or lead…" value={filters.search} onChange={event => set('search', event.target.value)} /></label>
      {[['salespersonId','Salesperson','salesperson'],['source','Source','source'],['storeId','Store','store']].map(([key,label,option]) => <label key={key}>{label}<select value={filters[key]} onChange={event => set(key,event.target.value)}><option value="">All {label.toLowerCase()}s</option>{(options[option] || []).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>)}
      <label>Created from<input type="date" value={filters.from} onChange={event => set('from',event.target.value)} /></label><label>Created to<input type="date" value={filters.to} onChange={event => set('to',event.target.value)} /></label>
      <button onClick={() => setFilters(EMPTY_FILTERS)}>Reset</button>
    </div>
    {optionsError && <p role="alert">Filter options: {optionsError}</p>}
    {invalidDates && <p role="alert" className="d2w-error">The end date must be on or after the start date.</p>}
    <div className="d2w-board-help"><span>Scroll across to view all stages · Times shown in your local timezone</span><label className="d2w-checkbox"><input type="checkbox" checked={closed} onChange={event => setClosed(event.target.checked)} />Show closed</label></div>
    {!invalidDates && <div className="d2w-kanban" tabIndex={0} role="region" aria-label="Lead pipeline, scroll horizontally for more stages">{(closed ? [...STAGES, CLOSED_STAGE] : STAGES).map(stage => <LeadColumn key={`${stage[0]}-${JSON.stringify(query)}-${version}`} stage={stage} filters={query} revision={version} onOpen={lead => setSelected(lead.id)} now={now} />)}</div>}
    {selected != null && <LeadSheet key={selected} id={selected} now={now} onClose={closeSheet} onChanged={() => setRefresh(value => value + 1)} onEdit={lead => { setSelected(null); onEdit(lead); }} />}
  </section>;
}
