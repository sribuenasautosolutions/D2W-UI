import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, QrCode, WifiOff } from "lucide-react";
import {
    connectWhatsapp,
    disconnectWhatsapp,
    getWhatsappStatus,
} from "../../../services/whatsappService";
import { getAllStores } from "../../../services/storeService";
import "./WhatsAppConnect.css";

const REASON_TEXT = {
    LOGGED_OUT_FROM_PHONE: "The phone removed this linked device. Please scan the QR code again.",
    QR_NOT_SCANNED: "The QR code was not scanned in time. Press Connect to get a new one.",
    CANNOT_REACH_WHATSAPP: "The server could not reach WhatsApp. Please try again in a moment.",
    DISCONNECTED_BY_USER: "WhatsApp was disconnected from the POS.",
};

function reasonText(reason) {
    if (!reason) return "";
    if (reason.startsWith("CONNECTION_LOST")) {
        return "The connection was lost (phone may be off or offline). It will retry by itself.";
    }
    return REASON_TEXT[reason] || "";
}

function readUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {}; // broken saved login: behave as a normal Store Owner
    }
}

export default function WhatsAppConnect() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = readUser();
    const isSuperAdmin = user.role === "SUPER_ADMIN";

    const [stores, setStores] = useState([]);
    const [storeId, setStoreId] = useState("");
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const timer = useRef(null);

    const leadsPath = location.pathname.replace(/\/whatsapp\/?$/, "");
    const effectiveStoreId = isSuperAdmin ? storeId : null;

    // Super Admin: load the store list once.
    useEffect(() => {
        if (!isSuperAdmin) return;
        let active = true;
        getAllStores()
            .then((rows) => {
                if (!active) return;
                const list = Array.isArray(rows) ? rows : rows?.content || [];
                setStores(list);
                if (list.length > 0) setStoreId(String(list[0].id));
                else setLoading(false);
            })
            .catch(() => {
                if (!active) return;
                setError("Could not load the store list.");
                setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [isSuperAdmin]);

    const refresh = useCallback(async () => {
        if (isSuperAdmin && !storeId) return null;
        try {
            const data = await getWhatsappStatus(effectiveStoreId);
            setInfo(data);
            setError("");
            return data;
        } catch (err) {
            setError(err?.response?.data?.message || "Could not read the WhatsApp status.");
            return null;
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, storeId, effectiveStoreId]);

    // Poll fast while waiting for a scan, slowly otherwise.
    useEffect(() => {
        if (isSuperAdmin && !storeId) return undefined;
        let stopped = false;
        setLoading(true);
        setInfo(null);

        const loop = async () => {
            const data = await refresh();
            if (stopped) return;
            const waiting = data && (data.status === "QR_PENDING" || data.status === "CONNECTING");
            timer.current = setTimeout(loop, waiting ? 3000 : 15000);
        };
        loop();

        return () => {
            stopped = true;
            clearTimeout(timer.current);
        };
    }, [refresh, isSuperAdmin, storeId]);

    const handleConnect = async () => {
        setBusy(true);
        setError("");
        try {
            setInfo(await connectWhatsapp(effectiveStoreId));
        } catch (err) {
            setError(err?.response?.data?.message || "Could not start WhatsApp.");
        } finally {
            setBusy(false);
        }
    };

    const handleDisconnect = async () => {
        const ok = window.confirm(
            "Disconnect this store's WhatsApp from the POS? Messages will stop coming into the POS until you scan the QR code again."
        );
        if (!ok) return;
        setBusy(true);
        setError("");
        try {
            setInfo(await disconnectWhatsapp(effectiveStoreId));
        } catch (err) {
            setError(err?.response?.data?.message || "Could not disconnect WhatsApp.");
        } finally {
            setBusy(false);
        }
    };

    const status = info?.status || "DISCONNECTED";

    return (
        <section className="wa-page">
            <button type="button" className="wa-back" onClick={() => navigate(leadsPath)}>
                <ArrowLeft size={16} /> Back to Leads
            </button>

            <h1 className="wa-title">WhatsApp connection</h1>
            <p className="wa-sub">
                Link the store's WhatsApp Business number once. After that, customer chats and stage
                messages work from the POS, including on the phone.
            </p>

            {isSuperAdmin && (
                <label className="wa-field">
                    <span>Store</span>
                    <select value={storeId} onChange={(e) => setStoreId(e.target.value)} disabled={busy}>
                        {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.storeName || `Store ${s.id}`}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {error && <div className="wa-banner wa-banner--error" role="alert">{error}</div>}

            {info && info.helperOnline === false && (
                <div className="wa-banner wa-banner--error" role="alert">
                    The WhatsApp service on the server is not running, so the status shown may be old.
                    Please contact support.
                </div>
            )}

            <div className="wa-card" aria-live="polite">
                {loading && !info ? (
                    <div className="wa-state"><Loader2 className="wa-spin" size={22} /> Checking WhatsApp…</div>
                ) : (
                    <>
                        {status === "CONNECTED" && (
                            <div className="wa-state wa-state--ok">
                                <CheckCircle2 size={22} />
                                <div>
                                    <strong>Connected</strong>
                                    <div className="wa-muted">
                                        {info?.storeName}
                                        {info?.phoneNumber ? ` · +${info.phoneNumber}` : ""}
                                    </div>
                                </div>
                            </div>
                        )}

                        {status === "QR_PENDING" && (
                            <div className="wa-qr-block">
                                <div className="wa-state"><QrCode size={22} /> <strong>Scan this QR code</strong></div>
                                {info?.qrDataUrl ? (
                                    <img className="wa-qr" src={info.qrDataUrl} alt="WhatsApp QR code to scan" />
                                ) : (
                                    <div className="wa-state"><Loader2 className="wa-spin" size={22} /> Getting QR code…</div>
                                )}
                                <ol className="wa-steps">
                                    <li>Open <strong>WhatsApp Business</strong> on the store phone.</li>
                                    <li>Tap <strong>Linked devices</strong>, then <strong>Link a device</strong>.</li>
                                    <li>Point the phone at this QR code.</li>
                                </ol>
                                <p className="wa-muted">The QR code refreshes by itself. Keep this page open.</p>
                            </div>
                        )}

                        {status === "CONNECTING" && (
                            <div className="wa-state"><Loader2 className="wa-spin" size={22} /> Connecting to WhatsApp…</div>
                        )}

                        {status === "DISCONNECTED" && (
                            <div className="wa-state wa-state--off">
                                <WifiOff size={22} />
                                <div>
                                    <strong>Not connected</strong>
                                    {reasonText(info?.disconnectReason) && (
                                        <div className="wa-muted">{reasonText(info.disconnectReason)}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="wa-actions">
                            {status === "DISCONNECTED" && (
                                <button type="button" className="wa-btn wa-btn--primary" onClick={handleConnect} disabled={busy}>
                                    {busy ? "Starting…" : "Connect WhatsApp"}
                                </button>
                            )}
                            {status !== "DISCONNECTED" && (
                                <button type="button" className="wa-btn wa-btn--danger" onClick={handleDisconnect} disabled={busy}>
                                    {status === "CONNECTED" ? "Disconnect" : "Cancel"}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
