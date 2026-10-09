import { useEffect, useState } from "react";
import { previewLeadEstimation, previewLeadEstimationPdf, createLeadEstimation, downloadLeadEstimation } from "../../../services/leadService";
import { workflowError } from "./leadWorkflowUtils";

export default function LeadEstimationPreview({ leadId, itemIds, onClose, onDownloaded }) {
  const [mask, setMask] = useState(false);
  const [preview, setPreview] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [date] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  });
  const ids = itemIds.join(",");
  useEffect(() => {
    let cancelled = false, objectUrl;
    const load = async () => {
      setLoading(true); setError(""); setPreview(null); setUrl("");
      try {
        const request = { itemIds: ids.split(",").map(Number), estimationDate: date, showPartNumber: !mask };
        const document = await previewLeadEstimation(leadId, request);
        const blob = await previewLeadEstimationPdf(leadId, { ...request, previewSignature: document.previewSignature });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); setPreview({ document, request });
      } catch (e) { if (!cancelled) setError(workflowError(e)); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [leadId, ids, date, mask, retry]);
  const download = async () => {
    if (!preview || loading || downloading) return;
    setDownloading(true); setError("");
    try {
      const saved = await createLeadEstimation(leadId, { ...preview.request, previewSignature: preview.document.previewSignature });
      const blob = await downloadLeadEstimation(leadId, saved.id);
      const downloadUrl = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = downloadUrl; link.download = `EST-${String(saved.id).padStart(5,"0")}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000); onDownloaded?.();
    } catch (e) { setError(workflowError(e)); }
    finally { setDownloading(false); }
  };
  return <div className="lead-drawer-backdrop" style={{ zIndex: 1200 }}>
    <section className="procurement-drawer-content" role="dialog" aria-modal="true" aria-labelledby="estimation-preview-title"
      style={{ width: "min(1000px, 95vw)", height: "92vh", margin: "auto", background: "white", display: "flex", flexDirection: "column" }}>
      <header className="procurement-drawer-header"><h2 id="estimation-preview-title">Estimation Preview</h2>
        <button className="procurement-cancel-btn" disabled={downloading} onClick={onClose}>Close</button></header>
      <div style={{ padding: 16 }}><label><input type="checkbox" checked={mask} disabled={downloading}
        onChange={event => { setPreview(null); setLoading(true); setMask(event.target.checked); }} /> Mask part numbers</label>
        {error && <div className="procurement-message error">{error}<button onClick={() => setRetry(value => value+1)}>Refresh preview</button></div>}
      </div>
      {loading ? <div className="procurement-table-state">Preparing preview...</div> : url &&
        <iframe title="Estimation PDF preview" src={`${url}#toolbar=0`} style={{ flex: 1, width: "100%", border: 0 }} />}
      <footer className="follow-up-drawer-footer"><button className="procurement-cancel-btn" disabled={downloading} onClick={onClose}>Close</button>
        <button className="procurement-complete-btn" disabled={loading || downloading || !preview} onClick={download}>
          {downloading ? "Downloading..." : "Download"}</button></footer>
    </section>
  </div>;
}
