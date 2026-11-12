"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Activity, ArrowUp, AudioLines, Bell, CalendarDays, Check, ChevronDown, CircleHelp, Command, ContactRound, Headphones, Mail, MessageCircle, Mic, MicOff, MoreHorizontal, Plus, Settings2, ShieldCheck, Sparkles, Volume2, VolumeX, X } from "lucide-react"

type Contact = { id: string; name: string; email: string; phone: string }
type Message = { role: "user" | "assistant"; content: string }
type Log = { id: number; title: string; detail: string; time: string; icon: "mail" | "calendar" | "message" }
const initialLogs: Log[] = [{ id: 1, title: "Workspace ready", detail: "Orion is standing by", time: "JUST NOW", icon: "message" }]
const welcome: Message = { role: "assistant", content: "Good morning. I’m Orion, your assistant. What can I take off your plate?" }

export default function OrionDashboard() {
  const [messages, setMessages] = useState<Message[]>([welcome])
  const [input, setInput] = useState("")
  const [contacts, setContacts] = useState<Contact[]>([])
  const [logs, setLogs] = useState<Log[]>(initialLogs)
  const [modal, setModal] = useState<"contacts" | "settings" | null>(null)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(true)
  const [voice, setVoice] = useState("Natural voice")
  const [busy, setBusy] = useState(false)
  const [contactDraft, setContactDraft] = useState({ name: "", email: "", phone: "" })
  const [pending, setPending] = useState<{ kind: string; recipient: string; detail: string } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognition = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("orion.contacts")
      const history = localStorage.getItem("orion.history")
      if (saved) setContacts(JSON.parse(saved))
      if (history) setMessages(JSON.parse(history))
    } catch { /* Ignore corrupt or unavailable local browser storage. */ }
  }, [])
  useEffect(() => { localStorage.setItem("orion.contacts", JSON.stringify(contacts)) }, [contacts])
  useEffect(() => { localStorage.setItem("orion.history", JSON.stringify(messages.slice(-50))) }, [messages])
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }) }, [messages, pending])
  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return
    const instance = new Recognition()
    instance.continuous = false
    instance.interimResults = false
    instance.lang = navigator.language || "en-US"
    instance.onresult = (event) => setInput((value) => `${value}${value ? " " : ""}${event.results[0][0].transcript}`)
    instance.onend = () => setListening(false)
    instance.onerror = () => setListening(false)
    recognition.current = instance
    return () => instance.abort()
  }, [])

  function speak(text: string) {
    if (!speaking || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/https?:\/\/\S+/g, "link").replace(/[*_`#]/g, ""))
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find((item) => /natural|neural|siri|google|microsoft/i.test(item.name)) || voices.find((item) => item.lang.startsWith("en"))
    if (preferred) utterance.voice = preferred
    utterance.rate = 0.94
    utterance.pitch = 1.02
    window.speechSynthesis.speak(utterance)
  }

  async function sendMessage(text = input) {
    const prompt = text.trim()
    if (!prompt || busy) return
    setInput("")
    const next = [...messages, { role: "user" as const, content: prompt }]
    setMessages(next)
    setBusy(true)
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20), contacts }) })
      if (!response.ok || !response.body) throw new Error("The assistant service isn’t configured yet. Add your Gemini API key to get started.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let answer = ""
      setMessages((items) => [...items, { role: "assistant", content: "" }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        answer += decoder.decode(value, { stream: true })
        setMessages((items) => items.map((item, index) => index === items.length - 1 ? { ...item, content: answer } : item))
      }
      speak(answer)
      const action = /\b(email|mail)\b/i.test(prompt) ? "mail" : /\b(calendar|meeting|schedule)\b/i.test(prompt) ? "calendar" : /\bwhatsapp|message|text\b/i.test(prompt) ? "message" : null
      if (action) {
        const match = contacts.find((contact) => new RegExp(contact.name.split(" ")[0], "i").test(prompt))
        setPending({ kind: action, recipient: match?.name || "recipient", detail: prompt })
      }
    } catch (error) {
      const content = error instanceof Error ? error.message : "Something went wrong. Please try again."
      setMessages((items) => [...items, { role: "assistant", content }])
    } finally { setBusy(false) }
  }

  function confirmAction() {
    if (!pending) return
    const recipient = contacts.find((person) => person.name === pending.recipient)
    const detail = pending.detail
    if (pending.kind === "message" && recipient?.phone) {
      const body = encodeURIComponent(detail.replace(/^(whatsapp|message|text)\s+/i, ""))
      window.open(`https://wa.me/${recipient.phone.replace(/\D/g, "")}?text=${body}`, "_blank", "noopener,noreferrer")
      addLog("WhatsApp opened", `Prepared a message for ${recipient.name}`, "message")
    } else if (pending.kind === "mail" && recipient?.email) {
      const subject = encodeURIComponent("Message from Orion")
      const body = encodeURIComponent(detail)
      window.location.href = `mailto:${recipient.email}?subject=${subject}&body=${body}`
      addLog("Email draft opened", `Prepared a message for ${recipient.name}`, "mail")
    } else if (pending.kind === "calendar") {
      window.open("https://calendar.google.com/calendar/u/0/r/eventedit", "_blank", "noopener,noreferrer")
      addLog("Calendar opened", "Review and create your meeting", "calendar")
    } else {
      setMessages((items) => [...items, { role: "assistant", content: `I don’t have ${pending.recipient}’s contact details saved yet. Add them in Contacts to continue.` }])
    }
    setPending(null)
  }

  function addLog(title: string, detail: string, icon: Log["icon"]) {
    setLogs((items) => [{ id: Date.now(), title, detail, time: "JUST NOW", icon }, ...items].slice(0, 6))
  }

  function saveContact(event: React.FormEvent) {
    event.preventDefault()
    if (!contactDraft.name.trim()) return
    setContacts((items) => [...items, { id: crypto.randomUUID(), ...contactDraft, name: contactDraft.name.trim() }])
    setContactDraft({ name: "", email: "", phone: "" })
  }

  const suggestions = ["What’s on my schedule today?", "Help me email Sarah", "Send John a WhatsApp"]
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Orion home"><span className="brand-mark"><Sparkles size={17} /></span><span>ORION</span></a>
        <div className="top-center"><span className="status-dot" /> LOCAL SESSION <span className="divider">/</span> PRIVATE BY DESIGN</div>
        <div className="top-actions"><button className="icon-button" aria-label="Manage contacts" onClick={() => setModal("contacts")}><ContactRound size={18} /></button><button className="icon-button" aria-label="Settings" onClick={() => setModal("settings")}><Settings2 size={18} /></button><span className="avatar">O</span></div>
      </header>

      <div className="dashboard-grid">
        <aside className="left-rail">
          <div className="section-label">YOUR SPACE</div>
          <button className="rail-link active"><Command size={17} /> Assistant <span className="rail-dot" /></button>
          <button className="rail-link" onClick={() => setModal("contacts")}><ContactRound size={17} /> Contacts <span className="count">{contacts.length}</span></button>
          <div className="rail-divider" />
          <div className="section-label">QUICK ACTIONS</div>
          <button className="rail-link" onClick={() => sendMessage("What’s on my calendar today?")}><CalendarDays size={17} /> My calendar</button>
          <button className="rail-link" onClick={() => sendMessage("Summarize my unread email")}><Mail size={17} /> Inbox summary</button>
          <div className="rail-bottom"><div className="privacy-card"><ShieldCheck size={17} /><div><strong>Your data stays yours</strong><span>History stored on this device</span></div></div><button className="help-link"><CircleHelp size={15} /> Help & feedback</button></div>
        </aside>

        <section className="assistant-column" aria-label="Assistant conversation">
          <div className="greeting"><div><div className="eyebrow">THURSDAY, NOVEMBER 12</div><h1>Good morning<span className="cyan">.</span></h1><p>Your day, a little more in sync.</p></div><button className="date-pill"><CalendarDays size={14} /> TODAY <ChevronDown size={13} /></button></div>
          <div className="orb-stage">
            <div className={`orb-halo ${listening ? "active" : ""}`}><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><motion.button className={`voice-orb ${listening ? "listening" : ""}`} onClick={() => { if (listening) recognition.current?.stop(); else { try { recognition.current?.start(); setListening(true) } catch { setListening(false) } } }} aria-label={listening ? "Stop listening" : "Start voice input"} animate={listening ? { scale: [1, 1.055, 1] } : { scale: 1 }} transition={{ duration: 1.6, repeat: listening ? Infinity : 0 }}><span className="orb-core" /><AudioLines className="orb-icon" size={24} /></motion.button></div><div className="orb-caption"><span className="live-dot" />{listening ? "I’M LISTENING" : busy ? "THINKING" : "READY WHEN YOU ARE"}</div><div className="orb-hint">{listening ? "Speak naturally, then pause" : "Tap to speak or type below"}</div>
          </div>
          <div className="chat-panel"><div className="chat-heading"><div className="mini-orb"><Sparkles size={13} /></div><span>YOUR ASSISTANT</span><span className="chat-time">TODAY</span></div><div className="messages" ref={scrollRef} aria-live="polite">{messages.map((message, index) => <div className={`message ${message.role}`} key={index}><div className="message-avatar">{message.role === "assistant" ? <Sparkles size={13} /> : "Y"}</div><div className="message-content"><span className="message-author">{message.role === "assistant" ? "ORION" : "YOU"}</span><p>{message.content || <span className="typing">Thinking<span>.</span><span>.</span><span>.</span></span>}</p></div></div>)}{pending && <div className="confirm-card"><div className="confirm-icon"><ShieldCheck size={16} /></div><div className="confirm-copy"><strong>Ready for your approval</strong><span>{pending.kind === "mail" ? "Open a prepared email draft?" : pending.kind === "calendar" ? "Open Calendar to review this event?" : `Open WhatsApp for ${pending.recipient}?`}</span></div><button className="confirm-button" onClick={confirmAction}><Check size={14} /> Confirm</button><button className="dismiss-button" aria-label="Dismiss action" onClick={() => setPending(null)}><X size={15} /></button></div>}</div>
            {messages.length === 1 && <div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => sendMessage(suggestion)}>{suggestion}<ArrowUp size={13} /></button>)}</div>}
            <form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage() }}><input aria-label="Message Orion" placeholder="Ask Orion anything…" value={input} onChange={(event) => setInput(event.target.value)} /><button type="button" className="composer-tool" aria-label={listening ? "Stop voice input" : "Voice input"} onClick={() => { if (listening) recognition.current?.stop(); else { try { recognition.current?.start(); setListening(true) } catch { setListening(false) } } }}>{listening ? <MicOff size={17} /> : <Mic size={17} />}</button><button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="Send message"><ArrowUp size={18} /></button></form><div className="composer-note"><ShieldCheck size={11} /> PRIVATE BY DESIGN <span>·</span> AI CAN MAKE MISTAKES</div>
          </div>
        </section>

        <aside className="right-rail"><div className="rail-panel"><div className="panel-header"><div><div className="section-label">AT A GLANCE</div><h2>Today</h2></div><button className="icon-button small" aria-label="More options"><MoreHorizontal size={17} /></button></div><div className="agenda-empty"><div className="calendar-icon"><CalendarDays size={18} /></div><div><strong>No calendar connected</strong><span>Connect Google Calendar to view your day.</span></div></div><button className="connect-calendar" onClick={() => sendMessage("Help me connect my Google Calendar")}>Connect a calendar <ArrowUp size={13} /></button></div>
          <div className="rail-panel activity-panel"><div className="panel-header"><div><div className="section-label">ACTIVITY</div><h2>Action log <span className="activity-count">{logs.length}</span></h2></div><Activity size={16} className="activity-indicator" /></div><div className="activity-list">{logs.map((log) => <div className="activity-item" key={log.id}><div className={`activity-icon ${log.icon}`}>{log.icon === "mail" ? <Mail size={14} /> : log.icon === "calendar" ? <CalendarDays size={14} /> : <MessageCircle size={14} />}</div><div className="activity-copy"><strong>{log.title}</strong><span>{log.detail}</span></div><span className="activity-time">{log.time}</span></div>)}</div></div>
          <div className="voice-card"><div className="voice-card-icon"><Headphones size={17} /></div><div><strong>Voice mode</strong><span>Natural, hands-free help</span></div><button className={`toggle ${speaking ? "on" : ""}`} aria-label={speaking ? "Mute voice output" : "Enable voice output"} onClick={() => setSpeaking(!speaking)}>{speaking ? <Volume2 size={14} /> : <VolumeX size={14} />}</button></div>
          <div className="free-note"><span className="free-dot" /> RUNS ON FREE TOOLS <span>·</span> NO SUBSCRIPTION</div>
        </aside>
      </div>

      <AnimatePresence>{modal && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null) }}><motion.section className="modal" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><span className="section-label">ORION SETTINGS</span><h2 id="modal-title">{modal === "contacts" ? "Your contacts" : "Preferences"}</h2></div><button className="icon-button" onClick={() => setModal(null)} aria-label="Close dialog"><X size={17} /></button></div>{modal === "contacts" ? <><p className="modal-description">Add the people you reach out to. Your contacts stay on this device.</p><form className="contact-form" onSubmit={saveContact}><input aria-label="Contact name" placeholder="Full name" value={contactDraft.name} onChange={(event) => setContactDraft({ ...contactDraft, name: event.target.value })} required /><input aria-label="Contact email" type="email" placeholder="Email address" value={contactDraft.email} onChange={(event) => setContactDraft({ ...contactDraft, email: event.target.value })} /><input aria-label="Contact phone" type="tel" placeholder="Phone number (international format)" value={contactDraft.phone} onChange={(event) => setContactDraft({ ...contactDraft, phone: event.target.value })} /><button type="submit" className="primary-button"><Plus size={15} /> Add contact</button></form><div className="contact-list">{contacts.length ? contacts.map((contact) => <div className="contact-row" key={contact.id}><span className="contact-avatar">{contact.name[0]?.toUpperCase()}</span><div><strong>{contact.name}</strong><span>{contact.email || contact.phone || "No details added"}</span></div><button aria-label={`Remove ${contact.name}`} onClick={() => setContacts((items) => items.filter((item) => item.id !== contact.id))}><X size={15} /></button></div>) : <div className="empty-contacts">Your address book is waiting for its first name.</div>}</div></> : <><p className="modal-description">Make Orion feel more like yours.</p><div className="setting-row"><div><strong>Voice responses</strong><span>Read Orion’s replies aloud</span></div><button className={`toggle ${speaking ? "on" : ""}`} aria-label="Toggle voice responses" onClick={() => setSpeaking(!speaking)}>{speaking ? <Volume2 size={14} /> : <VolumeX size={14} />}</button></div><div className="setting-row"><div><strong>Speech voice</strong><span>Choose the most natural voice available</span></div><select aria-label="Speech voice" value={voice} onChange={(event) => setVoice(event.target.value)}><option>Natural voice</option><option>Calm voice</option><option>Bright voice</option></select></div><div className="settings-footnote"><ShieldCheck size={15} /> Contact and conversation history stay in this browser only.</div></>}</motion.section></motion.div>}</AnimatePresence>
      <footer className="mobile-footer"><button aria-label="Assistant"><Sparkles size={18} /></button><button aria-label="Contacts" onClick={() => setModal("contacts")}><ContactRound size={18} /></button><button aria-label="Calendar" onClick={() => sendMessage("What’s on my schedule today?")}><CalendarDays size={18} /></button><button aria-label="Settings" onClick={() => setModal("settings")}><Settings2 size={18} /></button></footer>
    </main>
  )
}
