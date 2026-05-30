import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, setDoc, doc, updateDoc, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { db, storage, auth } from '../config/firebase';
import { MessageSquare, X, Send, Paperclip, Download, FileText, Camera, Check, CheckCheck, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [identity, setIdentity] = useState({ name: '', email: '' });
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const formatTime = (ts) => {
    if (!ts || !ts.seconds) return 'Just now';
    return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  const ensureVisitorAuth = async () => {
    if (auth.currentUser) return auth.currentUser;
    const credential = await signInAnonymously(auth);
    return credential.user;
  };

  // Restore session
  useEffect(() => {
    const savedId = localStorage.getItem('portfolio_chat_id');
    const savedName = localStorage.getItem('portfolio_chat_name');
    if (savedId && savedName) {
      queueMicrotask(() => setChatId(savedId));
      queueMicrotask(() => setIdentity({ name: savedName, email: '' }));
      queueMicrotask(() => setHasJoined(true));
    }
  }, []);

  // Listen to messages
  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsubscribe();
  }, [chatId]);

  // Mark admin messages as seenByVisitor
  useEffect(() => {
    if (!chatId || !isOpen || messages.length === 0) return;

    const markAsSeen = async () => {
      const batch = writeBatch(db);
      let hasPending = false;
      
      messages.forEach(msg => {
        if (msg.sender === 'admin' && !msg.seenByVisitor) {
          const msgRef = doc(db, `chats/${chatId}/messages`, msg.id);
          batch.update(msgRef, { seenByVisitor: true });
          hasPending = true;
        }
      });

      if (hasPending) {
        try {
          await batch.commit();
        } catch (err) {
          console.error("Error marking messages as seen:", err);
        }
      }
    };

    markAsSeen();
  }, [chatId, isOpen, messages.length]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!identity.name.trim()) return;
    await ensureVisitorAuth();
    const newChatRef = doc(collection(db, 'chats'));
    await setDoc(newChatRef, {
      visitorName: identity.name, visitorEmail: identity.email,
      startedAt: serverTimestamp(), lastMessageAt: serverTimestamp(), unreadAdmin: false
    });
    const newId = newChatRef.id;
    setChatId(newId);
    setHasJoined(true);
    localStorage.setItem('portfolio_chat_id', newId);
    localStorage.setItem('portfolio_chat_name', identity.name);
  };

  const sendMessage = async (payload) => {
    await ensureVisitorAuth();
    await addDoc(collection(db, `chats/${chatId}/messages`), {
      sender: 'visitor', createdAt: serverTimestamp(), seenByAdmin: false, ...payload
    });
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessageAt: serverTimestamp(), unreadAdmin: true,
      lastMessage: payload.text || (payload.fileName ? `📎 ${payload.fileName}` : 'Google Drive link')
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !chatId) return;
    const text = inputMsg;
    setInputMsg('');
    await sendMessage({ text, type: 'text' });
  };

  const handleFileUpload = async (file) => {
    if (!file || !chatId) return;
    
    // Check file size (e.g., limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please select a file under 10MB.");
      return;
    }

    setUploading(true); 
    setUploadProgress(0);
    
    try {
      await ensureVisitorAuth();
      const storageRef = ref(storage, `chat-attachments/${chatId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
      const metadata = { contentType: file.type || 'application/octet-stream' };
      
      const task = uploadBytesResumable(storageRef, file, metadata);
      
      task.on('state_changed',
        (snap) => {
          const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (err) => { 
          console.error("Upload error:", err); 
          setUploading(false);
          const reason = err?.code ? ` (${err.code})` : '';
          alert(`File upload failed${reason}. Please check Firebase Storage access and try again.`);
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            await sendMessage({ type: 'file', fileName: file.name, fileSize: file.size, fileURL: url, text: '' });
          } catch (e) {
            console.error("Error getting URL:", e);
            alert("Upload completed but failed to generate link.");
          } finally {
            setUploading(false); 
            setUploadProgress(0);
          }
        }
      );
    } catch (err) {
      console.error("Storage initialization error:", err);
      setUploading(false);
      const reason = err?.code ? ` (${err.code})` : '';
      alert(`Could not start upload${reason}. Please try again.`);
    }
  };

  const handleFileChange = (e) => { handleFileUpload(e.target.files[0]); e.target.value = ''; };
  const handleCameraChange = (e) => { handleFileUpload(e.target.files[0]); e.target.value = ''; };

  const renderMessage = (msg) => {
    if (msg.type === 'file') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {isImage(msg.fileName)
            ? <img src={msg.fileURL} alt={msg.fileName} style={{ maxWidth: '100%', borderRadius: '0.75rem', cursor: 'pointer', display: 'block' }} onClick={() => window.open(msg.fileURL, '_blank')} />
            : <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.2rem 0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: msg.sender === 'visitor' ? 'rgba(255,255,255,0.15)' : 'var(--bg-color)', border: msg.sender === 'admin' ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} />
                </div>
                <span style={{ fontSize: '0.85rem', wordBreak: 'break-word', fontWeight: 500 }}>{msg.fileName}</span>
              </div>
          }
          <a href={msg.fileURL} download={msg.fileName} target="_blank" rel="noreferrer"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.3rem', 
              fontSize: '0.75rem', 
              opacity: 0.9, 
              color: msg.sender === 'visitor' ? '#fff' : 'var(--primary-color)', 
              textDecoration: 'none',
              fontWeight: 600,
              padding: '0.2rem 0'
            }}>
            <Download size={13} /> Download
          </a>
        </div>
      );
    }
    return msg.text;
  };



  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleCameraChange} style={{ display: 'none' }} />

      <button className="chat-toggle-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle live chat"
        style={{ 
          position: 'fixed', 
          bottom: isMobile ? '1rem' : '2rem', 
          right: isMobile ? '1rem' : '2rem', 
          width: isMobile ? '50px' : '60px', 
          height: isMobile ? '50px' : '60px', 
          borderRadius: '50%', 
          backgroundColor: 'var(--primary-color)', 
          color: 'var(--bg-color)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          boxShadow: 'var(--card-shadow)', 
          zIndex: 2000, 
          border: 'none', 
          cursor: 'pointer' 
        }}>
        {isOpen ? <X size={isMobile ? 24 : 28} /> : <MessageSquare size={isMobile ? 24 : 28} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{ 
              position: 'fixed', 
              bottom: isMobile ? '5.5rem' : '6.5rem', 
              right: isMobile ? '1rem' : '2rem', 
              width: isMobile ? 'calc(100vw - 2rem)' : '350px', 
              maxWidth: '400px',
              height: isMobile ? 'min(500px, 70vh)' : '520px', 
              backgroundColor: 'var(--surface-color)', 
              borderRadius: '1.25rem', 
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)', 
              border: '1px solid var(--border-color)', 
              display: 'flex', 
              flexDirection: 'column', 
              zIndex: 1999, 
              overflow: 'hidden' 
            }}>

            <div style={{ 
              padding: isMobile ? '1.25rem' : '1.5rem', 
              backgroundColor: 'var(--primary-color)', 
              color: 'var(--bg-color)', 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smile size={24} />
                  </div>
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid var(--primary-color)' }}></div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Srabon</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                    Online
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ color: 'var(--bg-color)', opacity: 0.8, cursor: 'pointer', background: 'none', border: 'none', padding: '0.5rem', marginRight: '-0.5rem' }}>
                <X size={24} />
              </button>
            </div>

            {!hasJoined ? (
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', flex: 1, gap: '1rem' }}>
                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Please enter your details to start chatting.</p>
                <input type="text" placeholder="Your Name" value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} required style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
                <input type="email" placeholder="Email (optional)" value={identity.email} onChange={(e) => setIdentity({ ...identity, email: e.target.value })} style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
                <button type="submit" className="btn-primary" style={{ marginTop: 'auto' }}>Start Chat</button>
              </form>
            ) : (
              <>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'var(--bg-color)' }}>
                  {messages.length === 0 && (
                    <div style={{ margin: 'auto', textAlign: 'center', padding: '2rem' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid var(--border-color)' }}>
                        <MessageSquare size={32} color="var(--primary-color)" />
                      </div>
                      <p style={{ opacity: 0.6, fontSize: '0.9rem', fontWeight: 500 }}>Start a conversation with me!</p>
                    </div>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} style={{ alignSelf: msg.sender === 'visitor' ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', maxWidth: '85%' }}>
                      <div style={{ 
                        backgroundColor: msg.sender === 'visitor' ? 'var(--primary-color)' : 'var(--surface-color)', 
                        color: msg.sender === 'visitor' ? 'var(--bg-color)' : 'var(--text-color)', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '1.25rem', 
                        borderBottomRightRadius: msg.sender === 'visitor' ? '0.25rem' : '1.25rem', 
                        borderBottomLeftRadius: msg.sender === 'admin' ? '0.25rem' : '1.25rem', 
                        wordBreak: 'break-word', 
                        fontSize: '0.92rem',
                        lineHeight: 1.5,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        border: msg.sender === 'admin' ? '1px solid var(--border-color)' : 'none'
                      }}>
                        {renderMessage(msg)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', alignSelf: msg.sender === 'visitor' ? 'flex-end' : 'flex-start', marginTop: '0.3rem', padding: '0 0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', opacity: 0.5, color: 'var(--text-color)', fontWeight: 600 }}>{formatTime(msg.createdAt)}</span>
                        {msg.sender === 'visitor' && (
                          <span style={{ fontSize: '0.65rem', color: msg.seenByAdmin ? 'var(--primary-color)' : 'var(--text-color)', opacity: msg.seenByAdmin ? 1 : 0.4 }}>
                            {msg.seenByAdmin ? <CheckCheck size={12} /> : <Check size={12} />}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {uploading && <div style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', color: 'var(--primary-color)', borderTop: '1px solid var(--border-color)' }}>Uploading... {uploadProgress}%</div>}

                {/* Input bar with 2 attachment buttons directly visible */}
                <form onSubmit={handleSend} style={{ display: 'flex', padding: '0.75rem 0.85rem', borderTop: '1px solid var(--border-color)', gap: '0.4rem', alignItems: 'center', backgroundColor: 'var(--surface-color)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-icon" title="Attach file" style={{ width: '34px', height: '34px' }}><Paperclip size={18} /></button>
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-icon" title="Open camera" style={{ width: '34px', height: '34px' }}><Camera size={18} /></button>
                  </div>
                  <input type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} placeholder="Type a message..."
                    style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '1.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontSize: '0.85rem', outline: 'none', minWidth: 0 }} />
                  <button type="submit"
                    style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer', transition: 'transform 0.2s ease', padding: 0 }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
