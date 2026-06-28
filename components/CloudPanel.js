"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, firestore, googleProvider, firebaseEnabled } from "@/lib/firebase";
import { compactSql } from "@/lib/sqlUtils";

export default function CloudPanel({ currentSql, onLoadSql, onNotice }) {
  const [user, setUser] = useState(null);
  const [cloudQueries, setCloudQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!firebaseEnabled || !auth) return undefined;
    return onAuthStateChanged(auth, (nextUser) => setUser(nextUser));
  }, []);

  const loadCloudQueries = async (targetUser = user) => {
    if (!firebaseEnabled || !firestore || !targetUser) return;
    setLoading(true);
    try {
      const q = query(collection(firestore, "users", targetUser.uid, "queries"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setCloudQueries(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (err) {
      onNotice?.(err.message || "Failed to read cloud queries.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadCloudQueries(user);
  }, [user]);

  const signIn = async () => {
    if (!firebaseEnabled || !auth || !googleProvider) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      onNotice?.(err.message || "Google sign-in failed.", "error");
    }
  };

  const saveCloud = async () => {
    if (!firebaseEnabled || !firestore || !user) return;
    if (!currentSql?.trim()) return onNotice?.("No SQL to save.", "error");
    setLoading(true);
    try {
      await addDoc(collection(firestore, "users", user.uid, "queries"), {
        name: name.trim() || compactSql(currentSql, 50) || "Untitled query",
        sql: currentSql,
        createdAt: serverTimestamp(),
      });
      setName("");
      await loadCloudQueries();
      onNotice?.("Saved to cloud query library.");
    } catch (err) {
      onNotice?.(err.message || "Failed to save cloud query.", "error");
    } finally {
      setLoading(false);
    }
  };

  const removeCloud = async (id) => {
    if (!firebaseEnabled || !firestore || !user) return;
    setLoading(true);
    try {
      await deleteDoc(doc(firestore, "users", user.uid, "queries", id));
      await loadCloudQueries();
    } catch (err) {
      onNotice?.(err.message || "Failed to delete query.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseEnabled) {
    return (
      <div className="panel-section">
        <div className="empty-state small">
          <strong>Cloud library is optional.</strong>
          <span>Add Firebase values in <code>.env.local</code> to enable Google login and cloud query saving.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-section cloud-panel">
      {!user ? (
        <>
          <p className="muted">Sign in to save useful queries to your private Firestore library.</p>
          <button className="btn primary full" onClick={signIn}>Sign in with Google</button>
        </>
      ) : (
        <>
          <div className="cloud-user">
            <div>
              <strong>{user.displayName || "Signed in"}</strong>
              <span>{user.email}</span>
            </div>
            <button className="btn ghost" onClick={() => signOut(auth)}>Sign out</button>
          </div>
          <div className="inline-form">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Query name" />
            <button className="btn primary" onClick={saveCloud} disabled={loading}>Save</button>
          </div>
          <div className="list compact-list">
            {loading && <div className="muted">Syncing…</div>}
            {!loading && cloudQueries.length === 0 && <div className="muted">No cloud queries yet.</div>}
            {cloudQueries.map((item) => (
              <div className="list-card" key={item.id}>
                <button className="list-main" onClick={() => onLoadSql(item.sql, item.name)}>
                  <strong>{item.name || "Untitled query"}</strong>
                  <span>{compactSql(item.sql)}</span>
                </button>
                <button className="icon-btn danger" onClick={() => removeCloud(item.id)} title="Delete">×</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
