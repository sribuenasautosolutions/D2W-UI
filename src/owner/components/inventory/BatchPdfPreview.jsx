export default function BatchPdfPreview({ url, filename, onClose }) {
  return <div role="dialog" aria-modal="true" aria-label="Batch report PDF preview" style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,.6)",padding:20,display:"flex",flexDirection:"column"}}>
    <div style={{background:"white",padding:12,display:"flex",gap:16,alignItems:"center"}}>
      <strong style={{flex:1}}>PDF Preview</strong>
      <a href={url} download={filename}>Download PDF</a>
      <a href={url} target="_blank" rel="noreferrer">Open / Print PDF</a>
      <button autoFocus onClick={onClose}>Close</button>
    </div>
    <iframe title="Batch report PDF" src={url} style={{flex:1,border:0,background:"white"}} />
  </div>;
}
