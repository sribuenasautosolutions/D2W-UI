import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Camera,
    Download,
    FileText,
    Loader2,
    MessageCircle,
    Mic,
    Search,
    Send,
    Video,
} from "lucide-react";
import {
    fetchWhatsappMedia,
    getConversations,
    getMessages,
    markConversationRead,
    sendWhatsappText,
} from "../../../services/whatsappChatService";
import { getAllStores } from "../../../services/storeService";
import "./WhatsAppChats.css";

const LIST_POLL_MS = 8000;
const CHAT_POLL_MS = 3000;

/* ---------------- helpers ---------------- */

function readUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

const errorText = (err, fallback) => err?.response?.data?.message || fallback;

const toDate = (value) => (value ? new Date(value) : null);

function dayLabel(date) {
    if (!date) return "";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

const timeLabel = (date) =>
    date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

function listTime(value) {
    const date = toDate(value);
    if (!date) return "";
    return date.toDateString() === new Date().toDateString()
        ? timeLabel(date)
        : date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

const chatTitle = (c) => c.customerName || c.displayName || (c.phoneNumber ? `+${c.phoneNumber}` : "Unknown number");

function PreviewIcon({ type }) {
    if (type === "IMAGE" || type === "STICKER") return <Camera size={13} />;
    if (type === "AUDIO") return <Mic size={13} />;
    if (type === "VIDEO") return <Video size={13} />;
    if (type === "DOCUMENT") return <FileText size={13} />;
    return null;
}

const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ---------------- photo / voice note / file inside a message ---------------- */

function MediaView({ message }) {
    const [url, setUrl] = useState(null);
    const [status, setStatus] = useState("idle"); // idle | loading | error
    const urlRef = useRef(null);
    const autoLoad = ["IMAGE", "STICKER", "AUDIO"].includes(message.type);

    const load = useCallback(async () => {
        setStatus("loading");
        try {
            const blob = await fetchWhatsappMedia(message.id);
            const objectUrl = URL.createObjectURL(blob);
            urlRef.current = objectUrl;
            setUrl(objectUrl);
            setStatus("idle");
            return objectUrl;
        } catch {
            setStatus("error");
            return null;
        }
    }, [message.id]);

    useEffect(() => {
        if (autoLoad && message.hasMedia) load();
        return () => {
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        };
    }, [autoLoad, message.hasMedia, load]);

    if (!message.hasMedia) {
        return <div className="wc-file-note">File not saved</div>;
    }
    if (status === "error") {
        return (
            <button type="button" className="wc-file-btn" onClick={load}>
                Could not load. Tap to retry
            </button>
        );
    }
    if (status === "loading" && !url) {
        return <div className="wc-file-note"><Loader2 className="wc-spin" size={14} /> Loading…</div>;
    }

    if (message.type === "IMAGE" || message.type === "STICKER") {
        return url ? (
            <img
                className={message.type === "STICKER" ? "wc-sticker" : "wc-img"}
                src={url}
                alt={message.type === "STICKER" ? "Sticker" : "Photo from customer"}
                onClick={() => window.open(url, "_blank", "noopener")}
            />
        ) : null;
    }
    if (message.type === "AUDIO") {
        return url ? <audio className="wc-audio" controls src={url} /> : null;
    }
    if (message.type === "VIDEO") {
        return url ? (
            <video className="wc-video" controls src={url} />
        ) : (
            <button type="button" className="wc-file-btn" onClick={load}>
                <Video size={14} /> Play video {formatSize(message.mediaSize)}
            </button>
        );
    }

    // DOCUMENT or anything else: download on tap
    const download = async () => {
        const objectUrl = url || (await load());
        if (!objectUrl) return;
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = message.fileName || "whatsapp-file";
        document.body.appendChild(link);
        link.click();
        link.remove();
    };
    return (
        <button type="button" className="wc-file-btn" onClick={download}>
            <Download size={14} /> {message.fileName || "Download file"} {formatSize(message.mediaSize)}
        </button>
    );
}

/* ---------------- one open chat ---------------- */

function ChatView({ conversation, onBack, onActivity }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const scrollRef = useRef(null);
    const stickToBottom = useRef(true);
    const lastIdRef = useRef(0);
    const loadedRef = useRef(false);
    const firstIdRef = useRef(null);
    const restoreScroll = useRef(null);
    const convId = conversation.id;

    const mergeMessages = useCallback((incoming, mode) => {
        setMessages((current) => {
            const seen = new Set(current.map((m) => m.id));
            const fresh = incoming.filter((m) => !seen.has(m.id));
            if (fresh.length === 0) return current;
            return (mode === "prepend" ? [...fresh, ...current] : [...current, ...fresh]).sort((a, b) => a.id - b.id);
        });
    }, []);

    // keep the "newest id" and "oldest id" for polling and "load older"
    useEffect(() => {
        lastIdRef.current = messages.length ? messages[messages.length - 1].id : 0;
        firstIdRef.current = messages.length ? messages[0].id : null;
    }, [messages]);

    // open a chat: load the latest messages, mark them read
    useEffect(() => {
        let cancelled = false;
        setMessages([]);
        setLoading(true);
        loadedRef.current = false;
        setError("");
        setText("");
        stickToBottom.current = true;

        getMessages(convId, { limit: 50 })
            .then((rows) => {
                if (cancelled) return;
                setMessages(rows);
                lastIdRef.current = rows.length ? rows[rows.length - 1].id : 0;
                loadedRef.current = true;
                setHasMore(rows.length >= 50);
                return markConversationRead(convId).then(() => onActivity());
            })
            .catch((err) => !cancelled && setError(errorText(err, "Could not load this chat.")))
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [convId]); // eslint-disable-line react-hooks/exhaustive-deps

    // while the chat is open: look for new messages every few seconds
    useEffect(() => {
        let stopped = false;
        let timer;
        const tick = async () => {
            if (!document.hidden && loadedRef.current) {
                try {
                    const rows = await getMessages(convId, { afterId: lastIdRef.current });
                    if (!stopped && rows.length > 0) {
                        mergeMessages(rows, "append");
                        if (rows.some((m) => m.direction === "INBOUND")) {
                            await markConversationRead(convId);
                            onActivity();
                        }
                    }
                } catch {
                    /* a short network problem: try again at the next tick */
                }
            }
            if (!stopped) timer = setTimeout(tick, CHAT_POLL_MS);
        };
        timer = setTimeout(tick, CHAT_POLL_MS);
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [convId, mergeMessages, onActivity]);

    // scrolling: stay at the bottom for new messages, keep position when older ones load
    useLayoutEffect(() => {
        const box = scrollRef.current;
        if (!box) return;
        if (restoreScroll.current != null) {
            box.scrollTop = box.scrollHeight - restoreScroll.current;
            restoreScroll.current = null;
        } else if (stickToBottom.current) {
            box.scrollTop = box.scrollHeight;
        }
    }, [messages]);

    const handleScroll = () => {
        const box = scrollRef.current;
        if (!box) return;
        stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    };

    const loadOlder = async () => {
        if (firstIdRef.current == null) return;
        try {
            const rows = await getMessages(convId, { beforeId: firstIdRef.current, limit: 50 });
            setHasMore(rows.length >= 50);
            restoreScroll.current = scrollRef.current ? scrollRef.current.scrollHeight - scrollRef.current.scrollTop : null;
            mergeMessages(rows, "prepend");
        } catch (err) {
            setError(errorText(err, "Could not load older messages."));
        }
    };

    const handleSend = async () => {
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        setError("");
        try {
            const saved = await sendWhatsappText(convId, body);
            stickToBottom.current = true;
            mergeMessages([saved], "append");
            setText("");
            onActivity();
        } catch (err) {
            setError(errorText(err, "Message was not sent."));
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (event) => {
        // Enter sends on a computer. On a phone Enter makes a new line (use the Send button).
        const desktop = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
        if (event.key === "Enter" && !event.shiftKey && desktop) {
            event.preventDefault();
            handleSend();
        }
    };

    let lastDay = "";
    return (
        <div className="wc-chat">
            <header className="wc-chat-head">
                <button type="button" className="wc-icon-btn wc-only-mobile" onClick={onBack} aria-label="Back to chats">
                    <ArrowLeft size={20} />
                </button>
                <div className="wc-avatar">{chatTitle(conversation).charAt(0).toUpperCase()}</div>
                <div className="wc-chat-head-text">
                    <strong>{chatTitle(conversation)}</strong>
                    <span>
                        {conversation.phoneNumber ? `+${conversation.phoneNumber}` : "Number hidden by WhatsApp"}
                        {conversation.customerName ? " · POS customer" : ""}
                    </span>
                </div>
            </header>

            <div className="wc-messages" ref={scrollRef} onScroll={handleScroll}>
                {loading && <div className="wc-center"><Loader2 className="wc-spin" size={20} /></div>}
                {!loading && hasMore && (
                    <button type="button" className="wc-older" onClick={loadOlder}>Load older messages</button>
                )}
                {messages.map((m) => {
                    const date = toDate(m.sentAt);
                    const label = dayLabel(date);
                    const showDay = label !== lastDay;
                    lastDay = label;
                    const out = m.direction === "OUTBOUND";
                    return (
                        <div key={m.id}>
                            {showDay && <div className="wc-day"><span>{label}</span></div>}
                            <div className={`wc-row ${out ? "wc-row--out" : "wc-row--in"}`}>
                                <div className={`wc-bubble ${out ? "wc-bubble--out" : "wc-bubble--in"}`}>
                                    {out && m.sentBy && <div className="wc-by">{m.sentBy}</div>}
                                    {m.type !== "TEXT" && m.type !== "OTHER" && <MediaView message={m} />}
                                    {m.body && <div className="wc-text">{m.body}</div>}
                                    <div className="wc-time">{timeLabel(date)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {!loading && messages.length === 0 && !error && (
                    <div className="wc-center wc-muted">No messages yet.</div>
                )}
            </div>

            {error && <div className="wc-error" role="alert">{error}</div>}

            <div className="wc-compose">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message"
                    rows={1}
                    maxLength={4000}
                />
                <button
                    type="button"
                    className="wc-send"
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    aria-label="Send message"
                >
                    {sending ? <Loader2 className="wc-spin" size={18} /> : <Send size={18} />}
                </button>
            </div>
        </div>
    );
}

/* ---------------- Inbox + chat page ---------------- */

export default function WhatsAppChats() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = readUser();
    const isSuperAdmin = user.role === "SUPER_ADMIN";

    const [stores, setStores] = useState([]);
    const [storeId, setStoreId] = useState("");
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [conversations, setConversations] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [selected, setSelected] = useState(null);
    const [tick, setTick] = useState(0);

    const leadsPath = location.pathname.replace(/\/chats\/?$/, "");
    const effectiveStoreId = isSuperAdmin ? storeId : null;
    const refreshList = useCallback(() => setTick((n) => n + 1), []);

    useEffect(() => {
        const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(handle);
    }, [query]);

    useEffect(() => {
        if (!isSuperAdmin) return undefined;
        let active = true;
        getAllStores()
            .then((rows) => {
                if (!active) return;
                const list = Array.isArray(rows) ? rows : rows?.content || [];
                setStores(list);
                if (list.length > 0) setStoreId(String(list[0].id));
                else setListLoading(false);
            })
            .catch(() => {
                if (!active) return;
                setListError("Could not load the store list.");
                setListLoading(false);
            });
        return () => {
            active = false;
        };
    }, [isSuperAdmin]);

    // load the chat list now, on search/store change, and every few seconds
    useEffect(() => {
        if (isSuperAdmin && !storeId) return undefined;
        let stopped = false;
        let timer;

        const load = async () => {
            if (document.hidden && timer) {
                if (!stopped) timer = setTimeout(load, LIST_POLL_MS);
                return;
            }
            try {
                const rows = await getConversations(effectiveStoreId, { q: debouncedQuery });
                if (stopped) return;
                setConversations(rows);
                setListError("");
                setSelected((current) => (current ? rows.find((r) => r.id === current.id) || current : current));
            } catch (err) {
                if (!stopped) setListError(errorText(err, "Could not load chats."));
            } finally {
                if (!stopped) {
                    setListLoading(false);
                    timer = setTimeout(load, LIST_POLL_MS);
                }
            }
        };
        setListLoading(true);
        load();
        return () => {
            stopped = true;
            clearTimeout(timer);
        };
    }, [isSuperAdmin, storeId, effectiveStoreId, debouncedQuery, tick]);

    const openChat = (conversation) => {
        // show it as read straight away; the chat marks it read on the server
        setConversations((rows) => rows.map((r) => (r.id === conversation.id ? { ...r, unreadCount: 0 } : r)));
        setSelected({ ...conversation, unreadCount: 0 });
    };

    const changeStore = (value) => {
        setSelected(null);
        setConversations([]);
        setStoreId(value);
    };

    return (
        <section className={`wc-page${selected ? " wc-page--chat-open" : ""}`}>
            <div className="wc-topbar">
                <button type="button" className="wc-back" onClick={() => navigate(leadsPath)}>
                    <ArrowLeft size={16} /> Back to Leads
                </button>
                <h1>WhatsApp chats</h1>
            </div>

            <div className="wc-shell">
                <aside className="wc-list-pane">
                    {isSuperAdmin && (
                        <select className="wc-store-select" value={storeId} onChange={(e) => changeStore(e.target.value)}>
                            {stores.map((s) => (
                                <option key={s.id} value={s.id}>{s.storeName || `Store ${s.id}`}</option>
                            ))}
                        </select>
                    )}
                    <div className="wc-search">
                        <Search size={15} />
                        <input
                            type="text"
                            placeholder="Search name or number"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>

                    {listError && <div className="wc-error" role="alert">{listError}</div>}

                    <div className="wc-list">
                        {listLoading && conversations.length === 0 && (
                            <div className="wc-center"><Loader2 className="wc-spin" size={20} /></div>
                        )}
                        {!listLoading && conversations.length === 0 && !listError && (
                            <div className="wc-center wc-muted">
                                {debouncedQuery ? "No chat found." : "No chats yet. Customer messages will appear here."}
                            </div>
                        )}
                        {conversations.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className={`wc-item${selected?.id === c.id ? " is-active" : ""}`}
                                onClick={() => openChat(c)}
                            >
                                <div className="wc-avatar">{chatTitle(c).charAt(0).toUpperCase()}</div>
                                <div className="wc-item-main">
                                    <div className="wc-item-top">
                                        <strong>{chatTitle(c)}</strong>
                                        <span className={c.unreadCount > 0 ? "wc-time-unread" : ""}>{listTime(c.lastMessageAt)}</span>
                                    </div>
                                    <div className="wc-item-bottom">
                                        <span className="wc-preview">
                                            <PreviewIcon type={c.lastMessageType} /> {c.lastMessagePreview || ""}
                                        </span>
                                        {c.unreadCount > 0 && <span className="wc-badge">{c.unreadCount}</span>}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </aside>

                <div className="wc-chat-pane">
                    {selected ? (
                        <ChatView
                            key={selected.id}
                            conversation={selected}
                            onBack={() => setSelected(null)}
                            onActivity={refreshList}
                        />
                    ) : (
                        <div className="wc-empty">
                            <MessageCircle size={42} />
                            <p>Select a chat to read and reply.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
