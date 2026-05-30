import { useState, useEffect, useRef } from 'react';
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc,
  addDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, storage } from '../config/firebase';
import { Send, LogOut, MessageSquare, Paperclip, Download, FileText, Camera, Check, CheckCheck, X } from 'lucide-react';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const hasAutoSelected = useRef(false);

  // Resize handling
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u && !u.isAnonymous ? u : null));
    return () => unsub();
  }, []);

  // Fetch all chats
  useEffect(() => {
    if (!user) return;
    hasAutoSelected.current = false;
    let active = true;
    const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!active) return;
      const seen = new Set();
      const list = [];
      snapshot.docs.forEach(d => {
        if (!seen.has(d.id)) { seen.add(d.id); list.push({ id: d.id, ...d.data() }); }
      });
      setChats(list);
      if (!hasAutoSelected.current && list.length > 0 && !isMobile) {
        hasAutoSelected.current = true;
        setActiveChatId(list[0].id);
      }
    });
    return () => { active = false; unsub(); };
  }, [user, isMobile]);

  // Listen to messages
  useEffect(() => {
    if (!user || !activeChatId) return;
    const q = query(collection(db, `chats/${activeChatId}/messages`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [user, activeChatId]);

  // Mark visitor messages as seenByAdmin
  useEffect(() => {
    if (!user || !activeChatId || messages.length === 0) return;

    const markAsSeen = async () => {
      const batch = writeBatch(db);
      let hasPending = false;

      messages.forEach(msg => {
        if (msg.sender === 'visitor' && !msg.seenByAdmin) {
          const msgRef = doc(db, `chats/${activeChatId}/messages`, msg.id);
          batch.update(msgRef, { seenByAdmin: true });
          hasPending = true;
        }
      });

      if (hasPending) {
        try {
          await batch.commit();
          // Also clear the unread flag on the chat document
          await updateDoc(doc(db, 'chats', activeChatId), { unreadAdmin: false });
        } catch (err) {
          console.error("Error marking messages as seen:", err);
        }
      }
    };

    markAsSeen();
  }, [user, activeChatId, messages.length]);

  const selectChat = (id) => {
    setActiveChatId(id);
    if (isMobile) setIsSidebarOpen(false);
  };

  const formatTime = (ts) => {
    if (!ts || !ts.seconds) return 'Just now';
    return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  const renderMessage = (msg) => {
    if (msg.type === 'file') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {isImage(msg.fileName)
            ? <img src={msg.fileURL} alt={msg.fileName} style={{ maxWidth: '100%', borderRadius: '0.5rem', cursor: 'pointer' }} onClick={() => window.open(msg.fileURL, '_blank')} />
            : <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={20} /><span style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>{msg.fileName}</span></div>
          }
          <a href={msg.fileURL} download={msg.fileName} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', opacity: 0.85, color: msg.sender === 'admin' ? 'rgba(255,255,255,0.9)' : 'var(--primary-color)', textDecoration: 'none' }}>
            <Download size={13} /> Download
          </a>
        </div>
      );
    }
    return msg.text;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch (err) { alert("Login Failed: " + err.message); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeChatId) return;
    const text = inputMsg; setInputMsg('');
    await addDoc(collection(db, `chats/${activeChatId}/messages`), { text, type: 'text', sender: 'admin', createdAt: serverTimestamp(), seenByVisitor: false });
    await updateDoc(doc(db, 'chats', activeChatId), { lastMessageAt: serverTimestamp(), lastMessage: text });
  };

  const handleFileUpload = async (file) => {
    if (!file || !activeChatId) return;

    // Check file size (e.g., limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please select a file under 10MB.");
      return;
    }

    setUploading(true); 
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, `chat-attachments/${activeChatId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
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
          alert("File upload failed. Please check your connection or permissions.");
        },
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            await addDoc(collection(db, `chats/${activeChatId}/messages`), { 
              type: 'file', 
              fileName: file.name, 
              fileSize: file.size, 
              fileURL: url, 
              text: '', 
              sender: 'admin', 
              createdAt: serverTimestamp(), 
              seenByVisitor: false 
            });
            await updateDoc(doc(db, 'chats', activeChatId), { 
              lastMessageAt: serverTimestamp(), 
              lastMessage: `📎 ${file.name}` 
            });
          } catch (e) {
            console.error("Error finalizing upload:", e);
            alert("Upload completed but failed to update message list.");
          } finally {
            setUploading(false); 
            setUploadProgress(0);
          }
        }
      );
    } catch (err) {
      console.error("Storage error:", err);
      setUploading(false);
      alert("Could not initialize upload. Please try again.");
    }
  };

  const handleFileChange = (e) => { handleFileUpload(e.target.files[0]); e.target.value = ''; };
  const handleCameraChange = (e) => { handleFileUpload(e.target.files[0]); e.target.value = ''; };

  // Login screen
  if (!user) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: '1rem' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'var(--surface-color)', padding: isMobile ? '1.5rem' : '2rem', borderRadius: '1rem', boxShadow: 'var(--card-shadow)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--primary-color)', fontWeight: 800 }}>Secure Login</h2>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }} />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Login</button>
        </form>
      </main>
    );
  }

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <main style={{ 
      height: isMobile ? '100dvh' : 'calc(100vh - 40px)', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: 'var(--bg-color)', 
      overflow: 'hidden',
      padding: isMobile ? '0' : '1rem',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      {/* Hidden file inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleCameraChange} style={{ display: 'none' }} />

      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden', 
        position: 'relative',
        backgroundColor: 'var(--surface-color)',
        borderRadius: isMobile ? '0' : '1rem',
        border: isMobile ? 'none' : '1px solid var(--border-color)',
        boxShadow: isMobile ? 'none' : '0 10px 30px -10px rgba(0,0,0,0.1)'
      }}>
        {/* Sidebar / Chat List */}
        <aside style={{ 
          width: isMobile ? '100%' : '350px', 
          position: isMobile ? (activeChatId ? 'absolute' : 'relative') : 'relative',
          left: isMobile ? (activeChatId ? '-100%' : '0') : '0',
          top: 0,
          bottom: 0,
          zIndex: 10,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: '1px solid var(--border-color)', 
          backgroundColor: 'var(--surface-color)', 
          display: 'flex', 
          flexDirection: 'column',
          opacity: isMobile && activeChatId ? 0 : 1,
          pointerEvents: isMobile && activeChatId ? 'none' : 'auto'
        }}>
          <div style={{ padding: isMobile ? '0 1.25rem' : '0 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--surface-color)', height: isMobile ? '60px' : '70px', flexShrink: 0 }}>
            <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--primary-color)' }}>Inbox</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
              {chats.length > 0 && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--primary-color)', color: 'var(--bg-color)', borderRadius: '1rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(var(--primary-color-rgb), 0.3)' }}>{chats.length}</span>}
              <button onClick={() => signOut(auth)} className="btn-icon" title="Logout" style={{ width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', border: '1px solid var(--border-color)' }}>
                <LogOut size={isMobile ? 16 : 18} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--surface-color)' }}>
            {chats.length === 0 && (
              <div style={{ padding: isMobile ? '3rem 1.5rem' : '5rem 2rem', textAlign: 'center', opacity: 0.2 }}>
                <MessageSquare size={isMobile ? 48 : 64} style={{ marginBottom: '1rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No messages found</p>
              </div>
            )}
            {chats.map(chat => (
              <div key={chat.id} onClick={() => selectChat(chat.id)}
                style={{ 
                  padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.5rem', 
                  borderBottom: '1px solid var(--border-color)', 
                  cursor: 'pointer', 
                  backgroundColor: activeChatId === chat.id ? 'var(--bg-color)' : 'transparent', 
                  borderLeft: activeChatId === chat.id ? '4px solid var(--primary-color)' : '4px solid transparent',
                  transition: 'all 0.2s ease'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: isMobile ? '0.925rem' : '1rem', color: activeChatId === chat.id ? 'var(--primary-color)' : 'var(--text-color)' }}>{chat.visitorName}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 600 }}>{formatTime(chat.lastMessageAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: isMobile ? '0.8rem' : '0.875rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%', fontWeight: chat.unreadAdmin ? 700 : 400 }}>
                    {chat.lastMessage || 'New session started'}
                  </div>
                  {chat.unreadAdmin && <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--primary-color)', borderRadius: '50%', flexShrink: 0, boxShadow: '0 0 10px var(--primary-color)' }}></div>}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <section style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: 'var(--bg-color)', 
          width: '100%',
          position: isMobile ? (activeChatId ? 'relative' : 'absolute') : 'relative',
          left: isMobile ? (activeChatId ? '0' : '100%') : '0',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 20,
          height: '100%',
          opacity: isMobile && !activeChatId ? 0 : 1,
          pointerEvents: isMobile && !activeChatId ? 'none' : 'auto'
        }}>
          {activeChat ? (
            <>
              {/* Chat header */}
              <div style={{ padding: '0 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', height: '70px', flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => { setActiveChatId(null); }} className="btn-icon" style={{ border: 'none', marginLeft: '-0.25rem', width: '40px', height: '40px' }}>
                    <X size={24} />
                  </button>
                )}
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: 'var(--primary-color)', color: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                    {activeChat.visitorName?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid var(--surface-color)' }}></div>
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{activeChat.visitorName}</div>
                  {activeChat.visitorEmail && <div style={{ fontSize: '0.75rem', opacity: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{activeChat.visitorEmail}</div>}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.75rem' : '2rem', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.6rem' : '1rem' }}>
                {messages.length === 0 && (
                  <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.2 }}>
                    <MessageSquare size={isMobile ? 32 : 48} style={{ marginBottom: '1rem' }} />
                    <p style={{ fontSize: isMobile ? '0.85rem' : '1rem' }}>No messages yet</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} style={{ alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', maxWidth: isMobile ? '92%' : '75%' }}>
                    <div style={{ 
                      backgroundColor: msg.sender === 'admin' ? 'var(--primary-color)' : 'var(--surface-color)', 
                      color: msg.sender === 'admin' ? 'var(--bg-color)' : 'var(--text-color)', 
                      padding: isMobile ? '0.5rem 0.875rem' : '0.75rem 1.15rem', 
                      borderRadius: isMobile ? '1rem' : '1.25rem', 
                      borderBottomRightRadius: msg.sender === 'admin' ? '0.2rem' : (isMobile ? '1rem' : '1.25rem'), 
                      borderBottomLeftRadius: msg.sender === 'visitor' ? '0.2rem' : (isMobile ? '1rem' : '1.25rem'), 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)', 
                      fontSize: isMobile ? '0.85rem' : '0.95rem',
                      lineHeight: 1.4,
                      border: msg.sender === 'visitor' ? '1px solid var(--border-color)' : 'none'
                    }}>
                      {renderMessage(msg)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', alignSelf: msg.sender === 'admin' ? 'flex-end' : 'flex-start', marginTop: '0.2rem', padding: '0 0.3rem' }}>
                      <span style={{ fontSize: '0.6rem', opacity: 0.4, fontWeight: 700 }}>{formatTime(msg.createdAt)}</span>
                      {msg.sender === 'admin' && (
                        <span style={{ fontSize: '0.6rem', color: msg.seenByVisitor ? 'var(--primary-color)' : 'var(--text-color)', opacity: msg.seenByVisitor ? 1 : 0.3 }}>
                          {msg.seenByVisitor ? <CheckCheck size={10} /> : <Check size={10} />}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Upload progress */}
              {uploading && (
                <div style={{ padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.25rem', fontSize: '0.7rem', color: 'var(--primary-color)', backgroundColor: 'var(--surface-color)', borderTop: '1px solid var(--border-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '3px', backgroundColor: 'var(--bg-color)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.3s ease' }}></div>
                  </div>
                  <span style={{ minWidth: '30px' }}>{uploadProgress}%</span>
                </div>
              )}

              {/* Reply bar */}
              <form onSubmit={handleSend} style={{ padding: isMobile ? '0.6rem 0.75rem' : '1.25rem 2rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', display: 'flex', gap: isMobile ? '0.4rem' : '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: isMobile ? '0.2rem' : '0.35rem' }}>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-icon" title="Attach" style={{ width: isMobile ? '34px' : '40px', height: isMobile ? '34px' : '40px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}><Paperclip size={isMobile ? 16 : 20} /></button>
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-icon" title="Camera" style={{ width: isMobile ? '34px' : '40px', height: isMobile ? '34px' : '40px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)' }}><Camera size={isMobile ? 16 : 20} /></button>
                </div>
                <input type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} placeholder="Type a message..."
                  style={{ 
                    flex: 1, 
                    padding: isMobile ? '0.5rem 0.875rem' : '0.75rem 1.25rem', 
                    borderRadius: '1.25rem', 
                    border: '1px solid var(--border-color)', 
                    backgroundColor: 'var(--bg-color)', 
                    color: 'var(--text-color)', 
                    fontSize: isMobile ? '0.85rem' : '0.95rem', 
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }} 
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0', borderRadius: '50%', width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px', flexShrink: 0, minHeight: 'auto', boxShadow: '0 4px 12px rgba(var(--primary-color-rgb), 0.2)' }}>
                  <Send size={isMobile ? 16 : 20} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15, flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '35px', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                <MessageSquare size={60} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-color)' }}>Admin Inbox</h3>
                <p style={{ fontWeight: 600, maxWidth: '250px' }}>Select a conversation from the list to start responding</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
